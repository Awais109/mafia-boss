import type { Config } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { GoldSource } from '../model/events'
import type { PlayerState } from '../model/state'

// Gold bars buy time and nothing else (ADR 0034). Every grant comes through here, so rewarded ads
// and purchases can plug in later without engine changes.

export function grantGold(state: PlayerState, ctx: Ctx, t: number, amount: number, source: GoldSource): void {
  if (!(amount > 0)) return
  state.gold += amount
  state.stats.gold.granted += amount
  emit(ctx, t, { type: 'GOLD_GRANTED', amount, source })
}

// Bars to skip ahead this many hours.
export function skipCost(c: Config, hours: number): number {
  return Math.ceil(hours / c.gold.hoursPerBar)
}

// Bars to finish a job now: one for each started block of hoursPerBar it has left, at least one.
export function rushCost(c: Config, msLeft: number): number {
  return Math.max(1, Math.ceil(msLeft / (c.gold.hoursPerBar * c.time.hourMs)))
}
