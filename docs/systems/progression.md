# Progression: reputation, acts, tutorial

Reputation is the progress currency: it unlocks bigger rackets, the Restaurant, districts and officials, and ends Act II. Act I → Act II itself is gated by finishing every Act I goal, not by Reputation ([ADR 0039](../decisions/0039-goals-gate-act-two.md)). The guided opening walks a new player through buying the starting setup and then the loop; Act I goals give a reason to come back, and now decide when Act II opens.

**Code:** `engine/systems/reputation.ts` (`gainRep`, `spendClean`, `checkActs` — Act II "cleared" only), `engine/systems/tutorial.ts` (`TUTORIAL_STEPS`, `currentTutorialStep`, `tutorialOnAction`), `engine/systems/goals.ts` (`GOAL_CHECKS`, `checkGoals`, `checkActII` — the Act I → Act II transition), `engine/newGame.ts`, the quick start in `engine/core/apply.ts` (`applyQuickStart`). The copy lives in `app/components/TutorialBanner.tsx` and `app/goals.ts`.
**Config:** `reputation.*`, the `unlockRep` fields in `rackets.types` and `fronts.types`, `tutorial.*`, `opening.quickStart`, `crew.openingPool`, `goals.*`, and the `vault.starting*` fields.

## Reputation

([ADR 0019](../decisions/0019-reputation-sources.md))

| Source | Rep |
|---|---|
| Any Clean spent: rackets, upgrades, fronts, front upgrades, recruits, raises, crew slots, buy-outs | `reputation.perCleanSpent` per Clean |
| A successful job | `reputation.perOpSuccess × reward share` ([ops.md](ops.md)) |
| Taking a district | `reputation.perDistrict` |

`spendClean` is the only way Clean leaves the game, so every Clean purchase earns Rep. Rep never goes down.

## Acts

