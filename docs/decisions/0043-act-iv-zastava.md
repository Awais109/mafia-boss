# 0043. Act IV, Zastava: premium cigarettes, convoys, the Colonel and the importer

- **Status:** Accepted
- **Date:** 2026-09-29

## Context
The six-act design (ADR 0040, and the approved economy proposal) gives Act IV to the road out of the city: a second product, premium imported cigarettes, that arrives over the border rather than from a factory; a new rival who controls the road; and a front whose capacity depends on that trade. The expansion plan named "premium imported brands through the Port" as the first candidate for a second product (§18). The act needed a new decision on every visit: when to send a convoy, whether to pay the road or take it, how hot to run with customs watching, and how much of the new income a front can wash.

## Decision
- **A second stock, same machinery.** `inventory.premium` and `premiumEmpty` run beside cigarettes through one generic `accrueLine`, with its own cap (`premium.baseCap` plus Bonded Warehouses), hourly flag, events tagged `product: 'premium'` and served share. Joints carry `premiumShare` and `premiumSellsPerHr` like `cigaretteShare` and `sellsPerHr`; a joint's yield loses each share it can't supply. There's no served-first rule for premium. Nothing makes premium in Act IV (`premiumMakesPerHr` exists for Act V's Combine).
- **`premium.baseCap` holds one convoy.** At first it was half a load, which wasted half of every early convoy before a Bonded Warehouse. That punished the first try at the new loop rather than teaching it.
- **Convoys are jobs.** `runConvoy` reuses the job machinery (crew, odds, Clean cost without Rep, reports, XP). A convoy that succeeds rolls the road, then customs, once per convoy on `rng.derive('convoy', opId)`, so any split of the wait tells the same story. Road losses are the Colonel's (`convoys.hijackChance`, ×`hijackHostileMult` while he's hostile, zero with passage or once Zastava is yours). Customs is `customsBase + customsPerHeat × heat`, scaled by the Customs Chief and a Bonded Warehouse in Zastava: heat now costs goods as well as raids.
- **The Colonel** is a rival without visits. He holds Zastava (`controller: 'colonel'`) and taxes it like any rival; `BUY_PASSAGE` buys `passage.hours` of a clear road for `passage.hoursOfYield` hours of Dirty yield, so its price follows the empire's size. Passage is checked when a convoy lands, not when it leaves. Pressure and buy-outs sour him. There's no hijack-specific disposition change: losing a convoy is already the cost.
- **The importer washes only what its trade explains.** A front with `coverPerPremiumPack` has throughput `min(its throughput, premium sold per hour × cover)`. `derive` computes it and `convertFronts` and `frontsHourBoundary` read the derived throughput, so a starved importer drains nothing and doesn't draw suspicion for idle capacity. This ties Act IV's laundering to keeping premium on the shelves.
- **Zhanna's premium lots** reuse `BUY_SHIPMENT { product: 'premium' }`: fewer packs at `priceMult` times her price, on the same cooldown, as a stopgap between convoys.
- **Gates.** `progression.finalAct` becomes 4. Act IV opens on Rep (`acts[4]`). Act V's gate, which clears Act IV, asks for Rep, holding Zastava, and owning the Import–Export Company, so the act's two decisions (take the road, build the importer) are part of finishing it.
- **Businesses.** Truck Stop (a cigarette joint), Motel and Foreign Goods Shop (premium joints), Freight Yard and Fuel Depot (hot rackets), a Bonded Warehouse and a Convoy Depot (premises), the Customs Chief (official) and Grease the Post (an Influence job). All prices follow `costs.paybackHoursByAct[4]`.

## Consequences
- The bot runs 20–45 convoys over Act IV, loses a few to customs, and pays for passage rather than lose them on the road; the importer arrives late in the act, borrowed for. Act IV clears in about 9.4 days (target 8–10) with heat near 32 (TUNING.md, M10).
- Premium shortage is common for the bot (it restocks in six-hour loads), so the premium joints earn below their full yield much of the time. That's the act's pressure, not a bug; a player who keeps a convoy on the road does better.
- The importer's `coverPerPremiumPack` sets how much of Act IV's Dirty can be washed; a low cover leaves Dirty idle. Watch it with front utilization.
- Save schema v11: the premium stock and flag, the Colonel, Zastava's row, premium and convoy counters; `passageUntil` is shifted by `shiftTimes`.

## Related
`engine/systems/convoys.ts`, `engine/systems/supply.ts` (`accrueLine`), `engine/core/derive.ts` (premium, importer throughput), `engine/systems/fronts.ts`, `engine/systems/ops.ts` (`landConvoy` in `resolveOp`), `engine/systems/districts.ts` (the Colonel's disposition), `engine/core/apply.ts` (`BUY_PASSAGE`, `BUY_SHIPMENT { product }`), `app/components/ColonelCard.tsx`, `app/components/SupplyCard.tsx`, `sim/persona.ts`, [convoys.md](../systems/convoys.md), [supply-chain.md](../systems/supply-chain.md#premium-act-iv), [fronts.md](../systems/fronts.md#the-importer-act-iv), [districts-and-rivals.md](../systems/districts-and-rivals.md#the-colonel), [ADR 0040](0040-six-acts.md).
