import type { Config } from '../config/schema'
import type { GameEvent } from '../model/events'
import { LOG_CAP, type PlayerState } from '../model/state'
import { crewDayBoundary, refreshPoolIfDue, releaseJailed } from '../systems/crew'
import { accrueEnforcerXp, crewXpHourBoundary } from '../systems/experience'
import { convertFronts, frontsHourBoundary } from '../systems/fronts'
import { checkGoals } from '../systems/goals'
import { heatHourBoundary } from '../systems/heat'
import { autoResolveInbox, rollIncident } from '../systems/inbox'
import { ledgerDayBoundary } from '../systems/ledger'
import { refreshOffersIfDue } from '../systems/offers'
import { resolveOp } from '../systems/ops'
import { accrueVault, decayCondition, settleUpkeep } from '../systems/rackets'
import { tolyaTick } from '../systems/rivals'
import { accrueStock, supplyHourBoundary } from '../systems/supply'
import { clone, emit, type Ctx } from './ctx'
import { derive } from './derive'
import { convergeHeat } from './formulas'
import { makeRng, type RngFactory } from './rng'
import { isDayStart, isWholeHour, msToHours, nextWholeHour } from './time'

export type Result = { state: PlayerState; events: GameEvent[] }

// Catch the state up to `now` (plan §6). Nothing ticks: time is walked segment by
// segment, where a segment ends at the next whole hour or discrete event.
export function reconcile(input: PlayerState, now: number, c: Config, rng: RngFactory = makeRng(input.playerId)): Result {
  const state = clone(input)
  const ctx: Ctx = { c, rng, events: [] }
  advance(state, ctx, now)
  appendLog(state, ctx.events)
  return { state, events: ctx.events }
}

// The mutating walk. apply() runs it on its own working copy.
export function advance(state: PlayerState, ctx: Ctx, now: number): void {
  const { c } = ctx
  let t = state.updatedAt
  if (now <= t) return

  const floor = now - c.time.maxOfflineHours * c.time.hourMs
  if (t < floor) {
    emit(ctx, floor, { type: 'OFFLINE_CAPPED', skippedHours: msToHours(c, floor - t) })
    t = floor
    processDue(state, ctx, t)
  }

  while (t < now) {
    const boundary = nextBoundary(state, c, t, now)
    accrue(state, ctx, t, msToHours(c, boundary - t))
    t = boundary
    // Rolls at whole hours come before events landing on the same instant, so an op's
    // heat spike feeds the *next* hour's raid roll.
    if (isWholeHour(c, t)) hourBoundary(state, ctx, t)
    processDue(state, ctx, t)
  }
  state.updatedAt = now
}

function nextBoundary(state: PlayerState, c: Config, t: number, now: number): number {
  let b = Math.min(now, nextWholeHour(c, t))
  const consider = (x: number | undefined) => {
    if (x !== undefined && x > t && x < b) b = x
  }
  for (const op of state.ops) consider(op.completesAt)
  if (state.bribeControl > 0) consider(state.bribeUntil)
  consider(state.recruitPool.refreshAt)
  consider(state.offers.refreshAt)
  consider(state.rival.tolya.nextTickAt)
  for (const m of state.crew) if (m.status === 'jailed') consider(m.jailedUntil)
  for (const item of state.inbox) consider(item.expiresAt)
  return b
}

// Continuous quantities over a segment. Every rate here is constant within the segment,
// and each update composes exactly when the segment is split.
function accrue(state: PlayerState, ctx: Ctx, t: number, hours: number): void {
  if (hours <= 0) return
  const { c } = ctx
  const d = derive(state, c)
  const from = ctx.events.length
  accrueVault(state, ctx, t, hours, d.yieldPerHr, d.vaultCap)
  state.stats.tributeLost += d.tributePerHr * hours
  convertFronts(state, c, hours)
  accrueStock(state, ctx, t, hours, d)
  state.heat = convergeHeat(state.heat, d.heatTarget, hours, c.heat.convergePerHr)
  state.wagesOwed += d.wagesPerHr * hours
  state.upkeepOwed += d.upkeepPerHr * hours
  state.influence += d.influencePerHr * hours
  accrueEnforcerXp(state, c, hours)
  // The vault and the stock each emit mid-segment instants: keep them in time order, so a split agrees.
  if (ctx.events.length - from > 1) ctx.events.push(...ctx.events.splice(from).sort((a, b) => a.t - b.t))
}

function hourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  frontsHourBoundary(state, ctx.c)
  decayCondition(state, ctx.c)
  crewXpHourBoundary(state, ctx, t) // enforcers' banked XP becomes stat points on the hour
  heatHourBoundary(state, ctx, t)
  supplyHourBoundary(state, ctx, t)
  rollIncident(state, ctx, t)
  if (isDayStart(ctx.c, t)) {
    crewDayBoundary(state, ctx, t)
    settleUpkeep(state, ctx, t) // after wages: the crew get paid first
    ledgerDayBoundary(state, t) // last: the snapshot sees the day's settled costs
  }
}

const idNum = (id: string) => Number(id.replace(/\D/g, '')) || 0

// Discrete events due at or before t, in a fixed order.
export function processDue(state: PlayerState, ctx: Ctx, t: number): void {
  const due = state.ops
    .filter((o) => o.completesAt <= t)
    .sort((a, b) => a.completesAt - b.completesAt || idNum(a.id) - idNum(b.id))
  for (const op of due) resolveOp(state, ctx, op, t)
  autoResolveInbox(state, ctx, t)

  if (state.bribeControl > 0 && state.bribeUntil <= t) {
    state.bribeControl = 0
    emit(ctx, t, { type: 'BRIBE_EXPIRED' })
  }
  releaseJailed(state, ctx, t)
  refreshPoolIfDue(state, ctx, t)
  refreshOffersIfDue(state, ctx, t)
  if (state.rival.tolya.nextTickAt <= t) tolyaTick(state, ctx, t)
  // Goals only change at boundaries and actions, so checking here dates each to where it happened.
  checkGoals(state, ctx, t)
}

export function appendLog(state: PlayerState, events: GameEvent[]): void {
  if (events.length === 0) return
  state.log.push(...events)
  if (state.log.length > LOG_CAP) state.log.splice(0, state.log.length - LOG_CAP)
}
