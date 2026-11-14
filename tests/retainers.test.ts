import { describe, expect, it } from 'vitest'
import { apply, derive, migrate, reconcile, retainerFee, shiftTimes, type PlayerState } from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Officials' retainers (ADR 0064): an official's control lasts while their retainer is paid. It comes due every
// `officials.retainer.everyDays` in Clean, is paid by itself when the Clean is there, and lapses when it isn't.

const WEEK = config.officials.retainer.everyDays * 24 * H

function withCop(clean: number): PlayerState {
  const s = act(fresh('retainers'), [{ type: 'DEBUG_GRANT', influence: 10 }, { type: 'BUY_OFFICIAL', officialId: 'wardCop' }], T0)
  s.clean = clean
  return s
}

describe('retainers', () => {
  it('starts a retainer when an official joins, due a week later', () => {
    const s = withCop(0)
    expect(s.retainers.wardCop).toEqual({ dueAt: T0 + WEEK, lapsed: false })
  })

  it('pays itself from Clean when it falls due, as Clean spent', () => {
    const s = withCop(100_000)
    const r = reconcile(s, T0 + WEEK + H, config)
    expect(r.state.retainers.wardCop).toEqual({ dueAt: T0 + 2 * WEEK, lapsed: false })
    const paid = r.events.find((e) => e.type === 'RETAINER_PAID')
    expect(paid).toMatchObject({ officialId: 'wardCop', auto: true, t: T0 + WEEK })
    expect(r.state.stats.retainers).toMatchObject({ paid: 1, missed: 0 })
    // The fee is the official's retainerHours of yield when it falls due, and it earns Rep like any Clean spent.
    const fee = paid?.type === 'RETAINER_PAID' ? paid.fee : NaN
    expect(fee).toBeGreaterThanOrEqual(1)
    expect(r.state.stats.cleanSpent - s.stats.cleanSpent).toBeCloseTo(fee)
    expect(retainerFee(s, config, 'wardCop')).toBe(Math.max(1, Math.round(config.officials.list.wardCop.retainerHours * derive(s, config).yieldPerHr)))
  })

  it('lapses without the Clean, and the official gives no control until it’s paid', () => {
    const s = withCop(0)
    const before = derive(s, config).controlParts.officials
    const r = reconcile(s, T0 + WEEK + H, config)
    expect(r.state.retainers.wardCop?.lapsed).toBe(true)
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'RETAINER_MISSED', officialId: 'wardCop' }))
    expect(derive(r.state, config).controlParts.officials).toBe(before - config.officials.list.wardCop.control)
    // Lapsed, nothing more falls due: it waits for the player.
    expect(reconcile(r.state, T0 + 3 * WEEK, config).state.stats.retainers.missed).toBe(1)
  })

  it('takes a lapsed official back when the player pays, with the next retainer a week on', () => {
    const lapsed = reconcile(withCop(0), T0 + WEEK + H, config).state
    const t = T0 + WEEK + 2 * H
    expect(apply(lapsed, { type: 'PAY_RETAINER', officialId: 'wardCop' }, t, config).error).toBe('Not enough Clean')
    lapsed.clean = 100_000
    const paid = apply(lapsed, { type: 'PAY_RETAINER', officialId: 'wardCop' }, t, config)
    expect(paid.error).toBeUndefined()
    expect(paid.state.retainers.wardCop).toEqual({ dueAt: t + WEEK, lapsed: false })
    expect(derive(paid.state, config).controlParts.officials).toBe(config.officials.list.wardCop.control)
    expect(apply(paid.state, { type: 'PAY_RETAINER', officialId: 'wardCop' }, t, config).error).toBe('Already paid up')
    expect(apply(paid.state, { type: 'PAY_RETAINER', officialId: 'cityHall' }, t, config).error).toBe('Not on the payroll')
  })

  it('falls due at the same moment however the time is split', () => {
    const s = withCop(0)
    const whole = reconcile(s, T0 + WEEK + 5 * H, config).state
    const split = reconcile(reconcile(s, T0 + WEEK - 3 * H, config).state, T0 + WEEK + 5 * H, config).state
    expect(split.retainers).toEqual(whole.retainers)
    expect(split.heat).toBeCloseTo(whole.heat)
  })

  it('carries an old save’s officials over, due a week after it was last played, and shifts with time', () => {
    const s = withCop(0)
    const { retainers, ...rest } = s
    void retainers
    const old = { ...rest, schemaVersion: 17, stats: { ...s.stats, retainers: undefined } }
    const m = migrate(old)
    expect(m.retainers.wardCop).toEqual({ dueAt: s.updatedAt + WEEK, lapsed: false })
    expect(m.stats.retainers).toEqual({ paid: 0, missed: 0, clean: 0 })
    expect(shiftTimes(s, H).retainers.wardCop?.dueAt).toBe(T0 + WEEK + H)
  })
})
