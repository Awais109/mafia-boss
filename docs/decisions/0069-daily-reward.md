# 0069. Today's gold: a daily reward on a weekly streak, by game day

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #39

## Context
The game review found nothing that gives a reason to come back each day. Notifications (ADR 0058) say what's happening while you're away, but nothing rewards the visit itself. Gold (ADR 0034) is the reward currency: it buys hours of skip and finishes jobs, and the acts and goals already pay it. The issue left one question to decide: real calendar days or game days, and how a time skip or Debug's offset is kept from farming it.

## Decision
- **Once each game day after the opening, `CLAIM_DAILY` pays gold by day of the streak:** `daily.gold` is 1, 1, 1, 2, 2, 2, 3 (12 bars for a full week), and then the week starts over. Holding at 3 a day would have paid about 150 bars over a 50-day story, against the 45 the acts grant. The weekly cycle pays about 85.
- **A missed day takes `daily.dropPerMissedDay` (2) days off the streak,** not all of it, never below a fresh start. Missing one day costs a little, and a long break starts over. That's the "gently" the issue asked for.
- **Game days, not calendar days.** A game day is `dayIndex(config, t)`, the same day paydays use.
  - The engine stays pure and deterministic: the claim is an action at a game time, so it replays.
  - A gold skip is at most 8 hours and costs 8 bars, more than any claim pays, so skipping can't farm it.
  - Debug's offset is Debug's.
  - A device clock moved forward could farm it, as it could the rest of the idle game. That's #21's to stop (server time), not this feature's.
- **Claimed by hand, not paid automatically:** "Today's gold" sits at the top of Home with a Claim button until it's claimed. The visit is what's rewarded, so the reward should feel like one.
- **A reminder:** a local notification, "Today's gold is waiting", at the next game day's start (moved out of the quiet hours), with the bars and the streak it would make.
- **State:** `state.daily` (`lastAt`, the time of the last claim, which `shiftTimes` shifts; `streak`) and `stats.daily` (`claims`, `gold`, `best`), for the playtest's retention questions. Schema 19, with `v18to19` adding them unclaimed.
- **The bots claim it at their first session of each day.** The casual bot never spends gold, so pacing doesn't move.

## Consequences
- **Pacing (10 seeds, 60 days):** the casual bot is unchanged. The gold-rush persona, which spends every bar, finishes the story in 48.1 days (50.4 without the daily). Its Act I goes from 2.44 to 2.29 days.
- **Stats** shows the daily gold, the days claimed and the best streak.
- **The reminder can be crowded out:** notifications are capped at four, soonest first (ADR 0058), so on a busy day the next morning's reminder may be one of those left out.
- **When the backend comes (#19, #21),** the day can be checked against server time. The claim stays the same action.

## Related
`engine/systems/daily.ts` (`dailyOffer`, `claimDaily`), `engine/core/apply.ts`, `engine/model/state.ts`, `engine/model/migrate.ts` (`v18to19`), `engine/core/time.ts` (`shiftTimes`), `engine/config/defaults.ts` (`daily`), `app/components/DailyCard.tsx`, `app/notify/plan.ts`, `app/screens/StatsScreen.tsx`, `sim/persona.ts`, `tests/daily.test.ts`, `tests/notify.test.ts`, [gold.md](../systems/gold.md#todays-gold), [notifications.md](../notifications.md), [ADR 0034](0034-gold-bars.md), [ADR 0058](0058-local-notifications.md).
