# Progression: reputation, acts, tutorial

Reputation is the progress currency: it opens Act II, unlocks bigger rackets and the Restaurant, and ends Act II. A short tutorial teaches the loop in the first session.

**Code:** `engine/systems/reputation.ts` (`gainRep`, `spendClean`, `checkActs`), `engine/systems/tutorial.ts` (`TUTORIAL_STEPS`, `currentTutorialStep`, `tutorialOnAction`), `engine/newGame.ts`. The tutorial copy lives in `app/components/TutorialBanner.tsx`.
**Config:** `reputation.*`, the `unlockRep` fields in `rackets.types` and `fronts.types`, `tutorial.*`, and the `starting*` fields.

## Reputation

([ADR 0019](../decisions/0019-reputation-sources.md))

| Source | Rep |
|---|---|
| Any Clean spent: rackets, upgrades, fronts, front upgrades, recruits, raises, crew slots, buy-outs | `reputation.perCleanSpent` per Clean |
| A successful job | `reputation.perOpSuccess × reward share` ([ops.md](ops.md)) |
| Taking a district | `reputation.perDistrict` |

`spendClean` is the only way Clean leaves the game, so every Clean purchase earns Rep. Rep never goes down.

## Acts

`checkActs` runs after every Rep gain.

- **Act II** opens at `reputation.actThresholds[2]`. `state.act` becomes 2, `stats.actClearedAt[1]` is recorded, and `ACT_UNLOCKED` plus a note about Zhanna are emitted. What changes:
  - Act II racket types (each still gated by its `unlockRep`) and the Restaurant (its own `unlockRep`);
  - the Port Quarter and Sovietsky Blocks, the Precinct Captain, and the Move a Shipment job;
  - `crew.slotsByAct[2]` crew slots, and recruits from `crew.statBandByAct[2]`;
  - recruit and raise costs scaled by act, and job Dirty × `2^ops.rewardActScaling`.
- **Act II is cleared** at `reputation.actThresholds[3]`: `stats.actClearedAt[2]` and `ACT_CLEARED`. The game carries on in Act II. **Act III and later are not built**; the threshold is named 3 only to mark the end of Act II ([ADR 0015](../decisions/0015-act-ii-pacing.md)). The app says so in words: the header reads `Act II cleared`, and Home lists both act milestones from `stats.actClearedAt`, since the events themselves fall out of the 200-event log ([ADR 0022](../decisions/0022-end-of-prototype-state.md)).

The unlock ladder (`rackets.types.*.unlockRep`) sits below the Act II clear threshold, so every business opens within the act.

## New game

`newGame(config, playerId, now)`:

| Field | Starts from |
|---|---|
| Vault, Clean, Influence | `vault.startingDirty`, `vault.startingClean`, `vault.startingInfluence` |
| Heat | `heat.startHeat` (inspected already if that's above the threshold) |
| Businesses | `rackets.starting` (tier 1, condition 100; premises included) |
| Cigarettes | `supply.startingStock` |
| Fronts | every front type with `cost` 0 and `unlockRep` 0 |
| Crew | `crew.starting` |
| Districts | controllers from `startsAs` |
| Recruit pool | generated; refreshes after `crew.poolRefreshHours` |
| Tolya | first visit after `rivals.tolya.tickHours` |
| Tutorial | on unless `tutorial.enabled` is false |

See [ADR 0010](../decisions/0010-starting-position.md).

## Tutorial

`TUTORIAL_STEPS`. Each step advances when the player does the thing. The engine tracks only the step index; the app owns the words.

| Step | Advances on | Teaches |
|---|---|---|
| `collect` | `COLLECT` | the vault and its cap |
| `deposit` | `DEPOSIT` | Dirty can't buy anything; launder it (the first conversion is instant) |
| `spend` | `BUY_RACKET` or `UPGRADE_RACKET` | Clean buys businesses and earns Rep |
| `op` | `START_OP` | jobs |
| `heat` | `TUTORIAL_ADVANCE` ("Got it") | heat, thresholds, officials |

`TUTORIAL_SKIP` ends it at any point. Each step emits `TUTORIAL_STEP`.

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

**Tests:** `tests/apply.test.ts` (the first-session path, reaching Act II), `tests/sim.test.ts` (act clear times for the bot).
