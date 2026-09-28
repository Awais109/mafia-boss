// Config types and structural validation.
// Validation rejects configs that are *wrong* (rate > 1, thresholds out of order,
// negative durations, unknown keys). It does not reject badly tuned ones — that's
// what the sim is for (dev manual §2).

// Six acts (ADR 0040). `progression.finalAct` is the last one built; later acts exist as types and numbers only.
export type Act = 1 | 2 | 3 | 4 | 5 | 6
export const ACTS: readonly Act[] = [1, 2, 3, 4, 5, 6]
export type LaterAct = Exclude<Act, 1>
export const LATER_ACTS: readonly LaterAct[] = [2, 3, 4, 5, 6]

// Every business, whatever its kind (ADR 0031): joints, rackets and premises share one list.
export type RacketType =
  | 'kiosk' | 'marketStall' | 'beerTent' | 'videoSalon' | 'taxiRank' | 'slotHall' | 'tobaccoFactory' | 'warehouse'
  | 'autoShop' | 'cafe' | 'bathhouse' | 'petrol' | 'cargoBay' | 'stashHouse' | 'unionOffice'
  | 'cardClub' | 'nightclub' | 'printShop' | 'hotel' | 'clinic' | 'loanDesk'
export const RACKET_TYPES: readonly RacketType[] = [
  'kiosk', 'marketStall', 'beerTent', 'videoSalon', 'taxiRank', 'slotHall', 'tobaccoFactory', 'warehouse',
  'autoShop', 'cafe', 'bathhouse', 'petrol', 'cargoBay', 'stashHouse', 'unionOffice',
  'cardClub', 'nightclub', 'printShop', 'hotel', 'clinic', 'loanDesk',
]

export type FrontType = 'currencyKiosk' | 'restaurant' | 'cooperativeBank'
export const FRONT_TYPES: readonly FrontType[] = ['currencyKiosk', 'restaurant', 'cooperativeBank']

export type OfficialId = 'wardCop' | 'precinctCaptain' | 'cityHall'
export const OFFICIAL_IDS: readonly OfficialId[] = ['wardCop', 'precinctCaptain', 'cityHall']

export type OpType =
  | 'shakeDown' | 'collectDebt' | 'leanOnWard' | 'pressure' | 'smuggleCigarettes' | 'moveShipment' | 'dinner'
  | 'trainMuscle' | 'trainBrains' | 'trainNerve' | 'bigScore'
export const OP_TYPES: readonly OpType[] = [
  'shakeDown', 'collectDebt', 'leanOnWard', 'pressure', 'smuggleCigarettes', 'moveShipment', 'dinner',
  'trainMuscle', 'trainBrains', 'trainNerve', 'bigScore',
]

export type FrontMode = 'push' | 'normal' | 'layLow'
export const FRONT_MODES: readonly FrontMode[] = ['push', 'normal', 'layLow']

export type Specialization = 'greed' | 'stealth'

export type PerkId = 'earner' | 'ghost' | 'fixer' | 'mentor' | 'bargainer' | 'steady'
export const PERK_IDS: readonly PerkId[] = ['earner', 'ghost', 'fixer', 'mentor', 'bargainer', 'steady']

export type PerkConfig = {
  name: string
  text: string
  jobDirtyMult?: number // earner: a job with this member pays ×
  jobSpikeMult?: number // ghost: a job with this member spikes heat ×
  jobMinutesMult?: number // fixer: a job with this member takes ×
  partnerXpBonus?: number // mentor: everyone else on the job earns this much more XP
  haggleBonus?: number // bargainer: added to the haggle score
  noDrift?: boolean // steady: no daily loyalty drift
}

export type DistrictId = 'zarechye' | 'kioskRow' | 'stationSquare' | 'portQuarter' | 'sovietsky' | 'centre'
export const DISTRICT_IDS: readonly DistrictId[] = ['zarechye', 'kioskRow', 'stationSquare', 'portQuarter', 'sovietsky', 'centre']

export type Stat = 'muscle' | 'brains' | 'nerve'
export const STATS: readonly Stat[] = ['muscle', 'brains', 'nerve']

export type TraitId = 'exArmy' | 'gambler' | 'alcoholic'
export const TRAIT_IDS: readonly TraitId[] = ['exArmy', 'gambler', 'alcoholic']

export type Controller = 'player' | 'tolya' | 'zhanna' | 'none'
export type OpBand = 'quick' | 'standard' | 'long'
export const OP_BANDS: readonly OpBand[] = ['quick', 'standard', 'long']
export type OpOutcome = 'full' | 'partial' | 'fail'
export const OP_OUTCOMES: readonly OpOutcome[] = ['full', 'partial', 'fail']

export type IncidentType =
  | 'inspector' | 'drunkCrew' | 'shopkeeperLead' | 'copFavour' | 'badBatch' | 'investigation' | 'attack' | 'collectors' | 'lendingDefault'
export const INCIDENT_TYPES: readonly IncidentType[] = [
  'inspector', 'drunkCrew', 'shopkeeperLead', 'copFavour', 'badBatch', 'investigation', 'attack', 'collectors', 'lendingDefault',
]
export type IncidentNeed = 'idleCrew' | 'joint' | 'factory' | 'inspected' | 'printShop'

