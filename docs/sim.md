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
| `--persona <name>` | `casual` (default) or `goldRush`, which spends every gold bar finishing jobs |
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
2. Answer every pending inbox item with the affordable option of highest decision value (below). Perk choices go by a fixed preference: Earner, Ghost, Fixer, Steady, Mentor, Bargainer.
3. Tolya: haggle when `haggleOdds` is at least `haggleAbove` (0.6) and Dirty covers the haggled price; otherwise pay the demand if affordable. It never refuses. Repair rackets below 75 condition.
4. Set each front's dial: lay low while heat is above 55; push when the Dirty waiting to be washed (Dirty above the reserve, plus buffers) exceeds `pushBacklogHours` (6) of the front's base throughput and pushing keeps the heat target within 55; otherwise normal.
5. Deposit Dirty into fronts, best rate first, up to buffer caps, keeping a reserve of 12 h of wages and upkeep plus one bribe.
6. Bribe if heat is above 55.
7. Buy an official if affordable and heat or heat target is above 30.
8. Buy any unlocked front. Recruit into empty slots (highest stat total); past two crew, only while wages after the hire stay under `maxWageShare` (25%) of yield. Raise anyone under 35 loyalty.
9. Dispatch idle crew, one job at a time, greedily by value per crew member, over the fixed jobs and the offers on the board (below). Smuggling is a candidate only when stock would run out within `stockReserveHours` (12) and the Clean it costs isn't needed for the next planned purchase.
10. Anyone still idle trains the stat with the most room under its ceiling, if Dirty after the lesson stays above the reserve.
11. Buy a district when affordable and its tribute plus perks (yield bonuses on what the bot runs there, cheaper wages) over 48 h exceed the buy-out. It never saves Clean for one.
12. Spend Clean, repeatedly, on the best gain ÷ cost: a new front first; front rate and capacity upgrades when utilization is at least `fronts.suspicionStartUtil`; a new joint or racket in the district with the best yield multiplier; premises on the lot where they help most (below); or a tier upgrade. Joints and joint tiers are discounted by the shortage they would cause. The upgrade to tier 3 is offered twice, greed and stealth, and the heat-budget filter leaves stealth when greed runs too hot. It skips anything that pushes the heat target above 55, unless an official is affordable right now.
13. `SESSION_END`.

**Job value** (`bestDispatch`) = expected Dirty + expected Rep × 10 + expected Influence × (3 h of yield × urgency) + P(success) × district flip value + growth + goods − expected heat spike × heat cost. Growth is, per member and stat, the expected XP ÷ that stat's point cost × `xpValue` (3), skipping stats at their ceiling. The total is divided by the number of sessions the job blocks. Urgency rises as heat or heat target climbs past 30, so the bot runs Influence jobs when it needs an official. Offers on the board are candidates too, valued with their own terms (`opDirtyRewardFor` on the offer's `cfg`). Training jobs aren't dispatch candidates; step 10 handles them.

**Supply value.** A pack is worth the joints' `atStake` over the packs they sell. A new factory or factory tier is worth `0.6 × Σ atStake × (shortfall before − shortfall after)`, with `shortfall = max(0, 1 − made ÷ demand)`, but only while stock would run out within `supplyHorizonHours` (24): a casual player reacts to the Supply card, not to a deficit days away. A new factory also counts the joint bonus it switches on in its district. A warehouse or warehouse tier is worth half the surplus it would bank over a day, while production outruns sales and stock is within 10% of the cap. Upkeep comes off both. Smuggling's goods are its expected packs, up to the room in stock, × Dirty per pack, minus its Clean × 2.

**Gold.** The casual bot never spends gold, so the pacing guard measures the free game. `GOLD_RUSH` (`--persona goldRush`) is the casual bot plus one habit: after dispatching, it rushes every running job it can afford, soonest first, and dispatches again ([systems/gold.md](systems/gold.md)).

**Decision value** (`valueOf`) = Dirty + Clean × 2 + packs × pack value (full while stock would run out within `stockReserveHours`, a fifth otherwise) + Rep × `repValue` + Influence × the same Influence value + loyalty × `loyaltyValue` for each named crew member (×3 for anyone below `raiseBelow`) − heat × the same heat cost. `valuation()` computes the Influence value and heat cost once for both.

