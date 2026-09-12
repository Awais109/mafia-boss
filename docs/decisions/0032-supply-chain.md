# 0032. One city-wide cigarette stock: factories make, joints sell, warehouses keep

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
The owner chose tobacco as the one manufactured product, made from Act I: premises make it, joints sell it, warehouses keep the surplus, and smuggling tops it up. It had to stay split-invariant, resolve offline without blocking, and not turn into a logistics game.

## Decision
- **One stock for the city,** `state.inventory.cigarettes`, with no transport. Place matters through synergies (joints beside a factory are served first), not routes.
- **Rates, exact clamps.** Production, demand and the cap are rates derived from businesses and their condition. `accrueStock` moves stock over a segment with exact clamps at zero and at the cap, emitting `STOCK_OUT` and `STOCK_CAPPED` at the exact instants. Production beyond the cap is lost; stock above a cap that fell is never destroyed.
- **Shortage on the hour.** `stockEmpty` flips only at whole hours, like inspections ([ADR 0003](0003-split-invariant-reconcile.md)), and the flag is what cuts yield. While short, factory output is shared out, first to joints beside a factory, then by demand, and each joint keeps `1 − cigaretteShare + cigaretteShare × served` of its yield.
- **Batches** go in at once through `addStock`: smuggling runs, inbox effects and debug grants. Smuggling costs Clean up front and starts harder with heat; its terms are fixed on the job when it starts, and it lands `cigarettes × reward share` packs.
- Smuggling's Clean earns no Rep and isn't Clean spent: an exception to [ADR 0019](0019-reputation-sources.md), because it buys goods, not standing.
- **Amends [ADR 0024](0024-inbox.md):** a default inbox option may lose packs (the Bad batch burns them). Stock only falls to zero, so a default still never asks for money a player may not have; the rule against costing Dirty stands.
- The vault and the stock both emit mid-segment events, so `accrue` puts a segment's events in time order and any split produces the same event list.

## Consequences
- Supply is a spending decision: by day 8 the bot has built and upgraded four or five factories and a warehouse.
- With a 30-pack base cap and a bot that adds output only when stock would run out within a day, shortages are rare: about 3 hours per 8-day run over 10 seeds, none in Act I, mostly across a night away ([TUNING.md](../../TUNING.md)). The plan wanted some in Act I; that stays open.
- A shortage lowers yield and so the vault cap; nothing already earned is taken.
- A save migrated from before this change gets the starting stock but keeps its old businesses, so it has no factory until the player builds one.

## Related
`engine/systems/supply.ts`, `engine/core/derive.ts`, `engine/core/reconcile.ts`, `engine/systems/ops.ts` (`opConfigAt`, smuggling), `engine/systems/inbox.ts` (cigarette effects, the `factory` need), `app/components/SupplyCard.tsx`, [systems/supply-chain.md](../systems/supply-chain.md).
