# 0005. Seeded RNG streams derived from player id, tag and index

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §2.1: the same reconcile window must always produce the same raids, so reloading can't dodge one. A tester's run should be reproducible from a seed, and a log should replay exactly. One sequential generator would break both: the next roll would depend on how many rolls came before, which varies with how reconcile was split.

## Decision
- `makeRng(seed).derive(...parts)` hashes `seed|part|…` with xmur3 into an sfc32 generator, discarding the first 12 outputs to mix similar keys. Each roll site derives its own stream from stable identifiers.
- The seed is the player id: a random UUID in the app, `sim-<seed>` in the sim.

| Roll | Stream |
|---|---|
| Raid, arrest | `raid` / `arrest` + hour index |
| Job outcome | `op` + op id |
| Recruit pool | `pool` + refresh count |
| Tolya's visit | `tolya` + visit count |
| Walkout | `walkout` + day index + crew id |
| Debug forced arrest | `debug-arrest` + next id |

## Consequences
- A roll's result doesn't depend on reconcile timing, action order elsewhere, or how many other rolls happened.
- Renaming a stream tag or changing what goes into its key changes future rolls for existing saves. Past events stay as they are.
- Not cryptographic, which doesn't matter for a fun test (plan §1: no anti-tamper).

## Related
`engine/core/rng.ts`, [architecture.md](../architecture.md#randomness).
