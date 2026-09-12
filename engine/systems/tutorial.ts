import { emit, type Ctx } from '../core/ctx'
import type { ActionType } from '../model/actions'
import type { PlayerState } from '../model/state'

// Scripted first session: Collect → Deposit (instant conversion) → Spend → Op → Heat.
// Steps advance when the player does the thing; the UI owns the copy.
export type TutorialStepId = 'collect' | 'deposit' | 'spend' | 'op' | 'heat'

export const TUTORIAL_STEPS: readonly { id: TutorialStepId; advanceOn: readonly ActionType[] }[] = [
  { id: 'collect', advanceOn: ['COLLECT'] },
  { id: 'deposit', advanceOn: ['DEPOSIT'] },
  { id: 'spend', advanceOn: ['BUY_RACKET', 'UPGRADE_RACKET'] },
  { id: 'op', advanceOn: ['START_OP'] },
  { id: 'heat', advanceOn: ['TUTORIAL_ADVANCE'] },
]

export function currentTutorialStep(state: PlayerState): TutorialStepId | null {
  return state.tutorial.done ? null : (TUTORIAL_STEPS[state.tutorial.step]?.id ?? null)
}

export function tutorialOnAction(state: PlayerState, ctx: Ctx, t: number, type: ActionType): void {
  if (state.tutorial.done) return
  if (type === 'TUTORIAL_SKIP') {
    state.tutorial = { step: TUTORIAL_STEPS.length, done: true }
    emit(ctx, t, { type: 'TUTORIAL_STEP', step: state.tutorial.step, done: true })
    return
  }
  const step = TUTORIAL_STEPS[state.tutorial.step]
  if (!step?.advanceOn.includes(type)) return
  state.tutorial.step++
  state.tutorial.done = state.tutorial.step >= TUTORIAL_STEPS.length
  emit(ctx, t, { type: 'TUTORIAL_STEP', step: state.tutorial.step, done: state.tutorial.done })
}
