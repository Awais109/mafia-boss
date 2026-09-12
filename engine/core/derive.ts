import {
  DISTRICT_IDS,
  FRONT_TYPES,
  OFFICIAL_IDS,
  RACKET_TYPES,
  type Config,
  type DistrictId,
  type FrontType,
  type OfficialId,
  type RacketType,
} from '../config/schema'
import type { PlayerState } from '../model/state'
import { baseWage, crewSlots } from '../systems/crew'
import * as F from './formulas'

// Everything the game computes from state + config. Never persisted.

export type RacketDerived = {
  id: string
  yield: number // net Dirty/hr
  grossYield: number // before tribute
  tribute: number // Dirty/hr skimmed by the district's controller
  exposure: number
  conditionMult: number
  districtMult: number
  upgradeCost: number | null // null at max tier for the act
  repairCost: number
}

export type FrontDerived = {
  id: string
  type: FrontType
  rate: number
  throughput: number
  bufferCap: number
  util: number
  suspicion: number
  upgradeCost: number | null
  hoursToEmpty: number
}

export type Derived = {
  yieldPerHr: number
  tributePerHr: number
  vaultCap: number
  exposure: number
  racketExposure: number
  frontSuspicion: number
  control: number
  controlParts: { base: number; officials: number; bribe: number; districtMult: number }
  heatTarget: number
  inspectionMult: number
  wagesPerHr: number
  wageMult: number
  influencePerHr: number
  crewSlots: number
  maxTier: number
  cleanPerHrMax: number // if every front ran at full throughput
  throughputPerHr: number
  perRacket: RacketDerived[]
  perFront: FrontDerived[]
  costs: {
    racket: Record<RacketType, number>
    front: Record<FrontType, number>
    recruit: number
    raise: number
    crewSlot: number
    bribe: number
    official: Record<OfficialId, number>
    district: Record<DistrictId, number>
  }
  unlocked: {
    racket: Record<RacketType, boolean>
    front: Record<FrontType, boolean>
    district: Record<DistrictId, boolean>
    official: Record<OfficialId, boolean>
  }
}

const mapKeys = <K extends string, V>(keys: readonly K[], fn: (k: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((k) => [k, fn(k)])) as Record<K, V>

export function derive(state: PlayerState, c: Config): Derived {
  const controllerOf = (id: DistrictId) => state.districts.find((d) => d.id === id)?.controller ?? 'none'
  const inspectionMult = state.inspected ? c.heat.inspectYieldMult : 1
  const maxTier = c.rackets.maxTierByAct[state.act]

  const perRacket: RacketDerived[] = state.rackets.map((r) => {
    const district = c.districts.list[r.districtId]
    const controller = controllerOf(r.districtId)
    const ours = controller === 'player'
    const districtMult = ours ? (district.mod.yieldMult?.[r.type] ?? 1) : 1
    const conditionMult = r.condition / 100
    const enforced = r.enforcerId !== null
    const grossYield =
      F.tierYield(c, r.type, r.tier) *
      conditionMult *
      districtMult *
      inspectionMult *
      (enforced ? c.rackets.enforcer.yieldMult : 1)
    const tributeRate = ours || controller === 'none' ? 0 : district.tribute
    const tribute = grossYield * tributeRate
    return {
      id: r.id,
      yield: grossYield - tribute,
      grossYield,
      tribute,
      exposure: F.tierHeat(c, r.type, r.tier) * (enforced ? c.rackets.enforcer.heatMult : 1),
      conditionMult,
      districtMult,
      upgradeCost: r.tier < maxTier ? F.racketUpgradeCost(c, r.type, r.tier) : null,
      repairCost: F.racketRepairCost(c, r.type),
    }
  })

  const perFront: FrontDerived[] = state.fronts.map((f) => {
    const throughput = c.fronts.types[f.type].throughput
    return {
      id: f.id,
      type: f.type,
      rate: F.frontRate(c, f.type, f.level),
      throughput,
      bufferCap: F.frontBufferCap(c, f.type),
      util: f.util,
      suspicion: F.frontSuspicion(c, f.type, f.util),
      upgradeCost: f.level < c.fronts.upgrade.levels ? F.frontUpgradeCost(c, f.type, f.level) : null,
      hoursToEmpty: f.buffer / throughput,
    }
  })

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  const yieldPerHr = sum(perRacket.map((r) => r.yield))
  const racketExposure = sum(perRacket.map((r) => r.exposure))
  const frontSuspicion = sum(perFront.map((f) => f.suspicion))
  const exposure = racketExposure + frontSuspicion

  const taken = state.districts.filter((d) => d.controller === 'player' && !c.districts.list[d.id].home).length
  const controlParts = {
    base: c.heat.baseControl,
    officials: sum(state.officials.map((id) => c.officials.list[id].control)),
    bribe: state.bribeControl,
    districtMult: 1 + c.heat.districtControlPct * taken,
  }
  const control = (controlParts.base + controlParts.officials + controlParts.bribe) * controlParts.districtMult

  const wageMult = state.districts
    .filter((d) => d.controller === 'player')
    .reduce((m, d) => m * (c.districts.list[d.id].mod.wageMult ?? 1), 1)

  return {
    yieldPerHr,
    tributePerHr: sum(perRacket.map((r) => r.tribute)),
    vaultCap: F.vaultCap(c, yieldPerHr, state.act),
    exposure,
    racketExposure,
    frontSuspicion,
    control,
    controlParts,
    heatTarget: F.heatTarget(exposure, control),
    inspectionMult,
    wagesPerHr: sum(state.crew.map((m) => baseWage(c, m))) * wageMult,
    wageMult,
    influencePerHr: state.officials.length * c.officials.influencePerHrEach,
    crewSlots: crewSlots(c, state),
    maxTier,
    cleanPerHrMax: sum(perFront.map((f) => f.throughput * f.rate)),
    throughputPerHr: sum(perFront.map((f) => f.throughput)),
    perRacket,
    perFront,
    costs: {
      racket: mapKeys(RACKET_TYPES, (t) => F.racketPurchaseCost(c, t)),
      front: mapKeys(FRONT_TYPES, (t) => c.fronts.types[t].cost),
      recruit: F.recruitCost(c, state.act),
      raise: F.raiseCost(c, state.act),
      crewSlot: F.crewSlotCost(c, state.stats.cleanEarned),
      bribe: F.bribeCost(c, exposure),
      official: mapKeys(OFFICIAL_IDS, (id) => c.officials.list[id].cost),
      district: mapKeys(DISTRICT_IDS, (id) => c.districts.list[id].buyout),
    },
    unlocked: {
      racket: mapKeys(RACKET_TYPES, (t) => {
        const rt = c.rackets.types[t]
        return rt.act <= state.act && state.reputation >= rt.unlockRep
      }),
      front: mapKeys(FRONT_TYPES, (t) => state.reputation >= c.fronts.types[t].unlockRep),
      district: mapKeys(DISTRICT_IDS, (id) => c.districts.list[id].act <= state.act),
      official: mapKeys(OFFICIAL_IDS, (id) => c.officials.list[id].act <= state.act),
    },
  }
}