## Driver

`sim/driver.ts`:
- `simulate({ config, preset, days, seed, persona? })` starts a new game at 07:00 on a fixed sim day and plays it.
- `botPlay(state, config, from, days, persona?)` plays an existing save (the Debug Bot).
- Both walk time to the earliest of end, next session, next whole hour; play the session at its time; and record an hourly row at whole hours.
- `SESSION_END` is recorded like any other action, so a bot's action list is a faithful log.

`Recorder` rows:
- `HourRow`: `hour`, `day`, `act`, `dirty`, `clean`, `vault`, `vaultCap`, `heat`, `heatTarget`, `exposure`, `control`, `yield`, `rep`, `influence`, `frontUtil`, `cleanEarned`, `dirtyEarned`, `stock`, `gold` (the CSV columns), plus `crew`, `opPartial`, `opResolved`, `statPoints`, `stockCap` and `packDemand` for the report.
- `SessionRow`: `day`, `act`, `actions`, `decisions` (successful `RESOLVE_INBOX`), `income` (Dirty earned since the last session ended), `dirtyAfter`, `vaultFillHrs`.
- `Trace.startStats`: the stats when the run began. Per-run metrics subtract them, because the Debug Bot starts from a save with history.

## Report

`sim/report.ts`: `summarize(trace)` → `Summary`, `formatSummary`, `toCsv`. Each target from manual §3 is a `Check` with `min`/`max`.

| Metric | Definition |
|---|---|
| Act I clear | Days from the game's start (`createdAt`) to `stats.actClearedAt[1]` |
| Act II clear | Days from Act I clear to `stats.actClearedAt[2]` |
| Heat mean, min, max | Over hourly rows |
| hours ≥40 | Hourly rows with heat at or above `heat.inspectThreshold` |
| Front util | Mean over hours of throughput-weighted smoothed utilization |
| Dirty idle | Mean over sessions of `min(1, dirtyAfter ÷ income)` |
| Vault fill | `vaultCap ÷ yield` at session end. Act I uses day-1 sessions; Act II uses day-4+ Act II sessions |
| Op outcomes | Shares of `stats.opOutcomes` |
| Tiers | Final businesses, abbreviated (`K5 M4 BT3 VS2 TF2 WH1 A3 …`) |
| Decisions per session | Mean over sessions of `SessionRow.decisions` |
| Auto-resolved | `stats.inbox.auto` ÷ (answered + auto) over the run |
| Offer share | `stats.offerDirty` ÷ `stats.jobDirty` over the run |
| Wage share | (`stats.wagesPaid` + `stats.upkeepPaid`) ÷ `stats.dirtyEarned` over the run; a check at 10–25% (manual §5) |
| Crew growth | `stats.statPointsGained` over the run ÷ mean crew size ÷ days |
| Partial d1–2, d7–8 | Partial outcomes ÷ resolved jobs between the first and last hourly rows of those days (training never counts); blank when the run is too short. The plan's gate is d7–8 ≥ 40%: crew growth must not erase partials |
| Gold | Bars spent on skips and rushes, and hours skipped, over the run |
| Cigarettes | `stats.shortageHours` over the run; the share of Act I hours with stock out and joints selling; the share of selling hours with stock at its cap; packs lost to the cap. The plan's gate is some shortage, under 10% of Act I |

Clear times count from the game's `createdAt`, not the run's start, so the Debug Bot's report on an existing save reads like the CLI's. A clear that happened before the run is printed with `before this run` and not scored (`actClear1InRun`, `actClear2InRun`; [ADR 0022](decisions/0022-end-of-prototype-state.md)).

Where the bot stands against the targets, and every number change behind it, is in [TUNING.md](../TUNING.md).

## Replay

`sim/replay.ts` defines the app's log format (`LogLine`: `meta`, `action`, `config`, `event`; `LogExport` wraps the lines) and `replayLog(doc)`:
1. Start from the last `meta` line's snapshot, migrated to the current schema, and its config.
2. Walk to each `action` line's time and apply it, switching config at `config` lines.
3. Treat `SESSION_START` and `SESSION_END` as session bounds.

Because the engine is deterministic, the replay reproduces the tester's game; `tests/replay.test.ts` checks this against a bot game. `--replay` prints the same report.
