import {
  DISTRICT_IDS,
  FRONT_TYPES,
  OFFICIAL_IDS,
  RACKET_TYPES,
  type Config,
  type DistrictId,
  type FrontMode,
  type FrontType,
  type OfficialId,
  type RacketKind,
  type RacketType,
  type SynergyConfig,
} from '../config/schema'
import type { PlayerState, Racket } from '../model/state'
import { baseWage, crewSlots } from '../systems/crew'
import * as F from './formulas'

// Everything the game computes from state + config. Never persisted.

export type RacketDerived = {
  id: string
  kind: RacketKind
  yield: number // net Dirty/hr
  grossYield: number // before tribute
  tribute: number // Dirty/hr skimmed by the district's controller
  exposure: number
  conditionMult: number
  districtMult: number
  synergyMult: number // side-by-side yield bonus (plan (m))
  upkeep: number // premises: Dirty/hr
  packsPerHr: number // joints: packs they sell; factories: packs they make
  served: number // joints: share of their cigarette trade being supplied (1 unless stock is out)
  atStake: number // joints: Dirty/hr of yield that needs cigarettes, at full supply
  capacity: number // warehouses: stock cap they add
  upgradeCost: number | null // null at max tier
  repairCost: number
}

export type FrontDerived = {
  id: string
  type: FrontType
  mode: FrontMode
  rate: number
  throughput: number // after capacity and mode
  baseThroughput: number // after capacity, before mode; sizes the buffer
  bufferCap: number
  util: number
  suspicion: number
  upgradeCost: number | null // next rate level
  capacityLevel: number
  capacityUpgradeCost: number | null
  hoursToEmpty: number
}

