import type {
  Act,
  Controller,
  DistrictId,
  FrontMode,
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

export const SCHEMA_VERSION = 3
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
}

export type CrewStatus = 'idle' | 'on_op' | 'enforcer' | 'jailed'

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
}

export type TolyaState = {
  disposition: number
  nextTickAt: number
  tickCount: number
  demand: number | null // tribute demanded; refused if still unpaid at the next tick
  haggledTick: number | null // tickCount when a haggle over the current demand failed
  forceResult?: 'tribute' // the next visit is a demand (the opening schedules one)
}

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
  actClearedAt: { 1?: number; 2?: number }
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
  smugglingPaid: number // Clean
  shipmentsPaid: number
  surplusSold: number // Dirty received
  inbox: { filed: number; resolved: number; auto: number }
  specializations: { greed: number; stealth: number }
  frontModeChanges: number
  haggles: { won: number; lost: number }
  statPointsGained: number
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
  nextId: number

  vault: number // accrues, capped; raids seize from here
  dirty: number // collected, spendable, uncapped
  clean: number
  influence: number
  reputation: number
  act: Act

  heat: number // displayed value; converges toward the target
  inspected: boolean // heat ≥ inspectThreshold at the last whole hour

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
  influenceToday: { day: number; amount: number } // ops Influence, for the daily cap
  rival: { tolya: TolyaState }
  tutorial: { step: number; done: boolean }
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
    smugglingPaid: 0,
    shipmentsPaid: 0,
    surplusSold: 0,
    inbox: { filed: 0, resolved: 0, auto: 0 },
    specializations: { greed: 0, stealth: 0 },
    frontModeChanges: 0,
    haggles: { won: 0, lost: 0 },
    statPointsGained: 0,
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
