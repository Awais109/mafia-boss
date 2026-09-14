import { DISTRICT_IDS, FRONT_TYPES, type Config, type GoalId } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { openLots, openSpots } from './districts'
import { grantGold } from './gold'

// Act I goals (ADR 0035): a reason to come back after the opening. Each reads state and stats only
// and pays its gold once. They wait for the tutorial to end, and are checked after every action and
// at every reconcile boundary, which is where any of these conditions can change.
// Every one of them must be done to open Act II (ADR 0039) — not a Reputation threshold.

// A district counts once it's controlled AND has every joint/racket slot and every premises lot filled.
function districtFull(s: PlayerState, c: Config, id: (typeof DISTRICT_IDS)[number]): boolean {
  const d = s.districts.find((x) => x.id === id)
  return d !== undefined && d.controller === 'player' && openSpots(s, c, id).length === 0 && openLots(s, c, id) === 0
}

export const GOAL_CHECKS: Record<GoalId, (s: PlayerState, c: Config) => boolean> = {
  secondDistrict: (s, c) => DISTRICT_IDS.filter((id) => districtFull(s, c, id)).length >= 2,
  factoryTier2: (s) => s.rackets.some((r) => r.type === 'tobaccoFactory' && r.tier >= 2),
  thirdCrew: (s) => s.crew.length >= 3,
  wardCop: (s) => s.officials.includes('wardCop'),
  workFront: (s) => FRONT_TYPES.every((t) => s.fronts.some((f) => f.type === t && f.level >= 2)),
  smuggleRun: (s) => (s.stats.opsByType.smuggleCigarettes ?? 0) >= 3,
  soldier: (s) => s.crew.some((m) => m.rank >= 1),
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
  checkActII(state, ctx, t)
}

// Act II opens the instant every Act I goal is done (ADR 0039). Checked once here, after the loop
// above, so several goals completing on the same boundary only evaluate the transition once.
// Exported so Debug's force-complete path (which runs regardless of the tutorial-done gate above)
// can trigger it directly.
export function checkActII(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (state.act !== 1 || !c.goals.list.every((id) => state.goals.done.includes(id))) return
  state.act = 2
  state.stats.actClearedAt[1] = t
  emit(ctx, t, { type: 'ACT_UNLOCKED', act: 2 })
  grantGold(state, ctx, t, c.gold.perActUnlocked[2], 'act')
  // Zhanna's trade opens with the Port (ADR 0036).
  emit(ctx, t, { type: 'NOTE', text: 'Zhanna runs the Port Quarter. Her people watch every crate that moves.' })
}
