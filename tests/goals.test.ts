import { describe, expect, it } from 'vitest'
import { buildConfig, GOAL_CHECKS, goalProgress, tryBuildConfig, type Action, type GameEvent, type PlayerState } from '../engine'
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
    // Real purchases satisfy every goal but the last.
    const steps: Action[] = [
      // secondDistrict: Zarechye, the home district, already has the opening's businesses; take Kiosk Row and open one there.
      { type: 'BUY_DISTRICT', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' },
      // factoryTier2
      { type: 'UPGRADE_RACKET', racketId: s.rackets.find((r) => r.type === 'tobaccoFactory')!.id },
      // thirdCrew
      { type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id },
      // wardCop
      { type: 'BUY_OFFICIAL', officialId: 'wardCop' },
      // workFront: one front at rate level 2
      { type: 'UPGRADE_FRONT', frontId: s.fronts[0].id, track: 'rate' },
      { type: 'UPGRADE_FRONT', frontId: s.fronts[0].id, track: 'rate' },
    ]
    s = act(s, steps, T0)
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

  it('counts a second district once a business of yours is in it, not when it’s bought (ADR 0066)', () => {
    let s = fresh()
    s.tutorial.done = true
    s.clean = 5000
    s = act(s, [{ type: 'BUY_DISTRICT', districtId: 'kioskRow' }], T0)
    expect(s.districts.find((d) => d.id === 'kioskRow')?.controller).toBe('player')
    expect(goalProgress(s, config, 'secondDistrict')).toEqual({ have: 1, need: 2 })
    expect(s.goals.done).not.toContain('secondDistrict')
    s = act(s, [{ type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' }], T0)
    expect(goalProgress(s, config, 'secondDistrict')).toEqual({ have: 2, need: 2 })
    expect(s.goals.done).toContain('secondDistrict')
  })

  it('takes one front at rate level 2, and reads what each goal asks for from config (ADR 0066)', () => {
    let s = fresh()
    s.tutorial.done = true
    s.clean = 5000
    const front = s.fronts[0].id
    s = act(s, [{ type: 'UPGRADE_FRONT', frontId: front, track: 'rate' }], T0)
    expect(s.goals.done).not.toContain('workFront')
    s = act(s, [{ type: 'UPGRADE_FRONT', frontId: front, track: 'rate' }], T0)
    expect(s.goals.done).toContain('workFront')
    const stricter = buildConfig('default', { 'missions.enabled': false, 'goals.need.thirdCrew': 4 })
    expect(goalProgress(s, stricter, 'thirdCrew')).toEqual({ have: s.crew.length, need: 4 })
    expect(tryBuildConfig('default', { 'goals.need.workFront': 3 }).errors).toContain('goals.need.workFront: Act I has only 2 fronts')
    expect(tryBuildConfig('default', { 'goals.need.smuggleRun': 0 }).errors.some((e) => e.startsWith('goals.need.smuggleRun'))).toBe(true)
  })

  it('counted goals report how far along they are, and their check agrees', () => {
    const s = fresh()
    expect(goalProgress(s, config, 'thirdCrew')).toEqual({ have: s.crew.length, need: 3 })
    expect(goalProgress(s, config, 'smuggleRun')).toEqual({ have: 0, need: 3 })
    expect(goalProgress(s, config, 'wardCop')).toBeNull()
    s.stats.opsByType.smuggleCigarettes = 3
    expect(goalProgress(s, config, 'smuggleRun')?.have).toBe(3)
    for (const id of ['secondDistrict', 'thirdCrew', 'workFront', 'smuggleRun'] as const) {
      const p = goalProgress(s, config, id)!
      expect(GOAL_CHECKS[id](s, config)).toBe(p.have >= p.need)
    }
  })
})
