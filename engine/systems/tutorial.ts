import type { RacketType } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { minutesToMs } from '../core/time'
import type { Action, ActionType } from '../model/actions'
import type { PlayerState } from '../model/state'

// The guided opening (ADR 0035): the player buys the starting setup a piece at a time, then learns the
// loop by doing it. Steps advance when the player does the thing; the app owns the words.

export type TutorialStepId =
  | 'kiosk'
  | 'stall'
  | 'factory'
  | 'front'
  | 'hire'
  | 'collect'
  | 'launder'
  | 'job'
  | 'upgrade'
  | 'heat'
  | 'tolya'
  | 'report'
  | 'city'

export type TutorialStep = {
  id: TutorialStepId
  advanceOn: readonly ActionType[]
  racketType?: RacketType // a purchase step: done once one is owned
  front?: boolean // done once any front is owned
  crew?: number // done once the crew is this big
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'kiosk', advanceOn: ['BUY_RACKET'], racketType: 'kiosk' },
  { id: 'stall', advanceOn: ['BUY_RACKET'], racketType: 'marketStall' },
  { id: 'factory', advanceOn: ['BUY_RACKET'], racketType: 'tobaccoFactory' },
  { id: 'front', advanceOn: ['BUY_FRONT'], front: true },
  { id: 'hire', advanceOn: ['RECRUIT'], crew: 2 },
  { id: 'collect', advanceOn: ['COLLECT'] },
  { id: 'launder', advanceOn: ['DEPOSIT'] },
  { id: 'job', advanceOn: ['START_OP'] },
  { id: 'upgrade', advanceOn: ['UPGRADE_RACKET'] },
  { id: 'heat', advanceOn: ['TUTORIAL_ADVANCE'] },
  { id: 'tolya', advanceOn: ['PAY_TRIBUTE'] },
  { id: 'report', advanceOn: ['RESOLVE_INBOX'] },
  { id: 'city', advanceOn: ['TUTORIAL_ADVANCE'] },
]

export function currentTutorialStep(state: PlayerState): TutorialStepId | null {
  return state.tutorial.done ? null : (TUTORIAL_STEPS[state.tutorial.step]?.id ?? null)
}

const isPurchase = (step: TutorialStep) => step.racketType !== undefined || step.front === true || step.crew !== undefined

// A purchase step is done once the thing is owned, however it got there, so buying out of order
// never strands the player.
function owned(state: PlayerState, step: TutorialStep): boolean {
  if (step.racketType) return state.rackets.some((r) => r.type === step.racketType)
  if (step.front) return state.fronts.length > 0
  if (step.crew !== undefined) return state.crew.length >= step.crew
  return false
}

function nextStep(state: PlayerState, ctx: Ctx, t: number): void {
  const leaving = TUTORIAL_STEPS[state.tutorial.step]
  state.tutorial.step++
  state.tutorial.done = state.tutorial.step >= TUTORIAL_STEPS.length
  // Right after the heat lesson, Tolya comes by with a demand, so the next step has something to answer.
  if (leaving?.id === 'heat') {
    state.rival.tolya.nextTickAt = t + minutesToMs(ctx.c, ctx.c.tutorial.tolyaAfterMinutes)
    state.rival.tolya.forceResult = 'tribute'
  }
  emit(ctx, t, { type: 'TUTORIAL_STEP', step: state.tutorial.step, done: state.tutorial.done })
}

export function tutorialOnAction(state: PlayerState, ctx: Ctx, t: number, action: Action): void {
  if (state.tutorial.done) return
  if (action.type === 'TUTORIAL_SKIP') {
    state.tutorial = { step: TUTORIAL_STEPS.length, done: true }
    emit(ctx, t, { type: 'TUTORIAL_STEP', step: state.tutorial.step, done: true })
    return
  }
  const step = TUTORIAL_STEPS[state.tutorial.step]
  if (!step) return
  const done = isPurchase(step) ? owned(state, step) : step.advanceOn.includes(action.type)
  if (!done) return
  nextStep(state, ctx, t)
  while (!state.tutorial.done && isPurchase(TUTORIAL_STEPS[state.tutorial.step]) && owned(state, TUTORIAL_STEPS[state.tutorial.step])) {
    nextStep(state, ctx, t)
  }
}
