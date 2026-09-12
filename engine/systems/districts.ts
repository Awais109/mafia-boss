import type { Config, DistrictId, RacketType } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { District, PlayerState } from '../model/state'
import { gainRep } from './reputation'
import { changeDisposition } from './rivals'

export function getDistrict(state: PlayerState, id: DistrictId): District {
  const d = state.districts.find((x) => x.id === id)
  if (!d) throw new Error(`district ${id} missing from state`)
  return d
}

export function districtUnlocked(state: PlayerState, c: Config, id: DistrictId): boolean {
  return c.districts.list[id].act <= state.act
}

// Districts taken from someone else. Home turf doesn't count toward the control bonus.
export function takenDistrictCount(state: PlayerState, c: Config): number {
  return state.districts.filter((d) => d.controller === 'player' && !c.districts.list[d.id].home).length
}

// A district hosts at most one of each business it allows; these are the ones not built yet.
export function openSpots(state: PlayerState, c: Config, id: DistrictId): RacketType[] {
  const built = new Set(state.rackets.filter((r) => r.districtId === id).map((r) => r.type))
  return c.districts.list[id].allows.filter((t) => !built.has(t))
}

// Premises lots still free in a district (ADR 0031): any premises type, one of each type per district.
export function openLots(state: PlayerState, c: Config, id: DistrictId): number {
  const used = state.rackets.filter((r) => r.districtId === id && c.rackets.types[r.type].kind === 'premises').length
  return Math.max(0, c.districts.list[id].premisesLots - used)
}

// Why a premises of this type can't go in this district right now, or null if it can.
export function premisesBlocked(state: PlayerState, c: Config, id: DistrictId, type: RacketType): string | null {
  const max = c.rackets.types[type].maxInCity
  if (state.rackets.some((r) => r.districtId === id && r.type === type)) return 'You already have one there'
  if (max !== undefined && state.rackets.filter((r) => r.type === type).length >= max) {
    return max === 1 ? 'Only one in the city' : `Only ${max} in the city`
  }
  if (openLots(state, c, id) <= 0) return 'No free lot there'
  return null
}

export function canPressure(state: PlayerState, c: Config, id: DistrictId): string | null {
  if (!districtUnlocked(state, c, id)) return 'That district is not open yet'
  if (getDistrict(state, id).controller === 'player') return 'Already yours'
  return null
}

export function takeDistrict(state: PlayerState, ctx: Ctx, t: number, id: DistrictId, how: 'buyout' | 'pressure'): void {
  const d = getDistrict(state, id)
  const from = d.controller
  d.controller = 'player'
  d.pressureCount = 0
  const cfg = ctx.c.rivals.tolya
  if (from === 'tolya') changeDisposition(state, how === 'buyout' ? cfg.dispositionOnBuyout : cfg.dispositionOnFlip)
  if (how === 'pressure') emit(ctx, t, { type: 'DISTRICT_FLIPPED', districtId: id, from })
  gainRep(state, ctx, t, ctx.c.reputation.perDistrict)
}

export function addPressure(state: PlayerState, ctx: Ctx, t: number, id: DistrictId): void {
  const d = getDistrict(state, id)
  if (d.controller === 'player') return
  d.pressureCount++
  if (d.controller === 'tolya') changeDisposition(state, ctx.c.rivals.tolya.dispositionPerPressure)
  const needed = ctx.c.districts.pressureOpsToFlip
  emit(ctx, t, { type: 'DISTRICT_PRESSURED', districtId: id, count: d.pressureCount, needed })
  if (d.pressureCount >= needed) takeDistrict(state, ctx, t, id, 'pressure')
}
