// Config types and structural validation.
// Validation rejects configs that are *wrong* (rate > 1, thresholds out of order,
// negative durations, unknown keys). It does not reject badly tuned ones — that's
// what the sim is for (dev manual §2).

export type Act = 1 | 2
export const ACTS: readonly Act[] = [1, 2]

export type RacketType = 'kiosk' | 'marketStall' | 'autoShop' | 'cafe' | 'bathhouse' | 'petrol' | 'cargoBay'
export const RACKET_TYPES: readonly RacketType[] = [
  'kiosk', 'marketStall', 'autoShop', 'cafe', 'bathhouse', 'petrol', 'cargoBay',
]

export type FrontType = 'currencyKiosk' | 'restaurant'
export const FRONT_TYPES: readonly FrontType[] = ['currencyKiosk', 'restaurant']

export type OfficialId = 'wardCop' | 'precinctCaptain'
export const OFFICIAL_IDS: readonly OfficialId[] = ['wardCop', 'precinctCaptain']

export type OpType = 'shakeDown' | 'collectDebt' | 'leanOnWard' | 'pressure' | 'moveShipment' | 'dinner'
export const OP_TYPES: readonly OpType[] = [
  'shakeDown', 'collectDebt', 'leanOnWard', 'pressure', 'moveShipment', 'dinner',
]

export type DistrictId = 'zarechye' | 'kioskRow' | 'portQuarter' | 'sovietsky'
export const DISTRICT_IDS: readonly DistrictId[] = ['zarechye', 'kioskRow', 'portQuarter', 'sovietsky']

export type Stat = 'muscle' | 'brains' | 'nerve'
export const STATS: readonly Stat[] = ['muscle', 'brains', 'nerve']

export type TraitId = 'exArmy' | 'gambler' | 'alcoholic'
export const TRAIT_IDS: readonly TraitId[] = ['exArmy', 'gambler', 'alcoholic']

export type Controller = 'player' | 'tolya' | 'zhanna' | 'none'
export type OpBand = 'quick' | 'standard' | 'long'

export type RacketTypeConfig = {
  name: string
  act: Act
  baseYield: number // dirty/hr at tier 1
  baseHeat: number // exposure at tier 1
  unlockRep: number
}

export type FrontTypeConfig = {
  name: string
  rate: number // clean out per dirty in
  throughput: number // dirty/hr
  unlockRep: number
  cost: number // clean
}

export type OfficialConfig = { name: string; control: number; cost: number; act: Act }

export type OpConfig = {
  name: string
  band: OpBand
  minutes: number
  crew: number
  w: Partial<Record<Stat, number>>
  diff: number
  spike: number
  dirty?: number
  influence?: number
  districtPressure?: boolean
  act?: Act
}

export type DistrictConfig = {
  name: string
  act: Act
  startsAs: Controller
  home?: boolean // starting turf: never bought, no control bonus
  slots: number
  allows: RacketType[] // the kinds of business this district can host
  buyout: number
  tribute: number // fraction of racket yield paid to the controller while not yours
  mod: {
    yieldMult?: Partial<Record<RacketType, number>> // rackets in this district, once you control it
    wageMult?: number // all crew wages, once you control it
  }
}

export type CrewSeed = {
  name: string
  muscle: number
  brains: number
  nerve: number
  loyalty: number
  traits?: TraitId[]
  nephew?: boolean
}

