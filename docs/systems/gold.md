# Gold bars

Gold bars buy time and nothing else ([ADR 0034](../decisions/0034-gold-bars.md)). A bar skips an hour ahead, or finishes a running job now. Bars never turn into Dirty, Clean, Influence or Rep, never skip an unlock, and pacing is tuned without them.

**Code:** `engine/systems/gold.ts` (`grantGold`, `skipCost`, `rushCost`), the `SKIP_TIME`, `RUSH_OP` and `DEBUG_GRANT` handlers in `engine/core/apply.ts`, the act-unlock grant in `engine/systems/reputation.ts`, game time in `app/store.ts`. App: `app/components/SkipSheet.tsx`, the gold chip in `app/components/Header.tsx`, Finish now on Ops.
**Config:** `gold.*`.

## State

- `state.gold`: bars held.
- `state.skippedMs`: game time bought with bars. It's part of the clock and a duration, not a timestamp.
- `stats.gold`: `{ granted, spentSkip, spentRush, hoursSkipped }`.

A new game starts with `gold.starting`, counted as granted without an event.

## Skip ahead

`SKIP_TIME { hours }` takes a whole number of hours, at most `gold.maxSkipHours`, for `ceil(hours ÷ gold.hoursPerBar)` bars. The handler emits `TIME_SKIPPED { hours, bars }`, then runs the ordinary reconcile walk to `now + hours`: the vault fills, fronts launder, stock moves, jobs finish, heat drifts, wages settle, Tolya visits and raids roll, exactly as if the player had waited. Then `skippedMs` grows by the hours.

- **Game time** in the app is `Date.now() + debugOffsetMs + skippedMs`. The engine still only receives `now` ([architecture.md](../architecture.md#game-time)).
- `DEBUG_RESET_OFFSET` leaves `skippedMs` alone, and `shiftTimes` never touches it.
- A skip leaves no gap for the store's tick to find, so `dispatch` builds the away summary itself, titled "Skipped N hours".

## Finish now

`RUSH_OP { opId }` costs `max(1, ceil(time left ÷ gold.hoursPerBar hours))` bars. The job's `completesAt` becomes now and it resolves at once through `resolveOp`. Resolution is seeded by the job's id, not the time, so rushing never rerolls. Training can be rushed. Event: `OP_RUSHED { opId, opType, bars, name? }`.

## Where bars come from

Every grant goes through `grantGold(state, ctx, t, amount, source)` and emits `GOLD_GRANTED { amount, source }`:

| Source | When |
|---|---|
| `act` | Act II opens: `gold.perActUnlocked[2]`. `[3]` is for Act III, which isn't built |
| `debug` | `DEBUG_GRANT { gold }` |
| `goal` | An Act I goal done: `goals.rewardGold` each ([progression.md](progression.md#act-i-goals)) |
| `ad`, `purchase` | Reserved: rewarded ads and purchases aren't built |

## The app

- **Header:** a gold chip beside the clock that opens Skip ahead, and "+Nh skipped" once any time was bought.
- **Skip ahead sheet:** the `gold.skipChoices` with their costs; estimates at today's rates (vault after, Clean laundered, jobs finishing, cigarettes after); warnings when the vault is full, heat is at the raid line, or cigarettes would run out during the skip.
- **Ops:** Finish now with its cost on every running job.
- **Debug:** a +▰10 grant.

## The bot

The casual bot never spends gold, so the pacing guard measures the free game. `--persona goldRush` (`GOLD_RUSH` in `sim/persona.ts`) rushes every job it has just sent out while it has bars, then dispatches again; the report's Gold line shows bars spent and hours skipped ([sim.md](../sim.md)). After each session the driver moves its clock to the state's `updatedAt`, so a persona that skips keeps time.

**Tests:** `tests/gold.test.ts` (the starting bars; a skip equals waiting except for bars, bought time and its log line; limits on skips; a rush gives the roll waiting would; act and debug grants; a log with a skip and a rush replays exactly), `tests/sim.test.ts` (goldRush still takes a day or more to clear Act I), `tests/migrate.test.ts` (old saves get the starting bars).
