import { describe, expect, it } from 'vitest'
import { simulate } from '../sim/driver'
import { GOLD_RUSH, GREEDY } from '../sim/persona'
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

  it('clears Act I in about 2–3 days (ADR 0066)', () => {
    // Goal-gated (ADR 0039), and the goals sized for about two days with five visits a day on a 4 h leash:
    // 2.6 d over these 5 seeds, against 4.55 when they asked for two full districts and both fronts (TUNING.md).
    const actI = meanOf(summaries, (s) => s.actClear1)
    expect(actI).toBeGreaterThanOrEqual(2)
    expect(actI).toBeLessThanOrEqual(3)
  })

  it('clears Act II 4.5–6.5 days after Act I', () => {
    // Act III's ★1,200 comes at about the same day as before, so the days Act I gave up are Act II's now: 5.7 d
    // over these 5 seeds, against the manual's 3–5. The gate stays (ADR 0066; TUNING.md has the ★1,000 run).
    const actII = meanOf(summaries, (s) => s.actClear2)
    expect(actII).toBeGreaterThanOrEqual(4.5)
    expect(actII).toBeLessThanOrEqual(6.5)
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

  it('takes a greedy player to the raid line, hotter and with more lapsed retainers than the careful bot (ADR 0064)', () => {
    // No heat budget, no bribes, and retainers left until heat reaches the raid line: officials lapse, heat creeps
    // back to the line, and the greedy bot pays up there. Whether a raid lands at the line is the dice (0.7 a run
    // over 60 days before ADR 0066, 0.1 since: TUNING.md), so this checks the risk taken and what it costs, not
    // the raids. Not a constant stream either.
    const runs = SEEDS.map((seed) => simulate({ config, preset: 'default', days: 45, seed, persona: GREEDY }))
    const greedy = runs.map(summarize)
    const peak = (tr: (typeof traces)[number]) => Math.max(...tr.hours.map((h) => h.heat))
    const lapsed = (trs: typeof traces) => trs.reduce((sum, tr) => sum + tr.final.stats.retainers.missed, 0)
    expect(runs.some((tr) => peak(tr) >= config.heat.raidThreshold)).toBe(true)
    expect(meanOf(greedy, (s) => s.heatMean)).toBeGreaterThan(meanOf(summaries, (s) => s.heatMean) + 2)
    expect(lapsed(runs)).toBeGreaterThan(lapsed(traces))
    const raids = greedy.reduce((sum, s) => sum + s.raids, 0)
    expect(raids / greedy.length).toBeLessThanOrEqual(4)
    expect(summaries.reduce((sum, s) => sum + s.raids, 0)).toBeLessThanOrEqual(raids)
  })

  it('makes partial success the most common op outcome (40–60%)', () => {
    const partial = meanOf(summaries, (s) => s.opOutcomes.partial)
    expect(partial).toBeGreaterThanOrEqual(0.4)
    expect(partial).toBeLessThanOrEqual(0.6)
  })
}, 120_000)
