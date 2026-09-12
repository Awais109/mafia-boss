# 0014. The casual bot's policy, and where it deviates from the plan

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §11 describes the "engaged casual" bot: four sessions a day, and in each one collect, deposit with a reserve, bribe above 55 heat, buy officials above 30, dispatch crew, spend on the best yield per Clean within a heat budget of 45, and buy districts whose tribute outruns the buy-out. Implemented literally, the bot stalled in ways that measured the bot, not the game:
- it never ran Influence jobs, so it never bought an official and heat froze all spending;
- it treated an affordable bribe as buyable control, so the heat budget never bound;
- recruiting ahead of fronts delayed the Restaurant by a day.

## Decision
The policy is in `sim/persona.ts` (`CASUAL`). The deviations from plan §11:

| Plan | Built | Why |
|---|---|---|
| 4 sessions a day | Act I: every 2.5 h from 08:00 to 23:00 (7). Act II: 08:00, 13:00, 18:00, 22:00 | Act I's vault fills in 2.5 h; four sessions would waste half of Act I's income |
| Influence not mentioned | Worth 3 h of yield, times an urgency that rises as heat or target passes 30 | Otherwise quick Dirty jobs always win and officials never get bought |
| Heat budget 45, unless "a control purchase is affordable" | Budget 55, and only an affordable official counts | Live with inspections, stay clear of raids; a bribe isn't permanent control |
| Order: officials, dispatch, spend, districts | Unlocked fronts bought before recruiting; districts before spending | A new front opens the throttle; recruits were starving it |
| "If a district is affordable" | Never saves Clean for a buy-out | Matches the plan's wording. Measured no effect on pacing, kept for correctness |

It also pays Tolya when affordable, repairs rackets below 75 condition, and gives a raise below 35 loyalty. Jobs are picked greedily by value per crew member, divided by how many sessions the job blocks.

## Consequences
- The bot is a policy, not a player. Where humans diverge from it is the signal (manual §7).
- Sim results depend on this policy: changing it moves the baseline. Regenerate `sim/baseline.csv` and re-check `tests/sim.test.ts`, and note it in [TUNING.md](../../TUNING.md).
- The in-app Debug Bot runs the same policy on real saves.

## Related
`sim/persona.ts`, `sim/driver.ts`, [sim.md](../sim.md#the-casual-bot), [0020](0020-sim-report-metrics.md).
