import { DISTRICT_IDS, FRONT_TYPES, type Config, type GoalId } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { checkActs } from './acts'
import { openLots, openSpots } from './districts'
import { grantGold } from './gold'

// Act I goals (ADR 0035): a reason to come back after the opening. Each reads state and stats only
// and pays its gold once. They wait for the tutorial to end, and are checked after every action and
// at every reconcile boundary, which is where any of these conditions can change.
// Every one of them must be done to open Act II (ADR 0039): `progression.acts[2].goals`.

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
  // Act I's fronts (ADR 0040): later acts add fronts this goal never asked for.
  workFront: (s, c) => FRONT_TYPES.filter((t) => c.fronts.types[t].act === 1).every((t) => s.fronts.some((f) => f.type === t && f.level >= 2)),
  smuggleRun: (s) => (s.stats.opsByType.smuggleCigarettes ?? 0) >= 3,
  soldier: (s) => s.crew.some((m) => m.rank >= 1),
}

export function checkGoals(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (c.goals.enabled && state.tutorial.done) {
    for (const id of c.goals.list) {
      if (state.goals.done.includes(id) || !GOAL_CHECKS[id](state, c)) continue
      state.goals.done.push(id)
      emit(ctx, t, { type: 'GOAL_DONE', goalId: id, gold: c.goals.rewardGold })
      grantGold(state, ctx, t, c.goals.rewardGold, 'goal')
    }
  }
  // Once, after the loop, so several goals landing on one boundary open Act II once (ADR 0040).
  checkActs(state, ctx, t)
}
