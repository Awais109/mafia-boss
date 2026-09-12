import { TRAIT_IDS, type Act, type Config, type CrewSeed, type PerkId, type Stat, type TraitId } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { Rand } from '../core/rng'
import { dayIndex, hoursToMs } from '../core/time'
import type { CrewMember, PlayerState } from '../model/state'

export function effectiveStat(c: Config, m: CrewMember, stat: Stat): number {
  let v = m[stat]
  if (stat === 'muscle' && m.traits.includes('exArmy')) v += c.crew.traits.exArmy.muscleBonus
  if (stat === 'nerve' && m.traits.includes('gambler')) v += c.crew.traits.gambler.nerveBonus
  return v
}

// Wage per hour before district modifiers: (M + B + N) / wageDivisor × trait multipliers.
export function baseWage(c: Config, m: CrewMember): number {
  let mult = 1
  if (m.traits.includes('gambler')) mult *= c.crew.traits.gambler.wageMult
  if (m.traits.includes('alcoholic')) mult *= c.crew.traits.alcoholic.wageMult
  return ((m.muscle + m.brains + m.nerve) / c.crew.wageDivisor) * mult
}

export function crewSlots(c: Config, state: PlayerState): number {
  return c.crew.slotsByAct[state.act] + state.crewSlotsBought
}

export const clampLoyalty = (v: number): number => Math.max(0, Math.min(100, v))

export function changeLoyalty(m: CrewMember, delta: number): void {
  m.loyalty = clampLoyalty(m.loyalty + delta)
}

const FIRST_NAMES = [
  'Sasha', 'Kolya', 'Lyokha', 'Seryoga', 'Zhenya', 'Tolik', 'Borya', 'Grisha', 'Pasha', 'Styopa',
  'Fedya', 'Misha', 'Slava', 'Vova', 'Yura', 'Roma', 'Igor', 'Oleg', 'Stas', 'Kostya',
  'Venya', 'Gosha', 'Marat', 'Ruslan', 'Timur', 'Arkasha', 'Lyuba', 'Galya', 'Nadya', 'Tanya',
]
const NICKNAMES = [
  'Tractor', 'Glasses', 'Sparrow', 'Brick', 'Kettle', 'Ruble', 'Pepper', 'Moth', 'Ox', 'Button',
  'Crane', 'Lighter', 'Samovar', 'Pike', 'Quiet', 'Lucky', 'Stamp', 'Gauge', 'Volga', 'Radio',
]

// A crew member's growth fields, fresh. Ceilings default to stat + 10.
export function freshProgress(stats: Record<Stat, number>, potential?: Record<Stat, number>) {
  return {
    xp: { muscle: 0, brains: 0, nerve: 0 },
    potential: potential ?? {
      muscle: Math.min(100, stats.muscle + 10),
      brains: Math.min(100, stats.brains + 10),
      nerve: Math.min(100, stats.nerve + 10),
    },
    gained: 0,
    rank: 0,
    perks: [] as PerkId[],
  }
}

export function crewFromSeed(seed: CrewSeed, id: string): CrewMember {
  return {
    id,
    name: seed.name,
    muscle: seed.muscle,
    brains: seed.brains,
    nerve: seed.nerve,
    loyalty: seed.loyalty,
    traits: seed.traits ?? [],
    status: 'idle',
    ...(seed.nephew ? { nephew: true } : {}),
    ...freshProgress(seed, seed.potential),
  }
}

export function generateCandidates(c: Config, act: Act, rand: Rand, refreshCount: number): CrewMember[] {
  const [lo, hi] = c.crew.statBandByAct[act]
  const [plo, phi] = c.crew.experience.potentialRoll
  return Array.from({ length: c.crew.poolSize }, (_, i) => {
    const traits: TraitId[] = rand.chance(c.crew.traitChance) ? [rand.pick(TRAIT_IDS)] : []
    const name = `${rand.pick(FIRST_NAMES)} "${rand.pick(NICKNAMES)}"`
    const stats = { muscle: rand.int(lo, hi), brains: rand.int(lo, hi), nerve: rand.int(lo, hi) }
    const ceiling = (v: number) => Math.min(100, v + rand.int(plo, phi))
    const potential = { muscle: ceiling(stats.muscle), brains: ceiling(stats.brains), nerve: ceiling(stats.nerve) }
    return {
      id: `cand${refreshCount}-${i}`,
      name,
      ...stats,
      loyalty: c.crew.recruitLoyalty,
      traits,
      status: 'idle' as const,
      ...freshProgress(stats, potential),
    }
  })
}

export function regeneratePool(state: PlayerState, ctx: Ctx, t: number): void {
  const pool = state.recruitPool
  pool.refreshCount++
  pool.candidates = generateCandidates(
    ctx.c,
    state.act,
    ctx.rng.derive('pool', pool.refreshCount),
    pool.refreshCount,
  )
  emit(ctx, t, { type: 'POOL_REFRESHED' })
}

// Scheduled refresh. Advances along the fixed schedule so splits agree.
export function refreshPoolIfDue(state: PlayerState, ctx: Ctx, t: number): void {
  const pool = state.recruitPool
  if (pool.refreshAt > t) return
  const interval = hoursToMs(ctx.c, ctx.c.crew.poolRefreshHours)
  while (pool.refreshAt <= t) pool.refreshAt += interval
  regeneratePool(state, ctx, t)
}

export function releaseJailed(state: PlayerState, ctx: Ctx, t: number): void {
  for (const m of state.crew) {
    if (m.status === 'jailed' && (m.jailedUntil ?? 0) <= t) {
      m.status = 'idle'
      delete m.jailedUntil
      emit(ctx, t, { type: 'RELEASED', crewId: m.id, name: m.name })
    }
  }
}

export function unassignEnforcer(state: PlayerState, m: CrewMember): void {
  const racket = state.rackets.find((r) => r.enforcerId === m.id)
  if (racket) racket.enforcerId = null
  delete m.assignedTo
}

// Day boundary: settle wages (dirty first, then vault), drift loyalty, roll walkouts.
export function crewDayBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const owed = state.wagesOwed
  if (owed > 0) {
    const fromDirty = Math.min(state.dirty, owed)
    state.dirty -= fromDirty
    const fromVault = Math.min(state.vault, owed - fromDirty)
    state.vault -= fromVault
    const paid = fromDirty + fromVault
    state.wagesOwed = 0
    state.stats.wagesPaid += paid
    if (paid + 1e-6 < owed) {
      state.stats.missedWages++
      for (const m of state.crew) changeLoyalty(m, c.crew.loyalty.perMissedWageDay)
      emit(ctx, t, { type: 'WAGES_MISSED', owed, paid })
    } else {
      emit(ctx, t, { type: 'WAGES_PAID', amount: paid })
    }
  }

  for (const m of state.crew) if (!m.perks.includes('steady')) changeLoyalty(m, c.crew.loyalty.driftPerDay)

  const day = dayIndex(c, t)
  for (const m of [...state.crew]) {
    if (m.nephew || m.loyalty >= c.crew.loyalty.lowThreshold) continue
    if (m.status === 'on_op' || m.status === 'jailed') continue
    if (!ctx.rng.derive('walkout', day, m.id).chance(c.crew.loyalty.lowEventChancePerDay)) continue
    const stolen = Math.floor(state.dirty * c.crew.loyalty.walkoutStealPct)
    state.dirty -= stolen
    unassignEnforcer(state, m)
    state.crew = state.crew.filter((x) => x.id !== m.id)
    state.stats.walkouts++
    emit(ctx, t, { type: 'WALKOUT', crewId: m.id, name: m.name, stolen })
  }
}
