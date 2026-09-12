# 0018. Crew rules: wages, loyalty, walkouts, the nephew, traits, slots

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan gives the crew numbers: slots per act, recruit and raise costs, pool size and refresh, stat bands, the wage divisor, loyalty changes, three traits with one number each, and an `extraSlotCostPctOfBudget`. It leaves the rules around them open:
- what a "low loyalty event" is;
- what a missed wage day does beyond loyalty;
- what "budget" means for extra slots;
- who can be arrested;
- why anyone would hire a trait with only a downside.

## Decision
- **Wages** accrue continuously and settle at each game day start, from Dirty then the vault. A shortfall costs everyone `perMissedWageDay` loyalty and is then forgiven.
- **The low-loyalty event is a walkout.**
  - At each day start, every member below `lowThreshold` rolls `lowEventChancePerDay`.
  - A walkout leaves with `walkoutStealPct` of your Dirty.
  - Crew on a job or in jail don't roll.
- **The nephew:** Dima (`nephew: true`) can't be fired and never walks out.
- **Traits** (one at most; recruits roll `traitChance`):
  - `exArmy`: more Muscle, pure upside.
  - `gambler`: more Nerve, pricier wages.
  - `alcoholic`: cheap wages (a `wageMult` I added), but a random penalty on every job roll. That way there's a reason to hire one.
- **Extra slots** cost a share of lifetime Clean earned, never less than `extraSlotMinCost`, up to `extraSlotMax`. That's my reading of "budget". Both bounds are new keys.
- **Arrests** pick an idle crew member or an enforcer, never someone out on a job. Jailed crew still draw wages.
- **Recruits** start at `recruitLoyalty`, a new key.

## Consequences
- Wages bite hardest early, when two crew draw a large share of a small income, and fade to a small share in Act II.
- Walkouts only threaten crew you've neglected (no raises, failed jobs, missed wages), and the bot never triggers them.
- Crew slots get more expensive as the economy grows.

## Related
`engine/systems/crew.ts`, `engine/systems/heat.ts` (`arrest`), `engine/core/apply.ts` (`FIRE`, `RAISE`, `RECRUIT`, `BUY_CREW_SLOT`), [systems/crew.md](../systems/crew.md).
