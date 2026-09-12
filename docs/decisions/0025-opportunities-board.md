# 0025. An opportunities board of generated, expiring job variants

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
Dispatch had a single correct answer: the stat weights made the same crew on the same quick jobs strictly best. The plan wants dispatch to be a comparison, without inventing a second job system.

## Decision
- `state.offers = { items, refreshAt, refreshCount }`. Every `offers.refreshHours`, the board is replaced with `offers.count` offers drawn without replacement from `offers.templates` on `rng.derive('offers', refreshCount)`, following the recruit pool's fixed-schedule refresh so any split of a reconcile agrees.
- An offer is a **materialized variant of an existing job**: harder (`diffAdd`), better paid (`rewardMult` on Dirty and Influence), hotter (`spikeMult`) and a different length (`minutesMult`), with its own name. Pressure jobs are never offers.
- Offers **expire with the board** (`expiresAt = refreshAt`). Expiry is lazy: no boundary, the next refresh replaces the board, and `START_OP` rejects a stale id.
- `START_OP { offerId }` snapshots the offer's config on the job (`OpInstance.cfg`); resolution uses `opConfigOf`, so a job finishes on its own terms after the board moves on.
- The bot considers offers alongside the fixed jobs with the same valuation.

## Consequences
- Seed 42 took 11% of job Dirty from offers, under the plan's 25% ceiling.
- Offers raise the Dirty a job can pay, which is the knob to watch if Act II speeds up: `rewardMult` first.
- `OP_STARTED` and `OP_RESOLVED` carry the offer's `name` and `offerId`; `stats.offerDirty` counts its Dirty.

## Related
`engine/systems/offers.ts`, `engine/systems/ops.ts` (`opConfigOf`, `opDirtyRewardFor`), `engine/core/apply.ts` (`START_OP`), `app/screens/OpsScreen.tsx`, [systems/ops.md](../systems/ops.md#the-opportunities-board).
