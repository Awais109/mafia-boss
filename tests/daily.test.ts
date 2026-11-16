import { describe, expect, it } from 'vitest'
import { apply, dailyOffer, migrate, shiftTimes, tryBuildConfig, type PlayerState } from '../engine'
import { config, fresh, H, T0 } from './helpers'

// The daily reward (ADR 0069): the first claim of each game day pays gold by day of the streak; the week starts
// over; a missed day takes dropPerMissedDay off the streak rather than all of it.

const D = 24 * H
const gold = config.daily.gold

function ready(): PlayerState {
  const s = fresh('daily')
  s.tutorial.done = true
  return s
}
const claim = (s: PlayerState, t: number) => {
  const r = apply(s, { type: 'CLAIM_DAILY' }, t, config)
  if (r.error) throw new Error(r.error)
  return r
}

describe('the daily reward', () => {
  it('waits for the opening, pays the first day, and once a day', () => {
    expect(apply(fresh('daily'), { type: 'CLAIM_DAILY' }, T0, config).error).toBe('After the opening')
    const s = ready()
    expect(dailyOffer(s, config, T0)).toEqual({ gold: gold[0], streak: 1 })
    const r = claim(s, T0)
    expect(r.state.gold).toBe(s.gold + gold[0])
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'DAILY_CLAIMED', streak: 1, gold: gold[0] }))
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'GOLD_GRANTED', amount: gold[0], source: 'daily' }))
    expect(dailyOffer(r.state, config, T0 + H)).toBeNull()
    expect(apply(r.state, { type: 'CLAIM_DAILY' }, T0 + H, config).error).toBe('Already claimed today')
  })

  it('grows over a week of days in a row, then starts the week over', () => {
    let s = ready()
    for (let day = 0; day < gold.length + 1; day++) {
      const before = s.gold
      s = claim(s, T0 + day * D).state
      expect(s.gold - before).toBe(gold[day % gold.length])
      expect(s.daily.streak).toBe(day + 1)
    }
    expect(s.stats.daily).toEqual({ claims: gold.length + 1, gold: gold.reduce((a, b) => a + b, 0) + gold[0], best: gold.length + 1 })
  })

  it('takes days off the streak for days missed, never below a fresh start', () => {
    let s = ready()
    for (let day = 0; day < 5; day++) s = claim(s, T0 + day * D).state
    // One day missed: five, less two, plus today.
    expect(dailyOffer(s, config, T0 + 6 * D)).toEqual({ gold: gold[5 - config.daily.dropPerMissedDay], streak: 6 - config.daily.dropPerMissedDay })
    // A long gap: back to day 1.
    expect(dailyOffer(s, config, T0 + 30 * D)).toEqual({ gold: gold[0], streak: 1 })
    expect(claim(s, T0 + 30 * D).state.stats.daily.best).toBe(5)
  })

  it('counts game days, shifts with time, and comes to old saves unclaimed', () => {
    const s = claim(ready(), T0).state
    expect(shiftTimes(s, 3 * H).daily.lastAt).toBe(T0 + 3 * H)
    const { daily, ...rest } = s
    void daily
    const old = migrate({ ...rest, schemaVersion: 18, stats: { ...s.stats, daily: undefined } })
    expect(old.daily).toEqual({ lastAt: null, streak: 0 })
    expect(old.stats.daily).toEqual({ claims: 0, gold: 0, best: 0 })
  })

  it('is configurable, and validated', () => {
    expect(tryBuildConfig('default', { 'daily.enabled': false }).config.daily.enabled).toBe(false)
    expect(apply(ready(), { type: 'CLAIM_DAILY' }, T0, tryBuildConfig('default', { 'daily.enabled': false }).config).error).toBe('No daily reward in this build')
    expect(tryBuildConfig({ daily: { gold: [] } } as never).errors).toContain('daily.gold: needs at least one day')
  })
})
