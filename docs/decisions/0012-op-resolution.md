# 0012. Jobs score the team's best stats plus a team bonus, with uniform noise

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan gives each job stat weights, a difficulty, a heat spike and rewards, plus global `noise`, `fullMargin`, `partialRewardPct`, `partialSpikePct` and `failSpikePct`. It doesn't say:
- how several crew members combine;
- what a partial success does to heat;
- how fractional Influence rounds.

The target is that partial success is the most common outcome (manual §3: 40–60%). With averaged team stats, the starting crew would almost never pass a two-person job.

## Decision
- **Score:**
  ```
  base  = Σ w[stat] × (best effective stat on the team) / Σ w + teamBonusPerExtra × (crew − 1)
  score = base + U(−noise, +noise) − U(0, randomPenalty) per alcoholic
  full ≥ diff + fullMargin · partial ≥ diff · otherwise fail
  ```
- **Partial means the crew backed off early:** `partialRewardPct` of the reward and `partialSpikePct` of the heat spike, so it's quieter than a clean job. A failure pays nothing, spikes `failSpikePct`, and costs loyalty.
- **Rewards:** Dirty is scaled by `act^rewardActScaling` and goes straight into Dirty. Influence on success is `max(1, round(influence × share))`, capped per game day (`influenceDailyCap` is an amount, not a job count). Rep is `perOpSuccess × share`.
- **Odds:** `outcomeOdds` gives exact odds for the UI and the bot.
- **Tuned values:** noise ±15 and `fullMargin` 15. With ±10 noise, a 10 margin made full successes dominate, and a 15 margin with ±10 noise couldn't produce the target shape ([TUNING.md](../../TUNING.md)).

## Consequences
- Pairing specialists is the play: a brains member and a muscle member cover each other. A weak second member doesn't drag a team down; they just tie up a body.
- The crew the game gives you lands around 23% full, 45% partial, 33% fail across all jobs. The bot, picking jobs it's favoured at, lands near 30/50/20.
- Act II Dirty rewards are four times Act I's, which makes quick jobs lucrative early in Act II.

## Related
`engine/systems/ops.ts`, `engine/config/defaults.ts` (`ops.*`), `tests/ops.test.ts`, [systems/ops.md](../systems/ops.md).
