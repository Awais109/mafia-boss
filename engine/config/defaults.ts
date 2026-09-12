import type { Config } from './schema'

// Source of truth for every number in the game. Presets in ./presets are partial
// overrides of this object; the in-app editor writes user overrides on top.
// Section refs: "plan" = docs/sevgorod-implementation-plan.md, "manual" = docs/sevgorod-dev-manual.md.
// Any change here goes through the tuning loop (manual §1) and a line in TUNING.md.

export const defaults: Config = {
  meta: { name: 'default', version: 1 },

  time: {
    maxOfflineHours: 72, // an idle game shouldn't reward a 3-week absence (plan §6)
    hourMs: 3_600_000, // 'fast' preset: 60_000 (1 game hour = 1 real minute)
  },

  vault: {
    floorCap: 40, // vault cap never drops below this
    targetHoursByAct: { 1: 2.5, 2: 5.5 }, // vault cap = yield × this — the session leash (manual §4 Cadence)
    startingDirty: 30, // sits in the vault at launch; first conversion is instant (spec §3.2)
    startingClean: 60, // enough that the tutorial's first purchase lands in the first session
    startingInfluence: 1,
  },

  rackets: {
    tierYieldMult: 1.2, // spec §7.1 — must stay below tierHeatMult (manual §5)
    tierHeatMult: 1.35,
    maxTierByAct: { 1: 5, 2: 5 },
    conditionDecayPerDay: 2,
    conditionRepairPct: 0.1, // repair = 10% of purchase price, paid in Dirty
    enforcer: { yieldMult: 1.3, heatMult: 0.7 }, // "strictly worth it below tier 4"
    types: {
      kiosk: { name: 'Kiosk', act: 1, baseYield: 6, baseHeat: 0.8, unlockRep: 0 },
      marketStall: { name: 'Market Stall', act: 1, baseYield: 10, baseHeat: 1.3, unlockRep: 0 },
      autoShop: { name: 'Auto Shop', act: 2, baseYield: 18, baseHeat: 2.5, unlockRep: 150 },
      cafe: { name: 'Café', act: 2, baseYield: 14, baseHeat: 1.8, unlockRep: 250 },
      bathhouse: { name: 'Bathhouse', act: 2, baseYield: 24, baseHeat: 3.2, unlockRep: 400 },
      petrol: { name: 'Petrol Station', act: 2, baseYield: 34, baseHeat: 4.5, unlockRep: 600 },
      cargoBay: { name: 'Cargo Bay', act: 2, baseYield: 55, baseHeat: 8.0, unlockRep: 850 },
    },
    // 16 Dirty/hr: exactly fills the 40 floor cap in the Act I vault target of 2.5 h.
    starting: [
      { type: 'kiosk', districtId: 'zarechye' },
      { type: 'marketStall', districtId: 'zarechye' },
    ],
  },

  costs: {
    // spec §6.2: purchase = baseYield × payback hours for the racket's act
    paybackHoursByAct: { 1: 12, 2: 18 },
    upgradeBaseFactor: 0.5, // upgrade from tier t = purchase × 0.5 × upgradeTierMult^(t−1)
    upgradeTierMult: 1.4,
    overrides: {}, // { kiosk: { purchase: 40 } } — wins over the formula
  },

  fronts: {
    suspicionStartUtil: 0.7, // utilization above this adds exposure
    suspicionFactor: 0.3, // suspicion = factor × throughput × (util − start)
    bufferHours: 10, // buffer cap = throughput × this
    upgrade: {
      rateStep: 0.03, // +rate per level
      levels: 3,
      costPctOfUnlock: 0.4, // level L costs basis × pct × L
      minCostBasis: 100, // basis for fronts whose unlock cost is below this (the free Currency Kiosk)
    },
    types: {
      currencyKiosk: { name: 'Currency Kiosk', rate: 0.55, throughput: 25, unlockRep: 0, cost: 0 },
      restaurant: { name: 'Restaurant', rate: 0.65, throughput: 185, unlockRep: 80, cost: 60 },
    },
  },

  heat: {
    baseControl: 8, // strongest early-game heat knob (manual §4 Heat)
    convergePerHr: 0.1, // 10% of the gap per hour
    startHeat: 20,
    inspectThreshold: 40,
    inspectYieldMult: 0.85,
    raidThreshold: 65,
    raidChancePerHr: 0.1,
    raidSeizePct: 0.3, // of the vault only
    arrestThreshold: 85,
    arrestChancePerHr: 0.15,
    arrestHours: 12,
    bribe: { controlPct: 0.5, hours: 6, costPerExposure: 3 }, // cost in Dirty
    districtControlPct: 0.05, // control × (1 + this × districts you took)
  },

  officials: {
    cooldownDays: 3, // between any two official purchases
    influencePerHrEach: 1 / 8,
    list: {
      wardCop: { name: 'Ward Cop', control: 6, cost: 4, act: 1 },
      precinctCaptain: { name: 'Precinct Captain', control: 140, cost: 12, act: 2 },
    },
  },

  crew: {
    slotsByAct: { 1: 2, 2: 4 },
    extraSlotCostPctOfBudget: 0.05, // of lifetime Clean earned
    extraSlotMinCost: 150,
    extraSlotMax: 2,
    recruitCostPerAct: 50, // Clean × act
    poolSize: 3,
    poolRefreshHours: 24,
    statBandByAct: { 1: [25, 50], 2: [35, 60] },
    recruitLoyalty: 50,
    traitChance: 0.35,
    wageDivisor: 60, // wage/hr = (M + B + N) / 60
    loyalty: {
      driftPerDay: -2,
      perOpSuccess: 5,
      perRaise: 10,
      perMissedWageDay: -15,
      lowThreshold: 25,
      lowEventChancePerDay: 0.1, // below lowThreshold: chance per day they walk out
      walkoutStealPct: 0.1, // ...taking this share of your Dirty with them
    },
    raiseCostPerAct: 20, // Clean × act
    traits: {
      exArmy: { muscleBonus: 15 },
      gambler: { nerveBonus: 10, wageMult: 1.5 },
      alcoholic: { randomPenalty: 20, wageMult: 0.6 }, // cheap, unreliable: −U(0, 20) on every op
    },
    starting: [
      { name: 'Vitya', muscle: 48, brains: 30, nerve: 42, loyalty: 70 },
      { name: 'Dima', muscle: 30, brains: 50, nerve: 38, loyalty: 70, nephew: true },
    ],
  },

  ops: {
    // score = Σ w·(best stat on team) + teamBonus·(crew−1) + U(−noise, noise)
    // full: score ≥ diff + fullMargin · partial: score ≥ diff · else fail
    fullMargin: 15,
    partialRewardPct: 0.6,
    partialSpikePct: 0.5, // partial = backed off early: 60% reward, 50% noise
    failSpikePct: 1.5,
    failLoyalty: -5,
    noise: 10,
    teamBonusPerExtra: 5,
    influenceDailyCap: 3, // Influence from ops per game day
    rewardActScaling: 2, // Dirty reward × act^2
    list: {
      shakeDown: { name: 'Shake Down', band: 'quick', minutes: 15, crew: 1, w: { muscle: 0.7, nerve: 0.3 }, diff: 35, spike: 2, dirty: 15 },
      collectDebt: { name: 'Collect a Debt', band: 'quick', minutes: 20, crew: 1, w: { nerve: 0.6, brains: 0.4 }, diff: 40, spike: 1, dirty: 20 },
      leanOnWard: { name: 'Lean on the Ward', band: 'standard', minutes: 120, crew: 2, w: { brains: 0.5, nerve: 0.5 }, diff: 45, spike: 3, influence: 1 },
      pressure: { name: 'Pressure a District', band: 'standard', minutes: 60, crew: 2, w: { muscle: 0.6, nerve: 0.4 }, diff: 45, spike: 4, dirty: 10, districtPressure: true },
      moveShipment: { name: 'Move a Shipment', band: 'standard', minutes: 180, crew: 2, w: { nerve: 0.5, brains: 0.5 }, diff: 50, spike: 2, dirty: 30, act: 2 },
      dinner: { name: 'Dinner with Officials', band: 'long', minutes: 360, crew: 2, w: { brains: 0.7, nerve: 0.3 }, diff: 55, spike: 1, influence: 2 },
    },
  },

  districts: {
    pressureOpsToFlip: 3,
    // Each district hosts its own kind of business, so slots shape the portfolio:
    // 2 + 2 street rackets in Act I, then the port and the blocks in Act II.
    list: {
      zarechye: { name: 'Zarechye', act: 1, startsAs: 'player', home: true, slots: 2, allows: ['kiosk', 'marketStall'], buyout: 0, tribute: 0, mod: {} },
      kioskRow: { name: 'Kiosk Row', act: 1, startsAs: 'tolya', slots: 2, allows: ['kiosk', 'marketStall'], buyout: 150, tribute: 0.15, mod: { yieldMult: { kiosk: 1.1, marketStall: 1.1 } } },
      portQuarter: { name: 'Port Quarter', act: 2, startsAs: 'zhanna', slots: 2, allows: ['petrol', 'cargoBay'], buyout: 300, tribute: 0.15, mod: {} },
      sovietsky: { name: 'Sovietsky Blocks', act: 2, startsAs: 'none', slots: 3, allows: ['autoShop', 'cafe', 'bathhouse'], buyout: 300, tribute: 0, mod: { wageMult: 0.9 } },
    },
  },

  rivals: {
    tolya: {
      tickHours: 8,
      tickHoursEscalated: 6, // once you own escalateAtRackets rackets
      escalateAtRackets: 3,
      pConditionHit: 0.4,
      conditionHit: 15,
      pTribute: 0.3, // remainder: nothing happens
      tributePctOfVault: 0.1, // of vault cap at tick time
      refuseConditionHit: 10, // unpaid demand at the next tick
      dispositionPerTribute: 10, // +paid / −refused
      dispositionPerPressure: -5,
      dispositionOnBuyout: -10,
      dispositionOnFlip: -25,
      hostileBelow: -30,
      hostileTickMult: 0.5,
    },
  },

  reputation: {
    perCleanSpent: 0.1,
    perOpSuccess: 5, // partial success earns partialRewardPct of this
    perDistrict: 20,
    actThresholds: { 2: 80, 3: 1000 }, // 3 = Act II cleared (Act III is stubbed)
  },

  tutorial: { enabled: true, firstConversionInstant: true },

  debug: { enabled: true },
}
