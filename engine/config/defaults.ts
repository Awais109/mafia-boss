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
    // vault cap = yield × this — the session leash (manual §4 Cadence). Later acts ask for fewer, longer visits (ADR 0040).
    targetHoursByAct: { 1: 2.5, 2: 5.5, 3: 8, 4: 12, 5: 18, 6: 24 },
    startingDirty: 0, // vault starts empty: nothing has been earned yet at launch
    startingDirtyOnHand: 120, // ready for the first wages and Tolya's first visit (ADR 0035); absorbs the 30 that used to sit pre-filled in the vault
    startingClean: 440, // Uncle Lyosha's money: the opening's setup costs ●380, leaving ●60 as the old start did (ADR 0035)
    startingInfluence: 1,
  },

  rackets: {
    tierYieldMult: 1.2, // spec §7.1 — must stay below tierHeatMult (manual §5)
    tierHeatMult: 1.35,
    maxTierByAct: { 1: 5, 2: 5, 3: 6, 4: 6, 5: 6, 6: 6 }, // tier 6 from Act III (ADR 0041)
    conditionDecayPerDay: 2,
    conditionRepairPct: 0.1, // repair = 10% of purchase price, paid in Dirty
    enforcer: { yieldMult: 1.3, heatMult: 0.7 }, // "strictly worth it below tier 4"
    // The upgrade to tier 3 is a choice (ADR 0027). Stealth at 0.8 keeps T3 hotter than T2 (0.8 × 1.35² > 1.35).
    specialization: {
      atTier: 3,
      greed: { yieldMult: 1.25, exposureMult: 1.6 },
      stealth: { yieldMult: 1.0, exposureMult: 0.8 },
    },
    // The upgrade to tier 6 is a second choice, from Act III (ADR 0041).
    specialization6: {
      atTier: 6,
      greed: { yieldMult: 1.4, exposureMult: 1.8 },
      stealth: { yieldMult: 1.0, exposureMult: 0.8 },
    },
    // Premises (ADR 0031) tier up to maxTier in any act; a missed upkeep day knocks this off each one.
    premises: { maxTier: 5, missedUpkeepConditionHit: 20, maxShield: 0.8 }, // stash houses keep back at most this share of a raid
    // Side-by-side bonuses, evaluated per district (plan (m)).
    synergies: [
      { id: 'factoryJoints', a: 'tobaccoFactory', b: 'joints', effect: { yieldMult: 1.15, servedFirst: true } },
      { id: 'warehouseFactory', a: 'warehouse', b: 'tobaccoFactory', effect: { upkeepMultOf: { warehouse: 0.5 } } },
      // Act II (ADR 0037)
      { id: 'stashWarehouse', a: 'stashHouse', b: 'warehouse', effect: { upkeepMultOf: { warehouse: 0 } } },
      { id: 'unionSovietsky', a: 'unionOffice', district: 'sovietsky', effect: { influenceMult: 1.5 } },
      // Act III (ADR 0041): a hotel brings custom to every joint on its street.
      { id: 'hotelJoints', a: 'hotel', b: 'joints', effect: { yieldMult: 1.15 } },
    ],
    // Every non-zero unlock sits 38 above its M4 value: buying the opening's setup earns 38 Rep (ADR 0035).
    types: {
      // Joints: cigaretteShare of the yield needs stock (ADR 0032). Purchase = yield × payback hours.
      kiosk: {
        name: 'Kiosk', description: 'A street kiosk selling cigarettes and odds and ends. Cheap, quiet, and always the first thing you own.',
        act: 1, kind: 'joint', baseYield: 6, baseHeat: 0.8, unlockRep: 0, sellsPerHr: 0.5, cigaretteShare: 0.7, prosperity: 2,
      },
      marketStall: {
        name: 'Market Stall', description: 'A stall in the open market. More turnover than a Kiosk, a bit more heat to go with it.',
        act: 1, kind: 'joint', baseYield: 10, baseHeat: 1.3, unlockRep: 0, sellsPerHr: 0.8, cigaretteShare: 0.5, prosperity: 3,
      },
      beerTent: {
        name: 'Beer Tent', description: 'A tent that sells beer and cigarettes on the side. Modest money, modest heat.',
        act: 1, kind: 'joint', baseYield: 8, baseHeat: 1.0, unlockRep: 53, sellsPerHr: 0.6, cigaretteShare: 0.4, prosperity: 3,
      },
      videoSalon: {
        name: 'Video Salon', description: 'A pirated-video parlor. Earns Dirty directly — no cigarettes involved, but it runs hot for its size.',
        act: 1, kind: 'racket', baseYield: 12, baseHeat: 1.6, unlockRep: 68, prosperity: -2,
      },
      taxiRank: {
        name: 'Taxi Rank', description: 'An unlicensed taxi stand. Earns Dirty directly, hotter still than a Video Salon.',
        act: 1, kind: 'racket', baseYield: 14, baseHeat: 2.0, unlockRep: 83, prosperity: -1,
      },
      slotHall: {
        name: 'Slot Hall', description: 'A back-room slot machine hall. Your best Act I joint by far — and the hottest one.',
        act: 1, kind: 'joint', baseYield: 18, baseHeat: 2.6, unlockRep: 98, sellsPerHr: 0.4, cigaretteShare: 0.2, prosperity: 4,
      },
      // Premises earn nothing: the factory rolls packs, the warehouse raises the stock cap.
      tobaccoFactory: {
        name: 'Tobacco Factory',
        description: "Makes cigarette packs for your joints to sell. Earns no Dirty itself — pair it with a Warehouse so packs don't go to waste.",
        act: 1, kind: 'premises', baseYield: 0, baseHeat: 0.6, unlockRep: 0, prosperity: -2,
        purchase: 80, upkeepPerHr: 0.5, upkeepTierMult: 1.3, makesPerHr: 2, tierMakeMult: 1.5,
      },
      warehouse: {
        name: 'Warehouse', description: 'Raises how many cigarette packs the city can hold in stock, so a busy Tobacco Factory stops overflowing.',
        act: 1, kind: 'premises', baseYield: 0, baseHeat: 0.3, unlockRep: 58,
        purchase: 120, upkeepPerHr: 1, upkeepTierMult: 1.2, capPerTier: 100,
      },
      // Ladder sits under the Act III gate (progression.acts[3].rep) so every Act II spot opens in the act.
      autoShop: {
        name: 'Auto Shop', description: "Act II's entry-level racket: a chop shop dressed as a repair garage. Earns Dirty directly.",
        act: 2, kind: 'racket', baseYield: 18, baseHeat: 2.5, unlockRep: 148, prosperity: -2,
      },
      cafe: {
        name: 'Café', description: 'A café that moves cigarettes quietly alongside the coffee.',
        act: 2, kind: 'joint', baseYield: 14, baseHeat: 1.8, unlockRep: 208, sellsPerHr: 1.2, cigaretteShare: 0.3, prosperity: 6,
      },
      bathhouse: {
        name: 'Bathhouse', description: 'A banya where deals get made along with the steam. A strong Act II joint, but it runs hot.',
        act: 2, kind: 'joint', baseYield: 24, baseHeat: 3.2, unlockRep: 288, sellsPerHr: 1.6, cigaretteShare: 0.3, prosperity: 8,
      },
      petrol: {
        name: 'Petrol Station', description: 'A skimmed-fuel racket. Earns Dirty directly, and earns it fast.',
        act: 2, kind: 'racket', baseYield: 34, baseHeat: 4.5, unlockRep: 368, prosperity: -3,
      },
      cargoBay: {
        name: 'Cargo Bay', description: 'Your biggest earner: a shipping yard moving whatever pays. Also your hottest business by far.',
        act: 2, kind: 'racket', baseYield: 55, baseHeat: 8.0, unlockRep: 458, prosperity: -4,
      },
      // Act II premises (ADR 0037): the stash lengthens the leash and hides part of a raid; the union makes Influence.
      stashHouse: {
        name: 'Stash House',
        description: 'A hidden cache that lets the vault hold more before it fills, and hides part of what a raid can seize. Earns no Dirty itself.',
        act: 2, kind: 'premises', baseYield: 0, baseHeat: 1.0, unlockRep: 178,
        purchase: 200, upkeepPerHr: 1, upkeepTierMult: 1.2, leashHoursPerTier: 1.5, shieldPerTier: 0.16,
      },
      unionOffice: {
        name: 'Union Office',
        description: 'A captured union local that generates Influence over time, for buying officials and bribing your way to more control.',
        act: 2, kind: 'premises', baseYield: 0, baseHeat: 0.5, unlockRep: 238, maxInCity: 1,
        purchase: 250, upkeepPerHr: 1.5, upkeepTierMult: 1.2, influencePerHrPerTier: 1 / 60,
      },
      // Act III, the Centre (ADR 0041). Prosperity: joints lift a street, rackets sour it.
      nightclub: {
        name: 'Nightclub', description: 'A basement club off the embankment. Steady money, cigarettes at the bar, and a street that likes having it there.',
        act: 3, kind: 'joint', baseYield: 50, baseHeat: 6, unlockRep: 1220, sellsPerHr: 2.5, cigaretteShare: 0.25, prosperity: 6,
      },
      cardClub: {
        name: 'Card Club', description: 'The card room in the House of Officers. Big money, but only on a street that looks respectable enough to walk into.',
        act: 3, kind: 'joint', baseYield: 70, baseHeat: 9, unlockRep: 1700, sellsPerHr: 3, cigaretteShare: 0.3, prosperity: 12, minProsperity: 55, // a tier-1 hotel and a nightclub get the Centre there
      },
      printShop: {
        name: 'Print Shop', description: 'A print works turning out roubles that almost pass. The best racket in the Centre, and it draws investigators.',
        act: 3, kind: 'racket', baseYield: 90, baseHeat: 14, unlockRep: 2400, prosperity: -6,
      },
      hotel: {
        name: 'Hotel', description: 'A hotel on the street: every joint beside it earns more, and the whole district looks up. Earns no Dirty itself.',
        act: 3, kind: 'premises', baseYield: 0, baseHeat: 1.5, unlockRep: 1300,
        purchase: 500, upkeepPerHr: 3, upkeepTierMult: 1.2, prosperityPerTier: 8,
      },
      // Act III's consequences (ADR 0042): a doctor who doesn't ask, and a desk that lends your money out.
      clinic: {
        name: 'Clinic', description: 'A private clinic with a doctor who doesn’t ask. Hurt crew are back in half the time, and everyone is a little more loyal.',
        act: 3, kind: 'premises', baseYield: 0, baseHeat: 0.5, unlockRep: 1400, maxInCity: 1,
        purchase: 600, upkeepPerHr: 2, upkeepTierMult: 1.2, injuryMult: 0.5, loyaltyPerDay: 1,
      },
      loanDesk: {
        name: 'Loan Desk', description: 'A desk that lends your Dirty out for two days at interest. Most borrowers pay; a prosperous street means fewer who skip town.',
        act: 3, kind: 'premises', baseYield: 0, baseHeat: 1, unlockRep: 1600, maxInCity: 1,
        purchase: 800, upkeepPerHr: 2, upkeepTierMult: 1.2, lendHoursPerTier: 4, // 2 → 4: at 2 no lot was worth it (TUNING.md, M9)
      },
      // Act IV, Zastava (ADR 0043): the road to the border. Two joints sell premium imported cigarettes.
      truckStop: {
        name: 'Truck Stop', description: 'A diner and fuel pumps on the highway. Drivers smoke, drink coffee and don’t ask what’s in the back.',
        act: 4, kind: 'joint', baseYield: 120, baseHeat: 12, unlockRep: 9200, sellsPerHr: 5, cigaretteShare: 0.3, prosperity: 3,
      },
      motel: {
        name: 'Motel', description: 'A motel at the crossing with a bar that sells the red-and-white packs. Half its money needs premium stock.',
        act: 4, kind: 'joint', baseYield: 150, baseHeat: 14, unlockRep: 9600, sellsPerHr: 0, cigaretteShare: 0, premiumSellsPerHr: 1.5, premiumShare: 0.5, prosperity: 4,
      },
      foreignShop: {
        name: 'Foreign Goods Shop', description: 'Western cigarettes, jeans and whisky by the till. The best joint on the road, and it lives on premium stock.',
        act: 4, kind: 'joint', baseYield: 180, baseHeat: 15, unlockRep: 11000, sellsPerHr: 0, cigaretteShare: 0, premiumSellsPerHr: 2, premiumShare: 0.6, prosperity: 6,
      },
      freightYard: {
        name: 'Freight Yard', description: 'A lorry park that takes a cut of everything that crosses. Earns Dirty directly, and a lot of heat with it.',
        act: 4, kind: 'racket', baseYield: 280, baseHeat: 36, unlockRep: 13000, prosperity: -4,
      },
      fuelDepot: {
        name: 'Fuel Depot', description: 'Diesel that goes missing from the state tanks. The biggest earner on the road and the hottest.',
        act: 4, kind: 'racket', baseYield: 360, baseHeat: 45, unlockRep: 16000, prosperity: -5,
      },
      bondedWarehouse: {
        name: 'Bonded Warehouse', description: 'A customs warehouse with a lock that means something: holds premium stock, and in Zastava halves what customs takes.',
        act: 4, kind: 'premises', baseYield: 0, baseHeat: 3, unlockRep: 9400, prosperity: -2,
        purchase: 5000, upkeepPerHr: 20, upkeepTierMult: 1.2, premiumCapPerTier: 60, seizureMult: 0.5,
      },
      convoyDepot: {
        name: 'Convoy Depot', description: 'Your own lorries and drivers: convoys carry more, and the Colonel’s men find them harder to stop.',
        act: 4, kind: 'premises', baseYield: 0, baseHeat: 4, unlockRep: 10000, maxInCity: 1, prosperity: -2,
        purchase: 6000, upkeepPerHr: 25, upkeepTierMult: 1.2, convoyBonusPerTier: 0.15, hijackMult: 0.5,
      },
      // Act V, the Kombinat (ADR 0044): the Combine's own town, and the media that make opinion.
      palaceOfCulture: {
        name: 'Palace of Culture', description: 'The Combine’s club: a cinema, a dance hall and a buffet that sells both kinds of cigarettes. People like whoever keeps it open.',
        act: 5, kind: 'joint', baseYield: 400, baseHeat: 30, unlockRep: 31000, sellsPerHr: 6, cigaretteShare: 0.2, premiumSellsPerHr: 2, premiumShare: 0.2,
        prosperity: 8, opinionPerTier: 2,
      },
      constructionTrust: {
        name: 'Construction Trust', description: 'Public contracts: roads, roofs, the new housing. It earns with what the city thinks of you.',
        act: 5, kind: 'racket', baseYield: 600, baseHeat: 80, unlockRep: 36000, prosperity: -4, opinionYield: [0.6, 1.4],
      },
      combine: {
        name: 'The Combine', description: 'The tobacco line itself: plain Sever and the premium brands, by the thousand. A payroll, not an upkeep.',
        act: 5, kind: 'premises', baseYield: 0, baseHeat: 20, unlockRep: 31000, maxInCity: 1, onlyIn: 'kombinat', prosperity: 4,
        purchase: 30000, upkeepPerHr: 100, upkeepTierMult: 1.2, makesPerHr: 30, premiumMakesPerHr: 6, tierMakeMult: 1.3,
      },
      newspaper: {
        name: 'Newspaper', description: 'The works paper, Sevgorodsky Rabochy, and whatever it prints about you. Raises public opinion.',
        act: 5, kind: 'premises', baseYield: 0, baseHeat: 2, unlockRep: 32000, maxInCity: 1, onlyIn: 'kombinat',
        purchase: 12000, upkeepPerHr: 60, upkeepTierMult: 1.2, opinionPerTier: 5,
      },
      tvStation: {
        name: 'TV Station', description: 'The mast on the hill and the evening news. Raises public opinion more than the paper can.',
        act: 5, kind: 'premises', baseYield: 0, baseHeat: 3, unlockRep: 38000, maxInCity: 1, onlyIn: 'kombinat',
        purchase: 25000, upkeepPerHr: 120, upkeepTierMult: 1.2, opinionPerTier: 8,
      },
      // Act VI, Nagornaya (ADR 0045): a villa on the hill, and the last upgrade track in the game.
      holding: {
        name: 'The Holding', description: 'A holding company in a villa above the city. Every legal business you own earns more for each tier.',
        act: 6, kind: 'premises', baseYield: 0, baseHeat: 0, unlockRep: 96000, maxInCity: 1, onlyIn: 'nagornaya',
        purchase: 150000, upkeepPerHr: 300, upkeepTierMult: 1.2, legalBonusPerTier: 0.1,
      },
    },
  },

  // One city-wide pool of cigarettes (ADR 0032): factories add, joints sell, warehouses raise the cap.
  supply: {
    baseCap: 30, // a night away can empty it, so warehouses bank the surplus (TUNING.md, M3)
    startingStock: 30,
    sellFromAct: 1,
  },

  // Act IV (ADR 0043): premium imported cigarettes, a stock of their own. Nothing makes them yet: they come by convoy.
  premium: { fromAct: 4, baseCap: 60, startingStock: 0 }, // one convoy fits with no warehouse
  convoys: { customsBase: 0.08, customsPerHeat: 0.004, hijackChance: 0.4, hijackHostileMult: 1.5 },

  // Act VI (ADR 0045): money with a story needs no front; the past keeps its books.
  legalize: { fromAct: 6, minOpinion: 60, hoursOfYield: 170, cleanShare: 0.6 },
  reckoning: {
    fromAct: 6,
    base: 0.1,
    perIllegalShare: 0.5,
    perRaid: 5,
    perArrest: 3,
    perFreeze: 2,
    perMissedPayment: 2,
    maxCase: 40,
    empireWins: 6,
  },

  // Act V (ADR 0044): what the city thinks of you, what Moscow thinks, and the elections in between.
  opinion: { fromAct: 5, base: 40, stepPerHr: 0.05, inspectedPenalty: 5, raidPenalty: 10, controlBonus: 0.5 },
  ministry: { fromAct: 5, perYield: 0.012, opinionRelief: 30, stepPerHr: 0.05, freezeAt: 80, afterFreeze: 40, freezeHours: 24 },
  elections: {
    fromAct: 5,
    everyDays: 7,
    baseShare: 0.25,
    perOpinion: 0.004,
    perPoint: 0.005,
    noise: 0.05,
    pointHoursOfYield: 3,
    influencePerPoint: 5,
    maxPoints: 30,
    mayor: { perkMult: 2, control: 3000 },
  },

  costs: {
    // spec §6.2: purchase = baseYield × payback hours for the racket's act
    // Act I 12 → 10: Act I cleared at 2.1 d. Act III 24 → 40: the bot bought the Centre out in four days (TUNING.md).
    paybackHoursByAct: { 1: 10, 2: 18, 3: 40, 4: 40, 5: 40, 6: 40 },
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
      currencyKiosk: {
        name: 'Currency Kiosk', description: 'Turns Dirty into Clean at a modest rate. Your first front, and the cheapest.',
        act: 1, rate: 0.55, throughput: 25, unlockRep: 0, cost: 40,
      }, // bought in the opening (ADR 0035)
      // 185 → 120: Act II laundering grows through capacity upgrades (to 210) instead of arriving oversized (TUNING.md).
      // Opens just before Act II (143): opening it with Act II cost a seed a wage day (TUNING.md, M4).
      restaurant: {
        name: 'Restaurant', description: 'A better rate and much more laundering capacity than the Currency Kiosk — the front you grow into for Act II.',
        act: 1, rate: 0.65, throughput: 120, unlockRep: 133, cost: 60,
      },
      // Act III (ADR 0041): only a city that looks prosperous gets a bank.
      cooperativeBank: {
        name: 'Cooperative Bank', description: 'A co-operative bank on the embankment: the best rate yet and room for real money, once the city looks respectable.',
        act: 3, minProsperity: 55, rate: 0.75, throughput: 500, unlockRep: 1500, cost: 1500,
      },
      // Act IV (ADR 0043): an importer can only launder what its imports would plausibly earn.
      importExport: {
        name: 'Import–Export Company', description: 'A trading company at the crossing. A great rate, but it can only wash as much as your premium trade would explain.',
        act: 4, coverPerPremiumPack: 100, rate: 0.8, throughput: 1500, unlockRep: 9800, cost: 20000,
      },
      // Act V (ADR 0044): a charity with a Combine-sized budget. What it washes, the city sees it give.
      developmentFund: {
        name: 'Development Fund', description: 'A regional development fund: the best rate there is and the most room, and every rouble through it makes the city think better of you.',
        act: 5, opinionAtFullUtil: 15, rate: 0.9, throughput: 3000, unlockRep: 33000, cost: 60000,
      },
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
      wardCop: { name: 'Ward Cop', description: 'A beat cop on the payroll. A small, steady boost to control, plus a trickle of Influence.', control: 6, cost: 4, act: 1 },
      // 140 → 240 with the bigger Act I, whose businesses tier to 5 in Act II (TUNING.md, M3).
      precinctCaptain: {
        name: 'Precinct Captain', description: 'A captain who can make real trouble disappear. A huge, permanent boost to control.',
        control: 240, cost: 12, act: 2,
      },
      cityHall: {
        name: 'City Hall', description: 'The deputy mayor for trade, across the bridge. The city looks the other way for you now.',
        control: 1300, cost: 24, act: 3, // 400 → 1300: a tier-6 portfolio ran Act III at heat 45 (TUNING.md, M8)
      },
      customsChief: {
        name: 'Customs Chief', description: 'The man who signs off the crossing. More control, and customs take half as many of your convoys.',
        control: 2000, cost: 40, act: 4, seizureMult: 0.5,
      },
      governor: {
        name: 'Governor', description: 'The oblast governor, who takes calls from the capital and only from the mayor. Control, and the Ministry’s attention falls.',
        control: 5000, cost: 300, act: 5, ministryRelief: 40, needsMayor: true,
      },
    },
  },

  crew: {
    slotsByAct: { 1: 3, 2: 4, 3: 6, 4: 8, 5: 10, 6: 12 }, // Act I 2 → 3 with the bigger Act I (ADR 0033)
    extraSlotCostPctOfBudget: 0.05, // of lifetime Clean earned
    extraSlotMinCost: 150,
    extraSlotMax: 2,
    recruitCostPerAct: 50, // Clean × act
    poolSize: 3,
    poolRefreshHours: 24,
    statBandByAct: { 1: [25, 50], 2: [35, 60], 3: [45, 70], 4: [50, 75], 5: [55, 80], 6: [55, 80] },
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
    // The first people looking for work (ADR 0035): the opening hires two of the three.
    openingPool: [
      { name: 'Vitya', muscle: 48, brains: 30, nerve: 42, loyalty: 70, stays: true, potential: { muscle: 60, brains: 38, nerve: 55 } },
      { name: 'Dima', muscle: 30, brains: 50, nerve: 38, loyalty: 70, nephew: true, potential: { muscle: 38, brains: 72, nerve: 48 } },
      { name: 'Sasha "Cold"', muscle: 34, brains: 36, nerve: 50, loyalty: 50, potential: { muscle: 42, brains: 44, nerve: 62 } },
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
      // Act III: three crew, a night's work, a year's wages (plan §14).
      bigScore: { name: 'The Big Score', band: 'long', minutes: 480, crew: 3, w: { muscle: 0.3, brains: 0.4, nerve: 0.3 }, diff: 60, spike: 8, dirty: 200, act: 3 },
      // Act IV (ADR 0043): cartons over the border, paid for in Clean; the Colonel and customs both want a share.
      runConvoy: { name: 'Run a Convoy', band: 'long', minutes: 360, crew: 3, w: { nerve: 0.4, muscle: 0.4, brains: 0.2 }, diff: 60, spike: 5, costClean: 800, premium: 60, act: 4 },
      greasePost: { name: 'Grease the Post', band: 'standard', minutes: 240, crew: 2, w: { brains: 0.6, nerve: 0.4 }, diff: 60, spike: 2, influence: 3, act: 4 },
      // Act V (ADR 0044): a public contract steered your way, and the vote delivered by hand.
      fixTender: { name: 'Fix a Tender', band: 'long', minutes: 360, crew: 2, w: { brains: 0.7, nerve: 0.3 }, diff: 70, spike: 4, dirty: 300, act: 5 },
      deliverVote: { name: 'Deliver the Vote', band: 'standard', minutes: 240, crew: 3, w: { muscle: 0.5, nerve: 0.5 }, diff: 70, spike: 10, votes: 3, act: 5 },
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
      // Act III (ADR 0041): the Print Shop draws a man from the state bank's security service.
      investigation: {
        name: 'An investigator',
        text: 'Someone from the state bank is asking about roubles that almost pass. He has the Print Shop’s address.',
        act: 3,
        needs: 'printShop',
        options: [
          { id: 'shut', name: 'Close it for a day', default: true, closeHours: 24 },
          { id: 'pay', name: 'Pay him three hours’ takings', dirtyHoursOfYield: -3 },
        ],
      },
      // Act III (ADR 0042): filed by Tolya's visits, a missed loan payment and a defaulted loan; never rolled.
      attack: {
        name: 'Tolya’s boys',
        text: 'Four of Tolya’s boys are outside one of your places with bats, waiting to see what you’ll do.',
        act: 3,
        filed: true,
        options: [
          { id: 'hunker', name: 'Board it up and wait', default: true, condition: -15, stashConditionMult: 0.5 },
          { id: 'pay', name: 'Pay them an hour’s takings', dirtyHoursOfYield: -1 },
          {
            id: 'fight', name: 'Send someone out',
            contest: { stat: 'muscle', diff: 50, enforcerBonus: 10, win: { rep: 5, disposition: -5 }, lose: { condition: -25, injureHours: 12 } },
          },
        ],
      },
      collectors: {
        name: 'The collectors',
        text: 'Your lender sent two men to talk about the payment you missed. They’d like to see one of your businesses.',
        act: 3,
        filed: true,
        options: [
          { id: 'letThem', name: 'Let them make a point', default: true, condition: -30, heat: 10 },
          { id: 'payDouble', name: 'Pay double, in Clean', cleanPerDue: -2 },
          { id: 'fight', name: 'Show them out', contest: { stat: 'muscle', diff: 55, win: {}, lose: { condition: -30, injureHours: 12 } } },
        ],
      },
      // Act VI (ADR 0045): filed at a day start, likelier the more of the business is still illegal.
      hearing: {
        name: 'A hearing',
        text: 'The prosecutor’s office has opened a file on you: raids, arrests, the Ministry’s notes. A judge wants to hear it.',
        act: 6,
        filed: true,
        hours: 23, // filed at a day start: a once-a-day visit can answer it, and it's gone before the next roll
        options: [
          { id: 'letRun', name: 'Let it run', default: true, freezeHours: 24 },
          { id: 'settle', name: 'Settle it, in Clean', cleanHoursOfYield: -6 },
          { id: 'fight', name: 'Fight it in court', contest: { stat: 'brains', diff: 70, perCase: 0.5, win: { rep: 20, hearingWon: true }, lose: { freezeHours: 24 } } },
        ],
      },
      lendingDefault: {
        name: 'A borrower skips town',
        text: 'Someone the loan desk lent to has left the city, and your money went with him.',
        act: 3,
        filed: true,
        options: [
          { id: 'writeOff', name: 'Write it off', default: true },
          { id: 'chase', name: 'Send someone after him', contest: { stat: 'nerve', diff: 50, win: { dirtyPerDue: 0.5 }, lose: { injureHours: 12 } } },
        ],
      },
      // The city's story (ADR 0054; design: Home · Act V, Home after the story): decisions about the city, not the
      // business. Their Clean is hours of the city's gross income, so they keep up; opinion and the Ministry move
      // now and drift back to their targets; `{crew}` is whoever the item names, kept busy if sent.
      frontPage: {
        name: 'The Newspaper has two front pages',
        text: 'One has the Development Fund paying the Blocks’ heating bill. The other has Golovin’s workers, six months unpaid. The editor prints whichever is paid for by nine.',
        act: 5,
        options: [
          { id: 'buy', name: 'Buy the front page', cleanHoursOfYield: -1.5, opinion: 4 },
          { id: 'let', name: 'Let him choose', default: true, opinion: -3 },
        ],
      },
      workersAtGate: {
        name: 'Golovin’s workers are at the gate',
        text: 'Four hundred of them, six months unpaid. Their vouchers won Golovin the first round. A Ministry car has been parked opposite since noon.',
        act: 5,
        lastAct: 5,
        options: [
          { id: 'pay', name: 'Pay a month', cleanHoursOfYield: -3, opinion: 5, attention: 6 },
          { id: 'listen', name: 'Send {crew} to listen', opinion: 2, busyHours: 4 },
          { id: 'leave', name: 'Leave them to Golovin', default: true, opinion: -4 },
        ],
      },
      schoolRoof: {
        name: 'School No. 14 wants a roof',
        text: 'It leaks onto the second floor. The headmistress wrote to the mayor by hand: a roof, not a visit.',
        needs: 'afterStory',
        options: [
          { id: 'pay', name: 'Pay for the roof', cleanHoursOfYield: -3, rep: 180 },
          { id: 'tar', name: 'Send {crew} with tar', cleanHoursOfYield: -0.35, busyHours: 6 },
          { id: 'council', name: 'Pass it to the council', default: true, opinion: -2 },
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
      zarechye: {
        name: 'Zarechye', description: 'Your home turf. Never bought and never fought over, but it earns no control bonus either.',
        act: 1, startsAs: 'player', home: true, allows: ['kiosk', 'marketStall', 'beerTent'], premisesLots: 2, buyout: 0, tribute: 0, mod: {},
      },
      kioskRow: {
        name: 'Kiosk Row', description: "Tolya's turf. He skims tribute off every business here until you take it, which also boosts Kiosk and Market Stall yield.",
        act: 1, startsAs: 'tolya', allows: ['kiosk', 'marketStall', 'videoSalon'], premisesLots: 1, buyout: 150, tribute: 0.15, mod: { yieldMult: { kiosk: 1.1, marketStall: 1.1 } },
      },
      // Nobody's yet: buy it out, or take it with three pressure jobs (ADR 0033).
      stationSquare: {
        name: 'Station Square', description: "Unclaimed turf. Take it by buyout or pressure jobs for a Taxi Rank and Slot Hall yield boost — nobody's tribute to pay in the meantime.",
        act: 1, startsAs: 'none', allows: ['beerTent', 'videoSalon', 'taxiRank', 'slotHall'], premisesLots: 2, buyout: 200, tribute: 0, mod: { yieldMult: { taxiRank: 1.1, slotHall: 1.1 } },
      },
      portQuarter: {
        name: 'Port Quarter', description: "Zhanna's turf from Act II. She skims tribute here until you take it, and still runs her cigarette trade either way.",
        act: 2, startsAs: 'zhanna', allows: ['petrol', 'cargoBay'], premisesLots: 2, buyout: 300, tribute: 0.15, mod: {},
      },
      sovietsky: {
        name: 'Sovietsky Blocks', description: 'Unclaimed Act II turf. Take it and every crew wage in the city drops 10%.',
        act: 2, startsAs: 'none', allows: ['autoShop', 'cafe', 'bathhouse'], premisesLots: 2, buyout: 300, tribute: 0, mod: { wageMult: 0.9 },
      },
      // Act III (ADR 0041): the old merchant town across the bridge. Nobody from the south bank has ever held it.
      centre: {
        name: 'The Centre', description: 'The old town across the bridge. Nobody holds it; its card club only opens on a street prosperous enough to walk into.',
        act: 3, startsAs: 'none', allows: ['nightclub', 'cardClub', 'printShop'], premisesLots: 2, buyout: 900, tribute: 0, mod: { yieldMult: { cardClub: 1.1 } },
      },
      // Act IV (ADR 0043): the highway and the border crossing, sixty kilometres west. The Colonel's.
      zastava: {
        name: 'Zastava', description: 'The road to the border and the crossing itself. The Colonel takes a fifth of what runs here until you take it off him.',
        act: 4, startsAs: 'colonel', allows: ['truckStop', 'motel', 'foreignShop', 'freightYard', 'fuelDepot'], premisesLots: 3, buyout: 15000, tribute: 0.2,
        mod: { yieldMult: { freightYard: 1.1, fuelDepot: 1.1 } },
      },
      // Act V (ADR 0044): the Combine upriver and its town. A state asset: bought at auction, never pressured.
      kombinat: {
        name: 'Kombinat', description: 'The tobacco Combine upriver, its Palace of Culture and its town. The state is selling; nothing can be built until it’s yours.',
        act: 5, startsAs: 'state', auction: true, allows: ['palaceOfCulture', 'constructionTrust'], premisesLots: 3, buyout: 80000, tribute: 0,
        lotsFor: ['combine', 'newspaper', 'tvStation'],
        mod: { yieldMult: { constructionTrust: 1.1 } },
      },
      // Act VI (ADR 0045): the dachas above the Centre. Nobody to buy it from: you drive up.
      nagornaya: {
        name: 'Nagornaya', description: 'The hills above the city, where the dachas are. Nothing earns here; it’s where the Holding goes.',
        act: 6, startsAs: 'none', grantedOnOpen: true, allows: [], premisesLots: 1, lotsFor: ['holding'], buyout: 0, tribute: 0, mod: {},
      },
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
      // From Act III (ADR 0042): a chance at each visit that his boys come for a business, as an incident.
      attack: { fromAct: 3, chance: 0.05, chanceNoTurf: 0.1, chanceHostile: 0.2 },
    },
    // From Act II (ADR 0036): lots of cigarettes for Dirty, a buyer for the surplus, eyes on every crate at the Port.
    zhanna: {
      shipment: { cigarettes: 25, basePrice: 40, pricePerDisposition: -0.3, priceClamp: [0.5, 1.5], cooldownHours: 6, hostileMarkup: 1.5 },
      surplus: { pricePerPack: 2, maxPerDay: 30, dispositionPer10: 1 },
      dispositionPerShipment: 5,
      dispositionPerSmuggle: -5,
      dispositionOnBuyout: -10,
      dispositionOnFlip: -25,
      hostileBelow: -30,
      seizureDiff: 10,
      premium: { fromAct: 4, packs: 20, priceMult: 4 }, // her premium lots, on the same cooldown
    },
    // Act IV (ADR 0043): the Colonel's men stop convoys on the highway unless you've paid for passage.
    colonel: {
      passage: { hoursOfYield: 2, hours: 24 },
      dispositionPerPassage: 5,
      dispositionPerPressure: -5,
      dispositionOnBuyout: -10,
      dispositionOnFlip: -25,
      hostileBelow: -30,
    },
  },

  reputation: {
    perCleanSpent: 0.1,
    perOpSuccess: 2, // partial success earns partialRewardPct of this. Ops season Rep; spending drives it
    perDistrict: 20,
  },

  // Six acts (ADR 0040). Act II opens on the Act I goals; later acts on Reputation and what you hold.
  // finalAct is the last act this build has content for: its gate marks the game cleared instead.
  progression: {
    finalAct: 6,
    // Each gate after Act I also asks for the act before's overreach, sent, and its rematch, won (ADR 0050).
    acts: {
      2: { goals: true, missions: ['crateThroughPort'] },
      3: { rep: 1200, missions: ['herTerms', 'acrossTheBridge'] }, // 610 (Act II's old clear) → 1200: Act II ran 1.9 d against the manual's 3–5 (TUNING.md, M8)
      4: { rep: 9000, missions: ['secondLunch', 'firstTruck'] }, // just under what the Centre's catalogue can earn (~10,200 on the bot)
      5: { rep: 30000, holds: ['zastava'], fronts: ['importExport'], missions: ['firstAuction'] }, // the border held, the importer running (ADR 0043)
      6: { rep: 96000, mayor: true, missions: ['overGovernor'] }, // the mayor's office and the Rep to hold it (ADR 0044)
    },
  },

  // Rock bottom (ADR 0051): the family helps once per act, never a game over.
  rockBottom: { cleanBelowHours: 24, stakeHours: 36, minStake: 60 },

  // After the story (ADR 0052). Tiers 7–20 for joints and rackets, each 2.5× dearer again than the curve, so
  // growth slows but never stops; heat still compounds faster than yield, so past the book suits legal
  // businesses. Contracts: three a week, their Clean in days of income (yield plus legal Clean, × 24), so they
  // keep up with the empire.
  after: {
    extraTiers: 14,
    pastBookCostMult: 2.5,
    contracts: {
      count: 3,
      refreshDays: 7,
      minDayIncome: 20000,
      list: {
        tramDepot: { name: 'Rebuild the tram depot', crew: 2, hours: 72, costDays: 0.5, payDays: 1.5, gold: 6 },
        boilerHouse: { name: 'Fix the Blocks’ boiler house', crew: 2, hours: 48, costDays: 0.4, payDays: 1.25, gold: 5 },
        portChannel: { name: 'Dredge the port channel', crew: 3, hours: 96, costDays: 0.75, payDays: 1.8, gold: 8 },
        bridgeLights: { name: 'Light the bridge', crew: 1, hours: 24, costDays: 0.2, payDays: 0.6, gold: 3 },
        palaceRoof: { name: 'Reroof the Palace of Culture', crew: 2, hours: 60, costDays: 0.5, payDays: 1.4, gold: 5 },
        stationClock: { name: 'Start the station clock', crew: 1, hours: 36, costDays: 0.3, payDays: 0.8, gold: 4 },
      },
    },
  },

  // The boss missions (ADR 0050). An overreach appears once the rest of the next act's gate holds, fails by
  // design and opens that act; its cost is fixed. A rematch is open all through its act, rolled like a job.
  missions: {
    enabled: true,
    retryHours: 12,
    list: {
      crateThroughPort: {
        name: 'A crate through the Port', kind: 'overreach', act: 1, boss: 'zhanna', crew: 2, minutes: 120,
        w: { nerve: 0.6, muscle: 0.4 }, diff: 70, stakeHours: 2, injureHours: 12, heat: 10,
      },
      herTerms: {
        name: 'Her terms', kind: 'rematch', act: 2, boss: 'zhanna', crew: 2, minutes: 120,
        w: { brains: 0.6, nerve: 0.4 }, diff: 45, reward: { rep: 60, disposition: { zhanna: 25 } },
      },
      acrossTheBridge: {
        name: 'Across the bridge', kind: 'overreach', act: 2, boss: 'ignatov', crew: 1, minutes: 180,
        w: { nerve: 0.5, brains: 0.5 }, diff: 80, stakeHours: 2, heat: 8,
      },
      secondLunch: {
        name: 'The second lunch', kind: 'rematch', act: 3, boss: 'ignatov', crew: 1, minutes: 180,
        w: { brains: 0.6, nerve: 0.4 }, diff: 55, reward: { rep: 400, influence: 10 },
      },
      firstTruck: {
        name: 'The first truck', kind: 'overreach', act: 3, boss: 'colonel', crew: 2, minutes: 180,
        w: { muscle: 0.5, nerve: 0.5 }, diff: 90, stakeHours: 2, heat: 12,
      },
      firstAuction: {
        name: 'The first auction round', kind: 'overreach', act: 4, boss: 'golovin', crew: 1, minutes: 120,
        w: { brains: 0.7, nerve: 0.3 }, diff: 95, stakeHours: 2, heat: 5,
      },
      overGovernor: {
        name: 'Over the Governor’s head', kind: 'overreach', act: 5, boss: 'prosecutor', crew: 1, minutes: 240,
        w: { brains: 0.6, nerve: 0.4 }, diff: 99, stakeHours: 2, heat: 15,
      },
    },
  },

  // Act III (ADR 0042): a failed job that leans on Muscle can hurt someone on it.
  injuries: { fromAct: 3, chanceOnFail: 0.3, minMuscleWeight: 0.5, hours: 12 },

  // Act III (ADR 0042): borrow Clean against your laundering, and lend Dirty out through a loan desk.
  credit: {
    fromAct: 3,
    maxDaysOfClean: 2, // up to two days of the ledger's mean daily Clean
    minCap: 2000,
    interestPerDay: 0.05,
    repayPctPerDay: 0.25, // of the principal, from Clean, at each day start
    missesToRepossess: 2, // the second miss in a row: a business taken, the loan closed (ADR 0051)
    lending: { termHours: 48, returnPct: 0.3, defaultBase: 0.25, defaultPerProsperity: 0.003, minDefault: 0.02 },
  },

  // Act III (ADR 0041): each district has a prosperity from 0 to 100 that its joints' income follows.
  prosperity: {
    fromAct: 3,
    base: 45, // before businesses: an Act II district lands near 50, so Act III opens without a cliff
    stepPerHr: 0.1, // a tenth of the gap to target, at each whole hour
    yieldMult: [0.7, 1.3], // joints at prosperity 0 and 100 (×1 at 50)
    inspectedPenalty: 10,
    raidPenalty: 15,
    raidPenaltyHours: 24,
    shortagePenalty: 10,
  },

  tutorial: { enabled: true, firstConversionInstant: true, tolyaAfterMinutes: 2 }, // Tolya's first visit, right after the heat lesson

  // What Skip buys, and what a game starts with when the tutorial is off (ADR 0035).
  opening: {
    quickStart: {
      rackets: [
        { type: 'kiosk', districtId: 'zarechye' },
        { type: 'marketStall', districtId: 'zarechye' },
        { type: 'tobaccoFactory', districtId: 'zarechye' },
      ],
      fronts: ['currencyKiosk'],
      recruits: ['cand0-0', 'cand0-1'],
    },
  },

  // Act I goals (ADR 0035): shown once the opening is over; each pays rewardGold once.
  // Act II opens once every one of these is done (ADR 0039) — not a Reputation threshold.
  goals: {
    enabled: true,
    rewardGold: 1,
    list: ['secondDistrict', 'factoryTier2', 'thirdCrew', 'wardCop', 'workFront', 'smuggleRun', 'soldier'],
  },

  // Gold bars (ADR 0034): each buys an hour of waiting. You start with some and get more when an act opens.
  gold: {
    starting: 10,
    perActUnlocked: { 2: 5, 3: 10, 4: 10, 5: 10, 6: 10 },
    hoursPerBar: 1,
    maxSkipHours: 8,
    skipChoices: [1, 2, 4, 8],
  },

  debug: { enabled: true },
}
