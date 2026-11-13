import type { Config } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive, type Derived } from '../core/derive'
import { dayMs, hoursToMs } from '../core/time'
import type { PlayerState } from '../model/state'

// Act V (ADR 0044). Three tracks run from `opinion.fromAct`:
// - Public opinion, 0–100, city-wide: stepped toward a target at each whole hour, like prosperity. Media
//   premises and the Palace of Culture raise the target per tier, the Development Fund raises it as it
//   launders; inspections and a recent raid lower it. It multiplies control and wins elections.
// - The Ministry's attention, 0–100: stepped toward a target that grows with the size of the operation and
//   that only the Governor and opinion bring down. At `ministry.freezeAt` on a whole hour it freezes the
//   front moving the most money for `freezeHours`, and falls back to `afterFreeze`. Bribes don't touch it.
// - Elections every `elections.everyDays`: your share of the vote is a base, plus opinion, plus campaign
//   points bought with Dirty or Influence or delivered by a job, ± a seeded count. Win once and you're mayor
//   for good: no tribute, district perks amplified, more control, and no more elections.

export const politicsOn = (state: PlayerState, c: Config): boolean => state.act >= c.opinion.fromAct

const clamp100 = (n: number) => Math.max(0, Math.min(100, n))

export function opinionTarget(state: PlayerState, c: Config, t: number): number {
  const o = c.opinion
  let target = o.base
  for (const r of state.rackets) {
    if (r.closedUntil !== undefined) continue
    target += (c.rackets.types[r.type].opinionPerTier ?? 0) * r.tier * (r.condition / 100)
  }
  for (const f of state.fronts) target += (c.fronts.types[f.type].opinionAtFullUtil ?? 0) * f.util
  if (state.inspected) target -= o.inspectedPenalty
  if (state.raidPenaltyUntil > t) target -= o.raidPenalty
  return clamp100(target)
}

// What Moscow's attention is heading for: the size of the operation, less the Governor and a good press.
export function ministryTarget(state: PlayerState, c: Config, d: Derived = derive(state, c)): number {
  const m = c.ministry
  const relief = state.officials.reduce((sum, id) => sum + (c.officials.list[id].ministryRelief ?? 0), 0)
  return clamp100(m.perYield * (d.yieldPerHr + d.tributePerHr + d.legalGrossPerHr) - relief - (m.opinionRelief * state.politics.opinion) / 100)
}

// Control × this: a benefactor's neighbours don't call the police.
export function opinionControlMult(state: PlayerState, c: Config): number {
  return politicsOn(state, c) ? 1 + (c.opinion.controlBonus * state.politics.opinion) / 100 : 1
}

// Whole hour, after the fronts' utilization and the inspection flag it reads: both tracks step, and the
// Ministry freezes a front when its attention has peaked.
export function politicsHourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (!politicsOn(state, c)) return
  const pol = state.politics
  pol.opinion += (opinionTarget(state, c, t) - pol.opinion) * c.opinion.stepPerHr
  const d = derive(state, c)
  pol.attention += (ministryTarget(state, c, d) - pol.attention) * c.ministry.stepPerHr
  if (pol.attention < c.ministry.freezeAt || state.fronts.some((f) => f.frozenUntil !== undefined)) return
  if (freezeBusiestFront(state, ctx, t, c.ministry.freezeHours, d)) pol.attention = c.ministry.afterFreeze
}

// Freezes the front moving the most money (ties to the older one), or extends a freeze already on it. Used by
// the Ministry at its peak and by a hearing left to run (ADR 0045). Returns whether a front was frozen.
export function freezeBusiestFront(state: PlayerState, ctx: Ctx, t: number, hours: number, d: Derived = derive(state, ctx.c)): boolean {
  let pick = -1
  d.perFront.forEach((f, i) => {
    const busy = (x: number) => Math.max(d.perFront[x].throughput, d.perFront[x].frozen ? d.perFront[x].baseThroughput : 0)
    if (pick < 0 || busy(i) > busy(pick)) pick = i
  })
  if (pick < 0) return false
  const front = state.fronts[pick]
  front.frozenUntil = Math.max(front.frozenUntil ?? 0, t + hoursToMs(ctx.c, hours))
  state.stats.frontsFrozen++
  emit(ctx, t, { type: 'FRONT_FROZEN', frontId: front.id, until: front.frozenUntil })
  return true
}