// Act I goals (ADR 0035, gate ADR 0039), each paying gold once. All of them must be done to open Act II.
export type GoalId = 'secondDistrict' | 'factoryTier2' | 'thirdCrew' | 'wardCop' | 'workFront' | 'smuggleRun' | 'soldier'
export const GOAL_IDS: readonly GoalId[] = ['secondDistrict', 'factoryTier2', 'thirdCrew', 'wardCop', 'workFront', 'smuggleRun', 'soldier']

// What an option does, before it's materialized into the save (ChoiceConfig without its id and name).
export type ChoiceEffectsConfig = {
  dirtyPct?: number // share of the job's Dirty reward (reports)
  dirtyPerAct?: number // flat Dirty × act
  influence?: number
  rep?: number
  heat?: number
  loyalty?: number // every crew member named on the item
  condition?: number // the business named on the item
  disposition?: number // Tolya
  cigarettes?: number
  dirtyHoursOfYield?: number // Dirty = this × yield per hour, fixed when the item is filed
  closeHours?: number // the business named on the item shuts for this long
  dirtyPerDue?: number // × the amount the item is about (a defaulted loan), fixed at filing
  cleanPerDue?: number // × the amount the item is about (a missed payment), fixed at filing
  stashConditionMult?: number // condition × this when a Stash House stands in the business's district
  injureHours?: number // the crew member who fought is hurt for this long (ADR 0042)
  // A contest (ADR 0042): the best available crew member's stat + luck against diff; each branch is an effect.
  contest?: { stat: Stat; diff: number; enforcerBonus?: number; win: ChoiceEffectsConfig; lose: ChoiceEffectsConfig }
}

// One option on a pending decision (a crew report or an incident). Effects are materialized
// into the save when the item is filed, so replays don't depend on later config edits.
export type ChoiceConfig = ChoiceEffectsConfig & {
  id: string
  name: string
  default?: boolean // exactly one per list; applied when the item expires unanswered
}

export type IncidentConfig = {
  name: string
  text: string
  act?: Act
  needs?: IncidentNeed
  filed?: boolean // filed by a system (an attack, a missed payment), never rolled at random
  options: ChoiceConfig[]
}

export type OfferTemplate = {
  base: OpType
  name: string
  act?: Act
  diffAdd: [number, number]
  rewardMult: [number, number]
  spikeMult: [number, number]
  minutesMult: [number, number]
}

export type RacketKind = 'joint' | 'racket' | 'premises'
export const RACKET_KINDS: readonly RacketKind[] = ['joint', 'racket', 'premises']

// One business type (ADR 0031). Joints and rackets earn Dirty; premises earn nothing, cost upkeep,
// and make, keep or improve something instead.
export type RacketTypeConfig = {
  name: string
  description: string // one plain-language sentence: what it does, shown on unlock and in How It Works
  act: Act
  kind: RacketKind // joints sell cigarettes, rackets don't, premises make or keep things
  baseYield: number // dirty/hr at tier 1 (0 for premises)
  baseHeat: number // exposure at tier 1
  unlockRep: number
  sellsPerHr?: number // joints: packs sold per hour at tier 1, × tierYieldMult per tier
  cigaretteShare?: number // joints: the share of yield that needs cigarettes
  purchase?: number // premises: Clean price (joints and rackets use the payback formula)
  upkeepPerHr?: number // premises: Dirty per hour at tier 1
  upkeepTierMult?: number
  maxInCity?: number // premises: at most this many in the city
  makesPerHr?: number // factories: packs per hour at tier 1
  tierMakeMult?: number
  capPerTier?: number // warehouses: stock cap added per tier
  leashHoursPerTier?: number // stash houses: vault hours added per tier (the best one counts)
  shieldPerTier?: number // stash houses: share of a raid kept back per tier, weighted by the district's share of yield
  influencePerHrPerTier?: number // union offices: Influence per hour per tier
  prosperity?: number // added to its district's prosperity target (negative for rackets that sour a street; ADR 0041)
  prosperityPerTier?: number // hotels: prosperity target added per tier
  minProsperity?: number // can only open where the district's prosperity is at least this
  injuryMult?: number // clinics: injuries last × this (the best one counts)
  loyaltyPerDay?: number // clinics: every crew member gains this at each day start
  lendHoursPerTier?: number // loan desks: lend up to this many hours of Dirty yield per tier
}

// Businesses that work better side by side in one district (plan (m)). Active in a district that has
// an `a`, and a `b` when one is named.
export type SynergyConfig = {
  id: string
  a: RacketType
  b?: RacketType | 'joints'
  district?: DistrictId // only in this district
  effect: {
    yieldMult?: number // the `b` businesses in the district
    servedFirst?: boolean // joints in the district get cigarettes first in a shortage
    upkeepMultOf?: Partial<Record<RacketType, number>> // upkeep of these types in the district
    influenceMult?: number
  }
}

export type FrontTypeConfig = {
  name: string
  description: string // one plain-language sentence: what it does, shown on unlock and in How It Works
  act: Act // opens in this act (and at unlockRep)
  minProsperity?: number // city prosperity needed to open it (ADR 0041)
  rate: number // clean out per dirty in
  throughput: number // dirty/hr
  unlockRep: number
  cost: number // clean
}

