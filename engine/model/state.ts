import type {
  Act,
  Controller,
  DistrictId,
  Ending,
  FrontMode,
  GoalId,
  FrontType,
  OfficialId,
  OpConfig,
  OpOutcome,
  OpType,
  PerkId,
  RacketType,
  Specialization,
  Stat,
  TraitId,
} from '../config/schema'
import type { GameEvent } from './events'

export const SCHEMA_VERSION = 13
export const LOG_CAP = 200
export const LEDGER_ROWS = 8 // 7 closed days plus today's opening snapshot

export type Racket = {
  id: string
  type: RacketType
  districtId: DistrictId
  tier: number
  condition: number // 0–100; yield × condition/100
  enforcerId: string | null
  specialization?: Specialization // chosen on the way to rackets.specialization.atTier
  specialization6?: Specialization // chosen on the way to rackets.specialization6.atTier (ADR 0041)
  closedUntil?: number // shut (an investigation) until then: earns, sells and heats nothing
  legal?: true // legalized (ADR 0045): earns Clean directly, draws no heat, pays no tribute
}

export type Front = {
  id: string
  type: FrontType
  level: number // rate upgrades
  capacityLevel: number // throughput upgrades
  mode: FrontMode
  buffer: number // dirty deposited, not yet converted
  convertedThisHour: number // dirty converted since the last whole hour
  util: number // smoothed utilization, updated at each whole hour; drives suspicion
  frozenUntil?: number // the Ministry has frozen it until then: it launders nothing (ADR 0044)
}

export type CrewStatus = 'idle' | 'on_op' | 'enforcer' | 'jailed' | 'injured'

export type CrewMember = {
  id: string
  name: string
  muscle: number
  brains: number
  nerve: number
  loyalty: number
  traits: TraitId[]
  status: CrewStatus
  nephew?: boolean
  jailedUntil?: number
  injuredUntil?: number // hurt until then (ADR 0042): can't work, still draws wages
  assignedTo?: string // racket id (enforcer) or op id (on_op)
  xp: Record<Stat, number> // toward the next point in each stat
  potential: Record<Stat, number> // ceilings
  gained: number // stat points earned since joining; sets rank
  rank: number // 0 Associate, 1 Soldier, 2 Made, 3 Capo
  perks: PerkId[]
}

export type OpInstance = {
  id: string
  type: OpType
  crewIds: string[]
  startedAt: number
  completesAt: number
  districtId?: DistrictId // pressure target
  offerId?: string // taken from the opportunities board
  cfg?: OpConfig // the offer's job, snapshotted: resolution uses this instead of ops.list
  name?: string
}

export type District = {
  id: DistrictId
  controller: Controller
  pressureCount: number // successful pressure ops toward a flip
  prosperity: number // 0–100, stepped toward its target at whole hours from prosperity.fromAct (ADR 0041)
}

export type TolyaState = {
  disposition: number
  nextTickAt: number
  tickCount: number
  demand: number | null // tribute demanded; refused if still unpaid at the next tick
  haggledTick: number | null // tickCount when a haggle over the current demand failed
  forceResult?: 'tribute' // the next visit is a demand (the opening schedules one)
}

// Zhanna (ADR 0036): lots of cigarettes and a buyer for the surplus, from Act II.
export type ZhannaState = {
  disposition: number
  nextShipmentAt: number // her next lot is in
  shipmentsBought: number
  surplusToday: { day: number; packs: number } // packs she's bought today
}

// The Colonel (ADR 0043): he runs the road to the border; passage keeps his men off your convoys.
export type ColonelState = { disposition: number; passageUntil: number; passagesBought: number }

// Act V (ADR 0044): the city's opinion of you, the Ministry's attention, and the elections.
export type PoliticsState = {
  opinion: number // 0–100, stepped toward its target at whole hours from opinion.fromAct
  attention: number // the Ministry's, 0–100, stepped the same way; a front freezes at ministry.freezeAt
  nextElectionAt: number // 0 when none is scheduled (before Act V, or once you're mayor)
  elections: number // held so far; seeds each count
  points: number // campaign points for the coming election
  mayor: boolean // won an election: permanent
}

// Borrowed Clean (ADR 0042): one loan at a time, paid down from Clean at each day start.
export type Loan = { principal: number; owed: number; missed: number }
// Dirty lent out through a loan desk, due back with interest unless the borrower defaults.
export type Lending = { id: string; amount: number; dueAt: number }

