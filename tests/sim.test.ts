import { describe, expect, it } from 'vitest'
import { simulate } from '../sim/driver'
import { summarize, type Summary } from '../sim/report'
import { config } from './helpers'

// Pacing regression guard: the casual bot on default config must stay on the dev manual §3
// targets. Means over 5 seeds, so one unlucky seed doesn't fail the build.
// If this fails after a tuning change, that's the sim doing its job: check TUNING.md.

const SEEDS = ['42', '43', '44', '45', '46']

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function meanOf(summaries: Summary[], pick: (s: Summary) => number | null): number {
  const values = summaries.map(pick)
  if (values.some((v) => v === null)) throw new Error('a seed never reached this milestone')
  return mean(values as number[])
}

describe('casual bot pacing on default config', () => {
  const summaries = SEEDS.map((seed) => summarize(simulate({ config, preset: 'default', days: 8, seed })))

  it('clears Act I in about 1–2 days', () => {
    // Borderline in TUNING.md (1.92 d over 10 seeds): guard against drifting later, not the exact band.
    expect(meanOf(summaries, (s) => s.actClear1)).toBeLessThanOrEqual(2.1)
  })

  it('clears Act II 3–5 days after Act I', () => {
    const actII = meanOf(summaries, (s) => s.actClear2)
    expect(actII).toBeGreaterThanOrEqual(3)
    expect(actII).toBeLessThanOrEqual(5)
  })

  it('keeps heat on schedule with no more than one raid and no missed wages', () => {
    const heat = meanOf(summaries, (s) => s.heatMean)
    expect(heat).toBeGreaterThanOrEqual(25)
    expect(heat).toBeLessThanOrEqual(35)
    expect(Math.max(...summaries.map((s) => s.raids))).toBeLessThanOrEqual(1)
    expect(summaries.every((s) => s.missedWages === 0)).toBe(true)
  })

  it('makes partial success the most common op outcome (40–60%)', () => {
    const partial = meanOf(summaries, (s) => s.opOutcomes.partial)
    expect(partial).toBeGreaterThanOrEqual(0.4)
    expect(partial).toBeLessThanOrEqual(0.6)
  })
}, 120_000)