export type OfficialConfig = { name: string; description: string; control: number; cost: number; act: Act }

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
  cigarettes?: number // packs added to stock on success (× the reward share)
  costClean?: number // charged when the job starts, earning no Rep (smuggling)
  heatDiffPerPoint?: number // difficulty + this × heat, fixed when the job starts
  training?: Stat // a training job: no roll, no heat, XP to this stat
  costDirty?: number // charged × act when the job starts (training)
  xp?: number // training XP to `training`
  districtPressure?: boolean
  act?: Act
}

export type DistrictConfig = {
  name: string
  description: string // one plain-language sentence: what it does, shown on unlock and in How It Works
  act: Act
  startsAs: Controller
  home?: boolean // starting turf: never bought, no control bonus
  allows: RacketType[] // joints and rackets this district can host, one of each
  premisesLots: number // lots for premises of any type, one of each type
  buyout: number
  tribute: number // fraction of racket yield paid to the controller while not yours
  mod: {
    yieldMult?: Partial<Record<RacketType, number>> // rackets in this district, once you control it
    wageMult?: number // all crew wages, once you control it
  }
}

// What opens the next act (ADR 0040). Every listed condition must hold.
export type ActGate = {
  goals?: boolean // every Act I goal done
  rep?: number
  holds?: DistrictId[] // districts you control
  fronts?: FrontType[] // fronts you own
}

export type CrewSeed = {
  name: string
  muscle: number
  brains: number
  nerve: number
  loyalty: number
  traits?: TraitId[]
  nephew?: boolean
  potential?: Record<Stat, number> // ceilings; stat + 10 when omitted
}

export type Config = {
  meta: { name: string; version: number }
  time: { maxOfflineHours: number; hourMs: number }
  vault: {
    floorCap: number
    targetHoursByAct: Record<Act, number>
    startingDirty: number
    startingDirtyOnHand: number // Dirty in hand at the start, beside the vault
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
    specialization: {
      atTier: number // the upgrade to this tier asks for greed or stealth
      greed: { yieldMult: number; exposureMult: number }
      stealth: { yieldMult: number; exposureMult: number }
    }
    // Act III's second choice, on the upgrade to tier 6 (ADR 0041).
    specialization6: {
      atTier: number
      greed: { yieldMult: number; exposureMult: number }
      stealth: { yieldMult: number; exposureMult: number }
    }
    premises: { maxTier: number; missedUpkeepConditionHit: number; maxShield: number }
    synergies: SynergyConfig[]
    types: Record<RacketType, RacketTypeConfig>
  }
  supply: {
    baseCap: number // cigarettes the city holds without a warehouse
    startingStock: number
    sellFromAct: Act // joints' cigarette share applies from this act
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
    utilSmoothingHours: number
    bufferHours: number
    reserveHours: number // "launder all but running costs" keeps this many hours of wages and upkeep
    modes: {
      push: { throughputMult: number; suspicionStartUtil: number }
      layLow: { throughputMult: number; suspicion: boolean }
    }
    upgrade: {
      rateStep: number
      levels: number
      costPctOfUnlock: number
      minCostBasis: number
      capacity: { step: number; levels: number; costPctOfUnlock: number }
    }
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
    experience: {
      xpByBand: Record<OpBand, number> // split across stats by the job's weights
      outcomeMult: Record<OpOutcome, number>
      pointCost: { base: number; perAbove30: number } // XP for +1 = base + perAbove30 × max(0, stat − 30)
      potentialRoll: [number, number] // recruits' ceilings: stat + U(lo, hi)
      mentorBonus: number // the lower-ranked member of a team earns this much more XP
      enforcerXpPerHr: number // Muscle
      ranks: { soldier: number; made: number; capo: number } // stat points gained
      perkChoices: number
      perks: Record<PerkId, PerkConfig>
    }
    openingPool: CrewSeed[] // the first people looking for work: ids cand0-0, cand0-1, …
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
    reports: { bands: OpBand[]; byOutcome: Record<OpOutcome, ChoiceConfig[]> }
  }
  inbox: { reportHours: number; incidentHours: number; perkHours: number; maxPending: number }
  incidents: { chancePerHr: number; startAfterHours: number; types: Record<IncidentType, IncidentConfig> }
  offers: { count: number; refreshHours: number; templates: Record<string, OfferTemplate> }
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
      haggle: { diff: number; noise: number; pricePct: number; dispositionOnWin: number; dispositionOnInsult: number }
      // From Act III his boys come for a business (ADR 0042): likelier once he's lost the Row, likelier still when hostile.
      attack: { fromAct: Act; chance: number; chanceNoTurf: number; chanceHostile: number }
    }
    // Zhanna sells cigarettes by the lot and buys the surplus (ADR 0036).
    zhanna: {
      shipment: {
        cigarettes: number
        basePrice: number // Dirty
        pricePerDisposition: number // price × (1 + this × disposition ÷ 100), clamped to priceClamp
        priceClamp: [number, number]
        cooldownHours: number
        hostileMarkup: number
      }
      surplus: { pricePerPack: number; maxPerDay: number; dispositionPer10: number }
      dispositionPerShipment: number
      dispositionPerSmuggle: number
      dispositionOnBuyout: number
      dispositionOnFlip: number
      hostileBelow: number
      seizureDiff: number // added to smuggling difficulty while she holds the Port
    }
  }
  reputation: {
    perCleanSpent: number
    perOpSuccess: number
    perDistrict: number
  }
  // Six acts (ADR 0040): what opens each one, and the last act this build has content for.
  progression: {
    finalAct: Act
    acts: Record<LaterAct, ActGate>
  }
  // Act III's consequences (ADR 0042): hurt crew, borrowing, lending.
  injuries: {
    fromAct: Act
    chanceOnFail: number // a failed job leaning on Muscle hurts someone on it
    minMuscleWeight: number
    hours: number
  }
  credit: {
    fromAct: Act
    maxDaysOfClean: number // borrow up to this many days of Clean income (the ledger's closed days)
    minCap: number
    interestPerDay: number // on what's owed, at each day start
    repayPctPerDay: number // of the principal, due from Clean at each day start
    secondMissVaultPct: number // two missed payments: the lender takes this share of the vault
    lending: {
      termHours: number
      returnPct: number
      defaultBase: number // chance a borrower defaults, before the desk's street
      defaultPerProsperity: number // − this × the desk district's prosperity
      minDefault: number
    }
  }
  // Districts earn more when they're doing well (ADR 0041), from `fromAct`.
  prosperity: {
    fromAct: Act
    base: number // every district's target before its businesses
    stepPerHr: number // share of the gap to target closed at each whole hour
    yieldMult: [number, number] // joints earn × lerp(lo, hi, prosperity ÷ 100)
    inspectedPenalty: number
    raidPenalty: number
    raidPenaltyHours: number
    shortagePenalty: number
  }
  tutorial: { enabled: boolean; firstConversionInstant: boolean; tolyaAfterMinutes: number }
  // What Skip buys, and what a game starts with when the tutorial is off (ADR 0035).
  opening: {
    quickStart: { rackets: { type: RacketType; districtId: DistrictId }[]; fronts: FrontType[]; recruits: string[] }
  }
  goals: { enabled: boolean; rewardGold: number; list: GoalId[] }
  // Gold bars buy time and nothing else (ADR 0034).
  gold: {
    starting: number
    perActUnlocked: Record<LaterAct, number> // granted when that act opens
    hoursPerBar: number
    maxSkipHours: number
    skipChoices: number[]
  }
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

