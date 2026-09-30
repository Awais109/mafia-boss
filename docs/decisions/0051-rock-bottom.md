# 0051. Rock bottom: no game over

- **Status:** Accepted
- **Date:** 2026-09-30
- **Supersedes in part:** [0042](0042-act-iii-credit-and-consequences.md): the second missed loan payment's vault seizure.

## Context
The owner asked what happens when a player goes broke with no way back. Nothing in the game ended a save, but nothing brought a broke one back either. Missed paydays cost loyalty, low loyalty led to walkouts, and a missed loan kept coming back with a share of the vault each second miss while the debt compounded.

The design brief settled it as "rock bottom", which is never a game over:
- the family helps once per act;
- the lender takes a business rather than letting a debt grow for ever;
- Vitya and Dima never walk out.

## Decision
- **The envelope.**
  - **When it comes:** at a payday that can't be met (`WAGES_MISSED`), when Clean is below `rockBottom.cleanBelowHours` of wages as well. Then, if the family hasn't helped this act, `rockBottom.pending` is set and `ROCK_BOTTOM` is emitted.
  - **When it goes:** a payday met in full clears it.
  - **Opening it:** `OPEN_ENVELOPE` pays `rockBottom.stakeHours` of wages and upkeep in Dirty (at least `rockBottom.minStake`), records the act in `rockBottom.usedActs`, and emits `ENVELOPE_OPENED`. It works once per act.
  - **In the app:** Home shows the rock-bottom banner while it waits, and the Home tab gets a dot. Opening it plays Scene 15, *The second envelope*, with Lyosha's note for that act (`ENVELOPE_NOTES`).
- **The keys.** At `credit.missesToRepossess` missed loan payments in a row, the lender's men take one business and the loan is closed:
  - it's the middle earner by yield (not the worst thing you own, not the best), or a premises if nothing earns;
  - whoever minded it comes home;
  - `LOAN_REPOSSESSED` is emitted, and the notice shows the design's repossession panel;
  - the collectors' incident still comes at each earlier miss.

  This replaces `credit.secondMissVaultPct`, and the debt can't grow for ever.
- **Vitya never walks out.** The opening pool's `stays` flag, like Dima's `nephew`, is skipped by the walkout roll, and the app shows "never leaves". The v15→16 migration marks him by the opening pool's name, adds `rockBottom`, and adds the `repossessed` loan counter.
- **The bot** opens the envelope the moment it's there. The casual bot never goes broke, so pacing doesn't move.

## Consequences
- **The save is never wiped,** and every broke state has a way back within a payday: the envelope once an act, then the Dirty businesses keep earning.
- **The envelope can't carry a player through Act I,** since it comes once per act. A second broke payday the same act only costs loyalty, and Vitya and Dima stay.
- **Repossession costs more than a share of the vault did,** but it ends the loan. A player who can't pay isn't pinned under interest.
- `stats.loans.seized` stays, for saves from before this change; new saves only count `repossessed`.

## Related
`engine/systems/crew.ts`, `engine/systems/credit.ts`, `engine/core/apply.ts`, `engine/config/defaults.ts`, `engine/model/migrate.ts`, `app/screens/HomeScreen.tsx`, `app/components/EventNoticeModal.tsx`, `app/scenes.ts`, `app/story.ts`, [crew.md](../systems/crew.md), [credit.md](../systems/credit.md), [app.md](../app.md), [story.md](../story.md).
