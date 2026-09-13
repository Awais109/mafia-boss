# 0035. A guided opening: buy the starting setup yourself, then Act I goals

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
[ADR 0010](0010-starting-position.md) handed a new player a working setup: a Kiosk, a Market Stall, a Tobacco Factory (added by [ADR 0033](0033-bigger-act-i.md)), the Currency Kiosk and two crew. The owner wants the first half hour to be engaging: generous Clean, and a tutorial in which the player buys that same setup, not the whole catalogue, and learns what each piece does. The dev manual warns the biggest drop-off comes on day 2, when nothing gives a reason to return.

## Decision
- **Supersedes ADR 0010.** A new game starts with empty turf, no crew and no front: `vault.startingClean` (●440), `vault.startingDirtyOnHand` (◆90) beside `vault.startingDirty` (◆30) in the vault, the starting gold and stock. The Currency Kiosk now costs Clean. The setup costs ●380, so a player who buys it lands where the old start began, with ●60.
- **The first recruit pool** is `crew.openingPool`: Vitya, Dima (the nephew) and Sasha, with fixed stats and ceilings, at the normal price. Hiring two of three is a real choice.
- **Thirteen tutorial steps.** Five purchases (a purchase step is done once the thing is owned, so order doesn't matter), then collect, launder, send a job, upgrade, heat, Tolya, answer the report, and "the city runs without you". Leaving the heat step brings Tolya's next visit `tutorial.tolyaAfterMinutes` away with a forced tribute demand, so the next step has something to answer. Reports file from the first job; incidents wait for the end.
- **Skip buys the setup** (`opening.quickStart`) through the ordinary handlers, so Clean, Rep and events match buying it by hand. It skips anything owned, hires only up to the quick start's crew size, and places directly whatever Clean can't cover. `TUTORIAL_SKIP` doesn't count as an action. With the tutorial off, `newGame` applies the quick start itself. The bot skips.
- **Rep shift.** The setup earns 38 Rep, so every non-zero unlock and act threshold moved up by 38.
- **Act I goals** (`goals.list`): eight conditions read from state and stats (a second district, a tier-2 factory, a third crew member, the Ward Cop, working a front, a smuggling run, a Soldier, Act II). Each pays `goals.rewardGold` gold once. They wait for the tutorial to end and are checked after every action and at every reconcile boundary, so each is dated where its condition first held and splits agree. Home lists them until all are done.
- A save migrated from before this change is marked past the tutorial; its old five steps don't map onto the new thirteen.

## Consequences
- The bot's Act I got faster with the new start (1.55 days against 1.86), mostly from the ◆90 on hand and a known third recruit. The act thresholds went up by another 15 and 32 on top of the shift to hold the M4 clear times ([TUNING.md](../../TUNING.md)).
- Goals add up to eight gold bars in Act I, five of them on the first day for the bot. A player spending every bar on quick jobs now clears Act I in about a day, right at the gold gate from [ADR 0034](0034-gold-bars.md).
- Tests build their games through Skip (`fresh()` in `tests/helpers.ts`), so they start from the same setup the old start gave.
- The tutorial doesn't highlight controls on screen; each step's banner has a button to the right tab.

## Related
`engine/newGame.ts`, `engine/systems/tutorial.ts`, `engine/systems/goals.ts`, `engine/core/apply.ts` (`applyQuickStart`), `engine/core/reconcile.ts` (`processDue`), `engine/model/migrate.ts` (`v5to6`), `app/components/TutorialBanner.tsx`, `app/goals.ts`, [systems/progression.md](../systems/progression.md#the-guided-opening).
