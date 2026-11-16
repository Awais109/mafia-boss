import { FRONT_TYPES, type Config, type GoalId } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { checkActs } from './acts'
import { grantGold } from './gold'

// Act I goals (ADR 0035): a reason to come back after the opening. Each reads state and stats only
// and pays its gold once. They wait for the tutorial to end, and are checked after every action and
// at every reconcile boundary, which is where any of these conditions can change.
// Every one of them must be done to open Act II (ADR 0039): `progression.acts[2].goals`. What the counted
// ones ask for is `goals.need`, sized for an Act I of about two days (ADR 0066).

// The districts that count: held, with a business of yours in them (not an empty one bought and left).
export function districtsWorked(s: PlayerState): number {
  return s.districts.filter((d) => d.controller === 'player' && s.rackets.some((r) => r.districtId === d.id)).length
}

// The goals that count something: how many you have against how many it takes. The check is have >= need,
// and Home shows the count.
export function goalProgress(s: PlayerState, c: Config, id: GoalId): { have: number; need: number } | null {
  const need = c.goals.need
  switch (id) {
    case 'secondDistrict':
      return { have: districtsWorked(s), need: need.secondDistrict }
    case 'thirdCrew':
      return { have: s.crew.length, need: need.thirdCrew }
    case 'workFront': {
      // Act I's fronts (ADR 0040): later acts add fronts this goal never asked for.
      const first = FRONT_TYPES.filter((t) => c.fronts.types[t].act === 1)
      return { have: first.filter((t) => s.fronts.some((f) => f.type === t && f.level >= 2)).length, need: need.workFront }
    }
    case 'smuggleRun':
      return { have: s.stats.opsByType.smuggleCigarettes ?? 0, need: need.smuggleRun }
    default:
      return null
  }
}

const counted = (id: GoalId) => (s: PlayerState, c: Config) => {
  const p = goalProgress(s, c, id)
  return p !== null && p.have >= p.need
}

export const GOAL_CHECKS: Record<GoalId, (s: PlayerState, c: Config) => boolean> = {
  secondDistrict: counted('secondDistrict'),
  factoryTier2: (s) => s.rackets.some((r) => r.type === 'tobaccoFactory' && r.tier >= 2),
  thirdCrew: counted('thirdCrew'),
  wardCop: (s) => s.officials.includes('wardCop'),
  workFront: counted('workFront'),
  smuggleRun: counted('smuggleRun'),
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
