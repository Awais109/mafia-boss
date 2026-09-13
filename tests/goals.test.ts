import { describe, expect, it } from 'vitest'
import { type Action, type GameEvent, type PlayerState } from '../engine'
import { act, config, crewNamed, fresh, T0 } from './helpers'

// Act I goals (ADR 0035): each pays its gold once, when its condition first holds after the opening.

const goalsDone = (s: PlayerState) =>
  s.log.filter((e): e is Extract<GameEvent, { type: 'GOAL_DONE' }> => e.type === 'GOAL_DONE').map((e) => e.goalId)

describe('Act I goals', () => {
  it('each goal pays its gold once, when its condition first holds', () => {
    let s = fresh()
    s.tutorial.done = true
    Object.assign(s, { clean: 5000, influence: 50, dirty: 500 })
    const gold = s.gold
    const steps: Action[] = [
      { type: 'BUY_DISTRICT', districtId: 'kioskRow' },
      { type: 'UPGRADE_RACKET', racketId: s.rackets.find((r) => r.type === 'tobaccoFactory')!.id },
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id },
      { type: 'BUY_OFFICIAL', officialId: 'wardCop' },
      { type: 'SET_FRONT_MODE', frontId: s.fronts[0].id, mode: 'push' },
      { type: 'START_OP', opType: 'smuggleCigarettes', crewIds: [crewNamed(s, 'Vitya').id, crewNamed(s, 'Dima').id] },
    ]
    s = act(s, steps, T0)
    s.crew[0].rank = 1
    s = act(s, [{ type: 'COLLECT' }, { type: 'DEBUG_SET_REP', reputation: config.reputation.actThresholds[2] }, { type: 'COLLECT' }], T0)
    expect([...goalsDone(s)].sort()).toEqual([...config.goals.list].sort())
    expect([...s.goals.done].sort()).toEqual([...config.goals.list].sort())
    // One bar per goal, plus Act II's own grant.
    expect(s.gold).toBe(gold + config.goals.list.length * config.goals.rewardGold + config.gold.perActUnlocked[2])
  })

  it('waits for the opening to end', () => {
    let s = fresh()
    s = act(s, [{ type: 'DEBUG_GRANT', influence: 50 }, { type: 'BUY_OFFICIAL', officialId: 'wardCop' }], T0)
    expect(s.goals.done).toEqual([])
    s = act(s, [{ type: 'TUTORIAL_SKIP' }], T0)
    expect(s.goals.done).toEqual(['wardCop'])
    expect(goalsDone(s)).toEqual(['wardCop'])
  })
})
