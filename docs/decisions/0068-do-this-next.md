# 0068. "Do this next": one suggestion leads Home when nothing else waits

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #38

## Context
Home shows a lot: Tolya, decisions, alerts, the act's goals, the vault, the money, the week, what the next act needs. A returning player still had to work out what to tap. The game review asked for a "do this next" button. #36 had added an alert for what the next act waits on, and #37 goals for every act. What was missing was one place that picks.

## Decision
- **A card at the top of Home, "Do this next":** one suggestion with a button that does it or goes to it. It comes from `doNext` (`app/doNext.ts`), which is pure and tested, and reads only the state, the derived figures, the config and the time, so it can't disagree with the rest of Home.
- **It stays out of the way** during the opening (the banner leads), and while Tolya's demand, a decision or rock bottom waits. Those are already at the top of Home, and they come first.
- **Otherwise it shows the first of these:**
  1. **The vault 90% full or more:** Collect, which collects.
  2. **Idle Dirty, at least an hour of yield, that the fronts have room for:** Deposit, which deposits it best rate first. It keeps back what payday needs and the vault can't cover, the same sum as Home's "Dirty won't cover payday".
  3. **Crew with nothing to do:** Ops.
  4. **What the next act waits on,** once its Rep is in hand (`nextStep`, from #36). Its alert then stays off the Alerts list, so it isn't said twice.
  5. **The act's first goal that can be done now** (not waiting on Rep or its act), preferring one whose price is in hand, with the goal's hint. The button goes to where it's done (`GOAL_TAB`).
  6. **Nothing:** "Nothing needs you", and when the vault will be full, so the player knows when to come back.
- **Only collecting and depositing are done from the card.** They have one obvious amount. Everything else involves a choice (which job, which crew, which business), so the card goes to the screen where it's made.
- **The thresholds are presentation, not game numbers** (`DO_NEXT` in `app/doNext.ts`, like the sound mix and the notification plan), so they live in the app, not in `engine/config`.
- **The glyphs move to `app/glyphs.ts`,** free of React Native, so the goals and this card can be tested. `components/ui.tsx` re-exports them.

## Consequences
- A returning player sees one thing to do, with a button, whenever nothing more urgent is up. The rest of Home is unchanged below it.
- The suggestion order is a judgment call, to be checked in the playtest (#4). The order and the thresholds are each a one-line change.
- The engine is unchanged, as is the save.

## Related
`app/doNext.ts`, `app/components/DoNextCard.tsx`, `app/screens/HomeScreen.tsx`, `app/goals.ts` (`GOAL_TAB`, `locked`, `affordable`), `app/glyphs.ts`, `tests/donext.test.ts`, [app.md](../app.md), [ADR 0050](0050-boss-missions.md), [ADR 0067](0067-act-goals.md).
