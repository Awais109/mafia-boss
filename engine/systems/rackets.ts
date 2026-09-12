import type { Config } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'

// Vault accrual over a segment where yield and cap are constant.
export function accrueVault(
  state: PlayerState,
  ctx: Ctx,
  t: number,
  hours: number,
  yieldPerHr: number,
  cap: number,
): void {
  const potential = yieldPerHr * hours
  if (potential <= 0) return
  if (state.vault >= cap) {
    state.stats.dirtyLostToCap += potential
    return
  }
  const room = cap - state.vault
  if (potential >= room) {
    state.vault = cap
    state.stats.dirtyEarned += room
    state.stats.dirtyLostToCap += potential - room
    emit(ctx, t + Math.round((room / yieldPerHr) * ctx.c.time.hourMs), { type: 'VAULT_CAPPED', cap })
  } else {
    state.vault += potential
    state.stats.dirtyEarned += potential
  }
}

export function decayCondition(state: PlayerState, c: Config): void {
  const perHour = c.rackets.conditionDecayPerDay / 24
  for (const r of state.rackets) r.condition = Math.max(0, r.condition - perHour)
}
