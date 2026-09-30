import { goalProgress, openLots, openSpots, type Config, type Derived, type GoalId, type PlayerState } from '../engine'
import { glyph } from './components/ui'
import { fmt } from './format'

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

export type GoalRow = { id: GoalId; text: string; done: boolean; hint?: string }

// Shown once the opening is over, until every goal is done. Each open goal says how far along it is.
export function goalsView(s: PlayerState, c: Config, d: Derived): GoalRow[] | null {
  if (!c.goals.enabled || !s.tutorial.done) return null
  const rows = c.goals.list.map((id) => {
    const done = s.goals.done.includes(id)
    return { id, text: GOAL_TEXT[id], done, hint: done ? undefined : goalHint(s, c, d, id) }
  })
  return rows.every((r) => r.done) ? null : rows
}

function goalHint(s: PlayerState, c: Config, d: Derived, id: GoalId): string | undefined {
  const p = goalProgress(s, c, id)
  const count = p ? `${fmt(p.have)} of ${fmt(p.need)}` : undefined
  switch (id) {
    case 'secondDistrict': {
      // The nearest district to full: one you hold with room left.
      const room = s.districts
        .filter((x) => x.controller === 'player')
        .map((x) => ({ name: c.districts.list[x.id].name, spots: openSpots(s, c, x.id).length, lots: openLots(s, c, x.id) }))
        .find((x) => x.spots + x.lots > 0)
      if (!room) return count
      const free = [room.spots ? `${room.spots} free spot${room.spots === 1 ? '' : 's'}` : '', room.lots ? `${room.lots} free lot${room.lots === 1 ? '' : 's'}` : '']
      return `${count} · ${room.name} has ${free.filter(Boolean).join(' and ')}`
    }
    case 'factoryTier2': {
      const factory = s.rackets.find((r) => r.type === 'tobaccoFactory')
      return factory ? `yours is tier ${factory.tier}` : 'no factory yet'
    }
    case 'wardCop':
      return `needs ${glyph.influence}${fmt(d.costs.official.wardCop)} · you have ${glyph.influence}${fmt(s.influence)}`
    case 'soldier':
      return undefined
    default:
      return count
  }
}
