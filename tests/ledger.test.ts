import { describe, expect, it } from 'vitest'
import { dayMs, LEDGER_ROWS, ledgerDays, reconcile, type PlayerState } from '../engine'
import { config, fresh, H, T0 } from './helpers'

// The ledger is snapshots of cumulative stats at day starts (ADR 0026), so its rows must add up
// to the stats they were taken from.

function playDays(days: number): PlayerState {
  let s = fresh()
  for (let d = 1; d <= days; d++) s = reconcile(s, T0 + d * 24 * H, config).state
  return s
}

describe('daily ledger', () => {
  it('starts with one row at game creation', () => {
    const s = fresh()
    expect(s.ledger).toHaveLength(1)
    expect(s.ledger[0].startsAt).toBe(s.createdAt)
  })

  it('snapshots at each day start and keeps only the latest rows', () => {
    const s = playDays(10)
    expect(s.ledger).toHaveLength(LEDGER_ROWS)
    for (const row of s.ledger) expect(row.startsAt % dayMs(config)).toBe(0)
  })

  it('day rows add up to the stats, with wages in the day they were paid', () => {
    const s = reconcile(fresh(), T0 + 30 * H, config).state
    const days = ledgerDays(s, s.updatedAt)
    expect(days.at(-1)!.today).toBe(true)
    expect(days.reduce((sum, d) => sum + d.dirtyEarned, 0)).toBeCloseTo(s.stats.dirtyEarned)
    expect(s.stats.wagesPaid).toBeGreaterThan(0)
    expect(days[0].wagesPaid).toBeCloseTo(s.stats.wagesPaid)
  })
})
