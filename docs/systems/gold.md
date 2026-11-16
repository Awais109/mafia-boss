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

`RUSH_OP { opId }` costs `max(1, ceil(time left ÷ gold.hoursPerBar hours))` bars. The job's `completesAt` becomes now and it resolves at once through `resolveOp`. Resolution is seeded by the job's id, not the time, so rushing never rerolls. Training can be rushed; a contract can't, since it pays gold ([ADR 0052](../decisions/0052-after-the-story.md)). Event: `OP_RUSHED { opId, opType, bars, name? }`. A contract done grants its gold (`source: 'contract'`).

## Where bars come from

Every grant goes through `grantGold(state, ctx, t, amount, source)` and emits `GOLD_GRANTED { amount, source }`:

| Source | When |
|---|---|
| `act` | Act II opens: `gold.perActUnlocked[2]`. `[3]`–`[6]` for each later act as it opens |
| `debug` | `DEBUG_GRANT { gold }` |
| `goal` | A goal done: `goals.rewardGold` each in Act I, `goals.rewardGoldByAct[act]` in later acts ([progression.md](progression.md#act-i-goals), [later acts](progression.md#later-acts-goals)) |
| `daily` | The day's gold, claimed (below) |
| `ad`, `purchase` | Reserved: rewarded ads and purchases aren't built |

## Today's gold

([ADR 0069](../decisions/0069-daily-reward.md)) `engine/systems/daily.ts`. `CLAIM_DAILY`, once each game day after the opening, pays `daily.gold[(streak − 1) mod length]` bars: by day of the streak, 1, 1, 1, 2, 2, 2, 3, and then the week starts over. The streak counts days in a row. A missed day takes `daily.dropPerMissedDay` (2) days off it rather than all of it, never below a fresh start. `dailyOffer(state, config, t)` gives what a claim would pay, and the streak it makes, or null when there's nothing to claim (claimed today, the opening, or `daily.enabled` off). A claim sets `state.daily` (`lastAt`, `streak`), counts `stats.daily` (`claims`, `gold`, `best`), and emits `DAILY_CLAIMED { streak, gold }` and a `daily` gold grant. Errors: "No daily reward in this build", "After the opening", "Already claimed today".

Game days, as paydays use: a game day is `dayIndex(config, t)`. Gold can skip at most `gold.maxSkipHours` (8), which costs more than a claim pays, so skipping can't farm it. Debug's offset is Debug's, and a device clock moved forward is #21's to stop.

## The app

- **Header:** a gold chip beside the clock that opens Skip ahead, and "+Nh skipped" once any time was bought.
- **Skip ahead sheet:** the `gold.skipChoices` with their costs; estimates at today's rates (vault after, Clean laundered, jobs finishing, cigarettes after); warnings when the vault is full, heat is at the raid line, or cigarettes would run out during the skip.
- **Ops:** Finish now with its cost on every running job.
- **Debug:** a +▰10 grant.
- **Home:** "Today's gold" at the top until it's claimed (`DailyCard`): the day of the streak, or the days a missed day took off, and Claim ▰N.
- **Stats:** Daily gold, with the days claimed and the best streak.
- **Notifications:** "Today's gold is waiting" at the next game day's start ([notifications.md](../notifications.md)).

## The bot

The casual bot never spends gold, so the pacing guard measures the free game. Every bot claims the day's gold at its first session of the day. `--persona goldRush` (`GOLD_RUSH` in `sim/persona.ts`) rushes every job it has just sent out while it has bars, then dispatches again; the report's Gold line shows bars spent and hours skipped ([sim.md](../sim.md)). After each session the driver moves its clock to the state's `updatedAt`, so a persona that skips keeps time.

**Tests:** `tests/daily.test.ts` (not during the opening, once a day, a week of days in a row and the week starting over, days off for days missed, game days, shifted with time, old saves unclaimed, validation), `tests/gold.test.ts` (the starting bars; a skip equals waiting except for bars, bought time and its log line; limits on skips; a rush gives the roll waiting would; act and debug grants; a log with a skip and a rush replays exactly), `tests/sim.test.ts` (goldRush still takes a day or more to clear Act I), `tests/migrate.test.ts` (old saves get the starting bars).
