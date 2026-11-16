# 0066. Act I in about two days: cheaper goals, a 4-hour vault, five visits a day

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #5

## Context
Act I took 4.73 days on the casual bot, against the dev manual's 1–2. ADR 0039 had made three of its seven goals harder, and those set the pace:
- `secondDistrict` asked for two districts fully built, every slot and premises lot. Even one full district took about 4 days.
- `workFront` asked for both Act I fronts at rate level 2, and the second front only opens at ★133.
- `soldier` asked for 8 stat points gained on one member, which took about 2.1 days.

Act I also asked for a visit every 2.5 hours, seven a day on the bot. The game review (2026-11-14) put it plainly: idle games are won or lost on the first day, and a real player checks in three to five times a day. The owner chose cheaper goals and a longer Act I vault, keeping all seven goals, tuned in the sim toward about two days (#5). An earlier choice to wait for the playtest is replaced.

## Decision
- **The three slowest goals ask for less.** The ids stay the same, so saves keep their progress. ADR 0039's intent stays too: a district bought and left empty doesn't count, and a front has to be upgraded, not just set.
  - `secondDistrict`: two districts held, each with a business of yours in it (`districtsWorked`), not two fully built. The goal reads "Open a business in a second district", and Home's hint names the empty district, or the cheapest one to take and its price.
  - `workFront`: one Act I front at rate level 2, not both. It reads "Upgrade a front's rate to level 2".
  - `soldier`: `crew.experience.ranks.soldier` 8 → 6 stat points. Made (20) and Capo (36) don't change, so every member reaches Soldier, and their first perk, a little sooner.
- **What the counted goals ask for is config:** `goals.need` (`secondDistrict` 2, `thirdCrew` 3, `workFront` 1, `smuggleRun` 3). Validation keeps each at 1 or more, `workFront` within the number of Act I fronts, and `secondDistrict` within the number of districts.
- **Act I's vault holds 4 hours:** `vault.targetHoursByAct[1]` 2.5 → 4. The casual bot visits five times a day in Act I (08:00, 12:00, 16:00, 20:00, 23:00), not seven, so the sim measures the player the review describes.
- **The gates don't change.** Act II still opens on every Act I goal. Act III still waits on ★1,200 and the act's missions.
- **The bot plays the goals as a player reading Home would** (`sim/persona.ts`):
  - it saves Clean for the cheapest district while `secondDistrict` is open, then opens that district's cheapest business;
  - it stops upgrading fronts once one is at level 2;
  - it keeps back the Dirty a payday needs when the payday comes before its next visit, less what the vault will hold by then (`paydayDue`, the sum behind Home's "Dirty won't cover payday"). It also won't stake that Dirty on an overreach. With five visits, the 23:00 visit is an hour before payday, and without this a deposit or a mission there missed it.
  - Pushing the Ward Cop or the third hire sooner was tried and didn't help: the Ward Cop waits on Influence, and an early hire's wages slowed everything else (TUNING.md).

## Consequences
10 seeds, 60 days:
- **Act I clears in 2.51 days** (was 4.73). Now no single goal sets the pace: the third crew, the Ward Cop and Soldier each land around day 2, each held by something else (the bot's wage share, ✦4 of Influence from jobs, XP). Getting closer to 2 days would mean moving several of these at once. The playtest should decide whether that's needed.
- **Act II takes 5.70 days** (was 3.76), against the manual's 3–5. Act III's ★1,200 comes at about the same day as before, since Rep grows with the empire, not with the act. So the days Act I gave up are now spent in Act II, with Act II's businesses and districts open. The whole story takes 49.6 days, as before.
  - A ★1,000 gate only brought Act II to 5.24, because the overreach after it takes its own time. Act III's businesses also unlock from ★1,220, so Act III would open with half a day of nothing new.
  - Act II's own goals (#37) are what should give it shape.
- **Acts III–VI:** III 6.52 (10/10), IV 9.29 (10/10), V 11.77 (10/10), VI 13.80 (9/10).
- **Other targets:** missed wages 0.00 (was 0.10), heat 30.7, no raids, front use 75%.
- **The greedy bot meets fewer raids** (0.1 a run over 60 days, was 0.7). It still climbs to the raid line, runs hotter than the careful bot and lets more retainers lapse, but it pays up at the line by design, so whether a raid lands there is luck. `tests/sim.test.ts` now checks the line, the heat and the lapses, not the raid count.
- **The sim report** keeps the manual's targets for Acts I and II, so it shows the remaining gap. The Act I vault-fill target is 3.5–4.5 h, for the new leash. `tests/sim.test.ts` guards Act I at 2–3 days and Act II at 4.5–6.5.
- **Saves don't change.** A goal already done stays done. A save partway through Act I may find a goal already met under the new rules: it's marked done, and paid, at the next check.
- The design brief's Home mock-up (`design/`) still shows the old goal wording. It's the designer's input, so it's left as it is.

## Related
`engine/systems/goals.ts`, `engine/config/defaults.ts` (`goals.need`, `vault.targetHoursByAct`, `crew.experience.ranks`), `engine/config/schema.ts`, `app/goals.ts`, `sim/persona.ts`, `sim/report.ts`, `tests/goals.test.ts`, `tests/sim.test.ts`, [progression.md](../systems/progression.md), [sim.md](../sim.md), [TUNING.md](../../TUNING.md), [ADR 0035](0035-guided-opening.md), [ADR 0039](0039-goals-gate-act-two.md) (its three harder goal definitions are superseded; the goal gate stays), [ADR 0040](0040-six-acts.md) (Act I's vault leash), [ADR 0064](0064-officials-retainers.md) (the greedy bot's raids).
