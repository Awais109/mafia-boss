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
    // Rep enough for videoSalon (68) and the Restaurant (133); real purchases satisfy every other goal.
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: config.fronts.types.restaurant.unlockRep }], T0)
    const steps: Action[] = [
      // secondDistrict: Zarechye's opening setup already has kiosk + marketStall + a Tobacco Factory —
      // finish its third allows-slot and second premises lot, then take and fully build Kiosk Row.
      { type: 'BUY_RACKET', racketType: 'beerTent', districtId: 'zarechye' },
      { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'zarechye' },
      { type: 'BUY_DISTRICT', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'marketStall', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'videoSalon', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'kioskRow' },
      // factoryTier2
      { type: 'UPGRADE_RACKET', racketId: s.rackets.find((r) => r.type === 'tobaccoFactory')!.id },
      // thirdCrew
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id },
      // wardCop
      { type: 'BUY_OFFICIAL', officialId: 'wardCop' },
      // workFront: both fronts owned, each at rate level 2
      { type: 'BUY_FRONT', frontType: 'restaurant' },
      { type: 'UPGRADE_FRONT', frontId: s.fronts[0].id, track: 'rate' },
      { type: 'UPGRADE_FRONT', frontId: s.fronts[0].id, track: 'rate' },
    ]
    s = act(s, steps, T0)
    const restaurant = s.fronts.find((f) => f.type === 'restaurant')!.id
    s = act(s, [{ type: 'UPGRADE_FRONT', frontId: restaurant, track: 'rate' }, { type: 'UPGRADE_FRONT', frontId: restaurant, track: 'rate' }], T0)
    // smuggleRun: 3 dispatches, each after the last completes so the same crew frees up.
    const smugglers = [crewNamed(s, 'Vitya').id, crewNamed(s, 'Dima').id]
    const minutes = config.ops.list.smuggleCigarettes.minutes
    for (let i = 0; i < 3; i++) {
      s = act(s, [{ type: 'START_OP', opType: 'smuggleCigarettes', crewIds: smugglers }], T0 + i * (minutes + 1) * 60_000)
    }
    // soldier
    s.crew[0].rank = 1
    s = act(s, [{ type: 'COLLECT' }], T0)
    expect([...goalsDone(s)].sort()).toEqual([...config.goals.list].sort())
    expect([...s.goals.done].sort()).toEqual([...config.goals.list].sort())
    expect(s.act).toBe(2)
    // One bar per goal, plus Act II's own grant.
    expect(s.gold).toBe(gold + config.goals.list.length * config.goals.rewardGold + config.gold.perActUnlocked[2])
  })

  it('does not open Act II with one goal still open', () => {
    let s = fresh()
    s.tutorial.done = true
    for (const id of config.goals.list.slice(0, -1)) {
      s.goals.done.push(id)
    }
    expect(s.act).toBe(1)
    s = act(s, [{ type: 'DEBUG_GRANT', influence: 50 }], T0) // any action re-checks goals
    expect(s.act).toBe(1)
    s.goals.done.push(config.goals.list[config.goals.list.length - 1])
    s = act(s, [{ type: 'DEBUG_GRANT', influence: 0 }], T0)
    expect(s.act).toBe(2)
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
