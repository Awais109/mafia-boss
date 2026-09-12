import type { DistrictId, FrontType, OfficialId, OpType, RacketType } from '../config/schema'

export type Action =
  | { type: 'COLLECT' }
  | { type: 'DEPOSIT'; frontId: string; amount: number }
  | { type: 'BUY_RACKET'; racketType: RacketType; districtId: DistrictId }
  | { type: 'UPGRADE_RACKET'; racketId: string }
  | { type: 'REPAIR_RACKET'; racketId: string }
  | { type: 'ASSIGN_ENFORCER'; crewId: string; racketId: string | null } // null = back to idle
  | { type: 'START_OP'; opType: OpType; crewIds: string[]; districtId?: DistrictId }
  | { type: 'RECRUIT'; candidateId: string }
  | { type: 'FIRE'; crewId: string }
  | { type: 'RAISE'; crewId: string }
  | { type: 'BUY_CREW_SLOT' }
  | { type: 'BUY_OFFICIAL'; officialId: OfficialId }
  | { type: 'BRIBE' }
  | { type: 'BUY_DISTRICT'; districtId: DistrictId }
  | { type: 'BUY_FRONT'; frontType: FrontType }
  | { type: 'UPGRADE_FRONT'; frontId: string }
  | { type: 'PAY_TRIBUTE' }
  | { type: 'TUTORIAL_ADVANCE' }
  | { type: 'TUTORIAL_SKIP' }
  | { type: 'SESSION_START' }
  | { type: 'SESSION_END'; durationMs: number; actions: number }
  | DebugAction

export type DebugAction =
  | { type: 'DEBUG_ADD_OFFSET'; ms: number }
  | { type: 'DEBUG_RESET_OFFSET' }
  | { type: 'DEBUG_GRANT'; dirty?: number; clean?: number; influence?: number }
  | { type: 'DEBUG_SET_HEAT'; heat: number }
  | { type: 'DEBUG_SET_REP'; reputation: number }
  | { type: 'DEBUG_FORCE_RAID' }
  | { type: 'DEBUG_FORCE_ARREST' }
  | { type: 'DEBUG_FORCE_TOLYA' }
  | { type: 'DEBUG_COMPLETE_OPS' }
  | { type: 'DEBUG_REFRESH_POOL' }

export type ActionType = Action['type']

// Bookkeeping actions that shouldn't count toward "actions per session".
export const PASSIVE_ACTIONS: readonly ActionType[] = ['SESSION_START', 'SESSION_END', 'TUTORIAL_ADVANCE']
