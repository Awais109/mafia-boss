# 0023. "While you were away" is built in the app from the catch-up reconcile

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
A tester asked for a popup on return: which jobs finished and what each earned, how much Dirty the rackets made, how much was laundered and into how much Clean. The engine already catches the save up in one `reconcile` call when the app launches, comes to the foreground, or skips time in Debug, and that call returns every event of the gap. But the money flows a player most wants to see (vault accrual, laundering, wages) are continuous: they change state without emitting events, so events alone can't produce the breakdown.

Options:
1. Make the engine emit accrual events. Rejected: it would emit one per reconcile segment (every whole hour), which is the log's problem to filter, and it puts presentation in the engine.
2. Record a summary in `PlayerState`. Rejected: it's transient UI state, and it would bump the save schema for something that isn't a game rule.
3. **Build it in the app from the state before and after the catch-up plus its events.** Chosen.

## Decision
- `app/away.ts` (pure, no React) builds an `AwaySummary` from `(before, after, events)`: finished jobs from `OP_RESOLVED` events with their crew and rewards; racket income as the `stats.dirtyEarned` delta minus job rewards; Dirty lost to the full vault; per-front laundering as the buffer delta and the Clean it made at the front's rate; wages, tribute, seizures and Influence from the stats and state deltas; heat before and after; and the remaining non-bookkeeping events for the popup to describe.
- The store catches up at the start of every dispatch and on every tick. A gap of **15 game minutes or more** since the save was last caught up counts as being away: that's the shortest job, so a job that finished while the player was gone always gets a popup. A gap from a Debug time skip or an imported save counts too; the Bot commits its own end state, so it doesn't.
- A gap with a summary is always committed, even without events, so the next tick doesn't see the same gap again.
- A second gap before the popup is dismissed extends the pending summary (`mergeAway`) rather than replacing it.
- The summary lives in the snapshot only. It isn't saved: killing the app loses it, and the Log still has every event.

## Consequences
- The popup's numbers reconcile exactly with the save, because they're deltas of the same state the save holds.
- On the `fast` preset, 15 game minutes is 15 real seconds, so a short lock-screen pause shows the popup. That's acceptable for a testing preset and is noted in [app.md](../app.md).
- The threshold is an app constant, not config: it's presentation, not a game rule.
- Anything that changes `stats` accounting (what counts as `dirtyEarned`) changes the popup's racket line. `tests/away.test.ts` pins the split.

## Related
`app/away.ts`, `app/components/AwayModal.tsx`, `app/store.ts` (`tick`, `dispatch`, `dismissAway`), `tests/away.test.ts`, [app.md](../app.md#while-you-were-away), [architecture.md](../architecture.md#the-reconcile-walk).
