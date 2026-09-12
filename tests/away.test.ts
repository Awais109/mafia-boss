import { describe, expect, it } from 'vitest'
import { buildAway, mergeAway } from '../app/away'
import { derive, reconcile } from '../engine'
import { act, config, crewNamed, fresh, H, T0 } from './helpers'

// The "while you were away" popup is built from the catch-up reconcile: the state before and
// after, plus its events (ADR 0023). Its numbers must reconcile with the save's own stats.

describe('away summary', () => {
  // A first session, then three hours away: collect, launder (the first conversion is instant,
  // the second buffers), and send both crew out on quick jobs.
  const start = fresh()
  const front = start.fronts[0].id
  const before = act(
    start,
    [
      { type: 'COLLECT' },
      { type: 'DEPOSIT', frontId: front, amount: 20 },
      { type: 'DEPOSIT', frontId: front, amount: 10 },
      { type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(start, 'Vitya').id] },
      { type: 'START_OP', opType: 'collectDebt', crewIds: [crewNamed(start, 'Dima').id] },
    ],
    T0,
  )
  const to = T0 + 3 * H
  const r = reconcile(before, to, config)
  const a = buildAway(before, r.state, r.events, config, to)

  it('covers the gap from the save to now', () => {
    expect(a.from).toBe(before.updatedAt)
    expect(a.to).toBe(to)
  })

  it('lists each finished job with its crew and what it earned', () => {
    expect(a.jobs.map((j) => [j.name, j.crew])).toEqual([
      ['Shake Down', 'Vitya'],
      ['Collect a Debt', 'Dima'],
    ])
    const resolved = r.events.filter((e) => e.type === 'OP_RESOLVED')
    expect(a.jobs.map((j) => j.dirty)).toEqual(resolved.map((e) => e.dirty))
    expect(a.jobs.map((j) => j.outcome)).toEqual(resolved.map((e) => e.outcome))
  })

  it('splits Dirty between rackets and jobs, and counts what the full vault lost', () => {
    const jobDirty = a.jobs.reduce((sum, j) => sum + j.dirty, 0)
    expect(a.racketsEarned + jobDirty).toBeCloseTo(r.state.stats.dirtyEarned - before.stats.dirtyEarned, 6)
    // Three hours of yield into a vault that holds 2.5 h of it: the rest hits the cap. Condition
    // decays at every whole hour, so the total sits between three hours at the final and the
    // starting yield.
    const total = a.racketsEarned + a.lostToCap
    expect(total).toBeGreaterThanOrEqual(derive(r.state, config).yieldPerHr * 3 - 1e-6)
    expect(total).toBeLessThanOrEqual(derive(before, config).yieldPerHr * 3 + 1e-6)
    expect(a.lostToCap).toBeGreaterThan(0)
    expect(a.vaultFull).toBe(true)
  })

  it('reports what each front laundered and the Clean it made', () => {
    expect(a.fronts).toHaveLength(1)
    expect(a.fronts[0].dirty).toBeCloseTo(before.fronts[0].buffer - r.state.fronts[0].buffer, 6)
    expect(a.fronts[0].dirty).toBeGreaterThan(0)
    expect(a.fronts.reduce((sum, f) => sum + f.clean, 0)).toBeCloseTo(a.cleanEarned, 6)
    expect(a.cleanEarned).toBeCloseTo(r.state.stats.cleanEarned - before.stats.cleanEarned, 6)
  })

  it('keeps only the events the job and money lines do not already tell', () => {
    expect(a.events.some((e) => e.type === 'OP_RESOLVED' || e.type === 'VAULT_CAPPED' || e.type === 'OP_STARTED')).toBe(false)
  })

  it('extends a pending summary with a second gap', () => {
    const to2 = to + 2 * H
    const r2 = reconcile(r.state, to2, config)
    const b = buildAway(r.state, r2.state, r2.events, config, to2)
    const m = mergeAway(a, b)
    expect(m.from).toBe(a.from)
    expect(m.to).toBe(to2)
    expect(m.jobs).toHaveLength(a.jobs.length + b.jobs.length)
    expect(m.racketsEarned).toBeCloseTo(a.racketsEarned + b.racketsEarned, 6)
    expect(m.lostToCap).toBeCloseTo(a.lostToCap + b.lostToCap, 6)
    expect(m.cleanEarned).toBeCloseTo(a.cleanEarned + b.cleanEarned, 6)
    expect(m.heatFrom).toBe(a.heatFrom)
    expect(m.heatTo).toBe(b.heatTo)
    expect(mergeAway(null, b)).toBe(b)
  })
})
