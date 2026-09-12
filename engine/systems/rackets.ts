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

// Day start, right after wages: premises upkeep is paid from Dirty, then the vault (ADR 0031).
// A short day knocks condition off every premises, so a neglected factory makes less.
export function settleUpkeep(state: PlayerState, ctx: Ctx, t: number): void {
  const owed = state.upkeepOwed
  if (owed <= 0) return
  const fromDirty = Math.min(state.dirty, owed)
  state.dirty -= fromDirty
  const fromVault = Math.min(state.vault, owed - fromDirty)
  state.vault -= fromVault
  const paid = fromDirty + fromVault
  state.upkeepOwed = 0
  state.stats.upkeepPaid += paid
  if (paid + 1e-6 < owed) {
    state.stats.missedUpkeep++
    const hit = ctx.c.rackets.premises.missedUpkeepConditionHit
    for (const r of state.rackets) {
      if (ctx.c.rackets.types[r.type].kind === 'premises') r.condition = Math.max(0, r.condition - hit)
    }
    emit(ctx, t, { type: 'UPKEEP_MISSED', owed, paid })
  } else {
    emit(ctx, t, { type: 'UPKEEP_PAID', amount: paid })
  }
}