// A frozen front thaws at its boundary.
export function thawFronts(state: PlayerState, ctx: Ctx, t: number): void {
  for (const f of state.fronts) {
    if (f.frozenUntil === undefined || f.frozenUntil > t) continue
    delete f.frozenUntil
    emit(ctx, t, { type: 'FRONT_THAWED', frontId: f.id })
  }
}

// When Act V opens: opinion starts at its target, attention at nothing, and the first election is scheduled.
export function initPolitics(state: PlayerState, c: Config, t: number): void {
  state.politics.opinion = opinionTarget(state, c, t)
  state.politics.attention = 0
  if (!state.politics.mayor) state.politics.nextElectionAt = t + c.elections.everyDays * dayMs(c)
}

export const electionScheduled = (state: PlayerState): boolean => !state.politics.mayor && state.politics.nextElectionAt > 0

// Your share of the vote before the count.
export function voteShare(state: PlayerState, c: Config): number {
  const e = c.elections
  return e.baseShare + e.perOpinion * (state.politics.opinion - 50) + e.perPoint * state.politics.points
}

// The chance the count goes your way: share + U(−noise, noise) ≥ ½.
export function winChance(state: PlayerState, c: Config): number {
  const n = c.elections.noise
  return Math.max(0, Math.min(1, (voteShare(state, c) + n - 0.5) / (2 * n)))
}

// What one campaign point costs, in Dirty (hours of yield) or Influence.
export function pointCost(state: PlayerState, c: Config, pay: 'dirty' | 'influence'): number {
  if (pay === 'influence') return c.elections.influencePerPoint
  return Math.max(1, Math.round(c.elections.pointHoursOfYield * derive(state, c).yieldPerHr))
}

export const pointsRoom = (state: PlayerState, c: Config): number => Math.max(0, c.elections.maxPoints - state.politics.points)

export function campaign(state: PlayerState, ctx: Ctx, t: number, points: number, pay: 'dirty' | 'influence'): string | null {
  const { c } = ctx
  if (!politicsOn(state, c)) return 'There’s no election to run in yet'
  if (state.politics.mayor) return 'You’re already mayor'
  if (!electionScheduled(state)) return 'No election is coming'
  if (!Number.isInteger(points) || points < 1) return 'Buy at least one point'
  const room = pointsRoom(state, c)
  if (points > room) return room > 0 ? `The campaign can use ${room} more` : 'The campaign can’t use any more'
  const cost = points * pointCost(state, c, pay)
  if (pay === 'dirty') {
    if (state.dirty < cost - 1e-6) return 'Not enough Dirty'
    state.dirty -= cost
    state.stats.campaignPaid.dirty += cost
  } else {
    if (state.influence < cost - 1e-6) return 'Not enough Influence'
    state.influence -= cost
    state.stats.campaignPaid.influence += cost
  }
  state.politics.points += points
  emit(ctx, t, { type: 'CAMPAIGNED', points, cost, pay, total: state.politics.points })
  return null
}

// Points from a job (Deliver the Vote), while an election is coming. Returns what was added.
export function addVotes(state: PlayerState, c: Config, votes: number): number {
  if (!electionScheduled(state) || votes <= 0) return 0
  const added = Math.min(votes, pointsRoom(state, c))
  state.politics.points += added
  return added
}

// The count, at its boundary: one seeded roll per election.
export function electionDue(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const pol = state.politics
  if (!electionScheduled(state) || pol.nextElectionAt > t) return
  const index = pol.elections++
  const share = voteShare(state, c) + ctx.rng.derive('election', String(index)).range(-c.elections.noise, c.elections.noise)
  const won = share >= 0.5
  state.stats.elections.held++
  pol.points = 0
  if (won) {
    pol.mayor = true
    pol.nextElectionAt = 0
    state.stats.elections.won++
  } else {
    pol.nextElectionAt += c.elections.everyDays * dayMs(c)
  }
  emit(ctx, t, { type: 'ELECTION_HELD', index, share, won })
}
