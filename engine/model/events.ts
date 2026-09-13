import type {
  Act,
  Controller,
  DistrictId,
  FrontMode,
  FrontType,
  GoalId,
  IncidentType,
  OfficialId,
  OpOutcome,
  OpType,
  PerkId,
  RacketType,
  Specialization,
  Stat,
} from '../config/schema'
import type { InboxEffects, InboxItem } from './state'

export type GoldSource = 'start' | 'act' | 'goal' | 'debug' | 'ad' | 'purchase'

// What happened during a reconcile or apply. Events are the playtest log.
export type EventBody =
  | { type: 'OFFLINE_CAPPED'; skippedHours: number }
  | { type: 'VAULT_CAPPED'; cap: number }
  | { type: 'COLLECTED'; amount: number }
  | { type: 'DEPOSITED'; frontId: string; amount: number; instantClean?: number }
  | { type: 'RACKET_BOUGHT'; racketId: string; racketType: RacketType; districtId: DistrictId; cost: number }
  | { type: 'RACKET_UPGRADED'; racketId: string; tier: number; cost: number; specialization?: Specialization }
  | { type: 'RACKET_REPAIRED'; racketId: string; cost: number }
  | { type: 'FRONT_BOUGHT'; frontId: string; frontType: FrontType; cost: number }
  | { type: 'FRONT_UPGRADED'; frontId: string; level: number; cost: number; track?: 'rate' | 'capacity' }
  | { type: 'FRONT_MODE_SET'; frontId: string; mode: FrontMode }
  | { type: 'ENFORCER_ASSIGNED'; crewId: string; racketId: string }
  | { type: 'ENFORCER_REMOVED'; crewId: string; racketId: string }
  | { type: 'OP_STARTED'; opId: string; opType: OpType; crewIds: string[]; districtId?: DistrictId; name?: string; offerId?: string }
  | {
      type: 'OP_RESOLVED'
      opId: string
      opType: OpType
      crewIds: string[]
      outcome: OpOutcome
      score: number
      diff: number
      dirty: number
      influence: number
      influenceLostToCap: number
      spike: number
      rep: number
      districtId?: DistrictId
      name?: string // an offer's own name
      offerId?: string
      cigarettes?: number // packs a smuggling run put in stock
    }
  | { type: 'UPKEEP_PAID'; amount: number }
  | { type: 'UPKEEP_MISSED'; owed: number; paid: number }
  | { type: 'STOCK_OUT' }
  | { type: 'STOCK_CAPPED'; cap: number }
  | { type: 'SHORTAGE_STARTED'; demand: number; made: number }
  | { type: 'SHORTAGE_ENDED' }
  | { type: 'GOLD_GRANTED'; amount: number; source: GoldSource }
  | { type: 'TIME_SKIPPED'; hours: number; bars: number }
  | { type: 'OP_RUSHED'; opId: string; opType: OpType; bars: number; name?: string }
  | { type: 'GOAL_DONE'; goalId: GoalId; gold: number }
  | { type: 'REPORT_FILED'; itemId: string; opId: string; opType: OpType; outcome: OpOutcome; expiresAt: number }
  | { type: 'INCIDENT_RAISED'; itemId: string; incidentType: IncidentType; crewId?: string; racketId?: string; expiresAt: number }
  | { type: 'INBOX_RESOLVED'; itemId: string; kind: InboxItem['kind']; ref: string; optionId: string; optionName: string; auto: boolean; effects: InboxEffects }
  | { type: 'OFFERS_REFRESHED'; count: number }
  | { type: 'TRAINING_DONE'; opId: string; crewId: string; name: string; stat: Stat; xp: number }
  | { type: 'CREW_STAT_UP'; crewId: string; name: string; stat: Stat; value: number }
  | { type: 'CREW_RANK_UP'; crewId: string; name: string; rank: number }
  | { type: 'PERK_CHOSEN'; crewId: string; name: string; perk: PerkId }
  | { type: 'TRIBUTE_HAGGLED'; crewId: string; name: string; won: boolean; demand: number; paid: number }
  | { type: 'RECRUITED'; crewId: string; name: string; cost: number }
  | { type: 'FIRED'; crewId: string; name: string }
  | { type: 'RAISED'; crewId: string; cost: number; loyalty: number }
  | { type: 'CREW_SLOT_BOUGHT'; cost: number; slots: number }
  | { type: 'POOL_REFRESHED' }
  | { type: 'OFFICIAL_BOUGHT'; officialId: OfficialId; cost: number }
  | { type: 'BRIBED'; cost: number; control: number; until: number }
  | { type: 'BRIBE_EXPIRED' }
  | { type: 'INSPECTION_STARTED'; heat: number }
  | { type: 'INSPECTION_ENDED'; heat: number }
  | { type: 'RAID'; heat: number; seized: number }
  | { type: 'ARREST'; heat: number; crewId: string; name: string; until: number }
  | { type: 'RELEASED'; crewId: string; name: string }
  | { type: 'WAGES_PAID'; amount: number }
  | { type: 'WAGES_MISSED'; owed: number; paid: number }
  | { type: 'WALKOUT'; crewId: string; name: string; stolen: number }
  | { type: 'DISTRICT_BOUGHT'; districtId: DistrictId; cost: number }
  | { type: 'DISTRICT_PRESSURED'; districtId: DistrictId; count: number; needed: number }
  | { type: 'DISTRICT_FLIPPED'; districtId: DistrictId; from: Controller }
  | { type: 'TOLYA_TICK'; result: 'conditionHit' | 'tribute' | 'nothing'; racketId?: string; amount?: number; hostile: boolean }
  | { type: 'TRIBUTE_PAID'; amount: number }
  | { type: 'TRIBUTE_REFUSED'; amount: number; racketId?: string; explicit?: true }
  | { type: 'ACT_UNLOCKED'; act: Act }
  | { type: 'ACT_CLEARED'; act: Act }
  | { type: 'NOTE'; text: string }
  | { type: 'TUTORIAL_STEP'; step: number; done: boolean }
  | { type: 'SESSION_START' }
  | { type: 'SESSION_END'; durationMs: number; actions: number }
  | { type: 'DEBUG'; action: string; detail?: string }
  | { type: 'CONFIG_CHANGED'; path: string; value: number | boolean | null; preset: string }

export type EventType = EventBody['type']
export type GameEvent = EventBody & { t: number }
export type EventOf<K extends EventType> = Extract<GameEvent, { type: K }>
