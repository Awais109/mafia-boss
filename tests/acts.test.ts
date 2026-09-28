import { describe, expect, it } from 'vitest'
import { apply, gameCleared, prosperityTarget, tryBuildConfig, type PlayerState } from '../engine'
import { act, config, fresh, T0 } from './helpers'

// Six acts (ADR 0040): each act after the first opens when its gate holds; meeting the gate after the
// last built act clears that act instead, and play carries on.

const gate = (a: 3 | 4) => config.progression.acts[a].rep!

// A game that's just reached Act II.
const actTwo = (): PlayerState => act(fresh('acts'), [{ type: 'DEBUG_COMPLETE_GOALS' }], T0)

describe('acts', () => {
  it('opens Act II on the goals and Act III on its Reputation, paying gold for each', () => {
    let s = actTwo()
    expect(s.act).toBe(2)
    const gold = s.gold
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: gate(3) - 1 }], T0)
    expect(s.act).toBe(2)
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: gate(3) }], T0)
    expect(s.act).toBe(3)
    expect(s.gold).toBe(gold + config.gold.perActUnlocked[3])
    expect(s.stats.actClearedAt[2]).toBe(T0)
    expect(s.log.filter((e) => e.type === 'ACT_UNLOCKED').map((e) => (e as { act: number }).act)).toEqual([2, 3])
  })

  it('clears the last built act, rather than leaving it, when the next gate holds', () => {
    // Pinned to a build whose last act is III, so the test is about the rule, not today's content.
    const { config: c } = tryBuildConfig({ progression: { finalAct: 3 } })
    let s = act(act(fresh('acts', c), [{ type: 'DEBUG_COMPLETE_GOALS' }], T0, c), [{ type: 'DEBUG_SET_REP', reputation: gate(3) }], T0, c)
    expect(gameCleared(s, c)).toBe(false)
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: gate(4) }], T0, c)
    expect(s.act).toBe(3)
    expect(s.stats.actClearedAt[3]).toBe(T0)
    expect(gameCleared(s, c)).toBe(true)
    expect(s.log.filter((e) => e.type === 'ACT_CLEARED')).toHaveLength(1)
  })

  it('can ask for districts held and fronts owned as well as Reputation', () => {
    const { config: c, errors } = tryBuildConfig({
      progression: { acts: { 3: { rep: 500, holds: ['stationSquare'], fronts: ['restaurant'] } } },
    })
    expect(errors).toEqual([])
    let s = act(fresh('acts', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: 500 }], T0, c)
    s.clean = 10_000
    expect(s.act).toBe(2)
    s = act(s, [{ type: 'BUY_DISTRICT', districtId: 'stationSquare' }], T0, c)
    expect(s.act).toBe(2)
    s = act(s, [{ type: 'BUY_FRONT', frontType: 'restaurant' }], T0, c)
    expect(s.act).toBe(3)
  })

  it('opens every act whose gate already holds, in order', () => {
    const s = act(fresh('acts'), [{ type: 'DEBUG_SET_REP', reputation: gate(3) }, { type: 'DEBUG_COMPLETE_GOALS' }], T0)
    expect(s.act).toBe(3)
    expect(s.stats.actClearedAt[1]).toBe(T0)
    expect(s.stats.actClearedAt[2]).toBe(T0)
  })

  it('starts every district at its prosperity target when Act III opens, so the act has no cliff', () => {
    const s = act(actTwo(), [{ type: 'DEBUG_SET_REP', reputation: gate(3) }], T0)
    for (const d of s.districts.filter((x) => config.districts.list[x.id].act <= 3)) {
      expect(d.prosperity).toBeCloseTo(prosperityTarget(s, config, d.id, T0))
    }
  })

  it('rejects a gate with no conditions', () => {
    const { errors } = tryBuildConfig({ progression: { acts: { 4: { rep: undefined } } } } as never)
    expect(errors.some((e) => e.includes('progression.acts.4'))).toBe(true)
  })

  it('refuses an Act III business before Act III, however much Reputation there is', () => {
    const s = actTwo()
    s.reputation = gate(3) - 1
    s.clean = 100_000
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'nightclub', districtId: 'zarechye' }, T0, config).error).toBe('Not unlocked yet')
  })
})
