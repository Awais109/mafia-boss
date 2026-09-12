# 0031. Joints, rackets and premises: four questions, spots and lots, upkeep

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
The expansion plan adds businesses that don't earn directly: a Tobacco Factory and a Warehouse now, a Stash House and a Union office later. Mafia Empire's rule, that every building answers one of four questions (does it make money, supply another, improve another, reduce a risk), gives a test for any new type. ADR 0009's one-of-each spots already stop spam, but they leave no placement choice, so side-by-side bonuses had nowhere to live.

## Decision
- Every business type has a `kind`: `joint` (sells cigarettes for part of its income), `racket` (earns without goods, hotter per Dirty) or `premises` (makes, keeps or improves; no yield; costs upkeep). Joints and rackets answer the first question, premises the other three. Fronts stay separate.
- All three kinds share `state.rackets` and the same actions, so saves, Tolya's hits, repairs and the ledger need no new paths. The tab keeps its id `rackets` and is titled Business, grouped by district.
- Joints and rackets keep ADR 0009's spots. Premises go on `districts.list[id].premisesLots`: any premises type, one of each type per district, and at most `maxInCity` in the city when a type sets it.
- Premises carry a set `purchase` price, tier to `rackets.premises.maxTier` in any act, take no enforcer and no specialization, and what they do scales with condition.
- Upkeep accrues continuously and settles at each day start after wages, from Dirty then the vault. A short day forgives the rest and knocks `rackets.premises.missedUpkeepConditionHit` off every premises.
- Synergies (`rackets.synergies`) are evaluated per district from config: a business `a` beside a `b` gives the `b` businesses a yield multiplier or first claim on cigarettes, or changes named types' upkeep.

## Consequences
- Placement is a decision for premises: a factory beside joints lifts them 15% and feeds them first in a shortage, and a warehouse beside a factory costs half the upkeep. The bot builds factories where the joints are.
- Upkeep makes premises a running cost to justify, but it's small next to income with the M3 defaults (wages and upkeep are about 5% of Dirty earned; [TUNING.md](../../TUNING.md)).
- Premises exposure counts toward heat like any business's.

## Related
`engine/config/schema.ts` (`RacketKind`, `SynergyConfig`), `engine/core/derive.ts`, `engine/systems/districts.ts` (`openLots`, `premisesBlocked`), `engine/systems/rackets.ts` (`settleUpkeep`), `engine/core/apply.ts`, `app/screens/RacketsScreen.tsx`, [systems/economy.md](../systems/economy.md). Extends [ADR 0009](0009-districts-one-of-each-business.md).
