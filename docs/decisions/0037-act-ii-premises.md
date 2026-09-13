# 0037. Act II premises: the Stash House and the Union Office

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
[ADR 0031](0031-business-kinds.md) made premises the businesses that supply, improve or protect, on a limited number of lots. Act I has two, the Tobacco Factory and the Warehouse. The expansion plan (M6, features (k), (l) and (m)) adds two for Act II. The owner's note proposed a Stash House that shields 40% of the vault, but at target pacing raids happen 0–1 times in five days, so a building for a rare event alone is a weak buy.

## Decision
- **Stash House** (Act II, one per district). Its effects scale with tier and condition.
  - It lengthens the leash: the best one adds `leashHoursPerTier × tier` hours to the vault's target hours (`Derived.stashHours`, `Derived.vaultCap`). Stash houses don't stack.
  - It hides part of a raid in proportion to how much of the yield runs in its district: `shieldPerTier × tier × that district's share of yield`, summed and capped at `rackets.premises.maxShield`. `RAID` gains `shielded`. Where you build it matters.
- **`vaultCapBase`** keeps the unextended cap. Tolya's tribute demand reads it, so a stash doesn't raise his price. The sim report scores vault fill on it and prints the stash's extra hours beside it, which amends [ADR 0020](0020-sim-report-metrics.md)'s vault fill row: the leash target measures the free game, and a stash is a paid extension of it.
- **Union Office** (Act II, one per city) makes `influencePerHrPerTier × tier` Influence an hour, added to `Derived.influencePerHr` outside the daily cap on Influence from jobs.
- **Act II synergies:** `stashWarehouse` (a Warehouse beside a Stash House pays no upkeep) and `unionSovietsky` (a Union Office in Sovietsky Blocks makes ×1.5 Influence). `influenceMult` joins the synergy effects and lands on the `a` premises.
- Unlocks follow the M5 Rep shift: Stash House ★178, Union Office ★238.

## Consequences
- The casual bot builds a Stash House in every run, around day 4.5 and mostly in Station Square, and takes it to tier 4 (about 5.4 extra vault hours and a 12% raid shield). Act II pacing held at 3.07 days.
- The bot never builds a Union Office. In Acts I–II Influence buys only officials, and the bot has bought the Precinct Captain (day 2.6–3.0) before the office unlocks. For a player it shortens the wait for the Captain; its lasting use would be an Act III official, which isn't built.
- Influence guardrail: the Captain's cost ÷ Influence a day while saving for him averages 1.77 days on the bot (target 1.5–2.5). A tier-5 office in Sovietsky adds 3 Influence a day, which would take that ratio to 1.33 days; the bot doesn't get there before the Captain.
- The sim has no raids, so pacing never exercises the shield; `tests/apply.test.ts` covers it.

## Related
`engine/core/derive.ts` (`stashHours`, `raidShield`, `vaultCapBase`, `influencePerHr`), `engine/core/formulas.ts` (`vaultCap`), `engine/systems/heat.ts` (`raid`), `engine/systems/rivals.ts` (`tolyaTick`), `engine/config/defaults.ts` (`rackets.types.stashHouse`, `rackets.types.unionOffice`, `rackets.synergies`), `sim/persona.ts` (`spendOptions`), `sim/driver.ts` (`vaultFillHrs`), `sim/report.ts`, [systems/economy.md](../systems/economy.md#premises), [systems/heat.md](../systems/heat.md).
