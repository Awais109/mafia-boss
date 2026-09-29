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
import { cityProsperity, prosperityOn, prosperityYieldMult } from '../systems/prosperity'
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
  prosperityMult: number // joints: × the district's prosperity (ADR 0041); 1 otherwise
  opinionMult: number // the Construction Trust: × public opinion (ADR 0044); 1 otherwise
  legal: boolean // legalized (ADR 0045): yield 0, exposure 0, no tribute
  legalClean: number // Clean per hour it earns while legal
  closed: boolean // shut by an investigation: earns, sells and heats nothing
  synergyMult: number // side-by-side yield bonus (plan (m))
  upkeep: number // premises: Dirty/hr
  packsPerHr: number // joints: packs they sell; factories: packs they make
  served: number // joints: share of their cigarette trade being supplied (1 unless stock is out)
  atStake: number // joints: Dirty/hr of yield that needs cigarettes, at full supply
  premiumPacksPerHr: number // premium joints: premium packs they sell (ADR 0043)
  premiumServed: number // premium joints: share of their premium trade being supplied
  premiumAtStake: number // premium joints: Dirty/hr of yield that needs premium packs, at full supply
  capacity: number // warehouses: stock cap they add
  leashHours: number // stash houses: vault hours they add (only the best counts)
  shield: number // stash houses: their part of the raid shield
  influence: number // union offices: Influence per hour
  upgradeCost: number | null // null at max tier
  repairCost: number
}

