# 0029. Tolya's demands can be paid, haggled once, or refused

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
A tribute demand had one sensible answer: tap Pay. Leaving it unpaid was a refusal by neglect ([ADR 0017](0017-tolya-and-zhanna.md)), not a choice anyone would make on purpose. The expansion plan wants Tolya's visits to be a decision, and wants crew stats to matter outside jobs.

## Decision
- `PAY_TRIBUTE { choice? }`, default `pay`, so logs from before this change replay unchanged.
- **Haggle:** the best idle talker (effective Nerve plus the Bargainer perk's bonus) rolls `score + U(−noise, noise) ≥ diff` once per demand, on `rng.derive('haggle', tickCount)`. Winning pays `pricePct` of the demand and pleases him; losing leaves the demand standing, insults him, and records `haggledTick` so the same demand can't be haggled again. It needs someone idle and Dirty for the haggled price. `haggleOdds` is the closed form, shown before the player commits.
- **Refuse:** the refusal that used to happen at his next visit happens now, on `rng.derive('refuse', tickCount)`, and `TRIBUTE_REFUSED` carries `explicit: true`.
- `TolyaState.forceResult: 'tribute'` makes his next visit a demand without rolling, once. The guided opening uses it.
- The bot haggles at odds of 0.6 or better, otherwise pays when it can, and never refuses.

## Consequences
- Seeding by visit count means reloading or waiting can't reroll a haggle.
- Nerve and crew growth now pay off in Dirty saved, and the Bargainer perk has a use.
- Refusing is available as a deliberate, immediate cost rather than something that happens to an absent player.

## Related
`engine/systems/rivals.ts`, `engine/core/apply.ts` (`PAY_TRIBUTE`), `app/components/TributeCard.tsx`, `sim/persona.ts`, [systems/districts-and-rivals.md](../systems/districts-and-rivals.md#answering-a-demand).