export type Config = {
  meta: { name: string; version: number }
  time: { maxOfflineHours: number; hourMs: number }
  vault: {
    floorCap: number
    targetHoursByAct: Record<Act, number>
    startingDirty: number
    startingClean: number
    startingInfluence: number
  }
  rackets: {
    tierYieldMult: number
    tierHeatMult: number
    maxTierByAct: Record<Act, number>
    conditionDecayPerDay: number
    conditionRepairPct: number
    enforcer: { yieldMult: number; heatMult: number }
    types: Record<RacketType, RacketTypeConfig>
    starting: { type: RacketType; districtId: DistrictId }[]
  }
  costs: {
    paybackHoursByAct: Record<Act, number>
    upgradeBaseFactor: number
    upgradeTierMult: number
    overrides: Partial<Record<RacketType, { purchase?: number }>>
  }
  fronts: {
    suspicionStartUtil: number
    suspicionFactor: number
    bufferHours: number
    upgrade: { rateStep: number; levels: number; costPctOfUnlock: number; minCostBasis: number }
    types: Record<FrontType, FrontTypeConfig>
  }
  heat: {
    baseControl: number
    convergePerHr: number
    startHeat: number
    inspectThreshold: number
    inspectYieldMult: number
    raidThreshold: number
    raidChancePerHr: number
    raidSeizePct: number
    arrestThreshold: number
    arrestChancePerHr: number
    arrestHours: number
    bribe: { controlPct: number; hours: number; costPerExposure: number }
    districtControlPct: number
  }
  officials: {
    cooldownDays: number
    influencePerHrEach: number
    list: Record<OfficialId, OfficialConfig>
  }
  crew: {
    slotsByAct: Record<Act, number>
    extraSlotCostPctOfBudget: number
    extraSlotMinCost: number
    extraSlotMax: number
    recruitCostPerAct: number
    poolSize: number
    poolRefreshHours: number
    statBandByAct: Record<Act, [number, number]>
    recruitLoyalty: number
    traitChance: number
    wageDivisor: number
    loyalty: {
      driftPerDay: number
      perOpSuccess: number
      perRaise: number
      perMissedWageDay: number
      lowThreshold: number
      lowEventChancePerDay: number
      walkoutStealPct: number
    }
    raiseCostPerAct: number
    traits: {
      exArmy: { muscleBonus: number }
      gambler: { nerveBonus: number; wageMult: number }
      alcoholic: { randomPenalty: number; wageMult: number }
    }
    starting: CrewSeed[]
  }
  ops: {
    fullMargin: number
    partialRewardPct: number
    partialSpikePct: number
    failSpikePct: number
    failLoyalty: number
    noise: number
    teamBonusPerExtra: number
    influenceDailyCap: number
    rewardActScaling: number
    list: Record<OpType, OpConfig>
  }
  districts: {
    pressureOpsToFlip: number
    list: Record<DistrictId, DistrictConfig>
  }
  rivals: {
    tolya: {
      tickHours: number
      tickHoursEscalated: number
      escalateAtRackets: number
      pConditionHit: number
      conditionHit: number
      pTribute: number
      tributePctOfVault: number
      refuseConditionHit: number
      dispositionPerTribute: number
      dispositionPerPressure: number
      dispositionOnBuyout: number
      dispositionOnFlip: number
      hostileBelow: number
      hostileTickMult: number
    }
  }
  reputation: {
    perCleanSpent: number
    perOpSuccess: number
    perDistrict: number
    actThresholds: { 2: number; 3: number }
  }
  tutorial: { enabled: boolean; firstConversionInstant: boolean }
  debug: { enabled: boolean }
}

// ---------------------------------------------------------------------------
// Validation

type Check = (errors: string[]) => void

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function num(errors: string[], path: string, v: unknown, test: (n: number) => boolean, rule: string) {
  if (!isNum(v)) errors.push(`${path}: expected a number, got ${JSON.stringify(v)}`)
  else if (!test(v)) errors.push(`${path}: ${v} must be ${rule}`)
}

const positive = (e: string[], p: string, v: unknown) => num(e, p, v, (n) => n > 0, '> 0')
const nonNeg = (e: string[], p: string, v: unknown) => num(e, p, v, (n) => n >= 0, '>= 0')
const unit = (e: string[], p: string, v: unknown) => num(e, p, v, (n) => n >= 0 && n <= 1, 'in [0, 1]')
const rate = (e: string[], p: string, v: unknown) => num(e, p, v, (n) => n > 0 && n <= 1, 'in (0, 1]')
const int = (e: string[], p: string, v: unknown, min = 0) =>
  num(e, p, v, (n) => Number.isInteger(n) && n >= min, `an integer >= ${min}`)

