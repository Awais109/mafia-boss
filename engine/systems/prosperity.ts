import type { Config, DistrictId } from '../config/schema'
import type { Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'

// Prosperity (ADR 0041): from `prosperity.fromAct`, each district has a prosperity from 0 to 100 that its
// joints' income follows. It moves a share of the way to its target at each whole hour, so it's constant
// within a reconcile segment and every split of a walk agrees. The target is the base, plus what each
// business there adds (joints lift a street, rackets sour it, hotels lift it per tier), minus city-wide
// penalties while inspectors are in, after a raid, and while cigarettes are out.

export const prosperityOn = (state: PlayerState, c: Config): boolean => state.act >= c.prosperity.fromAct

export function prosperityTarget(state: PlayerState, c: Config, id: DistrictId, t: number): number {
  const p = c.prosperity
  let target = p.base
  for (const r of state.rackets) {
    if (r.districtId !== id || r.closedUntil !== undefined) continue
    const rt = c.rackets.types[r.type]
    target += (rt.prosperity ?? 0) + (rt.prosperityPerTier ?? 0) * r.tier * (r.condition / 100)
  }
  if (state.inspected) target -= p.inspectedPenalty
  if (state.raidPenaltyUntil > t) target -= p.raidPenalty
  if (state.stockEmpty) target -= p.shortagePenalty
  return Math.max(0, Math.min(100, target))
}

const open = (state: PlayerState, c: Config) => state.districts.filter((d) => c.districts.list[d.id].act <= state.act)

// Whole hour, after the inspection and shortage flags: every open district steps toward its target.
export function prosperityHourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (!prosperityOn(state, c)) return
  for (const d of open(state, c)) d.prosperity += (prosperityTarget(state, c, d.id, t) - d.prosperity) * c.prosperity.stepPerHr
}

// When prosperity switches on, every district starts at its target, so the act doesn't open on a cliff.
export function initProsperity(state: PlayerState, c: Config, t: number): void {
  for (const d of open(state, c)) d.prosperity = prosperityTarget(state, c, d.id, t)
}

// Joints earn × this: lo at 0, hi at 100, 1 at the midpoint for the default [0.7, 1.3].
export function prosperityYieldMult(c: Config, prosperity: number): number {
  const [lo, hi] = c.prosperity.yieldMult
  return lo + ((hi - lo) * prosperity) / 100
}

// The city's prosperity, as the Bank sees it: the mean over districts where you run a joint or racket.
export function cityProsperity(state: PlayerState, c: Config): number {
  const run = new Set(state.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises').map((r) => r.districtId))
  const ds = state.districts.filter((d) => run.has(d.id))
  return ds.length ? ds.reduce((sum, d) => sum + d.prosperity, 0) / ds.length : 0
}