- **Act II** opens the instant every goal in `goals.list` is in `state.goals.done` ([ADR 0039](../decisions/0039-goals-gate-act-two.md)) — checked by `checkActII` (`engine/systems/goals.ts`), called once at the end of `checkGoals` after that boundary's goal completions are recorded. `state.act` becomes 2, `stats.actClearedAt[1]` is recorded, and `ACT_UNLOCKED` plus a note about Zhanna are emitted, and `gold.perActUnlocked[2]` gold bars are granted ([gold.md](gold.md)). What changes:
  - Act II racket types (each still gated by its `unlockRep`) and the Restaurant (its own `unlockRep`, and unlike rackets/districts/officials, Rep-gated only — it doesn't check `state.act` at all);
  - the Port Quarter and Sovietsky Blocks, the Precinct Captain, and the Move a Shipment job;
  - `crew.slotsByAct[2]` crew slots, and recruits from `crew.statBandByAct[2]`;
  - recruit and raise costs scaled by act, and job Dirty × `2^ops.rewardActScaling`.
- **Act II is cleared** at `reputation.actThresholds[3]`: `stats.actClearedAt[2]` and `ACT_CLEARED`, still checked by `checkActs` (`engine/systems/reputation.ts`) after every Rep gain — this half is unchanged by ADR 0039. The game carries on in Act II. **Act III and later are not built**; the threshold is named 3 only to mark the end of Act II ([ADR 0015](../decisions/0015-act-ii-pacing.md)). The app says so in words: the header reads `Act II cleared`, and Home lists both act milestones from `stats.actClearedAt`, since the events themselves fall out of the 200-event log ([ADR 0022](../decisions/0022-end-of-prototype-state.md)).

`reputation.actThresholds[2]` (143) is no longer read by any gate — it's kept as the historical reference point the unlock ladder (`rackets.types.*.unlockRep`) was tuned against, so every business still opens within the act it's tagged for even though nothing checks Act I → Act II against it directly any more. Every non-zero threshold includes the 38 Rep the opening's setup earns ([ADR 0035](../decisions/0035-guided-opening.md)).

## New game

`newGame(config, playerId, now)`:

| Field | Starts from |
|---|---|
| Vault, Dirty, Clean, Influence | `vault.startingDirty` in the vault, `vault.startingDirtyOnHand`, `vault.startingClean`, `vault.startingInfluence` |
| Heat | `heat.startHeat` (inspected already if that's above the threshold) |
| Businesses, fronts, crew | none: the opening buys them |
| Cigarettes | `supply.startingStock` |
| Gold | `gold.starting` bars |
| Districts | controllers from `startsAs` |
| Recruit pool | `crew.openingPool` (ids `cand0-0`, `cand0-1`, …); refreshes after `crew.poolRefreshHours` |
| Tolya | first visit after `rivals.tolya.tickHours`, or right after the opening's heat lesson |
| Tutorial | running; with `tutorial.enabled` false, `newGame` applies the quick start at once |

See [ADR 0035](../decisions/0035-guided-opening.md), which replaces [ADR 0010](../decisions/0010-starting-position.md).

## The guided opening

([ADR 0035](../decisions/0035-guided-opening.md)) `TUTORIAL_STEPS`. Each step advances when the player does the thing; the engine tracks only the step index and the app owns the words. The first five are purchases, and a purchase step is done once the thing is owned, however it got there, so buying out of order never strands the player.

| # | Step | Advances when | Teaches |
|---|---|---|---|
| 1 | `kiosk` | a Kiosk is owned | joints sell cigarettes; yield, heat, one of each per district |
| 2 | `stall` | a Market Stall is owned | a bigger joint, the vault cap |
| 3 | `factory` | a Tobacco Factory is owned | premises make, joints sell; upkeep |
| 4 | `front` | a front is owned | Dirty can't buy businesses; laundering |
| 5 | `hire` | the crew is 2 | stats, ceilings, wages in Dirty, the nephew |
| 6 | `collect` | `COLLECT` | the vault as the leash; Money flow |
| 7 | `launder` | `DEPOSIT` | the instant first conversion; keeping running costs back |
| 8 | `job` | `START_OP` | odds, experience, finishing a job with gold |
| 9 | `upgrade` | `UPGRADE_RACKET` | tiers; Clean spent earns Rep |
| 10 | `heat` | `TUTORIAL_ADVANCE` ("Got it") | heat, thresholds, the Ward Cop |
| 11 | `tolya` | `PAY_TRIBUTE`, any choice | tribute; pay, haggle or refuse |
| 12 | `report` | `RESOLVE_INBOX` | reports and their choices |
| 13 | `city` | `TUTORIAL_ADVANCE` | the city runs without you; gold; goals |

- **Tolya's visit.** Leaving step 10 sets Tolya's next visit `tutorial.tolyaAfterMinutes` game minutes away with `forceResult: 'tribute'`, so step 11 has a demand to answer. His visits carry on on their usual schedule from there.
- Reports file from the first job on; incidents wait for the opening to end.
- **Skip.** `TUTORIAL_SKIP` buys `opening.quickStart` through the ordinary `BUY_RACKET`, `BUY_FRONT` and `RECRUIT` handlers, skipping anything already owned and hiring only up to the quick start's crew size. Anything Clean can't cover is placed directly, so a skipped game is never worse off than the old fixed start. It doesn't count as an action.
- With `tutorial.enabled` false, `newGame` applies the quick start itself.

Each step emits `TUTORIAL_STEP`.

## Act I goals

([ADR 0035](../decisions/0035-guided-opening.md), gate [ADR 0039](../decisions/0039-goals-gate-act-two.md)) `goals.list`, checked by `checkGoals` after every action and at every reconcile boundary once the opening is over, so each is dated to the boundary where its condition first held. Each pays `goals.rewardGold` gold once (`GOAL_DONE { goalId, gold }`, a `goal` grant; [gold.md](gold.md)) and is kept in `state.goals.done`. Home lists them until all are done — and once all are, Act II opens (see Acts, above).

| Goal | Done when |
|---|---|
| `secondDistrict` | two districts are controlled *and* fully built: every joint/racket slot they allow, and every premises lot, filled |
| `factoryTier2` | a Tobacco Factory is at tier 2 or more |
| `thirdCrew` | the crew is 3 |
| `wardCop` | the Ward Cop is on the payroll |
| `workFront` | both front types are owned, each at rate level 2 or more |
| `smuggleRun` | 3 smuggling jobs have been sent |
| `soldier` | anyone reached Soldier |

There used to be an eighth goal, `actII` ("Reach Act II") — removed under ADR 0039, since it checked `state.act >= 2`, which can't hold before Act II opens once Act II requires every goal done.

## Playtest stats

`state.stats` (`PlaytestStats`) records what the playtest needs:
- sessions and actions;
- act clear times;
- raids, arrests, missed wages, walkouts;
- job outcomes, dispatches per crew member and per job type;
- Dirty earned and lost to the vault cap, Dirty from jobs and from offers, and net Dirty from decisions;
- Clean earned and spent;
- wages, repairs and bribes paid (and counters for training, upkeep, smuggling, shipments and surplus sales, which stay 0 until those systems exist);
- tribute lost and Dirty seized;
- inbox items filed, answered and auto-resolved;
- the first raid, when each official was bought, and the last session.

Sessions come from the app dispatching `SESSION_START` and `SESSION_END`.

**Tests:** `tests/opening.test.ts` (an empty start; the scripted path in order and affordable, ending where Skip does; purchases out of order; skipping part-way; a skip short of Clean; the tutorial off), `tests/goals.test.ts` (each goal pays once, opens Act II when the last one lands; goals wait for the opening; Act II stays shut with one goal still open), `tests/apply.test.ts` (the first-session loop; completing every goal reaching Act II), `tests/sim.test.ts` (act clear times for the bot), `tests/migrate.test.ts` (an old save's completed `actII` goal is dropped, not carried forward).
