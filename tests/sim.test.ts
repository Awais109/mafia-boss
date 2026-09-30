import { describe, expect, it } from 'vitest'
import { simulate } from '../sim/driver'
import { GOLD_RUSH } from '../sim/persona'
import { summarize, type Summary } from '../sim/report'
import { withMissions as config } from './helpers'

// Pacing regression guard: the casual bot on default config must stay on the dev manual §3
// targets, and on the six-act design's for later acts (ADR 0040). Means over 5 seeds, so one unlucky
// seed doesn't fail the build. If this fails after a tuning change, that's the sim doing its job:
// check TUNING.md.

const SEEDS = ['42', '43', '44', '45', '46']

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function meanOf(summaries: Summary[], pick: (s: Summary) => number | null): number {
  const values = summaries.map(pick)
  if (values.some((v) => v === null)) throw new Error('a seed never reached this milestone')
  return mean(values as number[])
}

describe('casual bot pacing on default config', () => {
  // Long enough for every act to clear (all six take about 50 days on the bot).
  const traces = SEEDS.map((seed) => simulate({ config, preset: 'default', days: 60, seed }))
  const summaries = traces.map(summarize)

  it('clears Act I in about 4–5.5 days (goal-gated now, ADR 0039)', () => {
    // Was ≤2.1 d under the old Rep-threshold gate. Completing every Act I goal — especially fully
    // building two districts — genuinely takes longer; 4.55 d mean over these 5 seeds (TUNING.md).
    const actI = meanOf(summaries, (s) => s.actClear1)
    expect(actI).toBeGreaterThanOrEqual(4)
    expect(actI).toBeLessThanOrEqual(5.5)
  })

  it('clears Act II 3–5 days after Act I', () => {
    // The manual's own target again (M8): Act III's gate moved to ★1,200, so Act II is a full act (TUNING.md).
    const actII = meanOf(summaries, (s) => s.actClear2)
    expect(actII).toBeGreaterThanOrEqual(3)
    expect(actII).toBeLessThanOrEqual(5)
  })

  it('clears Act III 6–8 days after Act II', () => {
    const actIII = meanOf(summaries, (s) => s.actClears[2])
    expect(actIII).toBeGreaterThanOrEqual(6)
    expect(actIII).toBeLessThanOrEqual(8)
  })

  it('clears Act IV 8–10 days after Act III', () => {
    const actIV = meanOf(summaries, (s) => s.actClears[3])
    expect(actIV).toBeGreaterThanOrEqual(8)
    expect(actIV).toBeLessThanOrEqual(10)
  })

  it('clears Act V 10–14 days after Act IV', () => {
    // Bimodal by design: about 10 days when the first election is won, 14 when it takes the second (ADR 0044).
    const actV = meanOf(summaries, (s) => s.actClears[4])
    expect(actV).toBeGreaterThanOrEqual(10)
    expect(actV).toBeLessThanOrEqual(14)
  })

  it('reaches an ending 10–18 days after Act V', () => {
    const actVI = meanOf(summaries, (s) => s.actClears[5])
    expect(actVI).toBeGreaterThanOrEqual(10)
    expect(actVI).toBeLessThanOrEqual(18)
  })

  it('keeps growing after the story: contracts done, tiers past the book, new bests (ADR 0052)', () => {
    // Every seed ends the story by about day 52, leaving a week or more after it (TUNING.md).
    for (const { final } of traces) {
      expect(final.stats.after.contracts).toBeGreaterThanOrEqual(1)
      expect(final.stats.after.pastBook).toBeGreaterThan(0)
      expect(final.stats.after.bests).toBeGreaterThanOrEqual(1)
    }
  })

  it('keeps heat on schedule with no more than one raid and no missed wages', () => {
    const heat = meanOf(summaries, (s) => s.heatMean)
    expect(heat).toBeGreaterThanOrEqual(25)
    expect(heat).toBeLessThanOrEqual(35)
    expect(Math.max(...summaries.map((s) => s.raids))).toBeLessThanOrEqual(1)
    expect(summaries.every((s) => s.missedWages === 0)).toBe(true)
  })

  it('leaves Act I at a day or more even when every gold bar goes on finishing jobs', () => {
    // Gold speeds up jobs, not the building goals now gate Act I on (ADR 0039), so it barely moves
    // this number any more — but the floor is still worth guarding. Needs 6 days, not 3, for every
    // seed to reach the milestone at the new pace (TUNING.md).
    const TEN = Array.from({ length: 10 }, (_, i) => String(42 + i))
    const rush = TEN.map((seed) => summarize(simulate({ config, preset: 'default', days: 6, seed, persona: GOLD_RUSH })))
    expect(rush.every((s) => s.goldSpent > 0)).toBe(true)
    expect(meanOf(rush, (s) => s.actClear1)).toBeGreaterThanOrEqual(1)
  })

  it('makes partial success the most common op outcome (40–60%)', () => {
    const partial = meanOf(summaries, (s) => s.opOutcomes.partial)
    expect(partial).toBeGreaterThanOrEqual(0.4)
    expect(partial).toBeLessThanOrEqual(0.6)
  })
}, 120_000)
