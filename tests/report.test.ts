import { describe, expect, it } from 'vitest'
import { botPlay, simulate } from '../sim/driver'
import { formatSummary, summarize } from '../sim/report'
import { config } from './helpers'

// The Debug Bot plays on top of an existing save, so a run can start after an act was already
// cleared. Clear times are measured from the game's start, and only clears inside the run are
// scored; measuring from the run's start reported a negative Act I clear on a second run.

describe('sim report on a bot run over an existing save', () => {
  const first = simulate({ config, preset: 'default', days: 3, seed: '42' })
  const second = botPlay(first.final, config, first.end, 5)
  const s1 = summarize(first)
  const s2 = summarize(second)
  const check = (name: string) => s2.checks.find((ch) => ch.name.startsWith(name))!

  it('measures act clears from game start, not from the run start', () => {
    expect(s1.actClear1).not.toBeNull()
    expect(s1.actClear1InRun).toBe(true)
    expect(s2.actClear1).toBe(s1.actClear1)
    expect(s2.actClear1).toBeGreaterThan(0)
  })

  it('shows a clear from before the run without scoring it', () => {
    expect(s2.actClear1InRun).toBe(false)
    expect(check('Act I clear').value).toBeNull()
    expect(formatSummary(s2)).toMatch(/Act I clear:.*before this run/)
  })

  it('scores a clear that happens inside the run', () => {
    expect(s2.actClear2).not.toBeNull()
    expect(s2.actClear2InRun).toBe(true)
    expect(check('Act II clear').value).toBe(s2.actClear2)
    expect(formatSummary(s2)).not.toMatch(/Act II clear:.*before this run/)
  })
}, 60_000)