// What an inbox option does, materialized when the item is filed.
export type InboxEffects = {
  dirty?: number
  clean?: number
  influence?: number
  rep?: number
  heat?: number
  loyalty?: number // each crew member on the item
  condition?: number // the business on the item
  disposition?: number // Tolya
  cigarettes?: number
  perk?: string
  closeHours?: number // the business on the item shuts for this long
  injureHours?: number // the crew member who fought is hurt for this long
  freezeHours?: number // the front moving the most money freezes for this long (ADR 0045)
  hearingWon?: true // a hearing beaten in court: counts toward the Empire (ADR 0045)
  // Resolved when the option is chosen (ADR 0042): the best available crew member's stat + luck against diff.
  contest?: { stat: Stat; diff: number; win: InboxEffects; lose: InboxEffects }
}

export type InboxOption = { id: string; name: string; effects: InboxEffects }

export type InboxItem = {
  id: string
  kind: 'report' | 'incident' | 'perk'
  ref: string // OpType for reports, IncidentType for incidents, crew id for perks
  opId?: string
  outcome?: OpOutcome
  crewIds?: string[]
  racketId?: string
  createdAt: number
  expiresAt: number
  options: InboxOption[]
  defaultOptionId: string
}

export type Offer = {
  id: string
  opType: OpType
  name: string
  cfg: OpConfig // materialized variant of the base job
  expiresAt: number
}

export const LEDGER_COUNTERS = [
  'dirtyEarned',
  'jobDirty',
  'inboxDirty',
  'cleanEarned',
  'cleanSpent',
  'wagesPaid',
  'repairsPaid',
  'bribesPaid',
  'tributeLost',
  'seized',
  'trainingPaid',
  'upkeepPaid',
  'smugglingPaid',
  'shipmentsPaid',
  'surplusSold',
] as const
export type LedgerCounter = (typeof LEDGER_COUNTERS)[number]
export type LedgerRow = { startsAt: number } & Record<LedgerCounter, number>

export type PlaytestStats = {
  sessions: number
  actions: number
  actClearedAt: Partial<Record<Act, number>> // act n is cleared when act n + 1 opens (the final act: when its gate is met)
  raids: number
  arrests: number
  missedWages: number
  walkouts: number
  opOutcomes: { full: number; partial: number; fail: number }
  opsByCrew: Record<string, number>
  opsByType: Partial<Record<OpType, number>>
  dirtyEarned: number // vault accrual + op rewards
  dirtyLostToCap: number // yield that hit a full vault
  jobDirty: number // op rewards alone
  offerDirty: number // op rewards from offers
  inboxDirty: number // net Dirty from decisions (can be negative)
  cleanEarned: number
  cleanSpent: number
  wagesPaid: number
  repairsPaid: number
  bribesPaid: number
  tributeLost: number // district tribute skimmed + Tolya demands paid
  seized: number
  trainingPaid: number
  upkeepPaid: number
  missedUpkeep: number // day starts when upkeep couldn't be covered
  smugglingPaid: number // Clean
  shipmentsPaid: number
  surplusSold: number // Dirty received
  packsMade: number
  packsSold: number
  packsLostToCap: number // made or brought in with no room in stock
  shortageHours: number // whole hours that found stock empty with joints selling
  premiumMade: number
  premiumSold: number
  premiumLostToCap: number
  premiumShortageHours: number
  convoys: { run: number; landed: number; hijacked: number; seized: number }
  passagesPaid: number // Dirty
  elections: { held: number; won: number }
  legalized: number
  legalClean: number // Clean earned by legal businesses
  hearings: { held: number; won: number }
  endings: Partial<Record<Ending, number>> // when each was first reached (ADR 0045)
  campaignPaid: { dirty: number; influence: number }
  frontsFrozen: number
  inbox: { filed: number; resolved: number; auto: number }
  specializations: { greed: number; stealth: number }
  frontModeChanges: number
  haggles: { won: number; lost: number }
  statPointsGained: number
  gold: { granted: number; spentSkip: number; spentRush: number; hoursSkipped: number }
  loans: { borrowed: number; interest: number; repaid: number; missed: number; seized: number }
  lending: { lent: number; returned: number; defaults: number }
  injuries: number
  attacks: number
  contests: { won: number; lost: number }
  firstRaidAt: number | null
  officialBoughtAt: Partial<Record<OfficialId, number>>
  lastSessionAt: number | null
}

