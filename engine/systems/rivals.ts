import type { Config } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { tributeDemand } from '../core/formulas'
import type { Rand } from '../core/rng'
import { hoursToMs } from '../core/time'
import type { CrewMember, PlayerState, Racket } from '../model/state'
import { effectiveStat } from './crew'

// Tolya: the neighbourhood's old boss. Ticks on a schedule; each tick he either
// damages a racket, demands tribute, or does nothing. Unpaid demands are refused
// at the next tick. A demand can be paid, haggled over once, or refused outright (ADR 0029).

export function changeDisposition(state: PlayerState, delta: number): void {
  const tol = state.rival.tolya
  tol.disposition = Math.max(-100, Math.min(100, tol.disposition + delta))
}

export function tolyaHostile(state: PlayerState, c: Config): boolean {
  return state.rival.tolya.disposition < c.rivals.tolya.hostileBelow
}

export function tolyaIntervalHours(state: PlayerState, c: Config): number {
  const cfg = c.rivals.tolya
  // Joints and rackets draw him; premises don't (ADR 0033).
  const run = state.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises').length
  const base = run >= cfg.escalateAtRackets ? cfg.tickHoursEscalated : cfg.tickHours
  return tolyaHostile(state, c) ? base * cfg.hostileTickMult : base
}

function damageRandomRacket(state: PlayerState, rand: Rand, amount: number): Racket | undefined {
  if (state.rackets.length === 0) return undefined
  const racket = rand.pick(state.rackets)
  racket.condition = Math.max(0, racket.condition - amount)
  return racket
}

// The demand is refused: he's insulted and breaks something.
export function refuseDemand(state: PlayerState, ctx: Ctx, t: number, rand: Rand, explicit: boolean): void {
  const tol = state.rival.tolya
  if (tol.demand === null) return
  const amount = tol.demand
  tol.demand = null
  tol.haggledTick = null
  changeDisposition(state, -ctx.c.rivals.tolya.dispositionPerTribute)
  const racket = damageRandomRacket(state, rand, ctx.c.rivals.tolya.refuseConditionHit)
  emit(ctx, t, { type: 'TRIBUTE_REFUSED', amount, racketId: racket?.id, ...(explicit ? { explicit: true as const } : {}) })
}

const haggleScoreOf = (c: Config, m: CrewMember) =>
  effectiveStat(c, m, 'nerve') + (m.perks.includes('bargainer') ? (c.crew.experience.perks.bargainer.haggleBonus ?? 0) : 0)

// The idle crew member who'd do the talking: best Nerve, counting the Bargainer perk.
export function bestHaggler(state: PlayerState, c: Config): CrewMember | null {
  let best: CrewMember | null = null
  for (const m of state.crew) {
    if (m.status !== 'idle') continue
    if (!best || haggleScoreOf(c, m) > haggleScoreOf(c, best)) best = m
  }
  return best
}

// Chance a haggle succeeds: best score + U(−noise, noise) ≥ diff.
export function haggleOdds(state: PlayerState, c: Config): number {
  const m = bestHaggler(state, c)
  if (!m) return 0
  const h = c.rivals.tolya.haggle
  const score = haggleScoreOf(c, m)
  if (h.noise <= 0) return score >= h.diff ? 1 : 0
  return Math.min(1, Math.max(0, (score + h.noise - h.diff) / (2 * h.noise)))
}

export function canHaggle(state: PlayerState): boolean {
  const tol = state.rival.tolya
  return tol.demand !== null && tol.haggledTick !== tol.tickCount
}

// One roll per demand, seeded by the visit that made it, so timing can't reroll it.
export function haggle(state: PlayerState, ctx: Ctx, t: number, m: CrewMember): { won: boolean; paid: number } {
  const { c } = ctx
  const tol = state.rival.tolya
  const h = c.rivals.tolya.haggle
  const demand = tol.demand ?? 0
  const price = Math.max(1, Math.round(demand * h.pricePct))
  const score = haggleScoreOf(c, m) + ctx.rng.derive('haggle', tol.tickCount).range(-h.noise, h.noise)
  const won = score >= h.diff
  if (won) {
    state.dirty -= price
    state.stats.tributeLost += price
    tol.demand = null
    tol.haggledTick = null
    changeDisposition(state, h.dispositionOnWin)
    state.stats.haggles.won++
  } else {
    tol.haggledTick = tol.tickCount
    changeDisposition(state, h.dispositionOnInsult)
    state.stats.haggles.lost++
  }
  emit(ctx, t, { type: 'TRIBUTE_HAGGLED', crewId: m.id, name: m.name, won, demand, paid: won ? price : 0 })
  return { won, paid: won ? price : 0 }
}

export function tolyaTick(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const cfg = c.rivals.tolya
  const tol = state.rival.tolya
  const rand = ctx.rng.derive('tolya', tol.tickCount)

  if (tol.demand !== null) refuseDemand(state, ctx, t, rand, false)

  const hostile = tolyaHostile(state, c)
  const forced = tol.forceResult
  if (forced) delete tol.forceResult
  const roll = forced === 'tribute' ? cfg.pConditionHit : rand.next()
  if (roll < cfg.pConditionHit) {
    const racket = damageRandomRacket(state, rand, cfg.conditionHit)
    emit(ctx, t, { type: 'TOLYA_TICK', result: 'conditionHit', racketId: racket?.id, amount: cfg.conditionHit, hostile })
  } else if (roll < cfg.pConditionHit + cfg.pTribute || forced === 'tribute') {
    const amount = tributeDemand(c, derive(state, c).vaultCap)
    tol.demand = amount
    emit(ctx, t, { type: 'TOLYA_TICK', result: 'tribute', amount, hostile })
  } else {
    emit(ctx, t, { type: 'TOLYA_TICK', result: 'nothing', hostile })
  }

  tol.tickCount++
  tol.nextTickAt = t + hoursToMs(c, tolyaIntervalHours(state, c))
}
