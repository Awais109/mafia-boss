# Ops: jobs

Crew go out on timed jobs for Dirty, Influence and Rep, at the cost of a heat spike. How well a job goes depends on who you send.

**Code:** `engine/systems/ops.ts` (`opUnlocked`, `opBaseScore`, `outcomeFor`, `rollOp`, `outcomeOdds`, `rewardShare`, `spikeShare`, `influenceRoom`, `opConfigOf`, `opDirtyRewardFor`, `opDirtyReward`, `resolveOp`), `engine/systems/offers.ts` (the opportunities board), the `START_OP` handler in `engine/core/apply.ts`. Jobs resolve inside the reconcile walk at their exact completion time.
**Config:** `ops.*` (including `ops.reports`, see [inbox.md](inbox.md)), `offers.*`, plus `reputation.perOpSuccess` and `crew.loyalty.perOpSuccess`.

## The jobs

`ops.list`: each job has a `name`, `band` (quick / standard / long, for display), `minutes`, `crew` count, stat weights `w`, difficulty `diff`, heat `spike`, rewards (`dirty` and/or `influence`), and optionally `districtPressure` and `act`. Durations and difficulties are in `defaults.ts`.

| Job | Crew | Weighted on | Pays | Notes |
|---|---|---|---|---|
| `shakeDown` | 1 | Muscle, Nerve | Dirty | quick |
| `collectDebt` | 1 | Nerve, Brains | Dirty | quick |
| `leanOnWard` | 2 | Brains, Nerve | Influence | standard |
| `pressure` | 2 | Muscle, Nerve | Dirty + district pressure | standard; needs a target district |
| `moveShipment` | 2 | Nerve, Brains | Dirty | standard; Act II |
| `dinner` | 2 | Brains, Nerve | Influence | long |

## Starting a job

`START_OP { opType, crewIds, districtId?, offerId? }` checks:
- with `offerId`: the offer is still on the board, hasn't expired, and is for `opType`; its `cfg` replaces `ops.list[opType]` for everything below;
- the job is unlocked (`act ≤ state.act`);
- exactly `crew` distinct crew members are chosen, and all are idle;
- for Pressure, a `districtId` that's open and not already yours.

The chosen crew become `on_op`, `stats.opsByCrew` and `stats.opsByType` count the dispatch, and the job completes `minutes` of game time later (`OP_STARTED`). A job taken from the board stores `offerId`, its `name`, and a snapshot of its `cfg`, and the offer leaves the board.

## The opportunities board

([ADR 0025](../decisions/0025-opportunities-board.md)) `state.offers = { items, refreshAt, refreshCount }`. Every `offers.refreshHours` the board is replaced with `offers.count` offers, generated on `rng.derive('offers', refreshCount)`:

1. Eligible templates are those in `offers.templates` whose base job exists, isn't a pressure job, and whose `act` (or the base job's) is at most the current act. Picks are without replacement.
2. Each offer copies its base job and rolls: `diff + round(U(diffAdd))`, `spike × U(spikeMult)` (one decimal), `minutes × U(minutesMult)` (rounded to 5), Dirty `× U(rewardMult)` (rounded), Influence `× U(rewardMult)` (rounded up), and the template's `name`.
3. Every offer expires at the next refresh (`expiresAt = refreshAt`). Expiry is lazy: nothing happens at the instant, the next refresh replaces the board, and `START_OP` rejects a stale id.

`refreshOffersIfDue` runs in `processDue` after the recruit pool and walks the fixed schedule, so a long gap refreshes the board once per interval it crossed. `newGame` generates the first board (refresh 0). `DEBUG_REFRESH_OFFERS` replaces it now and restarts the schedule. Resolution uses `opConfigOf(c, op)`: the snapshot if there is one, otherwise `ops.list`. `stats.offerDirty` counts Dirty earned from offers.

## Resolution

([ADR 0012](../decisions/0012-op-resolution.md))

```
base  = Σ_stat  w[stat] × (best effective stat on the team)  /  Σ w
        + ops.teamBonusPerExtra × (crew − 1)
score = base + U(−ops.noise, +ops.noise) − U(0, alcoholic.randomPenalty) per alcoholic on the team

full     if score ≥ diff + ops.fullMargin
partial  if score ≥ diff
fail     otherwise
```

The roll is seeded by the job's id. `outcomeOdds` computes the exact probabilities for uniform noise, counting alcoholics at their mean penalty; the Ops screen and the sim bot both use it.

## Outcomes

| | Full | Partial | Fail |
|---|---|---|---|
| Reward share | 1 | `partialRewardPct` | 0 |
| Heat spike | `spike` × 1 | `spike × partialSpikePct` | `spike × failSpikePct` |
| Crew loyalty | `crew.loyalty.perOpSuccess` | `round(perOpSuccess × partialRewardPct)` | `ops.failLoyalty` |

- **Dirty:** `round(dirty × share × act^ops.rewardActScaling)`, straight into Dirty (not the vault).
- **Influence:** `max(1, round(influence × share))` on any success, limited by the room left under `ops.influenceDailyCap` for the current game day. Anything over the cap is reported as `influenceLostToCap`.
- **Rep:** `reputation.perOpSuccess × share`.
- **Heat:** the spike lands on heat immediately and feeds the next hour's raid roll ([heat.md](heat.md)).
- **Pressure:** a full or partial success adds one pressure to the target district ([districts-and-rivals.md](districts-and-rivals.md)).
- **Report:** the crew's report is filed in the inbox with 2–3 choices ([inbox.md](inbox.md)).
- `stats.opOutcomes` counts each outcome; `stats.jobDirty` the Dirty.

## Events

- `OP_STARTED { opId, opType, crewIds, districtId?, name?, offerId? }`
- `OP_RESOLVED { opId, opType, crewIds, outcome, score, diff, dirty, influence, influenceLostToCap, spike, rep, districtId?, name?, offerId? }`
- `OFFERS_REFRESHED { count }` (quiet)

`DEBUG_COMPLETE_OPS` resolves every job in progress immediately.

**Tests:** `tests/ops.test.ts` (partial success is the most common outcome, odds match rolls, team scoring, traits), `tests/apply.test.ts` (job lifecycle, pressure flips a district), `tests/offers.test.ts` (the board's schedule, taking an offer, stale offers), `tests/sim.test.ts` (the bot's partial share stays 40–60%).