export function validateConfig(c: Config): string[] {
  const e: string[] = []
  const checks: Check[] = [
    (e) => {
      num(e, 'time.hourMs', c.time.hourMs, (n) => Number.isInteger(n) && n >= 1000, 'an integer >= 1000')
      positive(e, 'time.maxOfflineHours', c.time.maxOfflineHours)
    },
    (e) => {
      nonNeg(e, 'vault.floorCap', c.vault.floorCap)
      for (const a of ACTS) positive(e, `vault.targetHoursByAct.${a}`, c.vault.targetHoursByAct[a])
      nonNeg(e, 'vault.startingDirty', c.vault.startingDirty)
      nonNeg(e, 'vault.startingClean', c.vault.startingClean)
      nonNeg(e, 'vault.startingInfluence', c.vault.startingInfluence)
    },
    (e) => {
      const r = c.rackets
      num(e, 'rackets.tierYieldMult', r.tierYieldMult, (n) => n >= 1, '>= 1')
      num(e, 'rackets.tierHeatMult', r.tierHeatMult, (n) => n >= 1, '>= 1')
      for (const a of ACTS) int(e, `rackets.maxTierByAct.${a}`, r.maxTierByAct[a], 1)
      nonNeg(e, 'rackets.conditionDecayPerDay', r.conditionDecayPerDay)
      nonNeg(e, 'rackets.conditionRepairPct', r.conditionRepairPct)
      positive(e, 'rackets.enforcer.yieldMult', r.enforcer.yieldMult)
      positive(e, 'rackets.enforcer.heatMult', r.enforcer.heatMult)
      for (const t of RACKET_TYPES) {
        const rt = r.types[t]
        if (!rt) { e.push(`rackets.types.${t}: missing`); continue }
        positive(e, `rackets.types.${t}.baseYield`, rt.baseYield)
        nonNeg(e, `rackets.types.${t}.baseHeat`, rt.baseHeat)
        nonNeg(e, `rackets.types.${t}.unlockRep`, rt.unlockRep)
      }
    },
    (e) => {
      for (const a of ACTS) positive(e, `costs.paybackHoursByAct.${a}`, c.costs.paybackHoursByAct[a])
      positive(e, 'costs.upgradeBaseFactor', c.costs.upgradeBaseFactor)
      num(e, 'costs.upgradeTierMult', c.costs.upgradeTierMult, (n) => n >= 1, '>= 1')
      for (const [k, o] of Object.entries(c.costs.overrides ?? {})) {
        if (!RACKET_TYPES.includes(k as RacketType)) e.push(`costs.overrides.${k}: unknown racket type`)
        if (o?.purchase !== undefined) positive(e, `costs.overrides.${k}.purchase`, o.purchase)
      }
    },
    (e) => {
      const f = c.fronts
      num(e, 'fronts.suspicionStartUtil', f.suspicionStartUtil, (n) => n >= 0 && n < 1, 'in [0, 1)')
      nonNeg(e, 'fronts.suspicionFactor', f.suspicionFactor)
      positive(e, 'fronts.bufferHours', f.bufferHours)
      nonNeg(e, 'fronts.upgrade.rateStep', f.upgrade.rateStep)
      int(e, 'fronts.upgrade.levels', f.upgrade.levels, 0)
      nonNeg(e, 'fronts.upgrade.costPctOfUnlock', f.upgrade.costPctOfUnlock)
      nonNeg(e, 'fronts.upgrade.minCostBasis', f.upgrade.minCostBasis)
      for (const t of FRONT_TYPES) {
        const ft = f.types[t]
        rate(e, `fronts.types.${t}.rate`, ft.rate)
        num(e, `fronts.types.${t}.rate (max level)`, ft.rate + f.upgrade.rateStep * f.upgrade.levels,
          (n) => n <= 1, '<= 1 at max upgrade level')
        positive(e, `fronts.types.${t}.throughput`, ft.throughput)
        nonNeg(e, `fronts.types.${t}.unlockRep`, ft.unlockRep)
        nonNeg(e, `fronts.types.${t}.cost`, ft.cost)
      }
    },
    (e) => {
      const h = c.heat
      nonNeg(e, 'heat.baseControl', h.baseControl)
      num(e, 'heat.convergePerHr', h.convergePerHr, (n) => n > 0 && n < 1, 'in (0, 1)')
      num(e, 'heat.startHeat', h.startHeat, (n) => n >= 0 && n <= 100, 'in [0, 100]')
      num(e, 'heat.inspectThreshold', h.inspectThreshold, (n) => n > 0 && n < h.raidThreshold, '> 0 and < raidThreshold')
      num(e, 'heat.raidThreshold', h.raidThreshold, (n) => n < h.arrestThreshold, '< arrestThreshold')
      num(e, 'heat.arrestThreshold', h.arrestThreshold, (n) => n <= 100, '<= 100')
      rate(e, 'heat.inspectYieldMult', h.inspectYieldMult)
      unit(e, 'heat.raidChancePerHr', h.raidChancePerHr)
      unit(e, 'heat.raidSeizePct', h.raidSeizePct)
      unit(e, 'heat.arrestChancePerHr', h.arrestChancePerHr)
      positive(e, 'heat.arrestHours', h.arrestHours)
      unit(e, 'heat.bribe.controlPct', h.bribe.controlPct)
      positive(e, 'heat.bribe.hours', h.bribe.hours)
      nonNeg(e, 'heat.bribe.costPerExposure', h.bribe.costPerExposure)
      nonNeg(e, 'heat.districtControlPct', h.districtControlPct)
    },
    (e) => {
      nonNeg(e, 'officials.cooldownDays', c.officials.cooldownDays)
      nonNeg(e, 'officials.influencePerHrEach', c.officials.influencePerHrEach)
      for (const id of OFFICIAL_IDS) {
        nonNeg(e, `officials.list.${id}.control`, c.officials.list[id].control)
        nonNeg(e, `officials.list.${id}.cost`, c.officials.list[id].cost)
      }
    },
    (e) => {
      const cr = c.crew
      for (const a of ACTS) {
        int(e, `crew.slotsByAct.${a}`, cr.slotsByAct[a], 1)
        const [lo, hi] = cr.statBandByAct[a] ?? []
        num(e, `crew.statBandByAct.${a}`, lo, (n) => isNum(hi) && n >= 0 && n <= hi, '[lo, hi] with 0 <= lo <= hi')
      }
      if (cr.slotsByAct[2] < cr.slotsByAct[1]) e.push('crew.slotsByAct: act 2 must not have fewer slots than act 1')
      unit(e, 'crew.extraSlotCostPctOfBudget', cr.extraSlotCostPctOfBudget)
      nonNeg(e, 'crew.extraSlotMinCost', cr.extraSlotMinCost)
      int(e, 'crew.extraSlotMax', cr.extraSlotMax, 0)
      nonNeg(e, 'crew.recruitCostPerAct', cr.recruitCostPerAct)
      int(e, 'crew.poolSize', cr.poolSize, 1)
      positive(e, 'crew.poolRefreshHours', cr.poolRefreshHours)
      num(e, 'crew.recruitLoyalty', cr.recruitLoyalty, (n) => n >= 0 && n <= 100, 'in [0, 100]')
      unit(e, 'crew.traitChance', cr.traitChance)
      positive(e, 'crew.wageDivisor', cr.wageDivisor)
      num(e, 'crew.loyalty.lowThreshold', cr.loyalty.lowThreshold, (n) => n >= 0 && n <= 100, 'in [0, 100]')
      unit(e, 'crew.loyalty.lowEventChancePerDay', cr.loyalty.lowEventChancePerDay)
      unit(e, 'crew.loyalty.walkoutStealPct', cr.loyalty.walkoutStealPct)
      nonNeg(e, 'crew.raiseCostPerAct', cr.raiseCostPerAct)
      positive(e, 'crew.traits.gambler.wageMult', cr.traits.gambler.wageMult)
      positive(e, 'crew.traits.alcoholic.wageMult', cr.traits.alcoholic.wageMult)
      nonNeg(e, 'crew.traits.alcoholic.randomPenalty', cr.traits.alcoholic.randomPenalty)
      if (cr.starting.length > cr.slotsByAct[1]) e.push('crew.starting: more starting crew than act 1 slots')
    },
    (e) => {
      const o = c.ops
      nonNeg(e, 'ops.fullMargin', o.fullMargin)
      rate(e, 'ops.partialRewardPct', o.partialRewardPct)
      nonNeg(e, 'ops.partialSpikePct', o.partialSpikePct)
      nonNeg(e, 'ops.failSpikePct', o.failSpikePct)
      nonNeg(e, 'ops.noise', o.noise)
      nonNeg(e, 'ops.teamBonusPerExtra', o.teamBonusPerExtra)
      nonNeg(e, 'ops.influenceDailyCap', o.influenceDailyCap)
      nonNeg(e, 'ops.rewardActScaling', o.rewardActScaling)
      for (const t of OP_TYPES) {
        const op = o.list[t]
        if (!op) { e.push(`ops.list.${t}: missing`); continue }
        positive(e, `ops.list.${t}.minutes`, op.minutes)
        int(e, `ops.list.${t}.crew`, op.crew, 1)
        nonNeg(e, `ops.list.${t}.diff`, op.diff)
        nonNeg(e, `ops.list.${t}.spike`, op.spike)
        const wSum = STATS.reduce((s, k) => s + (op.w[k] ?? 0), 0)
        num(e, `ops.list.${t}.w (sum)`, wSum, (n) => n > 0, '> 0')
        for (const k of Object.keys(op.w)) {
          if (!STATS.includes(k as Stat)) e.push(`ops.list.${t}.w.${k}: unknown stat`)
        }
      }
    },
    (e) => {
      int(e, 'districts.pressureOpsToFlip', c.districts.pressureOpsToFlip, 1)
      for (const id of DISTRICT_IDS) {
        const d = c.districts.list[id]
        int(e, `districts.list.${id}.slots`, d.slots, 0)
        if (!Array.isArray(d.allows) || d.allows.length === 0) e.push(`districts.list.${id}.allows: list at least one racket type`)
        else for (const t of d.allows) if (!RACKET_TYPES.includes(t)) e.push(`districts.list.${id}.allows: unknown racket type ${t}`)
        nonNeg(e, `districts.list.${id}.buyout`, d.buyout)
        num(e, `districts.list.${id}.tribute`, d.tribute, (n) => n >= 0 && n < 1, 'in [0, 1)')
      }
    },
    (e) => {
      const t = c.rivals.tolya
      positive(e, 'rivals.tolya.tickHours', t.tickHours)
      positive(e, 'rivals.tolya.tickHoursEscalated', t.tickHoursEscalated)
      unit(e, 'rivals.tolya.pConditionHit', t.pConditionHit)
      unit(e, 'rivals.tolya.pTribute', t.pTribute)
      num(e, 'rivals.tolya.pConditionHit + pTribute', t.pConditionHit + t.pTribute, (n) => n <= 1, '<= 1')
      unit(e, 'rivals.tolya.tributePctOfVault', t.tributePctOfVault)
      positive(e, 'rivals.tolya.hostileTickMult', t.hostileTickMult)
    },
    (e) => {
      const r = c.reputation
      nonNeg(e, 'reputation.perCleanSpent', r.perCleanSpent)
      positive(e, 'reputation.actThresholds.2', r.actThresholds[2])
      num(e, 'reputation.actThresholds.3', r.actThresholds[3], (n) => n > r.actThresholds[2], '> actThresholds.2')
    },
  ]
  for (const check of checks) {
    try {
      check(e)
    } catch (err) {
      e.push(`structure: ${(err as Error).message}`)
    }
  }
  return e
}

// Keys under these paths are open maps: a preset may add entries the defaults don't have.
const OPEN_PATHS = [/^costs\.overrides$/, /^ops\.list\.[^.]+$/, /^ops\.list\.[^.]+\.w$/, /^districts\.list\.[^.]+\.mod(\..+)?$/]

// Every key in `overlay` must exist in `base` (outside open maps). Catches preset typos.
export function unknownKeys(base: unknown, overlay: unknown, path = ''): string[] {
  if (!isObject(overlay) || !isObject(base)) return []
  const errors: string[] = []
  const open = OPEN_PATHS.some((re) => re.test(path))
  for (const key of Object.keys(overlay)) {
    const p = path ? `${path}.${key}` : key
    if (!(key in base)) {
      if (!open) errors.push(`${p}: unknown config key`)
      continue
    }
    errors.push(...unknownKeys(base[key], overlay[key], p))
  }
  return errors
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
