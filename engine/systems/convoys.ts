import type { Config, OpConfig } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import type { Rand } from '../core/rng'
import { hoursToMs } from '../core/time'
import type { PlayerState } from '../model/state'
import { addStock } from './supply'

// Convoys and the road to the border (ADR 0043). A convoy buys cartons with Clean and brings premium packs
// back, unless the Colonel's men stop it on the highway (while he holds Zastava and you haven't paid for
// passage) or customs take it at the crossing (likelier the hotter you run; less with the Customs Chief or a
// bonded warehouse at the crossing). One roll each per convoy, on its own stream.

export const colonelHolds = (state: PlayerState): boolean => state.districts.find((d) => d.id === 'zastava')?.controller === 'colonel'

export const passageActive = (state: PlayerState, t: number): boolean => state.rival.colonel.passageUntil > t

export const colonelHostile = (state: PlayerState, c: Config): boolean => state.rival.colonel.disposition < c.rivals.colonel.hostileBelow

// What a day's passage costs: hours of Dirty yield.
export function passageCost(state: PlayerState, c: Config): number {
  return Math.max(1, Math.round(c.rivals.colonel.passage.hoursOfYield * derive(state, c).yieldPerHr))
}

export function changeColonel(state: PlayerState, delta: number): void {
  const col = state.rival.colonel
  col.disposition = Math.max(-100, Math.min(100, col.disposition + delta))
}

// The best working convoy depot's effects.
function depot(state: PlayerState, c: Config) {
  const ds = state.rackets.filter((r) => r.closedUntil === undefined && c.rackets.types[r.type].convoyBonusPerTier !== undefined)
  return ds.sort((a, b) => b.tier - a.tier)[0]
}

// Packs a convoy lands on a clean run: its load × the depot's bonus.
export function convoyLoad(state: PlayerState, c: Config, cfg: OpConfig): number {
  const dep = depot(state, c)
  const bonus = dep ? (c.rackets.types[dep.type].convoyBonusPerTier ?? 0) * dep.tier * (dep.condition / 100) : 0
  return (cfg.premium ?? 0) * (1 + bonus)
}

// The chance the Colonel's men take a convoy that's on the road now.
export function hijackChance(state: PlayerState, c: Config, t: number): number {
  if (!colonelHolds(state) || passageActive(state, t)) return 0
  const dep = depot(state, c)
  const mult = dep ? (c.rackets.types[dep.type].hijackMult ?? 1) : 1
  return Math.min(1, c.convoys.hijackChance * mult * (colonelHostile(state, c) ? c.convoys.hijackHostileMult : 1))
}

// The chance customs take a load at the crossing.
export function customsChance(state: PlayerState, c: Config): number {
  let p = c.convoys.customsBase + c.convoys.customsPerHeat * state.heat
  for (const id of state.officials) p *= c.officials.list[id].seizureMult ?? 1
  const bonded = state.rackets.find(
    (r) => r.districtId === 'zastava' && r.closedUntil === undefined && c.rackets.types[r.type].seizureMult !== undefined,
  )
  if (bonded) p *= c.rackets.types[bonded.type].seizureMult!
  return Math.max(0, Math.min(1, p))
}

export function buyPassage(state: PlayerState, ctx: Ctx, t: number): string | null {
  const { c } = ctx
  if (state.act < c.premium.fromAct) return 'Nobody runs the road yet'
  if (!colonelHolds(state)) return 'The road is yours'
  const cost = passageCost(state, c)
  if (state.dirty < cost - 1e-6) return 'Not enough Dirty'
  const col = state.rival.colonel
  state.dirty -= cost
  state.stats.passagesPaid += cost
  col.passageUntil = Math.max(col.passageUntil, t) + hoursToMs(c, c.rivals.colonel.passage.hours)
  col.passagesBought++
  changeColonel(state, c.rivals.colonel.dispositionPerPassage)
  emit(ctx, t, { type: 'PASSAGE_BOUGHT', cost, until: col.passageUntil })
  return null
}

// A convoy that did its job comes to the crossing: hijacked, seized, or landed into premium stock.
export function landConvoy(state: PlayerState, ctx: Ctx, t: number, cfg: OpConfig, share: number, rand: Rand): { premium: number; hijacked?: true; seized?: true } {
  const { c } = ctx
  state.stats.convoys.run++
  if (rand.chance(hijackChance(state, c, t))) {
    state.stats.convoys.hijacked++
    return { premium: 0, hijacked: true }
  }
  if (rand.chance(customsChance(state, c))) {
    state.stats.convoys.seized++
    return { premium: 0, seized: true }
  }
  state.stats.convoys.landed++
  const premium = addStock(state, derive(state, c).premium.cap, Math.round(convoyLoad(state, c, cfg) * share), 'premium')
  return { premium }
}
