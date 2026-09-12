# The simulator

`sim/`: a bot that plays the engine headlessly, a report against the dev manual's targets, and log replay. It's how every config change is previewed before a human plays it (manual §1). Everything except `sim/run.ts` is pure, so the app's Debug Bot reuses it.

## CLI

`npm run sim -- [flags]` (`sim/run.ts`):

| Flag | Meaning |
|---|---|
| `--preset <name>` | `default`, `fast`, `stress`, `lenient` |
| `--days <n>` | Days to simulate (default 5; use 8 to see Act II clear) |
| `--seed <s>` | Seed; the bot's player id is `sim-<seed>` |
| `--runs <n>` | Run seeds `seed … seed+n−1` and print each target's mean and how many runs were in range |
| `--sessions <n>` | `n` evenly spaced sessions a day (08:00–22:00) instead of the casual schedule |
| `--set path=value` | Config override, repeatable (`--set heat.baseControl=6`) |
| `--replay <file>` | Report on a log exported from the app instead of the bot |
| `--out <dir>` / `--no-csv` | CSV location (default `sim/out/`, git-ignored) or none |

A config that fails validation, an unreadable file, or a file that isn't a log export exits with code 1 and a message.

`sim/baseline.csv` is the seed-42, 8-day run on current defaults. Regenerate it when defaults change and diff new runs against it.

## The casual bot

`sim/persona.ts`, `CASUAL` options. It implements plan §11 with a few deviations that the plan's version needed to avoid stalling ([ADR 0014](decisions/0014-sim-persona-policy.md)).

**Sessions** (game time): Act I at 08:00, 10:30, 13:00, 15:30, 18:00, 20:30, 23:00, following the 2.5 h vault leash. Act II at 08:00, 13:00, 18:00, 22:00.

**Each session, in order** (`playSession`):
1. `SESSION_START`, skip the tutorial, `COLLECT`.
2. Pay Tolya's demand if affordable; repair rackets below 75 condition.
3. Deposit Dirty into fronts, best rate first, up to buffer caps, keeping a reserve of 12 h of wages plus one bribe.
4. Bribe if heat is above 55.
5. Buy an official if affordable and heat or heat target is above 30.
6. Buy any unlocked front. Recruit into empty slots (highest stat total). Raise anyone under 35 loyalty.
7. Dispatch idle crew, one job at a time, greedily by value per crew member (below).
8. Buy a district when affordable and its tribute over 48 h exceeds the buy-out. It never saves Clean for one.
9. Spend Clean, repeatedly, on the best gain ÷ cost: a new front first, front rate upgrades when utilization is at least `fronts.suspicionStartUtil`, a new racket in the district with the best yield multiplier, or a tier upgrade. It skips anything that pushes the heat target above 55, unless an official is affordable right now.
10. `SESSION_END`.

**Job value** (`bestDispatch`) = expected Dirty + expected Rep × 10 + expected Influence × (3 h of yield × urgency) + P(success) × district flip value − expected heat spike × heat cost. The total is divided by the number of sessions the job blocks. Urgency rises as heat or heat target climbs past 30, so the bot runs Influence jobs when it needs an official.

## Driver

`sim/driver.ts`:
- `simulate({ config, preset, days, seed, persona? })` starts a new game at 07:00 on a fixed sim day and plays it.
- `botPlay(state, config, from, days, persona?)` plays an existing save (the Debug Bot).
- Both walk time to the earliest of end, next session, next whole hour; play the session at its time; and record an hourly row at whole hours.
- `SESSION_END` is recorded like any other action, so a bot's action list is a faithful log.

`Recorder` rows:
- `HourRow`: `hour`, `day`, `act`, `dirty`, `clean`, `vault`, `vaultCap`, `heat`, `heatTarget`, `exposure`, `control`, `yield`, `rep`, `influence`, `frontUtil`, `cleanEarned`, `dirtyEarned` (the CSV columns).
- `SessionRow`: `day`, `act`, `actions`, `income` (Dirty earned since the last session ended), `dirtyAfter`, `vaultFillHrs`.

## Report

`sim/report.ts`: `summarize(trace)` → `Summary`, `formatSummary`, `toCsv`. Each target from manual §3 is a `Check` with `min`/`max`.

| Metric | Definition |
|---|---|
| Act I clear | Days from start to `stats.actClearedAt[1]` |
| Act II clear | Days from Act I clear to `stats.actClearedAt[2]` |
| Heat mean, min, max | Over hourly rows |
| hours ≥40 | Hourly rows with heat at or above `heat.inspectThreshold` |
| Front util | Mean over hours of throughput-weighted smoothed utilization |
| Dirty idle | Mean over sessions of `min(1, dirtyAfter ÷ income)` |
| Vault fill | `vaultCap ÷ yield` at session end. Act I uses day-1 sessions; Act II uses day-4+ Act II sessions |
| Op outcomes | Shares of `stats.opOutcomes` |
| Tiers | Final rackets, abbreviated (`K5 M4 A3 …`) |

Where the bot stands against the targets, and every number change behind it, is in [TUNING.md](../TUNING.md).

## Replay

`sim/replay.ts` defines the app's log format (`LogLine`: `meta`, `action`, `config`, `event`; `LogExport` wraps the lines) and `replayLog(doc)`:
1. Start from the last `meta` line's snapshot and config.
2. Walk to each `action` line's time and apply it, switching config at `config` lines.
3. Treat `SESSION_START` and `SESSION_END` as session bounds.

Because the engine is deterministic, the replay reproduces the tester's game; `tests/replay.test.ts` checks this against a bot game. `--replay` prints the same report.