export type PlayerState = {
  schemaVersion: number
  playerId: string // seeds every roll
  createdAt: number
  updatedAt: number // game-time ms of the last reconcile/apply
  debugOffsetMs: number
  skippedMs: number // game time bought with gold: part of the clock, never shifted
  nextId: number

  vault: number // accrues, capped; raids seize from here
  dirty: number // collected, spendable, uncapped
  clean: number
  influence: number
  reputation: number
  gold: number // bars: they buy time and nothing else (ADR 0034)
  act: Act

  heat: number // displayed value; converges toward the target
  inspected: boolean // heat ≥ inspectThreshold at the last whole hour
  raidPenaltyUntil: number // prosperity is down after a raid until then (ADR 0041)

  inventory: { cigarettes: number; premium: number } // the city-wide stocks (ADRs 0032, 0043)
  stockEmpty: boolean // stock at zero with joints selling, at the last whole hour
  premiumEmpty: boolean // premium stock at zero with premium joints selling, at the last whole hour

  rackets: Racket[]
  fronts: Front[]
  crew: CrewMember[]
  crewSlotsBought: number
  recruitPool: { candidates: CrewMember[]; refreshAt: number; refreshCount: number }
  ops: OpInstance[]
  districts: District[]
  officials: OfficialId[]
  officialCooldownUntil: number
  bribeUntil: number
  bribeControl: number

  wagesOwed: number // accrues continuously, settled at each day boundary
  upkeepOwed: number // premises upkeep: accrues continuously, settled after wages
  loan: Loan | null
  lending: Lending | null
  influenceToday: { day: number; amount: number } // ops Influence, for the daily cap
  rival: { tolya: TolyaState; zhanna: ZhannaState; colonel: ColonelState }
  politics: PoliticsState
  tutorial: { step: number; done: boolean }
  goals: { done: GoalId[] } // Act I goals completed (ADR 0035)
  firstConversionDone: boolean

  inbox: InboxItem[] // pending decisions
  offers: { items: Offer[]; refreshAt: number; refreshCount: number }
  ledger: LedgerRow[] // cumulative stat snapshots at day starts, newest last

  log: GameEvent[] // ring buffer of the latest LOG_CAP events
  stats: PlaytestStats
}

export function emptyStats(): PlaytestStats {
  return {
    sessions: 0,
    actions: 0,
    actClearedAt: {},
    raids: 0,
    arrests: 0,
    missedWages: 0,
    walkouts: 0,
    opOutcomes: { full: 0, partial: 0, fail: 0 },
    opsByCrew: {},
    opsByType: {},
    dirtyEarned: 0,
    dirtyLostToCap: 0,
    jobDirty: 0,
    offerDirty: 0,
    inboxDirty: 0,
    cleanEarned: 0,
    cleanSpent: 0,
    wagesPaid: 0,
    repairsPaid: 0,
    bribesPaid: 0,
    tributeLost: 0,
    seized: 0,
    trainingPaid: 0,
    upkeepPaid: 0,
    missedUpkeep: 0,
    smugglingPaid: 0,
    shipmentsPaid: 0,
    surplusSold: 0,
    packsMade: 0,
    packsSold: 0,
    packsLostToCap: 0,
    shortageHours: 0,
    premiumMade: 0,
    premiumSold: 0,
    premiumLostToCap: 0,
    premiumShortageHours: 0,
    convoys: { run: 0, landed: 0, hijacked: 0, seized: 0 },
    passagesPaid: 0,
    elections: { held: 0, won: 0 },
    legalized: 0,
    legalClean: 0,
    hearings: { held: 0, won: 0 },
    endings: {},
    campaignPaid: { dirty: 0, influence: 0 },
    frontsFrozen: 0,
    inbox: { filed: 0, resolved: 0, auto: 0 },
    specializations: { greed: 0, stealth: 0 },
    frontModeChanges: 0,
    haggles: { won: 0, lost: 0 },
    statPointsGained: 0,
    gold: { granted: 0, spentSkip: 0, spentRush: 0, hoursSkipped: 0 },
    loans: { borrowed: 0, interest: 0, repaid: 0, missed: 0, seized: 0 },
    lending: { lent: 0, returned: 0, defaults: 0 },
    injuries: 0,
    attacks: 0,
    contests: { won: 0, lost: 0 },
    firstRaidAt: null,
    officialBoughtAt: {},
    lastSessionAt: null,
  }
}

export function ledgerSnapshot(stats: PlaytestStats, startsAt: number): LedgerRow {
  const row = { startsAt } as LedgerRow
  for (const k of LEDGER_COUNTERS) row[k] = stats[k]
  return row
}
