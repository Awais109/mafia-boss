import {
  INCIDENT_TYPES,
  type ChoiceConfig,
  type ChoiceEffectsConfig,
  type Config,
  type IncidentNeed,
  type IncidentType,
  type OpConfig,
  type OpOutcome,
  type PerkId,
  type Stat,
} from '../config/schema'
import { emit, newId, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { hourIndex, hoursToMs } from '../core/time'
import type { InboxEffects, InboxItem, InboxOption, OpInstance, PlayerState } from '../model/state'
import { changeLoyalty, effectiveStat } from './crew'
import { injure } from './injuries'
import { gainRep } from './reputation'
import { changeDisposition } from './rivals'
import { freezeBusiestFront } from './politics'
import { addStock } from './supply'

// Pending decisions (ADR 0024): crew reports when a job comes back, and incidents that roll
// at whole hours. Each item has 2–3 options with effects baked in at filing, and a default
// that's applied when it expires, so an absence never blocks and a log replays exactly.

const EPS = 1e-6

// What an item is filed against: the act, a job's Dirty (reports), the city's income (an investigator's
// price), the amount it's about (a missed payment, a defaulted loan), and the business it names.
export type MaterializeContext = {
  act: number
  jobDirty?: number
  yieldPerHr?: number
  grossPerHr?: number // Dirty yield, tribute and legal gross together (a hearing's settlement, ADR 0045)
  due?: number
  stash?: boolean
  enforced?: boolean
  caseFile?: number // the prosecutor's file (ADR 0045)
}

function materializeEffects(fx: ChoiceEffectsConfig, m: MaterializeContext): InboxEffects {
  const effects: InboxEffects = {}
  const dirty =
    Math.round((fx.dirtyPct ?? 0) * (m.jobDirty ?? 0)) +
    (fx.dirtyPerAct ?? 0) * m.act +
    Math.round((fx.dirtyHoursOfYield ?? 0) * (m.yieldPerHr ?? 0)) +
    Math.round((fx.dirtyPerDue ?? 0) * (m.due ?? 0))
  if (dirty) effects.dirty = dirty
  const clean = Math.round((fx.cleanPerDue ?? 0) * (m.due ?? 0)) + Math.round((fx.cleanHoursOfYield ?? 0) * (m.grossPerHr ?? 0))
  if (clean) effects.clean = clean
  for (const k of ['influence', 'rep', 'heat', 'loyalty', 'disposition', 'cigarettes', 'closeHours', 'injureHours', 'freezeHours'] as const) {
    if (fx[k]) effects[k] = fx[k]
  }
  if (fx.hearingWon) effects.hearingWon = true
  // A Stash House on the street takes some of the damage (ADR 0042).
  if (fx.condition) effects.condition = Math.round(fx.condition * (m.stash && fx.stashConditionMult !== undefined ? fx.stashConditionMult : 1))
  if (fx.contest) {
    const k = fx.contest
    effects.contest = {
      stat: k.stat,
      diff: k.diff - (m.enforced ? (k.enforcerBonus ?? 0) : 0) + Math.round((k.perCase ?? 0) * (m.caseFile ?? 0)),
      win: materializeEffects(k.win, m),
      lose: materializeEffects(k.lose, m),
    }
  }
  return effects
}

export function materializeChoice(choice: ChoiceConfig, m: MaterializeContext): InboxOption {
  return { id: choice.id, name: choice.name, effects: materializeEffects(choice, m) }
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
    options: choices.map((ch) => materializeChoice(ch, { act: state.act, jobDirty })),
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
    case 'printShop':
      return state.rackets.some((r) => r.type === 'printShop' && r.closedUntil === undefined)
  }
}

// The business an incident is about, when its need names one.
function incidentRacket(state: PlayerState, need: IncidentNeed | undefined): string | undefined {
  if (need === 'printShop') return state.rackets.find((r) => r.type === 'printShop' && r.closedUntil === undefined)?.id
  return undefined
}

