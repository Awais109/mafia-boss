import { FRONT_TYPES, LATER_ACTS, type Act, type Config, type GoalId, type OfficialId, type RacketType } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { checkActs } from './acts'
import { grantGold } from './gold'

// Goals: a reason to come back, and what to try next. Each reads state and stats only and pays its gold once.
// They wait for the tutorial to end, and are checked after every action and at every reconcile boundary,
// which is where any of these conditions can change.
// - Act I's (ADR 0035) must all be done to open Act II (ADR 0039): `progression.acts[2].goals`. What the counted
//   ones ask for is `goals.need`, sized for an Act I of about two days (ADR 0066).
// - Each later act's (ADR 0067), `goals.byAct`, walk through what that act brings. They pay
//   `goals.rewardGoldByAct` and gate nothing, and only the act you're in counts: one left when the act
//   moves on stays undone.

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
    case 'premiumSold':
      return { have: Math.floor(s.stats.premiumSold), need: need.premiumSold }
    case 'legalBusinesses':
      return { have: s.rackets.filter((r) => r.legal).length, need: need.legalBusinesses }
    case 'hearingsWon':
      return { have: s.stats.hearings.won, need: need.hearingsWon }
    default:
      return null
  }
}

const counted = (id: GoalId) => (s: PlayerState, c: Config) => {
  const p = goalProgress(s, c, id)
  return p !== null && p.have >= p.need
}
const owns = (type: RacketType) => (s: PlayerState) => s.rackets.some((r) => r.type === type)
const onPayroll = (id: OfficialId) => (s: PlayerState) => s.officials.includes(id)
const holdsFrom = (act: Act) => (s: PlayerState, c: Config) => s.districts.some((d) => d.controller === 'player' && c.districts.list[d.id].act === act)

export const GOAL_CHECKS: Record<GoalId, (s: PlayerState, c: Config) => boolean> = {
  // Act I
  secondDistrict: counted('secondDistrict'),
  factoryTier2: (s) => s.rackets.some((r) => r.type === 'tobaccoFactory' && r.tier >= 2),
  thirdCrew: counted('thirdCrew'),
  wardCop: onPayroll('wardCop'),
  workFront: counted('workFront'),
  smuggleRun: counted('smuggleRun'),
  soldier: (s) => s.crew.some((m) => m.rank >= 1),
  // Act II: Zhanna's supply, the new districts, premises, the second official
  zhannaLot: (s) => s.stats.shipmentsPaid > 0,
  newTurf: holdsFrom(2),
  stashHouse: owns('stashHouse'),
  precinctCaptain: onPayroll('precinctCaptain'),
  // Act III: the Big Score, a bank on a prosperous street, lending, the Centre
  bigScore: (s) => (s.stats.opsByType.bigScore ?? 0) > 0,
  cooperativeBank: (s) => s.fronts.some((f) => f.type === 'cooperativeBank'),
  loanDesk: owns('loanDesk'),
  theCentre: holdsFrom(3),
  // Act IV: the border and what comes over it
  customsChief: onPayroll('customsChief'),
  firstConvoy: (s) => s.stats.convoys.landed > 0,
  foreignShop: owns('foreignShop'),
  premiumSold: counted('premiumSold'),
  // Act V: opinion and the vote
  newspaper: owns('newspaper'),
  campaign: (s) => s.stats.campaignPaid.dirty + s.stats.campaignPaid.influence > 0,
  fixTender: (s) => (s.stats.opsByType.fixTender ?? 0) > 0,
  governor: onPayroll('governor'),
  // Act VI: going legal, and the past
  firstLegal: (s) => s.rackets.some((r) => r.legal),
  legalBusinesses: counted('legalBusinesses'),
  holding: owns('holding'),
  hearingsWon: counted('hearingsWon'),
}

// The goals of an act, and the gold each pays.
export function actGoals(c: Config, act: Act): { list: GoalId[]; gold: number } {
  return act === 1 ? { list: c.goals.list, gold: c.goals.rewardGold } : { list: c.goals.byAct[act], gold: c.goals.rewardGoldByAct[act] }
}

// Every goal in the game, in act order (for Debug's count).
export const allGoals = (c: Config): GoalId[] => [...c.goals.list, ...LATER_ACTS.flatMap((a) => c.goals.byAct[a])]

export function checkGoals(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (c.goals.enabled && state.tutorial.done) {
    // Act I's in any act (they're all done once Act II opens), and the current act's.
    const acts: Act[] = state.act === 1 ? [1] : [1, state.act]
    for (const act of acts) {
      const { list, gold } = actGoals(c, act)
      for (const id of list) {
        if (state.goals.done.includes(id) || !GOAL_CHECKS[id](state, c)) continue
        state.goals.done.push(id)
        emit(ctx, t, { type: 'GOAL_DONE', goalId: id, gold })
        grantGold(state, ctx, t, gold, 'goal')
      }
    }
  }
  // Once, after the loop, so several goals landing on one boundary open Act II once (ADR 0040).
  checkActs(state, ctx, t)
}
