import { PERK_IDS, STATS, type Config, type OpConfig, type OpOutcome, type PerkId, type Stat } from '../config/schema'
import { emit, newId, type Ctx } from '../core/ctx'
import { statPointCost } from '../core/formulas'
import { hoursToMs } from '../core/time'
import type { CrewMember, InboxItem, PlayerState } from '../model/state'

// Crew grow with work (ADR 0030). XP accrues per stat; a stat rises one point when its XP covers
// statPointCost, up to the member's potential. Points gained set the rank; Soldier and Made each
// file a perk choice in the inbox.

export const RANK_NAMES = ['Associate', 'Soldier', 'Made', 'Capo'] as const

export function rankFor(c: Config, gained: number): number {
  const r = c.crew.experience.ranks
  return gained >= r.capo ? 3 : gained >= r.made ? 2 : gained >= r.soldier ? 1 : 0
}

export const hasPerk = (team: CrewMember[], perk: PerkId): boolean => team.some((m) => m.perks.includes(perk))

// XP each member of a team earns from a finished job, split by the job's stat weights.
export function jobXp(c: Config, cfg: OpConfig, outcome: OpOutcome, m: CrewMember, team: CrewMember[]): Partial<Record<Stat, number>> {
  const x = c.crew.experience
  if (cfg.training) return { [cfg.training]: cfg.xp ?? 0 }
  const total = x.xpByBand[cfg.band] * x.outcomeMult[outcome]
  let mult = 1
  const others = team.filter((o) => o.id !== m.id)
  if (others.some((o) => o.rank > m.rank)) mult += x.mentorBonus
  if (hasPerk(others, 'mentor')) mult += x.perks.mentor.partnerXpBonus ?? 0
  const wSum = STATS.reduce((sum, st) => sum + (cfg.w[st] ?? 0), 0)
  const out: Partial<Record<Stat, number>> = {}
  for (const st of STATS) {
    const w = cfg.w[st] ?? 0
    if (w > 0 && wSum > 0) out[st] = (total * w * mult) / wSum
  }
  return out
}

export function filePerkChoice(state: PlayerState, ctx: Ctx, t: number, m: CrewMember): void {
  const { c } = ctx
  const pool = PERK_IDS.filter((p) => !m.perks.includes(p))
  if (pool.length === 0) return
  const rand = ctx.rng.derive('perk', m.id, m.rank)
  const picks: PerkId[] = []
  while (picks.length < c.crew.experience.perkChoices && pool.length > 0) {
    picks.push(pool.splice(Math.floor(rand.next() * pool.length), 1)[0])
  }
  const item: InboxItem = {
    id: newId(state, 'in'),
    kind: 'perk',
    ref: m.id,
    crewIds: [m.id],
    createdAt: t,
    expiresAt: t + hoursToMs(c, c.inbox.perkHours),
    options: picks.map((p) => ({ id: p, name: c.crew.experience.perks[p].name, effects: { perk: p } })),
    defaultOptionId: picks[0],
  }
  state.inbox.push(item)
  state.stats.inbox.filed++
}

// Spend banked XP on stat points, then promote. Idempotent when nothing crosses a threshold.
export function levelUp(state: PlayerState, ctx: Ctx, t: number, m: CrewMember): void {
  const { c } = ctx
  for (const st of STATS) {
    for (;;) {
      if (m[st] >= m.potential[st]) {
        m.xp[st] = 0 // nothing left to learn here
        break
      }
      const cost = statPointCost(c, m[st])
      if (m.xp[st] + 1e-9 < cost) break
      m.xp[st] -= cost
      m[st]++
      m.gained++
      state.stats.statPointsGained++
      emit(ctx, t, { type: 'CREW_STAT_UP', crewId: m.id, name: m.name, stat: st, value: m[st] })
    }
  }
  const rank = rankFor(c, m.gained)
  while (m.rank < rank) {
    m.rank++
    emit(ctx, t, { type: 'CREW_RANK_UP', crewId: m.id, name: m.name, rank: m.rank })
    if (m.rank === 1 || m.rank === 2) filePerkChoice(state, ctx, t, m)
  }
}

export function grantXp(state: PlayerState, ctx: Ctx, t: number, m: CrewMember, xp: Partial<Record<Stat, number>>): void {
  for (const st of STATS) m.xp[st] += xp[st] ?? 0
  levelUp(state, ctx, t, m)
}

// Enforcers learn on the job: Muscle XP accrues continuously; points are spent at whole hours,
// so splits of a reconcile agree.
export function accrueEnforcerXp(state: PlayerState, c: Config, hours: number): void {
  const rate = c.crew.experience.enforcerXpPerHr
  if (rate <= 0) return
  for (const m of state.crew) if (m.status === 'enforcer') m.xp.muscle += rate * hours
}

export function crewXpHourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  for (const m of state.crew) levelUp(state, ctx, t, m)
}
