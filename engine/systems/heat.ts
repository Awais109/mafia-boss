import { emit, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import type { Rand } from '../core/rng'
import { hourIndex, hoursToMs } from '../core/time'
import type { PlayerState } from '../model/state'
import { unassignEnforcer } from './crew'

// Whole-hour checks: inspection flag, then raid and arrest rolls. Each roll is seeded by
// the hour index, so reloading can't dodge a raid.
export function heatHourBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const was = state.inspected
  state.inspected = state.heat >= c.heat.inspectThreshold
  if (state.inspected && !was) emit(ctx, t, { type: 'INSPECTION_STARTED', heat: state.heat })
  if (!state.inspected && was) emit(ctx, t, { type: 'INSPECTION_ENDED', heat: state.heat })

  const hour = hourIndex(c, t)
  if (state.heat >= c.heat.raidThreshold && ctx.rng.derive('raid', hour).chance(c.heat.raidChancePerHr)) {
    raid(state, ctx, t)
  }
  if (state.heat >= c.heat.arrestThreshold) {
    const rand = ctx.rng.derive('arrest', hour)
    if (rand.chance(c.heat.arrestChancePerHr)) arrest(state, ctx, t, rand)
  }
}

export function raid(state: PlayerState, ctx: Ctx, t: number): void {
  // Stash houses keep part of it back (ADR 0037).
  const exposed = state.vault * ctx.c.heat.raidSeizePct
  const seized = Math.floor(exposed * (1 - derive(state, ctx.c).raidShield))
  const shielded = Math.max(0, Math.floor(exposed) - seized)
  state.vault -= seized
  state.stats.raids++
  state.stats.seized += seized
  if (state.stats.firstRaidAt === null) state.stats.firstRaidAt = t
  emit(ctx, t, { type: 'RAID', heat: state.heat, seized, shielded })
}

export function arrest(state: PlayerState, ctx: Ctx, t: number, rand: Rand): void {
  const candidates = state.crew.filter((m) => m.status === 'idle' || m.status === 'enforcer')
  if (candidates.length === 0) return
  const m = rand.pick(candidates)
  if (m.status === 'enforcer') unassignEnforcer(state, m)
  m.status = 'jailed'
  m.jailedUntil = t + hoursToMs(ctx.c, ctx.c.heat.arrestHours)
  state.stats.arrests++
  emit(ctx, t, { type: 'ARREST', heat: state.heat, crewId: m.id, name: m.name, until: m.jailedUntil })
}
