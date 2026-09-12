import type {
  Act,
  Controller,
  DistrictId,
  FrontType,
  OfficialId,
  OpType,
  RacketType,
  TraitId,
} from '../config/schema'
import type { GameEvent } from './events'

export const SCHEMA_VERSION = 1
export const LOG_CAP = 200

export type Racket = {
  id: string
  type: RacketType
  districtId: DistrictId
  tier: number
  condition: number // 0–100; yield × condition/100
  enforcerId: string | null
}

export type Front = {
  id: string
  type: FrontType
  level: number
  buffer: number // dirty deposited, not yet converted
  convertedThisHour: number // dirty converted since the last whole hour
  lastUtil: number // utilization over the last whole hour; drives suspicion
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
}

export type OpInstance = {
  id: string
  type: OpType
  crewIds: string[]
  startedAt: number
  completesAt: number
  districtId?: DistrictId // pressure target
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
}

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
  dirtyEarned: number // vault accrual + op rewards
  dirtyLostToCap: number // yield that hit a full vault
  cleanEarned: number
  cleanSpent: number
  tributeLost: number // district tribute skimmed + Tolya demands paid
  seized: number
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
    dirtyEarned: 0,
    dirtyLostToCap: 0,
    cleanEarned: 0,
    cleanSpent: 0,
    tributeLost: 0,
    seized: 0,
    firstRaidAt: null,
    officialBoughtAt: {},
    lastSessionAt: null,
  }
}
