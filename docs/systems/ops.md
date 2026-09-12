# Ops: jobs

Crew go out on timed jobs for Dirty, Influence and Rep, at the cost of a heat spike. How well a job goes depends on who you send.

**Code:** `engine/systems/ops.ts` (`opUnlocked`, `opBaseScore`, `outcomeFor`, `rollOp`, `outcomeOdds`, `rewardShare`, `spikeShare`, `influenceRoom`, `opDirtyReward`, `resolveOp`), the `START_OP` handler in `engine/core/apply.ts`. Jobs resolve inside the reconcile walk at their exact completion time.
**Config:** `ops.*`, plus `reputation.perOpSuccess` and `crew.loyalty.perOpSuccess`.

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

`START_OP { opType, crewIds, districtId? }` checks:
- the job is unlocked (`act ≤ state.act`);
- exactly `crew` distinct crew members are chosen, and all are idle;
- for Pressure, a `districtId` that's open and not already yours.

The chosen crew become `on_op`, `stats.opsByCrew` counts the dispatch, and the job completes `minutes` of game time later (`OP_STARTED`).

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
- `stats.opOutcomes` counts each outcome.

## Events

- `OP_STARTED { opId, opType, crewIds, districtId? }`
- `OP_RESOLVED { opId, opType, crewIds, outcome, score, diff, dirty, influence, influenceLostToCap, spike, rep, districtId? }`

`DEBUG_COMPLETE_OPS` resolves every job in progress immediately.

**Tests:** `tests/ops.test.ts` (partial success is the most common outcome, odds match rolls, team scoring, traits), `tests/apply.test.ts` (job lifecycle, pressure flips a district), `tests/sim.test.ts` (the bot's partial share stays 40–60%).
