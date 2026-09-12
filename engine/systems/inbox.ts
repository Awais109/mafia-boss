import {
  INCIDENT_TYPES,
  type ChoiceConfig,
  type Config,
  type IncidentNeed,
  type IncidentType,
  type OpConfig,
  type OpOutcome,
  type PerkId,
} from '../config/schema'
import { emit, newId, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { hourIndex, hoursToMs } from '../core/time'
import type { InboxEffects, InboxItem, InboxOption, OpInstance, PlayerState } from '../model/state'
import { changeLoyalty } from './crew'
import { gainRep } from './reputation'
import { changeDisposition } from './rivals'
import { addStock } from './supply'

// Pending decisions (ADR 0024): crew reports when a job comes back, and incidents that roll
// at whole hours. Each item has 2–3 options with effects baked in at filing, and a default
// that's applied when it expires, so an absence never blocks and a log replays exactly.

const EPS = 1e-6

export function materializeChoice(choice: ChoiceConfig, act: number, jobDirty = 0): InboxOption {
  const effects: InboxEffects = {}
  const dirty = Math.round((choice.dirtyPct ?? 0) * jobDirty) + (choice.dirtyPerAct ?? 0) * act
  if (dirty) effects.dirty = dirty
  for (const k of ['influence', 'rep', 'heat', 'loyalty', 'condition', 'disposition', 'cigarettes'] as const) {
    if (choice[k]) effects[k] = choice[k]
  }
  return { id: choice.id, name: choice.name, effects }
}

const defaultOf = (choices: ChoiceConfig[]) => (choices.find((ch) => ch.default) ?? choices[0]).id

export function fileReport(
  state: PlayerState,
  ctx: Ctx,
  t: number,
  op: OpInstance,
  cfg: OpConfig,
  outcome: OpOutcome,
  jobDirty: number,
): void {
  const { c } = ctx
  if (cfg.training || !c.ops.reports.bands.includes(cfg.band)) return
  const choices = c.ops.reports.byOutcome[outcome]
  const item: InboxItem = {
    id: newId(state, 'in'),
    kind: 'report',
    ref: op.type,
    opId: op.id,
    outcome,
    crewIds: op.crewIds.filter((id) => state.crew.some((m) => m.id === id)),
    createdAt: t,
    expiresAt: t + hoursToMs(c, c.inbox.reportHours),
    options: choices.map((ch) => materializeChoice(ch, state.act, jobDirty)),
    defaultOptionId: defaultOf(choices),
  }
  state.inbox.push(item)
  state.stats.inbox.filed++
  emit(ctx, t, { type: 'REPORT_FILED', itemId: item.id, opId: op.id, opType: op.type, outcome, expiresAt: item.expiresAt })
}

export function incidentNeedHolds(state: PlayerState, c: Config, need: IncidentNeed | undefined): boolean {
  switch (need) {
    case undefined:
      return true
    case 'idleCrew':
      return state.crew.some((m) => m.status === 'idle')
    case 'joint':
      return state.rackets.some((r) => c.rackets.types[r.type].kind === 'joint')
    case 'factory':
      return state.rackets.some((r) => (c.rackets.types[r.type].makesPerHr ?? 0) > 0)
    case 'inspected':
      return state.inspected
  }
}

export function raiseIncident(state: PlayerState, ctx: Ctx, t: number, type: IncidentType, pick: () => number): void {
  const { c } = ctx
  const cfg = c.incidents.types[type]
  const idle = state.crew.filter((m) => m.status === 'idle')
  const crewId = cfg.needs === 'idleCrew' && idle.length ? idle[Math.floor(pick() * idle.length)].id : undefined
  const item: InboxItem = {
    id: newId(state, 'in'),
    kind: 'incident',
    ref: type,
    ...(crewId ? { crewIds: [crewId] } : {}),
    createdAt: t,
    expiresAt: t + hoursToMs(c, c.inbox.incidentHours),
    options: cfg.options.map((ch) => materializeChoice(ch, state.act)),
    defaultOptionId: defaultOf(cfg.options),
  }
  state.inbox.push(item)
  state.stats.inbox.filed++
  emit(ctx, t, { type: 'INCIDENT_RAISED', itemId: item.id, incidentType: type, crewId, expiresAt: item.expiresAt })
}

// Whole-hour roll, seeded by the hour: the same hour always rolls the same incident.
export function rollIncident(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (!state.tutorial.done) return
  if (t < state.createdAt + hoursToMs(c, c.incidents.startAfterHours)) return
  if (state.inbox.filter((i) => i.kind === 'incident').length >= c.inbox.maxPending) return
  const rand = ctx.rng.derive('incident', hourIndex(c, t))
  if (!rand.chance(c.incidents.chancePerHr)) return
  const eligible = INCIDENT_TYPES.filter((type) => {
    const inc = c.incidents.types[type]
    return (inc.act ?? 1) <= state.act && incidentNeedHolds(state, c, inc.needs)
  })
  if (eligible.length === 0) return
  raiseIncident(state, ctx, t, rand.pick(eligible), rand.next)
}

export function canAffordEffects(state: PlayerState, e: InboxEffects): boolean {
  if ((e.dirty ?? 0) < 0 && state.dirty < -(e.dirty ?? 0) - EPS) return false
  if ((e.clean ?? 0) < 0 && state.clean < -(e.clean ?? 0) - EPS) return false
  return true
}

function applyEffects(state: PlayerState, ctx: Ctx, t: number, item: InboxItem, e: InboxEffects): void {
  if (e.dirty) {
    const delta = Math.max(-state.dirty, e.dirty)
    state.dirty += delta
    state.stats.inboxDirty += delta
  }
  if (e.clean) state.clean = Math.max(0, state.clean + e.clean)
  if (e.influence) state.influence = Math.max(0, state.influence + e.influence)
  if (e.heat) state.heat = Math.max(0, Math.min(100, state.heat + e.heat))
  // Packs in or out of stock: never below zero, never above the cap.
  if (e.cigarettes) addStock(state, derive(state, ctx.c).supply.cap, e.cigarettes)
  if (e.loyalty) {
    for (const id of item.crewIds ?? []) {
      const m = state.crew.find((x) => x.id === id)
      if (m) changeLoyalty(m, e.loyalty)
    }
  }
  if (e.condition && item.racketId) {
    const r = state.rackets.find((x) => x.id === item.racketId)
    if (r) r.condition = Math.max(0, Math.min(100, r.condition + e.condition))
  }
  if (e.disposition) changeDisposition(state, e.disposition)
  if (e.rep && e.rep > 0) gainRep(state, ctx, t, e.rep)
  if (e.perk) {
    const perk = e.perk as PerkId
    for (const id of item.crewIds ?? []) {
      const m = state.crew.find((x) => x.id === id)
      if (m && !m.perks.includes(perk)) {
        m.perks.push(perk)
        emit(ctx, t, { type: 'PERK_CHOSEN', crewId: m.id, name: m.name, perk })
      }
    }
  }
}

export function resolveInboxItem(state: PlayerState, ctx: Ctx, t: number, item: InboxItem, option: InboxOption, auto: boolean): void {
  state.inbox = state.inbox.filter((x) => x.id !== item.id)
  if (auto) state.stats.inbox.auto++
  else state.stats.inbox.resolved++
  emit(ctx, t, {
    type: 'INBOX_RESOLVED',
    itemId: item.id,
    kind: item.kind,
    ref: item.ref,
    optionId: option.id,
    optionName: option.name,
    auto,
    effects: option.effects,
  })
  applyEffects(state, ctx, t, item, option.effects)
}

const idNum = (id: string) => Number(id.replace(/\D/g, '')) || 0

// Expired items take their default, oldest first.
export function autoResolveInbox(state: PlayerState, ctx: Ctx, t: number): void {
  const due = state.inbox
    .filter((i) => i.expiresAt <= t)
    .sort((a, b) => a.expiresAt - b.expiresAt || idNum(a.id) - idNum(b.id))
  for (const item of due) {
    const option = item.options.find((o) => o.id === item.defaultOptionId) ?? item.options[0]
    resolveInboxItem(state, ctx, t, item, option, true)
  }
}
