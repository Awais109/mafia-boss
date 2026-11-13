import type { Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { checkActs } from './acts'

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
