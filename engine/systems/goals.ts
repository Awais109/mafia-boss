import type { Config, GoalId } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { grantGold } from './gold'

// Act I goals (ADR 0035): a reason to come back after the opening. Each reads state and stats only
// and pays its gold once. They wait for the tutorial to end, and are checked after every action and
// at every reconcile boundary, which is where any of these conditions can change.

export const GOAL_CHECKS: Record<GoalId, (s: PlayerState, c: Config) => boolean> = {
  secondDistrict: (s) => s.districts.filter((d) => d.controller === 'player').length >= 2,
  factoryTier2: (s) => s.rackets.some((r) => r.type === 'tobaccoFactory' && r.tier >= 2),
  thirdCrew: (s) => s.crew.length >= 3,
  wardCop: (s) => s.officials.includes('wardCop'),
  workFront: (s) => s.stats.frontModeChanges >= 1 || s.fronts.some((f) => f.capacityLevel >= 1),
  smuggleRun: (s) => (s.stats.opsByType.smuggleCigarettes ?? 0) >= 1,
  soldier: (s) => s.crew.some((m) => m.rank >= 1),
  actII: (s) => s.act >= 2,
}

export function checkGoals(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (!c.goals.enabled || !state.tutorial.done) return
  for (const id of c.goals.list) {
    if (state.goals.done.includes(id) || !GOAL_CHECKS[id](state, c)) continue
    state.goals.done.push(id)
    emit(ctx, t, { type: 'GOAL_DONE', goalId: id, gold: c.goals.rewardGold })
    grantGold(state, ctx, t, c.goals.rewardGold, 'goal')
  }
}