function range(e: string[], p: string, v: unknown, test: (n: number) => boolean) {
  if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1])) {
    e.push(`${p}: expected [lo, hi]`)
    return
  }
  if (!test(v[0]) || !test(v[1]) || v[0] > v[1]) e.push(`${p}: [${v[0]}, ${v[1]}] must satisfy lo <= hi and the value rule`)
}

// A decision list: 2–3 options, unique ids, exactly one default, and the default never asks for money.
function choices(e: string[], p: string, list: unknown) {
  if (!Array.isArray(list) || list.length < 2 || list.length > 3) {
    e.push(`${p}: list 2–3 options`)
    return
  }
  const opts = list as ChoiceConfig[]
  if (new Set(opts.map((o) => o.id)).size !== opts.length) e.push(`${p}: option ids must be unique`)
  const defaults = opts.filter((o) => o.default)
  if (defaults.length !== 1) e.push(`${p}: exactly one option must be the default`)
  const d = defaults[0]
  // Stock only ever falls to zero, so a default may lose packs; it may never cost Dirty or Clean (ADR 0032).
  if (d && ((d.dirtyPct ?? 0) < 0 || (d.dirtyPerAct ?? 0) < 0 || (d.dirtyHoursOfYield ?? 0) < 0 || (d.dirtyPerDue ?? 0) < 0 || (d.cleanPerDue ?? 0) < 0)) {
    e.push(`${p}.${d.id}: the default option can't cost Dirty or Clean`)
  }
  if (d?.contest) e.push(`${p}.${d.id}: the default option can't be a contest`)
  for (const o of opts) effectsCheck(e, `${p}.${o.id}`, o)
}