export type SupplyDerived = {
  madePerHr: number
  demandPerHr: number
  soldPerHr: number
  cap: number
  stock: number
  hoursToEmpty: number // Infinity while the factories keep up
  hoursToFull: number // Infinity while joints sell everything made
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
  upkeepPerHr: number // premises running costs, paid in Dirty after wages
  influencePerHr: number
  crewSlots: number
  maxTier: number // for joints and rackets; premises use rackets.premises.maxTier
  cleanPerHrMax: number // if every front ran at full throughput
  throughputPerHr: number
  perRacket: RacketDerived[]
  perFront: FrontDerived[]
  supply: SupplyDerived
  synergies: { districtId: DistrictId; id: string }[]
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

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function derive(state: PlayerState, c: Config): Derived {
  const controllerOf = (id: DistrictId) => state.districts.find((d) => d.id === id)?.controller ?? 'none'
  const inspectionMult = state.inspected ? c.heat.inspectYieldMult : 1
  const maxTier = c.rackets.maxTierByAct[state.act]
  const kindOf = (t: RacketType) => c.rackets.types[t].kind
  const sells = state.act >= c.supply.sellFromAct

  // Synergies are active in a district that has an `a`, and a `b` when one is named.
  const synergies: { districtId: DistrictId; id: string }[] = []
  const activeIn = new Map<DistrictId, SynergyConfig[]>()
  for (const id of DISTRICT_IDS) {
    const here = state.rackets.filter((r) => r.districtId === id)
    const active = c.rackets.synergies.filter((syn) => {
      if (syn.district !== undefined && syn.district !== id) return false
      if (!here.some((r) => r.type === syn.a)) return false
      if (syn.b === 'joints') return here.some((r) => kindOf(r.type) === 'joint')
      return syn.b === undefined || here.some((r) => r.type === syn.b)
    })
    activeIn.set(id, active)
    for (const syn of active) synergies.push({ districtId: id, id: syn.id })
  }
  const effectsOn = (r: Racket) => {
    let yieldMult = 1
    let upkeepMult = 1
    let servedFirst = false
    for (const syn of activeIn.get(r.districtId) ?? []) {
      const onB = syn.b === 'joints' ? kindOf(r.type) === 'joint' : syn.b === r.type
      if (onB && syn.effect.yieldMult !== undefined) yieldMult *= syn.effect.yieldMult
      if (onB && syn.effect.servedFirst) servedFirst = true
      const mult = syn.effect.upkeepMultOf?.[r.type]
      if (mult !== undefined) upkeepMult *= mult
    }
    return { yieldMult, upkeepMult, servedFirst }
  }

  // The supply chain (ADR 0032): what the factories make, what the joints would sell, the stock cap.
  const base = state.rackets.map((r) => {
    const kind = kindOf(r.type)
    const cond = r.condition / 100
    return {
      r,
      kind,
      cond,
      fx: effectsOn(r),
      demand: kind === 'joint' && sells ? F.jointSales(c, r.type, r.tier) * cond : 0,
      made: kind === 'premises' ? F.factoryOutput(c, r.type, r.tier) * cond : 0,
      capacity: kind === 'premises' ? F.warehouseCapacity(c, r.type, r.tier) * cond : 0,
    }
  })
  const madePerHr = sum(base.map((b) => b.made))
  const demandPerHr = sum(base.map((b) => b.demand))
  const cap = c.supply.baseCap + sum(base.map((b) => b.capacity))
  const stock = state.inventory.cigarettes

  // While stock is out, what comes off the line goes first to joints beside a factory, then to the
  // rest in proportion to what they'd sell.
  const served = base.map(() => 1)
  if (state.stockEmpty && demandPerHr > 0) {
    const firstDemand = sum(base.map((b) => (b.fx.servedFirst ? b.demand : 0)))
    const restDemand = sum(base.map((b) => (b.fx.servedFirst ? 0 : b.demand)))
    const firstServed = firstDemand > 0 ? Math.min(1, madePerHr / firstDemand) : 1
    const restServed = restDemand > 0 ? Math.min(1, Math.max(0, madePerHr - firstDemand) / restDemand) : 1
    base.forEach((b, i) => {
      if (b.demand > 0) served[i] = b.fx.servedFirst ? firstServed : restServed
    })
  }

  const perRacket: RacketDerived[] = base.map(({ r, kind, cond, fx, demand, made, capacity }, i) => {
    const rt = c.rackets.types[r.type]
    const district = c.districts.list[r.districtId]
    const controller = controllerOf(r.districtId)
    const ours = controller === 'player'
    const districtMult = ours ? (district.mod.yieldMult?.[r.type] ?? 1) : 1
    const enforced = r.enforcerId !== null
    const spec = r.specialization ? c.rackets.specialization[r.specialization] : null
    const share = kind === 'joint' && sells ? (rt.cigaretteShare ?? 0) : 0
    const fullYield =
      kind === 'premises'
        ? 0
        : F.tierYield(c, r.type, r.tier) *
          cond *
          districtMult *
          inspectionMult *
          (enforced ? c.rackets.enforcer.yieldMult : 1) *
          (spec?.yieldMult ?? 1) *
          fx.yieldMult
    const grossYield = fullYield * (1 - share + share * served[i])
    const tributeRate = ours || controller === 'none' ? 0 : district.tribute
    const tribute = grossYield * tributeRate
    return {
      id: r.id,
      kind,
      yield: grossYield - tribute,
      grossYield,
      tribute,
      exposure: F.tierHeat(c, r.type, r.tier) * (enforced ? c.rackets.enforcer.heatMult : 1) * (spec?.exposureMult ?? 1),
      conditionMult: cond,
      districtMult,
      synergyMult: fx.yieldMult,
      upkeep: kind === 'premises' ? F.premisesUpkeep(c, r.type, r.tier) * fx.upkeepMult : 0,
      packsPerHr: kind === 'joint' ? demand : made,
      served: served[i],
      atStake: fullYield * share,
      capacity,
      upgradeCost: r.tier < F.racketMaxTier(c, r.type, state.act) ? F.racketUpgradeCost(c, r.type, r.tier) : null,
      repairCost: F.racketRepairCost(c, r.type),
    }
  })

  const perFront: FrontDerived[] = state.fronts.map((f) => {
    const throughput = F.frontThroughput(c, f)
    return {
      id: f.id,
      type: f.type,
      mode: f.mode,
      rate: F.frontRate(c, f.type, f.level),
      throughput,
      baseThroughput: F.frontBaseThroughput(c, f),
      bufferCap: F.frontBufferCap(c, f),
      util: f.util,
      suspicion: F.frontSuspicion(c, f, f.util),
      upgradeCost: f.level < c.fronts.upgrade.levels ? F.frontUpgradeCost(c, f.type, f.level) : null,
      capacityLevel: f.capacityLevel,
      capacityUpgradeCost:
        f.capacityLevel < c.fronts.upgrade.capacity.levels ? F.frontCapacityUpgradeCost(c, f.type, f.capacityLevel) : null,
      hoursToEmpty: f.buffer / throughput,
    }
  })

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
    upkeepPerHr: sum(perRacket.map((r) => r.upkeep)),
    influencePerHr: state.officials.length * c.officials.influencePerHrEach,
    crewSlots: crewSlots(c, state),
    maxTier,
    cleanPerHrMax: sum(perFront.map((f) => f.throughput * f.rate)),
    throughputPerHr: sum(perFront.map((f) => f.throughput)),
    perRacket,
    perFront,
    supply: {
      madePerHr,
      demandPerHr,
      soldPerHr: state.stockEmpty ? Math.min(demandPerHr, madePerHr) : demandPerHr,
      cap,
      stock,
      hoursToEmpty: demandPerHr > madePerHr ? Math.max(0, stock) / (demandPerHr - madePerHr) : Infinity,
      hoursToFull: madePerHr > demandPerHr ? Math.max(0, cap - stock) / (madePerHr - demandPerHr) : Infinity,
    },
    synergies,
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
