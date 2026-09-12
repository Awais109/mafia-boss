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
    // The upgrade to tier 3 is a choice (ADR 0027). Stealth at 0.8 keeps T3 hotter than T2 (0.8 × 1.35² > 1.35).
    specialization: {
      atTier: 3,
      greed: { yieldMult: 1.25, exposureMult: 1.6 },
      stealth: { yieldMult: 1.0, exposureMult: 0.8 },
    },
    // Premises (ADR 0031) tier up to maxTier in any act; a missed upkeep day knocks this off each one.
    premises: { maxTier: 5, missedUpkeepConditionHit: 20 },
    // Side-by-side bonuses, evaluated per district (plan (m)).
    synergies: [
      { id: 'factoryJoints', a: 'tobaccoFactory', b: 'joints', effect: { yieldMult: 1.15, servedFirst: true } },
      { id: 'warehouseFactory', a: 'warehouse', b: 'tobaccoFactory', effect: { upkeepMultOf: { warehouse: 0.5 } } },
    ],
    types: {
      // Joints: cigaretteShare of the yield needs stock (ADR 0032). Purchase = yield × payback hours.
      kiosk: { name: 'Kiosk', act: 1, kind: 'joint', baseYield: 6, baseHeat: 0.8, unlockRep: 0, sellsPerHr: 0.5, cigaretteShare: 0.7 },
      marketStall: { name: 'Market Stall', act: 1, kind: 'joint', baseYield: 10, baseHeat: 1.3, unlockRep: 0, sellsPerHr: 0.8, cigaretteShare: 0.5 },
      beerTent: { name: 'Beer Tent', act: 1, kind: 'joint', baseYield: 8, baseHeat: 1.0, unlockRep: 15, sellsPerHr: 0.6, cigaretteShare: 0.4 },
      videoSalon: { name: 'Video Salon', act: 1, kind: 'racket', baseYield: 12, baseHeat: 1.6, unlockRep: 30 },
      taxiRank: { name: 'Taxi Rank', act: 1, kind: 'racket', baseYield: 14, baseHeat: 2.0, unlockRep: 45 },
      slotHall: { name: 'Slot Hall', act: 1, kind: 'joint', baseYield: 18, baseHeat: 2.6, unlockRep: 60, sellsPerHr: 0.4, cigaretteShare: 0.2 },
      // Premises earn nothing: the factory rolls packs, the warehouse raises the stock cap.
      tobaccoFactory: {
        name: 'Tobacco Factory', act: 1, kind: 'premises', baseYield: 0, baseHeat: 0.6, unlockRep: 0,
        purchase: 80, upkeepPerHr: 0.5, upkeepTierMult: 1.3, makesPerHr: 2, tierMakeMult: 1.5,
      },
      warehouse: {
        name: 'Warehouse', act: 1, kind: 'premises', baseYield: 0, baseHeat: 0.3, unlockRep: 20,
        purchase: 120, upkeepPerHr: 1, upkeepTierMult: 1.2, capPerTier: 100,
      },
      // Ladder sits under the Act II clear threshold (reputation.actThresholds[3]) so every spot opens in the act.
      autoShop: { name: 'Auto Shop', act: 2, kind: 'racket', baseYield: 18, baseHeat: 2.5, unlockRep: 110 },
      cafe: { name: 'Café', act: 2, kind: 'joint', baseYield: 14, baseHeat: 1.8, unlockRep: 170, sellsPerHr: 1.2, cigaretteShare: 0.3 },
      bathhouse: { name: 'Bathhouse', act: 2, kind: 'joint', baseYield: 24, baseHeat: 3.2, unlockRep: 250, sellsPerHr: 1.6, cigaretteShare: 0.3 },
      petrol: { name: 'Petrol Station', act: 2, kind: 'racket', baseYield: 34, baseHeat: 4.5, unlockRep: 330 },
      cargoBay: { name: 'Cargo Bay', act: 2, kind: 'racket', baseYield: 55, baseHeat: 8.0, unlockRep: 420 },
    },
    // Kiosk + Stall: 16 Dirty/hr before the factory's synergy. The factory keeps them in stock (ADR 0033).
    starting: [
      { type: 'kiosk', districtId: 'zarechye' },
      { type: 'marketStall', districtId: 'zarechye' },
      { type: 'tobaccoFactory', districtId: 'zarechye' },
    ],
  },

  // One city-wide pool of cigarettes (ADR 0032): factories add, joints sell, warehouses raise the cap.
  supply: {
    baseCap: 30, // a night away can empty it, so warehouses bank the surplus (TUNING.md, M3)
    startingStock: 30,
    sellFromAct: 1,
  },

  costs: {
    // spec §6.2: purchase = baseYield × payback hours for the racket's act
    paybackHoursByAct: { 1: 10, 2: 18 }, // Act I 12 → 10: Act I cleared at 2.1 d (TUNING.md)
    upgradeBaseFactor: 0.5, // upgrade from tier t = purchase × 0.5 × upgradeTierMult^(t−1)
    upgradeTierMult: 1.4,
    overrides: {}, // { kiosk: { purchase: 40 } } — wins over the formula
  },

  fronts: {
    suspicionStartUtil: 0.7, // utilization above this adds exposure
    suspicionFactor: 0.3, // suspicion = factor × throughput × (util − start)
    utilSmoothingHours: 6, // util is a moving average over roughly this many hours
    bufferHours: 10, // buffer cap = throughput × this
    reserveHours: 12, // "launder all but running costs" keeps this many hours of wages + upkeep in Dirty
    // A dial per front (ADR 0028): push launders faster and draws suspicion sooner; lay low halves it and draws none.
    modes: {
      push: { throughputMult: 1.5, suspicionStartUtil: 0.5 },
      layLow: { throughputMult: 0.5, suspicion: false },
    },
    upgrade: {
      rateStep: 0.03, // +rate per level
      levels: 3,
      costPctOfUnlock: 0.4, // level L costs basis × pct × L
      minCostBasis: 100, // basis for fronts whose unlock cost is below this (the free Currency Kiosk)
      capacity: { step: 0.25, levels: 3, costPctOfUnlock: 0.5 }, // +25% throughput (and buffer) per level
    },
    types: {
      currencyKiosk: { name: 'Currency Kiosk', rate: 0.55, throughput: 25, unlockRep: 0, cost: 0 },
      // 185 → 120: Act II laundering grows through capacity upgrades (to 210) instead of arriving oversized (TUNING.md).
      restaurant: { name: 'Restaurant', rate: 0.65, throughput: 120, unlockRep: 80, cost: 60 },
    },
  },

  heat: {
    baseControl: 8, // strongest early-game heat knob (manual §4 Heat)
    convergePerHr: 0.2, // 20% of the gap per hour: job spikes bite, then bleed off (TUNING.md, M2)
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
    cooldownDays: 2, // between any two official purchases; puts the Captain ~40% into Act II
    influencePerHrEach: 1 / 8,
    list: {
      wardCop: { name: 'Ward Cop', control: 6, cost: 4, act: 1 },
      // 140 → 240 with the bigger Act I, whose businesses tier to 5 in Act II (TUNING.md, M3).
      precinctCaptain: { name: 'Precinct Captain', control: 240, cost: 12, act: 2 },
    },
  },

  crew: {
    slotsByAct: { 1: 3, 2: 4 }, // Act I 2 → 3 with the bigger Act I (ADR 0033)
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
    // Crew grow with work (ADR 0030). A job's XP splits by its stat weights; a stat rises when its XP
    // covers the point cost, up to the member's potential. Wages follow stats, so veterans cost more.
    experience: {
      xpByBand: { quick: 2, standard: 5, long: 8 },
      outcomeMult: { full: 1, partial: 0.75, fail: 0.5 },
      pointCost: { base: 4, perAbove30: 0.3 }, // Muscle 48 → 49 costs 9.4 XP
      potentialRoll: [5, 20],
      mentorBonus: 0.5,
      enforcerXpPerHr: 0.15,
      ranks: { soldier: 8, made: 20, capo: 36 }, // stat points gained; Soldier and Made each choose a perk
      perkChoices: 2,
      perks: {
        earner: { name: 'Earner', text: 'jobs pay 15% more Dirty', jobDirtyMult: 1.15 },
        ghost: { name: 'Ghost', text: 'jobs spike 30% less heat', jobSpikeMult: 0.7 },
        fixer: { name: 'Fixer', text: 'jobs take 20% less time', jobMinutesMult: 0.8 },
        mentor: { name: 'Mentor', text: 'partners on a job earn 50% more XP', partnerXpBonus: 0.5 },
        bargainer: { name: 'Bargainer', text: '+10 when haggling with Tolya', haggleBonus: 10 },
        steady: { name: 'Steady', text: 'loyalty never drifts', noDrift: true },
      },
    },
    starting: [
      { name: 'Vitya', muscle: 48, brains: 30, nerve: 42, loyalty: 70, potential: { muscle: 60, brains: 38, nerve: 55 } },
      { name: 'Dima', muscle: 30, brains: 50, nerve: 38, loyalty: 70, nephew: true, potential: { muscle: 38, brains: 72, nerve: 48 } },
    ],
  },

  ops: {
    // score = Σ w·(best stat on team) + teamBonus·(crew−1) + U(−noise, noise)
    // full: score ≥ diff + fullMargin · partial: score ≥ diff · else fail
    fullMargin: 15, // with noise ±15 and a typical +10 margin: ~33% full, ~50% partial, ~17% fail
    partialRewardPct: 0.6,
    partialSpikePct: 0.5, // partial = backed off early: 60% reward, half the heat spike
    failSpikePct: 1.5,
    failLoyalty: -5,
    noise: 15,
    teamBonusPerExtra: 5,
    influenceDailyCap: 3, // Influence from ops per game day
    rewardActScaling: 2, // Dirty reward × act^2
    list: {
      // Spikes ×1.5 with heat.convergePerHr 0.2 (M2 heat experiment, TUNING.md).
      shakeDown: { name: 'Shake Down', band: 'quick', minutes: 15, crew: 1, w: { muscle: 0.7, nerve: 0.3 }, diff: 35, spike: 3, dirty: 15 },
      collectDebt: { name: 'Collect a Debt', band: 'quick', minutes: 20, crew: 1, w: { nerve: 0.6, brains: 0.4 }, diff: 40, spike: 1.5, dirty: 20 },
      leanOnWard: { name: 'Lean on the Ward', band: 'standard', minutes: 120, crew: 2, w: { brains: 0.5, nerve: 0.5 }, diff: 45, spike: 4.5, influence: 1 },
      pressure: { name: 'Pressure a District', band: 'standard', minutes: 60, crew: 2, w: { muscle: 0.6, nerve: 0.4 }, diff: 45, spike: 6, dirty: 10, districtPressure: true },
      // Clean up front with no Rep, packs on success; every point of heat makes the run harder (plan (o)).
      smuggleCigarettes: {
        name: 'Smuggle Cigarettes', band: 'standard', minutes: 90, crew: 2, w: { nerve: 0.6, brains: 0.4 }, diff: 35, spike: 4,
        costClean: 30, cigarettes: 40, heatDiffPerPoint: 0.2,
      },
      moveShipment: { name: 'Move a Shipment', band: 'standard', minutes: 180, crew: 2, w: { nerve: 0.5, brains: 0.5 }, diff: 50, spike: 3, dirty: 30, act: 2 },
      dinner: { name: 'Dinner with Officials', band: 'long', minutes: 360, crew: 2, w: { brains: 0.7, nerve: 0.3 }, diff: 55, spike: 1.5, influence: 2 },
      // Training (ADR 0030): one crew member, costs Dirty × act, no roll, no heat, no report.
      trainMuscle: { name: 'Boxing Gym', band: 'long', minutes: 240, crew: 1, w: { muscle: 1 }, diff: 0, spike: 0, training: 'muscle', costDirty: 15, xp: 8 },
      trainBrains: { name: 'Night School', band: 'long', minutes: 240, crew: 1, w: { brains: 1 }, diff: 0, spike: 0, training: 'brains', costDirty: 15, xp: 8 },
      trainNerve: { name: 'Card Table', band: 'long', minutes: 240, crew: 1, w: { nerve: 1 }, diff: 0, spike: 0, training: 'nerve', costDirty: 15, xp: 8 },
    },
    // Every finished job files a report with a fork (ADR 0024). dirtyPct is a share of the job's
    // Dirty reward, so the options move value around rather than add it.
    reports: {
      bands: ['quick', 'standard', 'long'],
      byOutcome: {
        full: [
          { id: 'pocket', name: 'Pocket it', default: true },
          { id: 'boast', name: 'Let the street hear about it', rep: 1, heat: 1 },
          { id: 'treat', name: 'Stand the crew a round', dirtyPct: -0.25, loyalty: 5 },
        ],
        partial: [
          { id: 'pocket', name: 'Take what you got', default: true },
          { id: 'pushHarder', name: 'Go back for the rest', dirtyPct: 0.25, heat: 2 },
          { id: 'backOff', name: 'Let it go', loyalty: 3, heat: -1 },
        ],
        fail: [
          { id: 'layLow', name: 'Lie low', default: true, heat: -1 },
          { id: 'payOff', name: 'Pay off the witnesses', dirtyPerAct: -10, heat: -3 },
          { id: 'blame', name: 'Blame the crew', loyalty: -5, rep: 1 },
        ],
      },
    },
  },

  inbox: {
    reportHours: 12, // an unanswered report takes its default after this long
    incidentHours: 8,
    perkHours: 24,
    maxPending: 4, // incidents only: reports and perk choices always file
  },

  incidents: {
    chancePerHr: 0.06, // rolled at whole hours: ~1.4 a day
    startAfterHours: 6, // none in a game's first hours
    types: {
      inspector: {
        name: 'An inspector calls',
        text: 'A city inspector is going through your books and wants a reason to leave.',
        needs: 'inspected',
        options: [
          { id: 'stall', name: 'Stall him', default: true, heat: 3 },
          { id: 'pay', name: 'Pay him to go', dirtyPerAct: -20, heat: -3 },
        ],
      },
      drunkCrew: {
        name: 'Drunk on the job',
        text: 'One of your crew turned up drunk and started a fight outside a kiosk.',
        needs: 'idleCrew',
        options: [
          { id: 'dock', name: 'Dock their pay', default: true, loyalty: -5 },
          { id: 'cover', name: 'Cover the damage', dirtyPerAct: -10, loyalty: 5 },
          { id: 'ignore', name: 'Let it slide', heat: 2 },
        ],
      },
      shopkeeperLead: {
        name: 'A shopkeeper talks',
        text: 'A shopkeeper knows where a rival hides his takings.',
        needs: 'joint',
        options: [
          { id: 'pass', name: 'Leave it', default: true },
          { id: 'take', name: 'Take the money', dirtyPerAct: 15, heat: 2 },
        ],
      },
      copFavour: {
        name: 'A favour for a cop',
        text: 'A beat cop wants someone who owes him leaned on.',
        options: [
          { id: 'refuse', name: 'Refuse', default: true, heat: 2 },
          { id: 'doIt', name: 'Do the favour', dirtyPerAct: -15, influence: 1 },
        ],
      },
      badBatch: {
        name: 'A bad batch',
        text: 'A run of cigarettes came off the line damp and mouldy.',
        needs: 'factory',
        options: [
          { id: 'burn', name: 'Burn it', default: true, cigarettes: -20 },
          { id: 'sellAnyway', name: 'Sell it anyway', dirtyPerAct: 10, heat: 3 },
        ],
      },
    },
  },

  offers: {
    count: 3,
    refreshHours: 6, // the board is replaced on this schedule; offers expire with it
    templates: {
      stubbornVendor: { base: 'shakeDown', name: 'A vendor who won’t pay', diffAdd: [0, 10], rewardMult: [1.1, 1.5], spikeMult: [1, 1.5], minutesMult: [0.75, 1.25] },
      kioskRowDebt: { base: 'collectDebt', name: 'A debt in Kiosk Row', diffAdd: [0, 10], rewardMult: [1.1, 1.5], spikeMult: [1, 1.5], minutesMult: [0.75, 1.25] },
      wardWord: { base: 'leanOnWard', name: 'A word with the ward', diffAdd: [0, 10], rewardMult: [1.1, 1.5], spikeMult: [1, 1.5], minutesMult: [0.75, 1.25] },
      minskTruck: { base: 'smuggleCigarettes', name: 'A truck from Minsk', diffAdd: [0, 10], rewardMult: [1.1, 1.5], spikeMult: [1, 1.5], minutesMult: [0.75, 1.25] },
      lateDelivery: { base: 'moveShipment', name: 'A late delivery', act: 2, diffAdd: [0, 10], rewardMult: [1.1, 1.5], spikeMult: [1, 1.5], minutesMult: [0.75, 1.25] },
    },
  },

  districts: {
    pressureOpsToFlip: 3,
    // Each district hosts one of each joint or racket it allows, and premises on its lots (ADR 0031).
    list: {
      zarechye: { name: 'Zarechye', act: 1, startsAs: 'player', home: true, allows: ['kiosk', 'marketStall', 'beerTent'], premisesLots: 2, buyout: 0, tribute: 0, mod: {} },
      kioskRow: { name: 'Kiosk Row', act: 1, startsAs: 'tolya', allows: ['kiosk', 'marketStall', 'videoSalon'], premisesLots: 1, buyout: 150, tribute: 0.15, mod: { yieldMult: { kiosk: 1.1, marketStall: 1.1 } } },
      // Nobody's yet: buy it out, or take it with three pressure jobs (ADR 0033).
      stationSquare: { name: 'Station Square', act: 1, startsAs: 'none', allows: ['beerTent', 'videoSalon', 'taxiRank', 'slotHall'], premisesLots: 2, buyout: 200, tribute: 0, mod: { yieldMult: { taxiRank: 1.1, slotHall: 1.1 } } },
      portQuarter: { name: 'Port Quarter', act: 2, startsAs: 'zhanna', allows: ['petrol', 'cargoBay'], premisesLots: 2, buyout: 300, tribute: 0.15, mod: {} },
      sovietsky: { name: 'Sovietsky Blocks', act: 2, startsAs: 'none', allows: ['autoShop', 'cafe', 'bathhouse'], premisesLots: 2, buyout: 300, tribute: 0, mod: { wageMult: 0.9 } },
    },
  },

  rivals: {
    tolya: {
      tickHours: 8,
      tickHoursEscalated: 6, // once you run escalateAtRackets joints and rackets (premises don't count)
      escalateAtRackets: 5, // 3 → 5 with the bigger Act I (ADR 0033)
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
      // Pay, haggle or refuse (ADR 0029). One haggle per demand: best idle Nerve + U(±noise) vs diff.
      haggle: { diff: 45, noise: 15, pricePct: 0.5, dispositionOnWin: 5, dispositionOnInsult: -10 },
    },
  },

  reputation: {
    perCleanSpent: 0.1,
    perOpSuccess: 2, // partial success earns partialRewardPct of this. Ops season Rep; spending drives it
    perDistrict: 20,
    // 3 = Act II cleared (Act III is stubbed). 480 ≈ Rep the casual bot holds 4 days after Act I (TUNING.md).
    actThresholds: { 2: 80, 3: 480 },
  },

  tutorial: { enabled: true, firstConversionInstant: true },

  debug: { enabled: true },
}
