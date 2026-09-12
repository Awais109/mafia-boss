# 0034. Gold bars buy time and nothing else: skip ahead, finish now

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
The owner wants a gold currency that skips time, one bar for an hour of work: 10 to start, more when an act opens, bars from Debug for now, and later from rewarded ads and purchases. It had to fit an engine that is offline-first, deterministic and replayable, without undoing the pacing the game is tuned to.

## Decision
- **Bars only buy time.** `SKIP_TIME { hours }` runs the ordinary reconcile walk over whole hours (at most `gold.maxSkipHours`, `ceil(hours ÷ hoursPerBar)` bars), so income, laundering, jobs, heat, raids and Tolya all happen as if the player had waited. `RUSH_OP { opId }` resolves a running job now for a bar per started hour it has left; resolution is seeded by the job's id, so rushing never rerolls.
- Bars never turn into Dirty, Clean, Influence or Rep, and never bypass an unlock. The skip preview only estimates, from `derive`; it never runs a reconcile.
- **Game time** in the app is the real clock plus the debug offset plus `skippedMs`. The engine still receives only `now`. `skippedMs` is a duration, so the debug reset never shifts it, and a replayed log carries it in its action times.
- **One grant path.** Every grant goes through `grantGold` with a source (`act`, `goal`, `debug`, `ad`, `purchase`), so ads and purchases can plug in later. The starting bars are set by `newGame` without an event.
- A skip leaves no gap for the store's tick, so the store builds its away summary itself, titled "Skipped N hours".
- **Pacing is tuned without gold.** The casual bot never spends it. A `goldRush` persona spends every bar finishing jobs it has just sent out; the gate is that it still takes at least a day over Act I. To hold that gate, the act thresholds moved from 80 and 480 to 90 and 540. The Restaurant stays at 80, so it opens just before Act II.

## Consequences
- Spending every bar, the bot clears Act I in about 1.2 days against about 1.9 without gold ([TUNING.md](../../TUNING.md)). Early bars are strong: each buys another quick job's Rep and Dirty while the crew would otherwise wait for the next session. Any new source of bars, starting with M5's goals, needs the same check.
- The higher thresholds moved the casual bot's Act I clear from 1.67 to about 1.86 days, still inside 1–2.
- Rewarded ads, purchases and other gold sinks aren't built.

## Related
`engine/systems/gold.ts`, `engine/core/apply.ts` (`SKIP_TIME`, `RUSH_OP`, `DEBUG_GRANT`), `engine/systems/reputation.ts`, `app/store.ts`, `app/components/SkipSheet.tsx`, `sim/persona.ts` (`GOLD_RUSH`), `sim/driver.ts`, [systems/gold.md](../systems/gold.md).
