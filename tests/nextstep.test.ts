import { describe, expect, it } from 'vitest'
import { apply, type Action, type PlayerState } from '../engine'
import { nextStep } from '../app/acts'
import { fresh, H, T0, withMissions as c } from './helpers'

// Tester feedback: in Act II with ★1,200+, Act III didn't open and nothing said why. The gate also asks for
// Zhanna's rematch won and the act's overreach sent (ADR 0050), which Home showed only as chips. nextStep names
// what's left once the Rep is in hand, for Home's alert and the header.

function actTwo(rep: number): PlayerState {
  let s = fresh('next-step', c)
  for (const a of [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_COMPLETE_MISSIONS' }, { type: 'DEBUG_SET_REP', reputation: rep }] as Action[]) {
    const r = apply(s, a, T0, c)
    if (r.error) throw new Error(r.error)
    s = r.state
  }
  return s
}

describe('the next step to the next act', () => {
  it('says nothing while Rep is still the thing to earn', () => {
    const s = actTwo(800)
    expect(s.act).toBe(2)
    expect(nextStep(s, c, T0)).toBeNull()
  })

  it('names the rematch once the Rep is in hand, and where to win it', () => {
    const s = actTwo(1300)
    expect(s.act).toBe(2)
    expect(nextStep(s, c, T0)).toMatchObject({ short: 'win Her terms', title: 'Act III waits on Her terms', tab: 'ops', waiting: false })
  })

  it('waits while it’s under way or after a loss, then names the overreach once it’s won', () => {
    const s = actTwo(1300)
    s.missions.herTerms = { result: 'lost', at: T0, retryAt: T0 + 12 * H }
    expect(nextStep(s, c, T0)).toMatchObject({ waiting: true, short: expect.stringContaining('Her terms again in') })
    s.missions.herTerms = { result: 'won', at: T0 }
    expect(nextStep(s, c, T0)).toMatchObject({ short: 'send Across the bridge', waiting: false })
    s.missions.acrossTheBridge = { result: 'failed', at: T0 }
    expect(nextStep(s, c, T0)).toBeNull() // the gate holds: nothing left to name
  })
})