// A contest's stat and difficulty, and its branches, which may not nest another contest.
function effectsCheck(e: string[], p: string, fx: ChoiceEffectsConfig) {
  if (fx.injureHours !== undefined) nonNeg(e, `${p}.injureHours`, fx.injureHours)
  if (fx.closeHours !== undefined) nonNeg(e, `${p}.closeHours`, fx.closeHours)
  if (fx.stashConditionMult !== undefined) unit(e, `${p}.stashConditionMult`, fx.stashConditionMult)
  const k = fx.contest
  if (!k) return
  if (!STATS.includes(k.stat)) e.push(`${p}.contest.stat: unknown stat ${k.stat}`)
  nonNeg(e, `${p}.contest.diff`, k.diff)
  if (k.enforcerBonus !== undefined) nonNeg(e, `${p}.contest.enforcerBonus`, k.enforcerBonus)
  for (const [branch, sub] of [['win', k.win], ['lose', k.lose]] as const) {
    if (!sub) { e.push(`${p}.contest.${branch}: missing`); continue }
    if (sub.contest) e.push(`${p}.contest.${branch}: a contest can't nest another`)
    effectsCheck(e, `${p}.contest.${branch}`, sub)
  }
}

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
      nonNeg(e, 'vault.startingDirtyOnHand', c.vault.startingDirtyOnHand)
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
      const sp = r.specialization
      int(e, 'rackets.specialization.atTier', sp.atTier, 2)
      positive(e, 'rackets.specialization.greed.yieldMult', sp.greed.yieldMult)
      num(e, 'rackets.specialization.greed.exposureMult', sp.greed.exposureMult, (n) => n >= sp.greed.yieldMult, '>= greed.yieldMult')
      positive(e, 'rackets.specialization.stealth.yieldMult', sp.stealth.yieldMult)
      // Stealth may cool a tier, but never below the tier it came from: tiering can't lower exposure.
      num(e, 'rackets.specialization.stealth.exposureMult', sp.stealth.exposureMult, (n) => n >= 1 / r.tierHeatMult, '>= 1 / tierHeatMult')
      const sp6 = r.specialization6
      num(e, 'rackets.specialization6.atTier', sp6.atTier, (n) => Number.isInteger(n) && n > sp.atTier, '> specialization.atTier')
      positive(e, 'rackets.specialization6.greed.yieldMult', sp6.greed.yieldMult)
      num(e, 'rackets.specialization6.greed.exposureMult', sp6.greed.exposureMult, (n) => n >= sp6.greed.yieldMult, '>= greed.yieldMult')
      positive(e, 'rackets.specialization6.stealth.yieldMult', sp6.stealth.yieldMult)
      num(e, 'rackets.specialization6.stealth.exposureMult', sp6.stealth.exposureMult, (n) => n >= 1 / r.tierHeatMult, '>= 1 / tierHeatMult')
      int(e, 'rackets.premises.maxTier', r.premises.maxTier, 1)
      nonNeg(e, 'rackets.premises.missedUpkeepConditionHit', r.premises.missedUpkeepConditionHit)
      unit(e, 'rackets.premises.maxShield', r.premises.maxShield)
      for (const t of RACKET_TYPES) {
        const rt = r.types[t]
        if (!rt) { e.push(`rackets.types.${t}: missing`); continue }
        const p = `rackets.types.${t}`
        if (!RACKET_KINDS.includes(rt.kind)) e.push(`${p}.kind: expected joint, racket or premises`)
        nonNeg(e, `${p}.baseHeat`, rt.baseHeat)
        nonNeg(e, `${p}.unlockRep`, rt.unlockRep)
        if (!ACTS.includes(rt.act)) e.push(`${p}.act: expected an act`)
        if (rt.prosperity !== undefined) num(e, `${p}.prosperity`, rt.prosperity, (n) => Math.abs(n) <= 100, 'in [-100, 100]')
        if (rt.prosperityPerTier !== undefined) nonNeg(e, `${p}.prosperityPerTier`, rt.prosperityPerTier)
        if (rt.minProsperity !== undefined) num(e, `${p}.minProsperity`, rt.minProsperity, (n) => n >= 0 && n <= 100, 'in [0, 100]')
        if (rt.kind === 'premises') {
          // Premises earn nothing directly: they make, keep or improve (ADR 0031).
          num(e, `${p}.baseYield`, rt.baseYield, (n) => n === 0, '0 for premises')
          positive(e, `${p}.purchase`, rt.purchase)
          nonNeg(e, `${p}.upkeepPerHr`, rt.upkeepPerHr)
          num(e, `${p}.upkeepTierMult`, rt.upkeepTierMult ?? 1, (n) => n >= 1, '>= 1')
          if (rt.makesPerHr !== undefined) nonNeg(e, `${p}.makesPerHr`, rt.makesPerHr)
          if (rt.tierMakeMult !== undefined) num(e, `${p}.tierMakeMult`, rt.tierMakeMult, (n) => n >= 1, '>= 1')
          if (rt.capPerTier !== undefined) nonNeg(e, `${p}.capPerTier`, rt.capPerTier)
          if (rt.maxInCity !== undefined) int(e, `${p}.maxInCity`, rt.maxInCity, 1)
          if (rt.leashHoursPerTier !== undefined) nonNeg(e, `${p}.leashHoursPerTier`, rt.leashHoursPerTier)
          if (rt.shieldPerTier !== undefined) unit(e, `${p}.shieldPerTier`, rt.shieldPerTier)
          if (rt.influencePerHrPerTier !== undefined) nonNeg(e, `${p}.influencePerHrPerTier`, rt.influencePerHrPerTier)
          if (rt.injuryMult !== undefined) rate(e, `${p}.injuryMult`, rt.injuryMult)
          if (rt.loyaltyPerDay !== undefined) nonNeg(e, `${p}.loyaltyPerDay`, rt.loyaltyPerDay)
          if (rt.lendHoursPerTier !== undefined) nonNeg(e, `${p}.lendHoursPerTier`, rt.lendHoursPerTier)
        } else {
          positive(e, `${p}.baseYield`, rt.baseYield)
        }
        if (rt.kind === 'joint') {
          nonNeg(e, `${p}.sellsPerHr`, rt.sellsPerHr)
          unit(e, `${p}.cigaretteShare`, rt.cigaretteShare)
        }
      }
      for (const syn of r.synergies) {
        const p = `rackets.synergies.${syn.id}`
        if (!RACKET_TYPES.includes(syn.a)) e.push(`${p}.a: unknown business ${syn.a}`)
        if (syn.b !== undefined && syn.b !== 'joints' && !RACKET_TYPES.includes(syn.b)) e.push(`${p}.b: unknown business ${syn.b}`)
        if (syn.district !== undefined && !DISTRICT_IDS.includes(syn.district)) e.push(`${p}.district: unknown district ${syn.district}`)
        if (syn.effect.yieldMult !== undefined) positive(e, `${p}.effect.yieldMult`, syn.effect.yieldMult)
        if (syn.effect.influenceMult !== undefined) positive(e, `${p}.effect.influenceMult`, syn.effect.influenceMult)
        for (const [k, v] of Object.entries(syn.effect.upkeepMultOf ?? {})) nonNeg(e, `${p}.effect.upkeepMultOf.${k}`, v)
      }
      positive(e, 'supply.baseCap', c.supply.baseCap)
      nonNeg(e, 'supply.startingStock', c.supply.startingStock)
      if (!ACTS.includes(c.supply.sellFromAct)) e.push('supply.sellFromAct: expected an act')
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
      num(e, 'fronts.utilSmoothingHours', f.utilSmoothingHours, (n) => n >= 1, '>= 1')
      positive(e, 'fronts.bufferHours', f.bufferHours)
      nonNeg(e, 'fronts.upgrade.rateStep', f.upgrade.rateStep)
      int(e, 'fronts.upgrade.levels', f.upgrade.levels, 0)
      nonNeg(e, 'fronts.upgrade.costPctOfUnlock', f.upgrade.costPctOfUnlock)
      nonNeg(e, 'fronts.upgrade.minCostBasis', f.upgrade.minCostBasis)
      nonNeg(e, 'fronts.reserveHours', f.reserveHours)
      positive(e, 'fronts.modes.push.throughputMult', f.modes.push.throughputMult)
      num(e, 'fronts.modes.push.suspicionStartUtil', f.modes.push.suspicionStartUtil, (n) => n >= 0 && n < 1, 'in [0, 1)')
      positive(e, 'fronts.modes.layLow.throughputMult', f.modes.layLow.throughputMult)
      nonNeg(e, 'fronts.upgrade.capacity.step', f.upgrade.capacity.step)
      int(e, 'fronts.upgrade.capacity.levels', f.upgrade.capacity.levels, 0)
      nonNeg(e, 'fronts.upgrade.capacity.costPctOfUnlock', f.upgrade.capacity.costPctOfUnlock)
      for (const t of FRONT_TYPES) {
        const ft = f.types[t]
        rate(e, `fronts.types.${t}.rate`, ft.rate)
        num(e, `fronts.types.${t}.rate (max level)`, ft.rate + f.upgrade.rateStep * f.upgrade.levels,
          (n) => n <= 1, '<= 1 at max upgrade level')
        positive(e, `fronts.types.${t}.throughput`, ft.throughput)
        if (!ACTS.includes(ft.act)) e.push(`fronts.types.${t}.act: expected an act`)
        if (ft.minProsperity !== undefined) num(e, `fronts.types.${t}.minProsperity`, ft.minProsperity, (n) => n >= 0 && n <= 100, 'in [0, 100]')
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
        if (!ACTS.includes(c.officials.list[id].act)) e.push(`officials.list.${id}.act: expected an act`)
      }
    },
    (e) => {
      const cr = c.crew
      for (const a of ACTS) {
        int(e, `crew.slotsByAct.${a}`, cr.slotsByAct[a], 1)
        const [lo, hi] = cr.statBandByAct[a] ?? []
        num(e, `crew.statBandByAct.${a}`, lo, (n) => isNum(hi) && n >= 0 && n <= hi, '[lo, hi] with 0 <= lo <= hi')
      }
      for (const a of LATER_ACTS) {
        if (cr.slotsByAct[a] < cr.slotsByAct[(a - 1) as Act]) e.push(`crew.slotsByAct: act ${a} must not have fewer slots than act ${a - 1}`)
      }
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
      if (!Array.isArray(cr.openingPool) || cr.openingPool.length === 0) e.push('crew.openingPool: list at least one person')
      for (const seed of cr.openingPool ?? []) {
        for (const st of STATS) {
          if (seed.potential && !(seed.potential[st] >= seed[st])) e.push(`crew.openingPool.${seed.name}.potential.${st}: below the stat`)
        }
      }
      const x = cr.experience
      for (const b of OP_BANDS) nonNeg(e, `crew.experience.xpByBand.${b}`, x.xpByBand[b])
      for (const o of OP_OUTCOMES) nonNeg(e, `crew.experience.outcomeMult.${o}`, x.outcomeMult[o])
      positive(e, 'crew.experience.pointCost.base', x.pointCost.base)
      nonNeg(e, 'crew.experience.pointCost.perAbove30', x.pointCost.perAbove30)
      range(e, 'crew.experience.potentialRoll', x.potentialRoll, (n) => n >= 0)
      nonNeg(e, 'crew.experience.mentorBonus', x.mentorBonus)
      nonNeg(e, 'crew.experience.enforcerXpPerHr', x.enforcerXpPerHr)
      num(e, 'crew.experience.ranks', x.ranks.soldier, (n) => n > 0 && n < x.ranks.made && x.ranks.made < x.ranks.capo, 'soldier < made < capo, all > 0')
      int(e, 'crew.experience.perkChoices', x.perkChoices, 1)
      for (const p of PERK_IDS) if (!x.perks[p]) e.push(`crew.experience.perks.${p}: missing`)
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
        if (op.training !== undefined) {
          if (!STATS.includes(op.training)) e.push(`ops.list.${t}.training: unknown stat`)
          if (op.crew !== 1) e.push(`ops.list.${t}.crew: training takes one crew member`)
          nonNeg(e, `ops.list.${t}.xp`, op.xp ?? 0)
        }
        if (op.costDirty !== undefined) nonNeg(e, `ops.list.${t}.costDirty`, op.costDirty)
        if (op.costClean !== undefined) nonNeg(e, `ops.list.${t}.costClean`, op.costClean)
        if (op.cigarettes !== undefined) nonNeg(e, `ops.list.${t}.cigarettes`, op.cigarettes)
        if (op.heatDiffPerPoint !== undefined) nonNeg(e, `ops.list.${t}.heatDiffPerPoint`, op.heatDiffPerPoint)
      }
      for (const b of o.reports.bands) if (!OP_BANDS.includes(b)) e.push(`ops.reports.bands: unknown band ${b}`)
      for (const outcome of OP_OUTCOMES) choices(e, `ops.reports.byOutcome.${outcome}`, o.reports.byOutcome[outcome])
    },
    (e) => {
      const i = c.inbox
      positive(e, 'inbox.reportHours', i.reportHours)
      positive(e, 'inbox.incidentHours', i.incidentHours)
      positive(e, 'inbox.perkHours', i.perkHours)
      int(e, 'inbox.maxPending', i.maxPending, 0)
      unit(e, 'incidents.chancePerHr', c.incidents.chancePerHr)
      nonNeg(e, 'incidents.startAfterHours', c.incidents.startAfterHours)
      for (const t of INCIDENT_TYPES) {
        const inc = c.incidents.types[t]
        if (!inc) { e.push(`incidents.types.${t}: missing`); continue }
        choices(e, `incidents.types.${t}.options`, inc.options)
      }
    },
    (e) => {
      const o = c.offers
      int(e, 'offers.count', o.count, 0)
      positive(e, 'offers.refreshHours', o.refreshHours)
      for (const [id, tpl] of Object.entries(o.templates)) {
        const p = `offers.templates.${id}`
        const base = c.ops.list[tpl.base]
        if (!base) { e.push(`${p}.base: unknown job ${tpl.base}`); continue }
        if (base.districtPressure) e.push(`${p}.base: pressure jobs can't be offers`)
        range(e, `${p}.diffAdd`, tpl.diffAdd, (n) => Number.isFinite(n))
        range(e, `${p}.rewardMult`, tpl.rewardMult, (n) => n > 0)
        range(e, `${p}.spikeMult`, tpl.spikeMult, (n) => n >= 0)
        range(e, `${p}.minutesMult`, tpl.minutesMult, (n) => n > 0)
      }
    },
    (e) => {
      int(e, 'districts.pressureOpsToFlip', c.districts.pressureOpsToFlip, 1)
      for (const id of DISTRICT_IDS) {
        const d = c.districts.list[id]
        if (!Array.isArray(d.allows) || d.allows.length === 0) e.push(`districts.list.${id}.allows: list at least one racket type`)
        else {
          for (const t of d.allows) {
            if (!RACKET_TYPES.includes(t)) e.push(`districts.list.${id}.allows: unknown racket type ${t}`)
            else if (c.rackets.types[t].kind === 'premises') e.push(`districts.list.${id}.allows: ${t} is premises, which go on lots`)
          }
        }
        int(e, `districts.list.${id}.premisesLots`, d.premisesLots, 0)
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
      nonNeg(e, 'rivals.tolya.haggle.diff', t.haggle.diff)
      nonNeg(e, 'rivals.tolya.haggle.noise', t.haggle.noise)
      rate(e, 'rivals.tolya.haggle.pricePct', t.haggle.pricePct)
      if (!ACTS.includes(t.attack.fromAct)) e.push('rivals.tolya.attack.fromAct: expected an act')
      unit(e, 'rivals.tolya.attack.chance', t.attack.chance)
      unit(e, 'rivals.tolya.attack.chanceNoTurf', t.attack.chanceNoTurf)
      unit(e, 'rivals.tolya.attack.chanceHostile', t.attack.chanceHostile)
      const z = c.rivals.zhanna
      positive(e, 'rivals.zhanna.shipment.cigarettes', z.shipment.cigarettes)
      positive(e, 'rivals.zhanna.shipment.basePrice', z.shipment.basePrice)
      range(e, 'rivals.zhanna.shipment.priceClamp', z.shipment.priceClamp, (n) => n > 0)
      positive(e, 'rivals.zhanna.shipment.cooldownHours', z.shipment.cooldownHours)
      num(e, 'rivals.zhanna.shipment.hostileMarkup', z.shipment.hostileMarkup, (n) => n >= 1, '>= 1')
      nonNeg(e, 'rivals.zhanna.surplus.pricePerPack', z.surplus.pricePerPack)
      int(e, 'rivals.zhanna.surplus.maxPerDay', z.surplus.maxPerDay, 0)
      nonNeg(e, 'rivals.zhanna.seizureDiff', z.seizureDiff)
    },
    (e) => {
      const r = c.reputation
      nonNeg(e, 'reputation.perCleanSpent', r.perCleanSpent)
      const pr = c.progression
      if (!ACTS.includes(pr.finalAct)) e.push('progression.finalAct: expected an act')
      for (const a of LATER_ACTS) {
        const g = pr.acts[a]
        const p = `progression.acts.${a}`
        if (!g) { e.push(`${p}: missing`); continue }
        if (g.rep !== undefined) nonNeg(e, `${p}.rep`, g.rep)
        for (const id of g.holds ?? []) if (!DISTRICT_IDS.includes(id)) e.push(`${p}.holds: unknown district ${id}`)
        for (const f of g.fronts ?? []) if (!FRONT_TYPES.includes(f)) e.push(`${p}.fronts: unknown front ${f}`)
        if (!g.goals && g.rep === undefined && !(g.holds ?? []).length && !(g.fronts ?? []).length) e.push(`${p}: a gate needs at least one condition`)
      }
      const inj = c.injuries
      if (!ACTS.includes(inj.fromAct)) e.push('injuries.fromAct: expected an act')
      unit(e, 'injuries.chanceOnFail', inj.chanceOnFail)
      unit(e, 'injuries.minMuscleWeight', inj.minMuscleWeight)
      positive(e, 'injuries.hours', inj.hours)
      const cr = c.credit
      if (!ACTS.includes(cr.fromAct)) e.push('credit.fromAct: expected an act')
      nonNeg(e, 'credit.maxDaysOfClean', cr.maxDaysOfClean)
      nonNeg(e, 'credit.minCap', cr.minCap)
      nonNeg(e, 'credit.interestPerDay', cr.interestPerDay)
      rate(e, 'credit.repayPctPerDay', cr.repayPctPerDay)
      unit(e, 'credit.secondMissVaultPct', cr.secondMissVaultPct)
      positive(e, 'credit.lending.termHours', cr.lending.termHours)
      nonNeg(e, 'credit.lending.returnPct', cr.lending.returnPct)
      unit(e, 'credit.lending.defaultBase', cr.lending.defaultBase)
      nonNeg(e, 'credit.lending.defaultPerProsperity', cr.lending.defaultPerProsperity)
      unit(e, 'credit.lending.minDefault', cr.lending.minDefault)
      const ps = c.prosperity
      if (!ACTS.includes(ps.fromAct)) e.push('prosperity.fromAct: expected an act')
      num(e, 'prosperity.base', ps.base, (n) => n >= 0 && n <= 100, 'in [0, 100]')
      num(e, 'prosperity.stepPerHr', ps.stepPerHr, (n) => n > 0 && n <= 1, 'in (0, 1]')
      range(e, 'prosperity.yieldMult', ps.yieldMult, (n) => n > 0)
      nonNeg(e, 'prosperity.inspectedPenalty', ps.inspectedPenalty)
      nonNeg(e, 'prosperity.raidPenalty', ps.raidPenalty)
      positive(e, 'prosperity.raidPenaltyHours', ps.raidPenaltyHours)
      nonNeg(e, 'prosperity.shortagePenalty', ps.shortagePenalty)
    },
    (e) => {
      const g = c.gold
      int(e, 'gold.starting', g.starting, 0)
      for (const a of LATER_ACTS) int(e, `gold.perActUnlocked.${a}`, g.perActUnlocked[a], 0)
      positive(e, 'gold.hoursPerBar', g.hoursPerBar)
      int(e, 'gold.maxSkipHours', g.maxSkipHours, 1)
      if (!Array.isArray(g.skipChoices) || g.skipChoices.some((h) => !Number.isInteger(h) || h < 1 || h > g.maxSkipHours)) {
        e.push('gold.skipChoices: whole hours from 1 to maxSkipHours')
      }
    },
    (e) => {
      const q = c.opening.quickStart
      for (const r of q.rackets) {
        if (!RACKET_TYPES.includes(r.type) || !DISTRICT_IDS.includes(r.districtId)) e.push(`opening.quickStart.rackets: unknown ${r.type} in ${r.districtId}`)
      }
      for (const f of q.fronts) if (!FRONT_TYPES.includes(f)) e.push(`opening.quickStart.fronts: unknown front ${f}`)
      if (q.recruits.length > c.crew.slotsByAct[1]) e.push('opening.quickStart.recruits: more than act 1 has slots for')
      for (const id of q.recruits) {
        if (!c.crew.openingPool.some((_, i) => `cand0-${i}` === id)) e.push(`opening.quickStart.recruits: ${id} isn't in crew.openingPool`)
      }
      positive(e, 'tutorial.tolyaAfterMinutes', c.tutorial.tolyaAfterMinutes)
      int(e, 'goals.rewardGold', c.goals.rewardGold, 0)
      for (const g of c.goals.list) if (!GOAL_IDS.includes(g)) e.push(`goals.list: unknown goal ${g}`)
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
// Only maps the engine iterates by key are open; maps keyed by a fixed union (incident types) are not.
const OPEN_PATHS = [
  /^costs\.overrides$/,
  /^ops\.list\.[^.]+$/,
  /^ops\.list\.[^.]+\.w$/,
  /^districts\.list\.[^.]+\.mod(\..+)?$/,
  /^offers\.templates$/,
  /^progression\.acts\.[^.]+$/, // a gate may ask for conditions its default doesn't (ADR 0040)
]

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