// `about` names what a system files the incident over: the business (an attack, the collectors' target) and
// the amount (a missed payment, a defaulted loan).
export function raiseIncident(
  state: PlayerState,
  ctx: Ctx,
  t: number,
  type: IncidentType,
  pick: () => number,
  about: { racketId?: string; due?: number; caseFile?: number } = {},
): void {
  const { c } = ctx
  const cfg = c.incidents.types[type]
  const idle = state.crew.filter((m) => m.status === 'idle')
  const crewId = cfg.needs === 'idleCrew' && idle.length ? idle[Math.floor(pick() * idle.length)].id : undefined
  const racketId = about.racketId ?? incidentRacket(state, cfg.needs)
  const racket = racketId ? state.rackets.find((r) => r.id === racketId) : undefined
  const stash = racket !== undefined && state.rackets.some((r) => r.districtId === racket.districtId && c.rackets.types[r.type].shieldPerTier !== undefined)
  const d = derive(state, c)
  const context: MaterializeContext = {
    act: state.act,
    yieldPerHr: d.yieldPerHr,
    grossPerHr: d.yieldPerHr + d.tributePerHr + d.legalGrossPerHr,
    due: about.due,
    stash,
    enforced: !!racket?.enforcerId,
    caseFile: about.caseFile,
  }
  const item: InboxItem = {
    id: newId(state, 'in'),
    kind: 'incident',
    ref: type,
    ...(crewId ? { crewIds: [crewId] } : {}),
    ...(racketId ? { racketId } : {}),
    createdAt: t,
    expiresAt: t + hoursToMs(c, cfg.hours ?? c.inbox.incidentHours),
    options: cfg.options.map((ch) => materializeChoice(ch, context)),
    defaultOptionId: defaultOf(cfg.options),
  }
  state.inbox.push(item)
  state.stats.inbox.filed++
  emit(ctx, t, { type: 'INCIDENT_RAISED', itemId: item.id, incidentType: type, crewId, racketId, expiresAt: item.expiresAt })
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
    return !inc.filed && (inc.act ?? 1) <= state.act && incidentNeedHolds(state, c, inc.needs)
  })
  if (eligible.length === 0) return
  raiseIncident(state, ctx, t, rand.pick(eligible), rand.next)
}

export function canAffordEffects(state: PlayerState, e: InboxEffects): boolean {
  if ((e.dirty ?? 0) < 0 && state.dirty < -(e.dirty ?? 0) - EPS) return false
  if ((e.clean ?? 0) < 0 && state.clean < -(e.clean ?? 0) - EPS) return false
  return true
}

// Who fights a contest: the best available crew member for the stat, idle first, then an enforcer.
export function contestFighter(state: PlayerState, c: Config, stat: Stat) {
  const pool = state.crew.filter((m) => m.status === 'idle')
  const fallback = state.crew.filter((m) => m.status === 'enforcer')
  const from = pool.length ? pool : fallback
  return from.reduce<(typeof from)[number] | null>((best, m) => (!best || effectiveStat(c, m, stat) > effectiveStat(c, best, stat) ? m : best), null)
}

// The chance a contest is won, in closed form: the fighter's stat + U(−noise, noise) ≥ diff.
export function contestOdds(state: PlayerState, c: Config, contest: { stat: Stat; diff: number }): number {
  const m = contestFighter(state, c, contest.stat)
  if (!m) return 0
  const n = c.ops.noise
  const score = effectiveStat(c, m, contest.stat)
  if (n <= 0) return score >= contest.diff ? 1 : 0
  return Math.min(1, Math.max(0, (score + n - contest.diff) / (2 * n)))
}

function applyEffects(state: PlayerState, ctx: Ctx, t: number, item: InboxItem, e: InboxEffects, fighterId?: string): void {
  // A contest rolls once, on the item's own stream, when the option is chosen (ADR 0042).
  if (e.contest) {
    const k = e.contest
    const m = contestFighter(state, ctx.c, k.stat)
    const score = m ? effectiveStat(ctx.c, m, k.stat) + ctx.rng.derive('contest', item.id).range(-ctx.c.ops.noise, ctx.c.ops.noise) : 0
    const won = m !== null && score >= k.diff
    if (won) state.stats.contests.won++
    else state.stats.contests.lost++
    emit(ctx, t, { type: 'CONTEST_RESOLVED', itemId: item.id, stat: k.stat, diff: k.diff, won, ...(m ? { crewId: m.id, name: m.name } : {}) })
    applyEffects(state, ctx, t, item, won ? k.win : k.lose, m?.id)
  }
  if (e.injureHours && fighterId) {
    const m = state.crew.find((x) => x.id === fighterId)
    if (m) injure(state, ctx, t, m, e.injureHours)
  }
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
  if (e.closeHours && item.racketId) {
    const r = state.rackets.find((x) => x.id === item.racketId)
    if (r) {
      r.closedUntil = Math.max(r.closedUntil ?? 0, t + hoursToMs(ctx.c, e.closeHours))
      emit(ctx, t, { type: 'RACKET_CLOSED', racketId: r.id, until: r.closedUntil })
    }
  }
  if (e.disposition) changeDisposition(state, e.disposition)
  // Act VI (ADR 0045): a hearing left to run, or lost, costs a front for a while; one beaten counts toward the Empire.
  if (e.freezeHours) freezeBusiestFront(state, ctx, t, e.freezeHours)
  if (e.hearingWon) state.stats.hearings.won++
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
