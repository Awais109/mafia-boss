import { describe, expect, it } from 'vitest'
import { apply, dayMs, derive, migrate, reconcile, SCHEMA_VERSION, type PlayerState } from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Rock bottom (ADR 0051): no game over. A payday missed with no Clean brings the family's envelope once per
// act; Vitya and Dima never walk out.

const nextDay = (t: number) => (Math.floor(t / dayMs(config)) + 1) * dayMs(config)

// Broke: wages owed, no Dirty, nothing in the vault, no Clean.
function broke(s: PlayerState): PlayerState {
  s.wagesOwed = 200
  s.dirty = 0
  s.vault = 0
  s.clean = 0
  s.rackets = []
  return s
}

describe('rock bottom', () => {
  it('leaves the envelope waiting after a payday missed with no Clean, and clears it once a payday is met', () => {
    const r = reconcile(broke(fresh('broke')), nextDay(T0) + H, config)
    expect(r.state.rockBottom.pending).toBe(true)
    expect(r.events.some((e) => e.type === 'ROCK_BOTTOM')).toBe(true)
    const paid = r.state
    paid.dirty = 10_000
    paid.wagesOwed = 50
    expect(reconcile(paid, nextDay(nextDay(T0)) + H, config).state.rockBottom.pending).toBe(false)
  })

  it('doesn’t come while there’s Clean to fall back on', () => {
    const s = broke(fresh('broke'))
    s.clean = 10_000
    expect(reconcile(s, nextDay(T0) + H, config).state.rockBottom.pending).toBe(false)
  })

  it('opens once per act for a stake of wages and upkeep in Dirty', () => {
    const s = reconcile(broke(fresh('broke')), nextDay(T0) + H, config).state
    const d = derive(s, config)
    const opened = act(s, [{ type: 'OPEN_ENVELOPE' }], nextDay(T0) + H)
    const stake = Math.max(config.rockBottom.minStake, Math.round((d.wagesPerHr + d.upkeepPerHr) * config.rockBottom.stakeHours))
    expect(opened.dirty).toBe(s.dirty + stake)
    expect(opened.rockBottom).toEqual({ pending: false, usedActs: [1] })
    expect(apply(opened, { type: 'OPEN_ENVELOPE' }, nextDay(T0) + H, config).error).toMatch(/no envelope/)
    // Broke again the same act: no second envelope.
    const again = broke(opened)
    expect(reconcile(again, nextDay(nextDay(T0)) + H, config).state.rockBottom.pending).toBe(false)
  })

  it('never lets Vitya or Dima walk out, whatever their loyalty', () => {
    let s = fresh('loyal')
    for (const m of s.crew) m.loyalty = 0
    const family = s.crew.filter((m) => m.stays || m.nephew).map((m) => m.id)
    expect(family.length).toBeGreaterThanOrEqual(2)
    for (let day = 1; day <= 20; day++) s = reconcile(s, T0 + day * 24 * H, config).state
    for (const id of family) expect(s.crew.some((m) => m.id === id)).toBe(true)
  })

  it('marks Vitya as staying in an old save', () => {
    const s = JSON.parse(JSON.stringify(fresh('old')))
    for (const m of s.crew) delete m.stays
    delete s.rockBottom
    s.schemaVersion = 15
    const m = migrate(s)
    expect(m.schemaVersion).toBe(SCHEMA_VERSION)
    expect(m.crew.find((x) => x.name === 'Vitya')?.stays).toBe(true)
    expect(m.rockBottom).toEqual({ pending: false, usedActs: [] })
    expect(m.stats.loans.repossessed).toBe(0)
  })
})
