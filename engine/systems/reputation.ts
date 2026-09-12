import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { grantGold } from './gold'

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

export function checkActs(state: PlayerState, ctx: Ctx, t: number): void {
  const th = ctx.c.reputation.actThresholds
  if (state.act === 1 && state.reputation >= th[2]) {
    state.act = 2
    state.stats.actClearedAt[1] = t
    emit(ctx, t, { type: 'ACT_UNLOCKED', act: 2 })
    grantGold(state, ctx, t, ctx.c.gold.perActUnlocked[2], 'act')
    // Zhanna is a static presence until the supply chain exists (plan M4): log only.
    emit(ctx, t, { type: 'NOTE', text: 'Zhanna runs the Port Quarter. Her people watch every crate that moves.' })
  }
  if (state.act === 2 && state.reputation >= th[3] && state.stats.actClearedAt[2] === undefined) {
    state.stats.actClearedAt[2] = t
    emit(ctx, t, { type: 'ACT_CLEARED', act: 2 })
  }
}
