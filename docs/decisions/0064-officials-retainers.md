# 0064. Officials keep their control while a weekly retainer is paid

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #7

## Context
Officials were permanent control, bought once with Influence. In the 60-day sim, heat was all or nothing:
- **With the officials**, it never threatened, not even a bot with no heat budget and no bribes (heat ~29, no raids).
- **Without them**, Act I ran at heat 88, with 135 raids a run, and was never cleared.

There was no middle where a greedy player meets the odd raid while a careful one avoids them, which is what the heat design wants. The owner chose to make officials a retainer that lapses unless renewed.

## Decision
- **Every `officials.retainer.everyDays` (7) from purchase, an official's retainer falls due in Clean:** their `retainerHours` (1, 2, 3, 3, 4 from the Ward Cop to the Governor) × the Dirty yield per hour at the time. It's paid by itself when the Clean is there. Being Clean spent, it earns Rep like any.
- **Without the Clean, the official lapses:** their control is out of `derive`'s total until `PAY_RETAINER`, which reinstates them, with the next retainer a period on. Only their control lapses; their Influence and the Governor's Ministry relief stay.
- **Clean, not Influence.** The first version charged a fifth of the price in Influence. Each official's own trickle (3 a day) covered it many times over, and Influence has little other use before Act V, so nothing ever lapsed. Clean is what growth runs on, so it's a real choice between paying and expanding. Scaling the fee by yield keeps it relevant in every act.
- **Due times are reconcile boundaries,** so a lapse lands at the same moment however the time is split. `shiftTimes` moves them, and the v17→18 migration gives old saves' officials a retainer due a week after they were last played.
- **The bot:**
  - the careful casual bot keeps the next 48 hours' retainers back from its Clean and pays a lapsed one at once;
  - a `GREEDY` persona (no heat budget, no bribes) keeps nothing back and pays only at the raid line.
- **The app:**
  - the Heat screen shows each official's next retainer and fee, and "not answering" with **Pay the retainer** once lapsed;
  - Home raises an alert, a missed retainer is a pop-up, and the Precinct Captain's "permanent" is gone.

## Consequences
- **Heat has a middle** (5 seeds, 45 days): the careful bot meets no raids, the greedy one about one a run (5 across the seeds). Over 10 seeds and 60 days, greedy missed 3.4 retainers a run and met 1.9 raids at heat 36.8; careful missed 0.7, paid each at once, and met none at heat 28.5. `tests/sim.test.ts` guards this.
- **Pacing:** the Clean that goes on retainers slows the late game a little: Act V 11.7 → 13.3 d and Act VI 13.0 → 15.7 d (10 seeds), both in band. #6's re-pace is tuned on top of this.
- **Schema 18.** `state.retainers` and `stats.retainers` are new.
- **Not built:** no notification before a retainer would lapse, and no partial payment.

## Related
`engine/systems/retainers.ts`, `engine/core/derive.ts`, `engine/core/reconcile.ts`, `engine/core/apply.ts`, `engine/core/time.ts`, `engine/model/migrate.ts`, `engine/config/defaults.ts` (`officials.retainer`, `retainerHours`), `sim/persona.ts` (`retainers`, `GREEDY`), `app/screens/HeatScreen.tsx`, `app/inbox.ts`, `tests/retainers.test.ts`, `tests/sim.test.ts`, [heat.md](../systems/heat.md).
