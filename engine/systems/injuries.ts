import type { Config, OpConfig } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { Rand } from '../core/rng'
import { hoursToMs } from '../core/time'
import type { CrewMember, PlayerState } from '../model/state'
import { unassignEnforcer } from './crew'

// Injuries (ADR 0042): from Act III, a failed job that leans on Muscle can hurt someone on it, and so can
// losing a contest. A hurt member can't work and still draws wages until they're back. A Clinic shortens
// it and makes everyone a little more loyal.

const clinics = (state: PlayerState, c: Config) =>
  state.rackets.filter((r) => r.closedUntil === undefined && c.rackets.types[r.type].injuryMult !== undefined)

// Injuries last × this: the best working Clinic's, or 1 without one.
export function injuryMult(state: PlayerState, c: Config): number {
  return Math.min(1, ...clinics(state, c).map((r) => c.rackets.types[r.type].injuryMult!))
}

// Loyalty everyone gains at each day start: the best working Clinic's.
export function clinicLoyaltyPerDay(state: PlayerState, c: Config): number {
  return Math.max(0, ...clinics(state, c).map((r) => c.rackets.types[r.type].loyaltyPerDay ?? 0))
}

export function injure(state: PlayerState, ctx: Ctx, t: number, m: CrewMember, hours: number): void {
  if (m.status === 'enforcer') unassignEnforcer(state, m)
  if (m.status === 'jailed') return // already out of the picture
  m.status = 'injured'
  m.injuredUntil = Math.max(m.injuredUntil ?? 0, t + hoursToMs(ctx.c, hours * injuryMult(state, ctx.c)))
  delete m.assignedTo
  state.stats.injuries++
  emit(ctx, t, { type: 'CREW_INJURED', crewId: m.id, name: m.name, until: m.injuredUntil })
}

// A failed job with enough Muscle in it hurts one of the team, on the job's own roll stream.
export function maybeInjureTeam(state: PlayerState, ctx: Ctx, t: number, cfg: OpConfig, team: CrewMember[], rand: Rand): void {
  const inj = ctx.c.injuries
  if (state.act < inj.fromAct || team.length === 0) return
  const wSum = (cfg.w.muscle ?? 0) + (cfg.w.brains ?? 0) + (cfg.w.nerve ?? 0)
  if (wSum <= 0 || (cfg.w.muscle ?? 0) / wSum < inj.minMuscleWeight) return
  if (!rand.chance(inj.chanceOnFail)) return
  injure(state, ctx, t, rand.pick(team), inj.hours)
}

export function releaseInjured(state: PlayerState, ctx: Ctx, t: number): void {
  for (const m of state.crew) {
    if (m.status !== 'injured' || (m.injuredUntil ?? 0) > t) continue
    m.status = 'idle'
    delete m.injuredUntil
    emit(ctx, t, { type: 'CREW_RECOVERED', crewId: m.id, name: m.name })
  }
}
