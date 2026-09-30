import { describe, expect, it } from 'vitest'
import { apply, derive, migrate, missionBlocked, reconcile, SCHEMA_VERSION, type PlayerState } from '../engine'
import { act, fresh, H, T0, withMissions as c } from './helpers'

// The boss missions (ADR 0050): an overreach opens the next act by failing, at a fixed cost; a rematch is
// rolled, can be retried after a wait, and is part of the next act's gate.

const idle = (s: PlayerState) => s.crew.filter((m) => m.status === 'idle').map((m) => m.id)

// Act I with every goal done: only the overreach stands between it and Act II.
function actOneDone(): PlayerState {
  const s = act(fresh('missions', c), [{ type: 'DEBUG_COMPLETE_GOALS' }], T0, c)
  s.tutorial.done = true
  return s
}

describe('the overreach', () => {
  it('is the last step: shut until the rest of the gate holds', () => {
    const s = fresh('missions', c)
    s.tutorial.done = true
    expect(missionBlocked(s, c, 'crateThroughPort', T0)).toBe('The rest of the act comes first')
    const done = actOneDone()
    expect(done.act).toBe(1)
    expect(missionBlocked(done, c, 'crateThroughPort', T0)).toBeNull()
  })

  it('fails at its fixed cost and opens the next act', () => {
    let s = actOneDone()
    s.dirty = 5000
    const yieldPerHr = derive(s, c).yieldPerHr
    const [first, second] = idle(s)
    const heat = s.heat
    s = act(s, [{ type: 'START_MISSION', missionId: 'crateThroughPort', crewIds: [first, second] }], T0, c)
    const stake = Math.round(yieldPerHr * c.missions.list.crateThroughPort.stakeHours!)
    expect(s.dirty).toBe(5000 - stake)
    expect(s.crew.find((m) => m.id === first)!.status).toBe('on_op')
    s = reconcile(s, T0 + 3 * H, c).state
    expect(s.missions.crateThroughPort).toMatchObject({ result: 'failed', stake })
    expect(s.act).toBe(2)
    expect(s.crew.find((m) => m.id === first)!.status).toBe('injured')
    expect(s.heat).toBeGreaterThanOrEqual(heat + c.missions.list.crateThroughPort.heat! - 2)
  })
})

describe('the rematch', () => {
  // Act II with the rematch open and the Rep for Act III already there.
  function actTwo(): PlayerState {
    let s = actOneDone()
    s = act(s, [{ type: 'START_MISSION', missionId: 'crateThroughPort', crewIds: idle(s).slice(0, 2) }], T0, c)
    s = reconcile(s, T0 + 3 * H, c).state
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: c.progression.acts[3].rep! }], T0 + 3 * H, c)
    for (const m of s.crew) if (m.status === 'injured') m.injuredUntil = T0 + 3 * H
    return reconcile(s, T0 + 4 * H, c).state
  }

  it('is open from the act’s start, and the gate waits for it and the overreach', () => {
    const s = actTwo()
    expect(s.act).toBe(2)
    expect(missionBlocked(s, c, 'herTerms', T0 + 4 * H)).toBeNull()
    expect(missionBlocked(s, c, 'acrossTheBridge', T0 + 4 * H)).toBe('The rest of the act comes first')
  })

  it('rolls like a job: won pays and opens the overreach; lost waits, then opens again', () => {
    const cfg = { ...c, missions: { ...c.missions, list: { ...c.missions.list, herTerms: { ...c.missions.list.herTerms, diff: 0 } } } }
    let s = actTwo()
    const disposition = s.rival.zhanna.disposition
    s = act(s, [{ type: 'START_MISSION', missionId: 'herTerms', crewIds: idle(s).slice(0, 2) }], T0 + 4 * H, cfg)
    s = reconcile(s, T0 + 7 * H, cfg).state
    expect(s.missions.herTerms?.result).toBe('won')
    expect(s.rival.zhanna.disposition).toBeGreaterThan(disposition)
    expect(missionBlocked(s, cfg, 'acrossTheBridge', T0 + 7 * H)).toBeNull()

    const hard = { ...c, missions: { ...c.missions, list: { ...c.missions.list, herTerms: { ...c.missions.list.herTerms, diff: 1000 } } } }
    let l = actTwo()
    l = act(l, [{ type: 'START_MISSION', missionId: 'herTerms', crewIds: idle(l).slice(0, 2) }], T0 + 4 * H, hard)
    l = reconcile(l, T0 + 7 * H, hard).state
    expect(l.missions.herTerms?.result).toBe('lost')
    expect(missionBlocked(l, hard, 'herTerms', T0 + 7 * H)).toBe('Not yet: try again later')
    expect(missionBlocked(l, hard, 'herTerms', l.missions.herTerms!.retryAt!)).toBeNull()
  })

  it('resolves the same however the wait is split', () => {
    const base = actTwo()
    const sent = act(base, [{ type: 'START_MISSION', missionId: 'herTerms', crewIds: idle(base).slice(0, 2) }], T0 + 4 * H, c)
    const once = reconcile(sent, T0 + 9 * H, c).state
    let split = sent
    for (const t of [5, 6.5, 7, 9]) split = reconcile(split, T0 + t * H, c).state
    expect(split.missions.herTerms).toEqual(once.missions.herTerms)
  })
})

describe('missions and saves', () => {
  it('counts an old save’s past acts as done, and Debug completes the current act’s', () => {
    const s = JSON.parse(JSON.stringify(fresh('old', c)))
    s.act = 3
    delete s.missions
    s.schemaVersion = 14
    const m = migrate(s)
    expect(m.schemaVersion).toBe(SCHEMA_VERSION)
    expect(m.missions.crateThroughPort?.result).toBe('failed')
    expect(m.missions.herTerms?.result).toBe('won')
    expect(m.missions.secondLunch).toBeUndefined()
    const d = apply(m, { type: 'DEBUG_COMPLETE_MISSIONS' }, T0, { ...c, debug: { ...c.debug, enabled: true } }).state
    expect(d.missions.secondLunch?.result).toBe('won')
    expect(d.missions.firstTruck?.result).toBe('failed')
  })
})