export type FrontDerived = {
  id: string
  type: FrontType
  mode: FrontMode
  rate: number
  throughput: number // after capacity and mode; 0 while frozen
  frozen: boolean // the Ministry has frozen it (ADR 0044)
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
  legalCleanPerHr: number // Clean legal businesses earn directly (ADR 0045)
  legalGrossPerHr: number // their gross yield, before tax
  holdingMult: number // the Holding's bonus on legal businesses
  vaultCap: number // with the best Stash House's extra hours
  vaultCapBase: number // without them: Tolya's demand and the report read this
  stashHours: number
  raidShield: number // share of a raid's seizure kept back
  cityProsperity: number // mean prosperity where you run joints and rackets; the Bank reads it (ADR 0041)
  exposure: number
  racketExposure: number
  frontSuspicion: number
  control: number
  controlParts: { base: number; officials: number; bribe: number; districtMult: number; mayor: number; opinionMult: number }
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
  premium: SupplyDerived // premium imported cigarettes, from Act IV (ADR 0043)
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
  const premiumOn = state.act >= c.premium.fromAct
  const prospering = prosperityOn(state, c)
  const prosperityOf = (id: DistrictId) => state.districts.find((d) => d.id === id)?.prosperity ?? c.prosperity.base
  // Act V (ADR 0044): opinion pays the Construction Trust and multiplies control; the mayor pays no tribute
  // and gets more from every district's perks.
  const politics = state.act >= c.opinion.fromAct
  const opinion = state.politics.opinion
  const mayor = state.politics.mayor
  const perkMult = mayor ? c.elections.mayor.perkMult : 1

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
    let influenceMult = 1
    let servedFirst = false
    for (const syn of activeIn.get(r.districtId) ?? []) {
      const onB = syn.b === 'joints' ? kindOf(r.type) === 'joint' : syn.b === r.type
      if (onB && syn.effect.yieldMult !== undefined) yieldMult *= syn.effect.yieldMult
      if (onB && syn.effect.servedFirst) servedFirst = true
      const mult = syn.effect.upkeepMultOf?.[r.type]
      if (mult !== undefined) upkeepMult *= mult
      if (syn.a === r.type && syn.effect.influenceMult !== undefined) influenceMult *= syn.effect.influenceMult
    }
    return { yieldMult, upkeepMult, influenceMult, servedFirst }
  }

  // The supply chain (ADR 0032): what the factories make, what the joints would sell, the stock cap.
  const base = state.rackets.map((r) => {
    const kind = kindOf(r.type)
    // A shut business is as good as a wrecked one while it's shut.
    const cond = r.closedUntil !== undefined ? 0 : r.condition / 100
    return {
      r,
      kind,
      cond,
      fx: effectsOn(r),
      demand: kind === 'joint' && sells ? F.jointSales(c, r.type, r.tier) * cond : 0,
      made: kind === 'premises' ? F.factoryOutput(c, r.type, r.tier) * cond : 0,
      capacity: kind === 'premises' ? F.warehouseCapacity(c, r.type, r.tier) * cond : 0,
      premiumDemand: kind === 'joint' && premiumOn ? F.premiumSales(c, r.type, r.tier) * cond : 0,
      premiumMade: kind === 'premises' && premiumOn ? F.premiumOutput(c, r.type, r.tier) * cond : 0,
      premiumCapacity: kind === 'premises' ? (c.rackets.types[r.type].premiumCapPerTier ?? 0) * r.tier * cond : 0,
      leash: (c.rackets.types[r.type].leashHoursPerTier ?? 0) * r.tier * cond,
      shieldRaw: (c.rackets.types[r.type].shieldPerTier ?? 0) * r.tier * cond,
    }
  })
  const madePerHr = sum(base.map((b) => b.made))
  const demandPerHr = sum(base.map((b) => b.demand))
  const cap = c.supply.baseCap + sum(base.map((b) => b.capacity))
  const stock = state.inventory.cigarettes
  const premiumMade = sum(base.map((b) => b.premiumMade))
  const premiumDemand = sum(base.map((b) => b.premiumDemand))
  const premiumCap = c.premium.baseCap + sum(base.map((b) => b.premiumCapacity))
  // While premium stock is out, what's made (by the Combine, Act V) is shared in proportion to demand.
  const premiumServedAll = state.premiumEmpty && premiumDemand > 0 ? Math.min(1, premiumMade / premiumDemand) : 1

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

  // The Holding (ADR 0045): every legal business earns × this.
  const holdingMult = 1 + Math.max(0, ...base.map((b) => (c.rackets.types[b.r.type].legalBonusPerTier ?? 0) * b.r.tier * b.cond))

  const perRacket: RacketDerived[] = base.map(({ r, kind, cond, fx, demand, made, capacity, leash, premiumDemand: pDemand }, i) => {
    const rt = c.rackets.types[r.type]
    const district = c.districts.list[r.districtId]
    const controller = controllerOf(r.districtId)
    const ours = controller === 'player'
    const districtMult = ours ? 1 + ((district.mod.yieldMult?.[r.type] ?? 1) - 1) * perkMult : 1
    const enforced = r.enforcerId !== null
    const spec = r.specialization ? c.rackets.specialization[r.specialization] : null
    const spec6 = r.specialization6 ? c.rackets.specialization6[r.specialization6] : null
    const share = kind === 'joint' && sells ? (rt.cigaretteShare ?? 0) : 0
    const pShare = kind === 'joint' && premiumOn ? (rt.premiumShare ?? 0) : 0
    const pServed = pDemand > 0 ? premiumServedAll : 1
    const prosperityMult = kind === 'joint' && prospering ? prosperityYieldMult(c, prosperityOf(r.districtId)) : 1
    const oy = politics ? rt.opinionYield : undefined
    const opinionMult = oy ? oy[0] + ((oy[1] - oy[0]) * opinion) / 100 : 1
    const closed = r.closedUntil !== undefined
    const fullYield =
      kind === 'premises'
        ? 0
        : F.tierYield(c, r.type, r.tier) *
          cond *
          districtMult *
          inspectionMult *
          (enforced ? c.rackets.enforcer.yieldMult : 1) *
          (spec?.yieldMult ?? 1) *
          (spec6?.yieldMult ?? 1) *
          prosperityMult *
          opinionMult *
          fx.yieldMult
    const grossYield = fullYield * (1 - share - pShare + share * served[i] + pShare * pServed)
    // A legal business (ADR 0045) earns Clean directly, pays no tribute and draws no heat.
    const legal = r.legal === true
    const tributeRate = legal || ours || mayor || controller === 'none' ? 0 : district.tribute
    const tribute = grossYield * tributeRate
    return {
      id: r.id,
      kind,
      yield: legal ? 0 : grossYield - tribute,
      grossYield,
      legal,
      legalClean: legal ? grossYield * c.legalize.cleanShare * holdingMult : 0,
      tribute,
      exposure: closed || legal
        ? 0
        : F.tierHeat(c, r.type, r.tier) * (enforced ? c.rackets.enforcer.heatMult : 1) * (spec?.exposureMult ?? 1) * (spec6?.exposureMult ?? 1),
      conditionMult: cond,
      districtMult,
      prosperityMult,
      opinionMult,
      closed,
      synergyMult: fx.yieldMult,
      upkeep: kind === 'premises' ? F.premisesUpkeep(c, r.type, r.tier) * fx.upkeepMult : 0,
      packsPerHr: kind === 'joint' ? demand : made,
      served: served[i],
      atStake: fullYield * share,
      premiumPacksPerHr: pDemand,
      premiumServed: pServed,
      premiumAtStake: fullYield * pShare,
      capacity,
      leashHours: leash,
      shield: 0, // set below, once total yield is known
      influence: (rt.influencePerHrPerTier ?? 0) * r.tier * cond * fx.influenceMult,
      upgradeCost: r.tier < F.racketMaxTier(c, r.type, state.act) ? F.racketUpgradeCost(c, r.type, r.tier) : null,
      repairCost: F.racketRepairCost(c, r.type),
    }
  })

  const premiumSold = state.premiumEmpty ? Math.min(premiumDemand, premiumMade) : premiumDemand
  const perFront: FrontDerived[] = state.fronts.map((f) => {
    // An importer only washes what its premium trade would explain (ADR 0043).
    const cover = c.fronts.types[f.type].coverPerPremiumPack
    // A front the Ministry has frozen launders nothing until it thaws (ADR 0044).
    const frozen = f.frozenUntil !== undefined
    const throughput = frozen ? 0 : cover === undefined ? F.frontThroughput(c, f) : Math.min(F.frontThroughput(c, f), premiumSold * cover)
    return {
      id: f.id,
      type: f.type,
      mode: f.mode,
      rate: F.frontRate(c, f.type, f.level),
      throughput,
      frozen,
      baseThroughput: F.frontBaseThroughput(c, f),
      bufferCap: F.frontBufferCap(c, f),
      util: f.util,
      suspicion: F.frontSuspicion(c, f, f.util),
      upgradeCost: f.level < c.fronts.upgrade.levels ? F.frontUpgradeCost(c, f.type, f.level) : null,
      capacityLevel: f.capacityLevel,
      capacityUpgradeCost:
        f.capacityLevel < c.fronts.upgrade.capacity.levels ? F.frontCapacityUpgradeCost(c, f.type, f.capacityLevel) : null,
      hoursToEmpty: throughput > 0 ? f.buffer / throughput : Infinity,
    }
  })

  const yieldPerHr = sum(perRacket.map((r) => r.yield))
  // Stash houses hide part of a raid, in proportion to how much of the yield runs in their district (ADR 0037).
  const districtYield = (id: DistrictId) =>
    sum(perRacket.map((rd, i) => (rd.kind !== 'premises' && state.rackets[i].districtId === id ? rd.yield : 0)))
  base.forEach((b, i) => {
    if (b.shieldRaw > 0 && yieldPerHr > 0) perRacket[i].shield = (b.shieldRaw * districtYield(b.r.districtId)) / yieldPerHr
  })
  const raidShield = Math.min(c.rackets.premises.maxShield, sum(perRacket.map((rd) => rd.shield)))
  const stashHours = Math.max(0, ...perRacket.map((rd) => rd.leashHours))
  const racketExposure = sum(perRacket.map((r) => r.exposure))
  const frontSuspicion = sum(perFront.map((f) => f.suspicion))
  const exposure = racketExposure + frontSuspicion

  const taken = state.districts.filter((d) => d.controller === 'player' && !c.districts.list[d.id].home).length
  const controlParts = {
    base: c.heat.baseControl,
    officials: sum(state.officials.map((id) => c.officials.list[id].control)),
    bribe: state.bribeControl,
    districtMult: 1 + c.heat.districtControlPct * taken,
    mayor: mayor ? c.elections.mayor.control : 0,
    opinionMult: politics ? 1 + (c.opinion.controlBonus * opinion) / 100 : 1,
  }
  const control =
    (controlParts.base + controlParts.officials + controlParts.bribe + controlParts.mayor) * controlParts.districtMult * controlParts.opinionMult

  const wageMult = state.districts
    .filter((d) => d.controller === 'player')
    .reduce((m, d) => m * (c.districts.list[d.id].mod.wageMult ?? 1), 1)

  return {
    yieldPerHr,
    tributePerHr: sum(perRacket.map((r) => r.tribute)),
    legalCleanPerHr: sum(perRacket.map((r) => r.legalClean)),
    legalGrossPerHr: sum(perRacket.map((r) => (r.legal ? r.grossYield : 0))),
    holdingMult,
    vaultCap: F.vaultCap(c, yieldPerHr, state.act, stashHours),
    vaultCapBase: F.vaultCap(c, yieldPerHr, state.act),
    stashHours,
    raidShield,
    cityProsperity: cityProsperity(state, c),
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
    influencePerHr: state.officials.length * c.officials.influencePerHrEach + sum(perRacket.map((rd) => rd.influence)),
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
    premium: {
      madePerHr: premiumMade,
      demandPerHr: premiumDemand,
      soldPerHr: premiumSold,
      cap: premiumCap,
      stock: state.inventory.premium,
      hoursToEmpty: premiumDemand > premiumMade ? Math.max(0, state.inventory.premium) / (premiumDemand - premiumMade) : Infinity,
      hoursToFull: premiumMade > premiumDemand ? Math.max(0, premiumCap - state.inventory.premium) / (premiumMade - premiumDemand) : Infinity,
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
      front: mapKeys(FRONT_TYPES, (t) => c.fronts.types[t].act <= state.act && state.reputation >= c.fronts.types[t].unlockRep),
      district: mapKeys(DISTRICT_IDS, (id) => c.districts.list[id].act <= state.act),
      official: mapKeys(OFFICIAL_IDS, (id) => c.officials.list[id].act <= state.act && (!c.officials.list[id].needsMayor || state.politics.mayor)),
    },
  }
}
