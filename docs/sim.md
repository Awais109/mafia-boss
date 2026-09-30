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

`sim/baseline.csv` is the seed-42, 60-day run on current defaults (`npm run sim -- --days 60 --seed 42`, then copy the CSV from `sim/out/`): every act, through an ending. Regenerate it when defaults change and diff new runs against it.

## The casual bot

`sim/persona.ts`, `CASUAL` options. It implements plan §11 with a few deviations that the plan's version needed to avoid stalling ([ADR 0014](decisions/0014-sim-persona-policy.md)).

**Sessions** (game time, `sessionHours` by act): Act I at 08:00, 10:30, 13:00, 15:30, 18:00, 20:30, 23:00, following the 2.5 h vault leash. Act II at 08:00, 13:00, 18:00, 22:00. Later acts follow their longer leashes ([ADR 0040](decisions/0040-six-acts.md)): Act III at 08:00, 14:00, 20:00; Act IV at 08:00 and 20:00; Act V at 09:00 and 21:00; Act VI at 09:00.

**Each session, in order** (`playSession`):
1. `SESSION_START`; skip the tutorial, which buys the quick-start setup at the first session; `COLLECT`.
2. **Goal pursuit** (ADR 0039): while Dirty is above the wage/upkeep reserve, chase whichever Act I goals aren't done yet and wouldn't otherwise happen reliably, since Act II needs every one of them and the bot's normal economic logic doesn't trigger these three on its own — they only fire on a predicted shortage or high front utilization, both rare under the tuned economy. In order: upgrade a Tobacco Factory below tier 2 if affordable (`factoryTier2`); upgrade any owned front's rate track below level 2, ignoring the usual utilization gate (`workFront`); dispatch a `smuggleCigarettes` job with idle crew if fewer than 3 have run, ignoring the usual stock-shortage gate (`smuggleRun`); complete home plus the cheapest other unlocked district — every allows-slot, every premises lot, the latter capped at `maxWageShare` of yield so upkeep doesn't run away (`secondDistrict`). Runs before the deposit step below, so any upkeep it just added is already reflected in that step's reserve.
3. Answer every pending inbox item with the affordable option of highest decision value (below; opinion and the Ministry's attention at `opinionHours` hours of yield a point, [inbox.md](systems/inbox.md#the-bot)). Perk choices go by a fixed preference: Earner, Ghost, Fixer, Steady, Mentor, Bargainer.
4. Tolya: haggle when `haggleOdds` is at least `haggleAbove` (0.6) and Dirty covers the haggled price; otherwise pay the demand if affordable. It never refuses. Repair rackets below 75 condition. From Act II, when stock is within 10% of its cap and production outruns sales, sell Zhanna packs down to 70% of the cap, within her daily limit.
5. Set each front's dial: lay low while heat is above 55; push when the Dirty waiting to be washed (Dirty above the reserve, plus buffers) exceeds `pushBacklogHours` (6) of the front's base throughput and pushing keeps the heat target within 55; otherwise normal.
6. Deposit Dirty into fronts, best rate first, up to buffer caps, keeping a reserve of 12 h of wages and upkeep plus one bribe.
7. Bribe if heat is above 55.
8. Buy an official if affordable and heat or heat target is above 30.
9. Buy any unlocked front. Recruit into empty slots (highest stat total); past two crew, only while wages after the hire stay under `maxWageShare` (25%) of yield. Raise anyone under 35 loyalty.
10. Rock bottom ([ADR 0051](decisions/0051-rock-bottom.md)): open the family's envelope the moment it's there. The casual bot never misses a payday, so this only fires for a broke save.
11. Boss missions ([ADR 0050](decisions/0050-boss-missions.md)), before any other job claims the crew: an overreach goes the moment it opens (the only door to the next act), with the idle crew whose stats sum lowest; a rematch goes with the pair (or single) of idle crew with the best clean-or-partial odds (`bestMissionTeam`); a lost one goes again once its wait is over.
12. After the story ([ADR 0052](decisions/0052-after-the-story.md)): take every contract on the board its Clean covers, with the idle crew of lowest stat total (a contract is never rolled).
13. Dispatch idle crew, one job at a time, greedily by value per crew member, over the fixed jobs and the offers on the board (below). Smuggling is a candidate only when stock would run out within `stockReserveHours` (12) and the Clean it costs isn't needed for the next planned purchase.
14. Anyone still idle trains the stat with the most room under its ceiling, if Dirty after the lesson stays above the reserve. Then, from Act II, buy a lot from Zhanna when her next one is in, stock would run out within `stockReserveHours` (12), and Dirty after her price stays above the reserve.
15. Buy a district when affordable and its tribute plus perks (yield bonuses on what the bot runs there, cheaper wages) over 48 h exceed the buy-out. It never saves Clean for one.
16. Spend Clean, repeatedly, on the best gain ÷ cost: a new front first; front rate and capacity upgrades when utilization is at least `fronts.suspicionStartUtil`; a new joint or racket in the district with the best yield multiplier (for joints, including the street's prosperity from Act III); premises on the lot where they help most (below); or a tier upgrade (past the book too, after the story: [systems/after.md](systems/after.md)). It only considers what `racketBlocked` and `frontBlocked` allow. Joints and joint tiers are discounted by the shortage they would cause. The upgrades to tier 3 and tier 6 are each offered twice, greed and stealth, and the heat-budget filter leaves stealth when greed runs too hot. It skips anything that pushes the heat target above 55, unless an official is affordable right now.
17. `SESSION_END`.

**Job value** (`bestDispatch`) = expected Dirty + expected Rep × 10 + expected Influence × (3 h of yield × urgency) + P(success) × district flip value + growth + goods − expected heat spike × heat cost. Growth is, per member and stat, the expected XP ÷ that stat's point cost × `xpValue` (3), skipping stats at their ceiling. The total is divided by the number of sessions the job blocks. Urgency rises as heat or heat target climbs past 30, so the bot runs Influence jobs when it needs an official. Offers on the board are candidates too, valued with their own terms (`opDirtyRewardFor` on the offer's `cfg`). Training jobs aren't dispatch candidates; step 14 handles them.

**Supply value.** A pack is worth the joints' `atStake` over the packs they sell. A new factory or factory tier is worth `0.6 × Σ atStake × (shortfall before − shortfall after)`, with `shortfall = max(0, 1 − made ÷ demand)`, but only while stock would run out within `supplyHorizonHours` (24): a casual player reacts to the Supply card, not to a deficit days away. A new factory also counts the joint bonus it switches on in its district. A warehouse or warehouse tier is worth half the surplus it would bank over a day, while production outruns sales and stock is within 10% of the cap. Upkeep comes off both. Smuggling's goods are its expected packs, up to the room in stock, × Dirty per pack, minus its Clean × 2.

**Act II premises.** A Stash House, or a stash tier, is worth the overnight vault loss its extra hours would save: `min(extra hours, 10 − the act's target hours − hours already added) × yield ÷ 24`. A new stash also counts a small share of its raid shield, weighted by its district's yield, so it goes where the money is. A Union Office, or a tier, is worth its Influence × the Influence value jobs use, which is 0 once no official is left to buy. In practice the bot has bought the Precinct Captain before the office unlocks, so it never builds one.

**Act III.** A Hotel, or a hotel tier, is worth its prosperity: the joints on its street earn more by `(yieldMult[1] − yieldMult[0]) ÷ 100` per point; half a blocked business's yield when the hotel gets its street to that business's `minProsperity` (the Card Club); and a share of a blocked front's washing (the Bank) when the city's mean is short, in proportion to how much of the gap it closes. Its synergy with the street's joints counts like any other. An option that shuts a business (the investigator) costs what the business would earn while shut. City Hall and the Big Score need nothing new: the official loop and job dispatch are generic.

**Act III consequences** ([ADR 0042](decisions/0042-act-iii-credit-and-consequences.md)). A decision with a contest is worth its odds of each branch (`contestOdds`); lost condition costs about a day of a percent of that business's income per point, and an injury `5 + 2%` of yield per hour. After depositing, the bot lends everything idle above its running-cost reserve whenever the loan desk is free. In the spend loop it keeps the next loan payment back, and when nothing is affordable it borrows once for the best purchase that pays for itself within 48 hours and fits the heat budget; Clean left over pays the loan down. A Clinic is worth 2 Dirty an hour per crew member; a loan desk, or a desk tier, the expected return on the extra it could lend, at the default risk of the street it would sit on.

**Act IV** ([ADR 0043](decisions/0043-act-iv-zastava.md)). A premium pack is worth the premium joints' `premiumAtStake` over the packs they sell, plus what it lets an importer wash (`coverPerPremiumPack` at its rate, Clean worth 2). A convoy is a dispatch candidate when premium would run out within twice `stockReserveHours`; its goods are the expected landing (clean and partial odds × the load × the chance it gets past the road and customs, up to the room in stock) × that pack value, minus its Clean × 2. Before dispatching, while the Colonel holds the road and a convoy is wanted, it pays for passage if Dirty after the price stays above the reserve; it buys Zhanna's premium lot when premium would run out within `stockReserveHours`. Premium joints are discounted by the chance premium runs short (heavily while it would run out within a day). A Bonded Warehouse or Convoy Depot tier is worth, per six-hour convoy, the packs it saves: room a full stock would have wasted, customs seizures avoided in Zastava, the depot's bonus, road losses avoided. When nothing is affordable and credit is open, it borrows to open an unaffordable front it's allowed, so the importer isn't left waiting for savings.

**Act V** ([ADR 0044](decisions/0044-act-v-kombinat.md)). An auctioned district is bought as soon as it can be, with a loan when Clean falls short. A point of public opinion is worth `opinionValuePct` (1%) of yield an hour, half once mayor, plus what it adds to the Construction Trust; the media and the Palace of Culture are valued by the opinion they add, the Combine by the premium it makes against the premium shortage risk. In the `campaignWithinHours` (48) before a count, before depositing or lending, it buys campaign points until its chance of winning reaches `campaignTarget` (0.9): Influence first, keeping back what the officials still to come will cost, then Dirty above its reserve. Deliver the Vote is worth the Dirty its points would cost while the election still needs them. It never deposits into a frozen front, and buys the Governor once mayor when the Ministry's attention reaches half the freeze line or its target reaches the line. Premises are placed only where `racketBlocked` allows, so the Kombinat's reserved lots and `onlyIn` hold for the bot too.

**Act VI** ([ADR 0045](decisions/0045-act-vi-nagornaya.md)). It buys every district it can afford, for the Empire. Legalizing is a spend option worth the legal Clean × 2 (the Dirty it gives up mostly sat idle), with the heat it sheds counted as a negative heat gain, so legalizations compete with everything else on gain ÷ cost. The Holding is worth its bonus on the legal Clean, counting half of what isn't legal yet. In decisions, a frozen front costs the Clean the busiest front would have washed × 2, and a hearing won is worth `hearingWinHours` (6) of yield while the Empire still needs wins.

**Gold.** The casual bot never spends gold, so the pacing guard measures the free game. `GOLD_RUSH` (`--persona goldRush`) is the casual bot plus one habit: after dispatching, it rushes every running job it can afford (never a contract), soonest first, and dispatches again ([systems/gold.md](systems/gold.md)).

**Decision value** (`valueOf`) = Dirty + Clean × 2 + packs × pack value (full while stock would run out within `stockReserveHours`, a fifth otherwise) + Rep × `repValue` + Influence × the same Influence value + loyalty × `loyaltyValue` for each named crew member (×3 for anyone below `raiseBelow`) − heat × the same heat cost. `valuation()` computes the Influence value and heat cost once for both.

## Driver

`sim/driver.ts`:
- `simulate({ config, preset, days, seed, persona? })` starts a new game at 07:00 on a fixed sim day and plays it.
- `botPlay(state, config, from, days, persona?)` plays an existing save (the Debug Bot).
- Both walk time to the earliest of end, next session, next whole hour; play the session at its time; and record an hourly row at whole hours.
- `SESSION_END` is recorded like any other action, so a bot's action list is a faithful log.

`Recorder` rows:
- `HourRow`: `hour`, `day`, `act`, `dirty`, `clean`, `vault`, `vaultCap`, `heat`, `heatTarget`, `exposure`, `control`, `yield`, `rep`, `influence`, `frontUtil`, `cleanEarned`, `dirtyEarned`, `stock`, `gold` (the CSV columns), plus `crew`, `opPartial`, `opResolved`, `statPoints`, `stockCap`, `packDemand` and `goals` for the report.
- `SessionRow`: `day`, `act`, `actions`, `decisions` (successful `RESOLVE_INBOX`), `income` (Dirty earned since the last session ended), `dirtyAfter`, `vaultFillHrs`.
- `Trace.startStats`: the stats when the run began. Per-run metrics subtract them, because the Debug Bot starts from a save with history.

## Report

`sim/report.ts`: `summarize(trace)` → `Summary`, `formatSummary`, `toCsv`. Each target from manual §3 is a `Check` with `min`/`max`.

| Metric | Definition |
|---|---|
| Act *n* clear | Days from the previous act's clear (Act I: the game's start, `createdAt`) to `stats.actClearedAt[n]`, for every act up to `progression.finalAct`. Scored against `ACT_TARGETS` in `sim/report.ts`: I and II are the manual's §3 targets, III–VI the six-act design's ([ADR 0040](decisions/0040-six-acts.md)) |
| Heat mean, min, max | Over hourly rows before `legalize.fromAct`: legal businesses draw no heat by design, so Act VI isn't scored ([ADR 0045](decisions/0045-act-vi-nagornaya.md)) |
| hours ≥40 | Hourly rows with heat at or above `heat.inspectThreshold` |
| Front util | Mean over hours of throughput-weighted smoothed utilization |
| Dirty idle | Mean over sessions of `min(1, dirtyAfter ÷ income)` |
| Vault fill | `vaultCapBase ÷ yield` at session end, so a Stash House's extra hours don't count; the report prints the best stash's extra hours beside it ([ADR 0037](decisions/0037-act-ii-premises.md)). Act I uses day-1 sessions; Act II uses day-4+ Act II sessions |
| Op outcomes | Shares of `stats.opOutcomes` |
| Tiers | Final businesses, abbreviated (`K5 M4 BT3 VS2 TF2 WH1 A3 ST2 UN1 …`) |
| Decisions per session | Mean over sessions of `SessionRow.decisions` |
| Auto-resolved | `stats.inbox.auto` ÷ (answered + auto) over the run |
| Offer share | `stats.offerDirty` ÷ `stats.jobDirty` over the run |
| Wage share | (`stats.wagesPaid` + `stats.upkeepPaid`) ÷ `stats.dirtyEarned` over the run; a check at 10–25% (manual §5) |
| Crew growth | `stats.statPointsGained` over the run ÷ mean crew size ÷ days |
| Partial d1–2, d7–8 | Partial outcomes ÷ resolved jobs between the first and last hourly rows of those days (training never counts); blank when the run is too short. The plan's gate is d7–8 ≥ 40%: crew growth must not erase partials |
| Gold | Bars spent on skips and rushes, and hours skipped, over the run |
| Goals by day | Act I goals done by the end of each game day |
| Cigarettes | `stats.shortageHours` over the run; the share of Act I hours with stock out and joints selling; the share of selling hours with stock at its cap; packs lost to the cap. The plan's gate is some shortage, under 10% of Act I |

Clear times count from the game's `createdAt`, not the run's start, so the Debug Bot's report on an existing save reads like the CLI's. A clear that happened before the run is printed with `before this run` and not scored (`actClear1InRun`, `actClear2InRun`; [ADR 0022](decisions/0022-end-of-prototype-state.md)).

Where the bot stands against the targets, and every number change behind it, is in [TUNING.md](../TUNING.md).

## Replay

`sim/replay.ts` defines the app's log format (`LogLine`: `meta`, `action`, `config`, `event`; `LogExport` wraps the lines) and `replayLog(doc)`:
1. Start from the last `meta` line's snapshot, migrated to the current schema, and its config.
2. Walk to each `action` line's time and apply it, switching config at `config` lines.
3. Treat `SESSION_START` and `SESSION_END` as session bounds.

Because the engine is deterministic, the replay reproduces the tester's game; `tests/replay.test.ts` checks this against a bot game. `--replay` prints the same report.
