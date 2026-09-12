// Public surface of the engine. Pure TypeScript: no React, no Expo, no Date.now(), no Math.random().
export * from './config'
export * from './model/state'
export * from './model/actions'
export * from './model/events'
export { migrate } from './model/migrate'
export { reconcile, type Result } from './core/reconcile'
export { apply, type ApplyResult } from './core/apply'
export { derive, type Derived, type FrontDerived, type RacketDerived, type SupplyDerived } from './core/derive'
export * as formulas from './core/formulas'
export { makeRng, type Rand, type RngFactory } from './core/rng'
export * from './core/time'
export { newGame } from './newGame'
export { baseWage, crewSlots, effectiveStat } from './systems/crew'
export { canPressure, districtUnlocked, openLots, openSpots, premisesBlocked } from './systems/districts'
export {
  influenceRoom,
  opBaseScore,
  opConfigAt,
  opConfigOf,
  opDirtyReward,
  opDirtyRewardFor,
  opMinutesFor,
  opUnlocked,
  outcomeOdds,
} from './systems/ops'
export { jobXp, rankFor, RANK_NAMES } from './systems/experience'
export { rushCost, skipCost } from './systems/gold'
export { bestHaggler, canHaggle, haggleOdds } from './systems/rivals'
export { canAffordEffects, incidentNeedHolds } from './systems/inbox'
export { ledgerDays, type LedgerDay } from './systems/ledger'
export { tolyaHostile, tolyaIntervalHours } from './systems/rivals'
export { currentTutorialStep, TUTORIAL_STEPS, type TutorialStepId } from './systems/tutorial'
