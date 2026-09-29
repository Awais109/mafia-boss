# Progression: reputation, acts, tutorial

Reputation is the progress currency: it unlocks bigger businesses, fronts and officials, and opens the acts after Act II. The game has six acts ([ADR 0040](../decisions/0040-six-acts.md)); Act I → Act II is gated by finishing every Act I goal ([ADR 0039](../decisions/0039-goals-gate-act-two.md)). The guided opening walks a new player through buying the starting setup and then the loop; Act I goals give a reason to come back, and decide when Act II opens.

**Code:** `engine/systems/reputation.ts` (`gainRep`, `spendClean`), `engine/systems/acts.ts` (`gateMet`, `nextGate`, `gameCleared`, `checkActs`), `engine/systems/tutorial.ts` (`TUTORIAL_STEPS`, `currentTutorialStep`, `tutorialOnAction`), `engine/systems/goals.ts` (`GOAL_CHECKS`, `checkGoals`), `engine/newGame.ts`, the quick start in `engine/core/apply.ts` (`applyQuickStart`). The copy lives in `app/components/TutorialBanner.tsx`, `app/goals.ts` and `app/acts.ts`.
**Config:** `reputation.*`, `progression.*`, the `unlockRep` and `act` fields in `rackets.types`, `fronts.types` and `officials.list`, the `*ByAct` records, `tutorial.*`, `opening.quickStart`, `crew.openingPool`, `goals.*`, and the `vault.starting*` fields.

## Reputation

([ADR 0019](../decisions/0019-reputation-sources.md))

| Source | Rep |
|---|---|
| Any Clean spent: rackets, upgrades, fronts, front upgrades, recruits, raises, crew slots, buy-outs | `reputation.perCleanSpent` per Clean |
| A successful job | `reputation.perOpSuccess × reward share` ([ops.md](ops.md)) |
| Taking a district | `reputation.perDistrict` |

`spendClean` is the only way Clean leaves the game, so every Clean purchase earns Rep. Rep never goes down.

## Acts

([ADR 0040](../decisions/0040-six-acts.md)) `Act` runs from 1 to 6. Each act after the first opens when its gate in `progression.acts` holds; every condition a gate lists must hold:

| Gate field | Holds when |
|---|---|
| `goals` | every goal in `goals.list` is done |
| `rep` | `reputation ≥ rep` |
| `holds` | you control every district listed |
| `fronts` | you own every front type listed |
| `mayor` | you've won an election ([politics.md](politics.md)) |

`progression.finalAct` is the last act this build has content for. `checkActs` (`engine/systems/acts.ts`) runs after every Rep gain (`gainRep`), at the end of every `checkGoals` (so after every action and every reconcile boundary), and from Debug; it opens every act whose gate holds, in order. Opening act *n*:
- `state.act = n`, `stats.actClearedAt[n − 1] = t`, `ACT_UNLOCKED { act: n }`;
- `gold.perActUnlocked[n]` bars ([gold.md](gold.md));
- when *n* is `prosperity.fromAct`, every open district's prosperity starts at its target ([prosperity.md](prosperity.md));
- when *n* is `opinion.fromAct`, opinion starts at its target and the first election is scheduled ([politics.md](politics.md));
- any district with `grantedOnOpen` in act *n* becomes yours (Nagornaya);
- Act II also emits the note about Zhanna.

With `finalAct` at 6 there's no gate after it: the first ending clears Act VI ([endgame.md](endgame.md#the-endings)). With a lower `finalAct` (a preset or a test), when the gate after `finalAct` holds, the final act is **cleared** instead: `stats.actClearedAt[finalAct] = t` and `ACT_CLEARED`, once. The game carries on (`gameCleared`), and the app says so in words ([ADR 0022](../decisions/0022-end-of-prototype-state.md)).

What each act changes, beyond its own businesses, fronts, officials, districts and jobs (tagged `act` in config):
- the vault leash `vault.targetHoursByAct`, the max tier `rackets.maxTierByAct` (6 from Act III), the price of a business `costs.paybackHoursByAct`;
- crew slots `crew.slotsByAct` and recruits from `crew.statBandByAct`;
- recruit and raise costs scaled by act, and job Dirty × `act^ops.rewardActScaling`.

| Act | Setting | Gate | Built |
|---|---|---|---|
| I | the streets: Zarechye, Kiosk Row, Station Square | — | yes |
| II | the Port Quarter and Sovietsky Blocks | every Act I goal ([ADR 0039](../decisions/0039-goals-gate-act-two.md)) | yes |
| III | the Centre ([ADR 0041](../decisions/0041-act-iii-the-centre.md)) | `progression.acts[3].rep` | yes |
| IV | Zastava and the road to the border ([ADR 0043](../decisions/0043-act-iv-zastava.md)) | `progression.acts[4].rep` | yes |
| V | the Kombinat: the auction, opinion, the Ministry, elections ([ADR 0044](../decisions/0044-act-v-kombinat.md)) | `progression.acts[5]`: Rep, hold Zastava, own the Import–Export Company | yes |
| VI | Nagornaya, the hills: Legalize, the Holding, the reckoning ([ADR 0045](../decisions/0045-act-vi-nagornaya.md)) | `progression.acts[6]`: Rep and the mayor's office | yes: an ending clears it ([endgame.md](endgame.md)) |

The unlock ladder (`unlockRep`) sits inside each act: every Act II business opens below Act III's gate, and each later act's businesses spread from just above its own gate. Every non-zero threshold includes the 38 Rep the opening's setup earns ([ADR 0035](../decisions/0035-guided-opening.md)).

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
| `workFront` | both Act I front types (`fronts.types.*.act` 1) are owned, each at rate level 2 or more |
| `smuggleRun` | 3 smuggling jobs have been sent |
| `soldier` | anyone reached Soldier |

There used to be an eighth goal, `actII` ("Reach Act II") — removed under ADR 0039, since it checked `state.act >= 2`, which can't hold before Act II opens once Act II requires every goal done.

## Playtest stats

`state.stats` (`PlaytestStats`) records what the playtest needs:
- sessions and actions;
- when each act was cleared (`actClearedAt[n]`: act *n* cleared, the moment act *n + 1* opened);
- raids, arrests, missed wages, walkouts;
- job outcomes, dispatches per crew member and per job type;
- Dirty earned and lost to the vault cap, Dirty from jobs and from offers, and net Dirty from decisions;
- Clean earned and spent;
- wages, repairs and bribes paid (and counters for training, upkeep, smuggling, shipments and surplus sales, which stay 0 until those systems exist);
- tribute lost and Dirty seized;
- inbox items filed, answered and auto-resolved;
- the first raid, when each official was bought, and the last session.

Sessions come from the app dispatching `SESSION_START` and `SESSION_END`.

**Tests:** `tests/acts.test.ts` (Act II on the goals, Act III on its Rep, gold for each; the last built act cleared, not left; gates on districts and fronts; several acts at once; prosperity starts at target; no Act III business before Act III), `tests/opening.test.ts` (an empty start; the scripted path in order and affordable, ending where Skip does; purchases out of order; skipping part-way; a skip short of Clean; the tutorial off), `tests/goals.test.ts` (each goal pays once, opens Act II when the last one lands; goals wait for the opening; Act II stays shut with one goal still open), `tests/apply.test.ts` (the first-session loop; completing every goal reaching Act II), `tests/sim.test.ts` (act clear times for the bot, all six acts), `tests/migrate.test.ts` (an old save's completed `actII` goal is dropped, not carried forward; an old "Act II cleared" becomes the road to Act III).
