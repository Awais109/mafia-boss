import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'

// Rep = perCleanSpent per Clean spent + perOpSuccess per successful op + perDistrict per district.
export function gainRep(state: PlayerState, ctx: Ctx, t: number, amount: number): void {
  if (amount <= 0) return
  state.reputation += amount
  checkActs(state, ctx, t)
}

export function spendClean(state: PlayerState, ctx: Ctx, t: number, cost: number): void {
  state.clean -= cost
  state.stats.cleanSpent += cost
  gainRep(state, ctx, t, cost * ctx.c.reputation.perCleanSpent)
}

// Act I → Act II is gated by Act I goals now, not Reputation (ADR 0039) — see `checkActII` in
// `engine/systems/goals.ts`. This only ever handles Act II being "cleared", which stays Rep-based.
export function checkActs(state: PlayerState, ctx: Ctx, t: number): void {
  const th = ctx.c.reputation.actThresholds
  if (state.act === 2 && state.reputation >= th[3] && state.stats.actClearedAt[2] === undefined) {
    state.stats.actClearedAt[2] = t
    emit(ctx, t, { type: 'ACT_CLEARED', act: 2 })
  }
}
