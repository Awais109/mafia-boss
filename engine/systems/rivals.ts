import type { Config } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { tributeDemand } from '../core/formulas'
import type { Rand } from '../core/rng'
import { hoursToMs } from '../core/time'
import type { PlayerState, Racket } from '../model/state'

// Tolya: the neighbourhood's old boss. Ticks on a schedule; each tick he either
// damages a racket, demands tribute, or does nothing. Unpaid demands are refused
// at the next tick.

export function changeDisposition(state: PlayerState, delta: number): void {
  const tol = state.rival.tolya
  tol.disposition = Math.max(-100, Math.min(100, tol.disposition + delta))
}

export function tolyaHostile(state: PlayerState, c: Config): boolean {
  return state.rival.tolya.disposition < c.rivals.tolya.hostileBelow
}

export function tolyaIntervalHours(state: PlayerState, c: Config): number {
  const cfg = c.rivals.tolya
  const base = state.rackets.length >= cfg.escalateAtRackets ? cfg.tickHoursEscalated : cfg.tickHours
  return tolyaHostile(state, c) ? base * cfg.hostileTickMult : base
}

function damageRandomRacket(state: PlayerState, rand: Rand, amount: number): Racket | undefined {
  if (state.rackets.length === 0) return undefined
  const racket = rand.pick(state.rackets)
  racket.condition = Math.max(0, racket.condition - amount)
  return racket
}

export function tolyaTick(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const cfg = c.rivals.tolya
  const tol = state.rival.tolya
  const rand = ctx.rng.derive('tolya', tol.tickCount)

  if (tol.demand !== null) {
    const amount = tol.demand
    tol.demand = null
    changeDisposition(state, -cfg.dispositionPerTribute)
    const racket = damageRandomRacket(state, rand, cfg.refuseConditionHit)
    emit(ctx, t, { type: 'TRIBUTE_REFUSED', amount, racketId: racket?.id })
  }

  const hostile = tolyaHostile(state, c)
  const roll = rand.next()
  if (roll < cfg.pConditionHit) {
    const racket = damageRandomRacket(state, rand, cfg.conditionHit)
    emit(ctx, t, { type: 'TOLYA_TICK', result: 'conditionHit', racketId: racket?.id, amount: cfg.conditionHit, hostile })
  } else if (roll < cfg.pConditionHit + cfg.pTribute) {
    const amount = tributeDemand(c, derive(state, c).vaultCap)
    tol.demand = amount
    emit(ctx, t, { type: 'TOLYA_TICK', result: 'tribute', amount, hostile })
  } else {
    emit(ctx, t, { type: 'TOLYA_TICK', result: 'nothing', hostile })
  }

  tol.tickCount++
  tol.nextTickAt = t + hoursToMs(c, tolyaIntervalHours(state, c))
}
