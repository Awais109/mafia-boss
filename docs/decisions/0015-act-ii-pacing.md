# 0015. Act II ends at 480 Rep with a compressed unlock ladder

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Manual §3 targets Act I clearing in 1–2 days and Act II 3–5 days after that. The plan names Act II's opening threshold (80 Rep) and a Rep ladder for Act II rackets (150/250/400/600/850), but not when Act II ends. I first set the end at 1000 Rep, and the bot never reached it in 7 days.

Three rounds of changes barely moved day-7 Rep (567–671 across every variant):
- cheaper Act II rackets and upgrades;
- compressing the ladder alone;
- a smaller Restaurant.

The reason: Rep comes from Clean spent, and Clean spent is bounded by Clean earned, about 830 a day in early Act II. Cost changes only alter what Clean buys; cheaper purchases even earn less Rep each.

So I measured the base economy instead. Over 10 seeds, the bot's Rep after Act I cleared was 199 at +2 days, 309 at +3, 459 at +4 and 659 at +5.

## Decision
- **Act II clear:** `reputation.actThresholds[3]` = 480, about 4 days of Rep after Act I.
- **Unlock ladder:** Auto Shop 110, Café 170, Bathhouse 250, Petrol Station 330, Cargo Bay 420. Every business opens inside the act.
- **Act I costs:** `costs.paybackHoursByAct[1]` = 10 (was 12). Act I was clearing at 2.12 days with no seed inside the target.
- **Act III** is still a stub: reaching the threshold records `stats.actClearedAt[2]` and the game continues.

## Consequences
- Over 10 seeds and 8 days:
  - Act I clears in 1.92 days, but only 4/10 seeds land inside 1–2 days.
  - Act II clears 3.84 days after Act I, in 10/10 seeds.
  - 8 of the 10 manual targets are met on the mean.
- Cargo Bay opens late: some seeds finish Act II without one.
- Front utilization (~46%) and Dirty left over after sessions (~54%) remain off target. This decision doesn't address them.
- `tests/sim.test.ts` guards this pacing. Any change to Rep sources, the ladder, the threshold or the bot's policy should re-run `npm run sim -- --days 8 --runs 10`.

## Related
`engine/config/defaults.ts` (`reputation.actThresholds`, `rackets.types.*.unlockRep`, `costs.paybackHoursByAct`), [TUNING.md](../../TUNING.md), [systems/progression.md](../systems/progression.md#acts), [0019](0019-reputation-sources.md).
