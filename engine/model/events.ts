import type {
  Act,
  Controller,
  DistrictId,
  Ending,
  FrontMode,
  FrontType,
  GoalId,
  IncidentType,
  MissionId,
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
  | { type: 'RACKET_CLOSED'; racketId: string; until: number }
  | { type: 'RACKET_REOPENED'; racketId: string }
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
      premium?: number // premium packs a convoy put in stock (ADR 0043)
      hijacked?: true // the Colonel's men took the load
      seized?: true // customs took the load
      votes?: number // campaign points delivered (ADR 0044)
    }
  | { type: 'UPKEEP_PAID'; amount: number }
  | { type: 'UPKEEP_MISSED'; owed: number; paid: number }
  | { type: 'STOCK_OUT'; product?: 'premium' } // no product: cigarettes
  | { type: 'STOCK_CAPPED'; cap: number; product?: 'premium' }
  | { type: 'SHORTAGE_STARTED'; demand: number; made: number; product?: 'premium' }
  | { type: 'SHORTAGE_ENDED'; product?: 'premium' }
  | { type: 'GOLD_GRANTED'; amount: number; source: GoldSource }
  | { type: 'TIME_SKIPPED'; hours: number; bars: number }
  | { type: 'ROCK_BOTTOM'; act: Act }
  | { type: 'ENVELOPE_OPENED'; act: Act; stake: number }
  | { type: 'LOAN_REPOSSESSED'; racketId: string; racketType: RacketType; districtId: DistrictId; owed: number }
  | { type: 'MISSION_STARTED'; missionId: MissionId; opId: string; crewIds: string[]; stake: number }
  | {
      type: 'MISSION_RESOLVED'
      missionId: MissionId
      result: 'failed' | 'won' | 'lost'
      crewIds: string[]
      outcome?: OpOutcome
      stake?: number
      heat?: number
      injuredId?: string
      rep?: number
      influence?: number
    }
  | { type: 'OP_RUSHED'; opId: string; opType: OpType | 'mission'; bars: number; name?: string }
  | { type: 'GOAL_DONE'; goalId: GoalId; gold: number }
  | { type: 'SHIPMENT_BOUGHT'; packs: number; cost: number; product?: 'premium' }
  | { type: 'PASSAGE_BOUGHT'; cost: number; until: number }
  | { type: 'FRONT_FROZEN'; frontId: string; until: number } // the Ministry (ADR 0044)
  | { type: 'FRONT_THAWED'; frontId: string }
  | { type: 'CAMPAIGNED'; points: number; cost: number; pay: 'dirty' | 'influence'; total: number }
  | { type: 'ELECTION_HELD'; index: number; share: number; won: boolean }
  | { type: 'LEGALIZED'; racketId: string; cost: number } // ADR 0045
  | { type: 'ENDING_REACHED'; ending: Ending }
  | { type: 'SURPLUS_SOLD'; packs: number; dirty: number }
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
  | { type: 'RAID'; heat: number; seized: number; shielded: number }
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
  | { type: 'CONTEST_RESOLVED'; itemId: string; stat: Stat; diff: number; won: boolean; crewId?: string; name?: string }
  | { type: 'CREW_INJURED'; crewId: string; name: string; until: number }
  | { type: 'CREW_RECOVERED'; crewId: string; name: string }
  | { type: 'LOAN_TAKEN'; amount: number; owed: number }
  | { type: 'LOAN_PAYMENT'; paid: number; owed: number }
  | { type: 'LOAN_MISSED'; due: number; missed: number; seized?: number } // seized: only in logs from before ADR 0051
  | { type: 'LOAN_REPAID'; paid: number }
  | { type: 'LENT'; amount: number; dueAt: number }
  | { type: 'LENDING_REPAID'; amount: number; returned: number }
  | { type: 'LENDING_DEFAULTED'; amount: number }
  | { type: 'NOTE'; text: string }
  | { type: 'TUTORIAL_STEP'; step: number; done: boolean }
  | { type: 'SESSION_START' }
  | { type: 'SESSION_END'; durationMs: number; actions: number }
  | { type: 'DEBUG'; action: string; detail?: string }
  | { type: 'CONFIG_CHANGED'; path: string; value: number | boolean | null; preset: string }

export type EventType = EventBody['type']
export type GameEvent = EventBody & { t: number }
export type EventOf<K extends EventType> = Extract<GameEvent, { type: K }>
