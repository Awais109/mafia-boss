# Supply chain: cigarettes

One city-wide stock of cigarettes, the game's only product ([ADR 0032](../decisions/0032-supply-chain.md)). Tobacco factories make packs, joints sell them for part of their income, warehouses raise the stock cap, and smuggling runs bring in a batch. Rackets and fronts never touch stock.

**Code:** `engine/systems/supply.ts` (`accrueStock`, `supplyHourBoundary`, `addStock`), supply in `engine/core/derive.ts` (`Derived.supply`; per business `packsPerHr`, `served`, `atStake`, `capacity`), `engine/core/formulas.ts` (`factoryOutput`, `jointSales`, `warehouseCapacity`), smuggling in `engine/systems/ops.ts` (`opConfigAt`, `resolveOp`). App: `app/components/SupplyCard.tsx`.
**Config:** `supply.*`; joints' `sellsPerHr` and `cigaretteShare`; premises' `makesPerHr`, `tierMakeMult` and `capPerTier`; `ops.list.smuggleCigarettes`; the `servedFirst` synergy in `rackets.synergies`.

## Stock

`state.inventory.cigarettes`. A new game starts with `supply.startingStock`.

```
made   = Σ factories  makesPerHr × tierMakeMult^(tier−1) × condition/100
demand = Σ joints     sellsPerHr × tierYieldMult^(tier−1) × condition/100      (from act supply.sellFromAct)
cap    = supply.baseCap + Σ warehouses  capPerTier × tier × condition/100
```

Over each reconcile segment, where made, demand and cap are constant, `accrueStock` moves the stock with exact clamps, like the vault:

- **While there's stock**, joints sell their full demand and stock changes by `made − demand`.
- **Reaching zero** emits `STOCK_OUT` at the exact instant. While empty, joints sell what the factories make as it comes off the line.
- **Reaching the cap** emits `STOCK_CAPPED` (quiet) at the exact instant. Production beyond demand is then lost (`stats.packsLostToCap`).
- **Above a cap that fell** (a damaged warehouse), production is lost while sales bring stock down to the cap. Stock is never destroyed.

`stats.packsMade` and `stats.packsSold` count the flow. Because the vault and the stock both emit mid-segment instants, `accrue` puts that segment's events in time order, so a split reconcile tells the same story.

## Shortages

At every whole hour, after the heat checks, `supplyHourBoundary` sets `state.stockEmpty = stock ≤ ε and demand > 0`, emits `SHORTAGE_STARTED { demand, made }` or `SHORTAGE_ENDED` when it changes, and counts `stats.shortageHours`. Yield follows the flag, not the instant stock hits zero: at most an hour's lag, like inspections ([ADR 0003](../decisions/0003-split-invariant-reconcile.md)).

While `stockEmpty`, `derive` shares out what the factories make:

1. Joints in a district with an active `servedFirst` synergy (a Tobacco Factory beside them) come first: `served = min(1, made ÷ their demand)`.
2. The other joints share what's left in proportion to demand.

A joint then earns `× (1 − cigaretteShare + cigaretteShare × served)` ([economy.md](economy.md#yield-and-exposure)). A shortage lowers yield and so the vault cap; the vault stops accruing but never shrinks ([ADR 0016](../decisions/0016-vault-and-dirty.md)).

## Batches

`addStock(state, cap, amount)` adds a batch at once: what fits under the cap goes in and the rest is lost; a negative batch takes what's there.

- **Smuggling** ([ops.md](ops.md)): `smuggleCigarettes` costs `costClean` up front, earning no Rep, and starts `round(heatDiffPerPoint × heat)` harder. On success it lands `round(cigarettes × reward share)` packs when it resolves; `OP_RESOLVED.cigarettes` is what went in. A failed run keeps the Clean gone. The opportunities board has a smuggling variant.
- **Decisions** ([inbox.md](inbox.md)): an option's `cigarettes` effect. The Bad batch incident (needs a factory) burns packs by default, or sells them for Dirty and heat.
- **Debug:** `DEBUG_GRANT { cigarettes }` adds straight to stock.

## Derived

`Derived.supply = { madePerHr, demandPerHr, soldPerHr, cap, stock, hoursToEmpty, hoursToFull }`, with `hoursToEmpty` and `hoursToFull` infinite when stock isn't heading that way. Per joint: `packsPerHr` (demand), `served`, and `atStake` (the Dirty per hour that needs cigarettes, at full supply). Per factory: `packsPerHr` made. Per warehouse: `capacity`.

## Events

`STOCK_OUT`, `STOCK_CAPPED { cap }` (quiet), `SHORTAGE_STARTED { demand, made }`, `SHORTAGE_ENDED`; `OP_RESOLVED.cigarettes`.

## The bot

How the casual bot values factories, warehouses, joints and smuggling runs is in [sim.md](../sim.md#the-casual-bot). In short: it adds output when stock would run out within a day, banks surplus when production outruns sales at the cap, discounts joints that would run short, and smuggles when stock would run out within 12 hours.

## The app

"Packs" in the header; the Supply card on Home and Business (stock against cap, made and sold per hour, when it runs out or fills); joints show packs sold, their cigarette share and, when short, the share supplied; Home alerts when stock will run out within 6 hours or is out; the away popup lists packs made, sold and wasted and the stock before and after.

**Tests:** `tests/supply.test.ts` (starting rates; exact clamps and events; the flag only at whole hours; factory-district joints served first; a cap below the stock; smuggling), `tests/reconcile.test.ts` (split invariance with stock filling in a fresh game and running out in a busy one), `tests/migrate.test.ts` (old saves get the starting stock).
