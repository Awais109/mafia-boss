# 0052. After the story: tiers past the book, the empire value, and contracts

- **Status:** Accepted
- **Date:** 2026-09-30
- **Supersedes in part:** [0022](0022-end-of-prototype-state.md): once the last act is cleared, Home no longer says "the book is closed" with Export log; it shows After the story.

## Context
The story ends in Act VI ([ADR 0045](0045-act-vi-nagornaya.md)), and the owner wants play to carry on after it: "Players should still be able to play for growth." Until now, a cleared game had nothing new to reach:
- tiers stopped at 6;
- Reputation kept counting toward nothing;
- Home said the book was closed and offered Export log.

The design brief ("After the story") and the screens (Home after the story) settle three things:
- tiers past the old limit;
- an empire value with a personal best;
- a weekly board of big contracts paying Clean and gold.

## Decision
- **The story is over** when an ending clears the final act: `formulas.storyOver`, which `gameCleared` now calls.
- **Past the book.** After the story, joints and rackets tier `after.extraTiers` past the book's last tier (`formulas.bookMaxTier`, the final act's `maxTierByAct`), to tier 20. Each tier past it costs `after.pastBookCostMult` more again, on top of the usual curve. Heat still compounds faster than yield, so the new tiers suit legal businesses. Premises and fronts keep their caps. The app tags such a business "past the book".
- **The empire value** (`empireValue`), which the header, Home, Stats and the cover all read, is:
  - businesses at what they cost (bought, then each tier);
  - fronts at what they cost (bought, then each rate and capacity level);
  - cash (Dirty, Clean and the vault, less any loan);
  - a day of income (Dirty yield and legal Clean, × 24).

  At each day start it goes into `after.history` (the last 8 days). A value above `after.best` becomes the best, and once the story is over it emits `EMPIRE_BEST`. After the story, the header's first cell shows it in place of the vault; the vault stays on Home.
- **Contracts** are the council's big jobs.
  - **Posting:** the first board goes up the moment the story ends. After that the board is posted anew every `after.contracts.refreshDays`, on a fixed schedule; one under way stays on it.
  - **Terms:** each posting picks `count` kinds from `after.contracts.list`, with Clean up front and on completion in days of income (at least `minDayIncome`), rounded to two figures, and a fixed gold reward.
  - **Taking one:** `START_CONTRACT` takes the crew and the Clean up front (which earns Rep, like any Clean spent). It then rides the job machinery as a job of type `'contract'`.
  - **Completion:** it always comes back done (`CONTRACT_DONE`), paying Clean and gold. Nothing is rolled: the choice is Clean and crew-days against a sure return.
  - **No rushing:** gold can't finish one early, since a contract pays gold and rushing it would be a loop.
- **Schema 17** adds `after` and `stats.after`. An old save whose story was already over gets its first board on its next reconcile.
- **The bot** takes every contract its Clean covers, with its least valued idle crew, and never rushes one. Tiers past the book enter its spending like any other upgrade.

## Consequences
- **Growth has no ceiling within reach.** Each tier past the book costs about 3.5× the last, for 1.2× the yield. The bot reaches tier 12–13 on its cheapest businesses by day 60, then slows, and a player always has another tier to buy.
- **Contracts add roughly a third to a day's Clean** for crew who'd otherwise sit idle.
- **Pacing through the ending is unchanged.** The pacing test now also checks that each seed does a contract, buys a tier past the book and sets a new best.
- `shiftTimes` now also shifts `stats.endings`, which it had missed since [ADR 0045](0045-act-vi-nagornaya.md).
- **Not in this change:** the ending scenes, the credits and the cover's after-the-story variant.

## Related
`engine/systems/after.ts`, `engine/core/formulas.ts`, `engine/config/defaults.ts` (`after`), `engine/model/migrate.ts` (`v16to17`), `app/components/AfterStory.tsx`, `app/components/Header.tsx`, `app/screens/OpsScreen.tsx`, `sim/persona.ts`, `tests/after.test.ts`, [systems/after.md](../systems/after.md).
