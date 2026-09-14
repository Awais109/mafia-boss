import type { Config, GoalId, PlayerState } from '../engine'

// Act I goals on Home (ADR 0035): what each asks for, in the player's words. Act II opens the
// moment every one of these is done (ADR 0039).

export const GOAL_TEXT: Record<GoalId, string> = {
  secondDistrict: 'Fully build out two districts',
  factoryTier2: 'Upgrade the Tobacco Factory to tier 2',
  thirdCrew: 'Hire a third crew member',
  wardCop: 'Put the Ward Cop on the payroll',
  workFront: 'Get two fronts to rate level 2',
  smuggleRun: 'Run three smuggling jobs',
  soldier: 'Get someone promoted to Soldier',
}

export type GoalRow = { id: GoalId; text: string; done: boolean }

// Shown once the opening is over, until every goal is done.
export function goalsView(s: PlayerState, c: Config): GoalRow[] | null {
  if (!c.goals.enabled || !s.tutorial.done) return null
  const rows = c.goals.list.map((id) => ({ id, text: GOAL_TEXT[id], done: s.goals.done.includes(id) }))
  return rows.every((r) => r.done) ? null : rows
}
