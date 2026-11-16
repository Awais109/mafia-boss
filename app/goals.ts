import { DISTRICT_IDS, goalProgress, type Config, type Derived, type GoalId, type PlayerState } from '../engine'
import { glyph } from './components/ui'
import { fmt } from './format'

// Act I goals on Home (ADR 0035): what each asks for, in the player's words. Act II opens the
// moment every one of these is done (ADR 0039).

export const GOAL_TEXT: Record<GoalId, string> = {
  secondDistrict: 'Open a business in a second district',
  factoryTier2: 'Upgrade the Tobacco Factory to tier 2',
  thirdCrew: 'Hire a third crew member',
  wardCop: 'Put the Ward Cop on the payroll',
  workFront: 'Upgrade a front’s rate to level 2',
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
      // What's next: a district you hold with nothing of yours in it, or the cheapest one open to take.
      const empty = s.districts.find((x) => x.controller === 'player' && !s.rackets.some((r) => r.districtId === x.id))
      if (empty) return `${count} · open a business in ${c.districts.list[empty.id].name}`
      const next = DISTRICT_IDS.filter((id) => d.unlocked.district[id] && s.districts.find((x) => x.id === id)?.controller !== 'player').sort(
        (a, b) => d.costs.district[a] - d.costs.district[b],
      )[0]
      return next ? `${count} · ${c.districts.list[next].name} is ${glyph.clean}${fmt(d.costs.district[next])} on the Map` : count
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
