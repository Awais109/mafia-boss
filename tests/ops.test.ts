import { describe, expect, it } from 'vitest'
import { makeRng, newGame, opBaseScore, outcomeOdds, type Act, type CrewMember, type OpType } from '../engine'
import { generateCandidates } from '../engine/systems/crew'
import { rollOp } from '../engine/systems/ops'
import { config } from './helpers'

const member = (stats: Partial<CrewMember>): CrewMember => ({
  id: 'm',
  name: 'M',
  muscle: 40,
  brains: 40,
  nerve: 40,
  loyalty: 50,
  traits: [],
  status: 'idle',
  xp: { muscle: 0, brains: 0, nerve: 0 },
  potential: { muscle: 100, brains: 100, nerve: 100 },
  gained: 0,
  rank: 0,
  perks: [],
  ...stats,
})

// Training jobs never roll (ADR 0030), so they aren't part of the outcome distribution.
const opsForAct = (act: Act): OpType[] =>
  (Object.keys(config.ops.list) as OpType[]).filter((t) => (config.ops.list[t].act ?? 1) <= act && !config.ops.list[t].training)

describe('op resolution', () => {
  it('partial success is the modal outcome at default stats (40–60% of 500 resolutions)', () => {
    // Default stats = the crew the game hands you: Vitya and Dima in Act I, recruits from the Act II
    // band after that. Random Act I recruits sent on a difficulty-55 Dinner aren't a crew anyone picks.
    const rng = makeRng('ops-distribution')
    const starting = newGame(config, 'ops-test', 0).crew
    const counts = { full: 0, partial: 0, fail: 0 }
    for (let i = 0; i < 500; i++) {
      const act: Act = i % 2 === 0 ? 1 : 2
      const type = rng.derive('op', i).pick(opsForAct(act))
      const op = config.ops.list[type]
      const pool =
        act === 1
          ? rng.derive('order', i).chance(0.5) ? starting : [...starting].reverse()
          : generateCandidates(config, 2, rng.derive('crew', i), i)
      const team = pool.slice(0, op.crew)
      counts[rollOp(config, op, team, rng.derive('roll', i)).outcome]++
    }
    const partial = counts.partial / 500
    expect(partial).toBeGreaterThanOrEqual(0.4)
    expect(partial).toBeLessThanOrEqual(0.6)
    expect(counts.partial).toBeGreaterThan(counts.full)
    expect(counts.partial).toBeGreaterThan(counts.fail)
  })

  it('outcomeOdds matches rolled frequencies', () => {
    const team = [member({ muscle: 48, nerve: 42 })]
    const op = config.ops.list.shakeDown
    const odds = outcomeOdds(config, op, team)
    expect(odds.full + odds.partial + odds.fail).toBeCloseTo(1)
    const n = 4000
    const counts = { full: 0, partial: 0, fail: 0 }
    const rng = makeRng('odds')
    for (let i = 0; i < n; i++) counts[rollOp(config, op, team, rng.derive(i)).outcome]++
    for (const k of ['full', 'partial', 'fail'] as const) {
      expect(Math.abs(counts[k] / n - odds[k])).toBeLessThan(0.03)
    }
  })

  it('scores the best stat on the team, plus a bonus per extra member', () => {
    const bruiser = member({ muscle: 60, brains: 20, nerve: 20 })
    const brain = member({ muscle: 20, brains: 60, nerve: 20 })
    // leanOnWard: brains .5, nerve .5 → best brains 60, best nerve 20 → 40, + 5 for the second body
    expect(opBaseScore(config, config.ops.list.leanOnWard, [bruiser, brain])).toBeCloseTo(45)
  })

  it('traits change effective stats', () => {
    const plain = member({ muscle: 40, nerve: 40 })
    const exArmy = member({ muscle: 40, nerve: 40, traits: ['exArmy'] })
    const op = config.ops.list.shakeDown
    expect(opBaseScore(config, op, [exArmy]) - opBaseScore(config, op, [plain])).toBeCloseTo(15 * 0.7)
    const drunk = member({ muscle: 40, nerve: 40, traits: ['alcoholic'] })
    expect(outcomeOdds(config, op, [drunk]).fail).toBeGreaterThan(outcomeOdds(config, op, [plain]).fail)
  })
})
