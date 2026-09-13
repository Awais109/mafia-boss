# 0036. Zhanna sells lots, buys the surplus, and watches the Port

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
[ADR 0017](0017-tolya-and-zhanna.md) made Zhanna tribute only, because the plan's "static seizure modifier" had no supply chain to act on. [ADR 0032](0032-supply-chain.md) built one: a city-wide cigarette stock that factories fill and joints drain, with smuggling runs for batches. The expansion plan (M6, feature (p)) gives the Port Quarter's boss a trade in that stock. Supply is lumpy, a late Act II portfolio can outsell its factories, and anything made above the cap is wasted, so a seller of lots and a buyer of surplus each answer a real problem.

## Decision
- **Supersedes ADR 0017's "Zhanna is tribute only".** Tolya's part of 0017 stands, and Zhanna still takes the Port Quarter's tribute.
- **She trades from Act II**, when the Port opens, whoever holds it. State: `rival.zhanna { disposition, nextShipmentAt, shipmentsBought, surplusToday }`.
- **Lots.** `BUY_SHIPMENT` buys `shipment.cigarettes` packs for Dirty, once every `shipment.cooldownHours`, into stock up to the cap. The price is `basePrice × clamp(1 + pricePerDisposition × disposition ÷ 100, priceClamp)`, times `hostileMarkup` while she's hostile, so it falls as she warms to you.
- **Surplus.** `SELL_SURPLUS { packs }` sells packs for `surplus.pricePerPack` Dirty each, up to `surplus.maxPerDay` a game day.
- **Disposition.** Buying lots and selling surplus warm her; smuggling runs (from Act II) and taking her Port cool her.
- **The Port.** While she holds the Port Quarter, smuggling runs start `seizureDiff` harder, snapshotted at dispatch like the heat term.
- **Nothing in the reconcile walk.** The cooldown and the daily count are read when the player acts, so offline time needs no defaults and split invariance is untouched.

## Consequences
- Taking the Port becomes a trade: no tribute and easier smuggling, against a cooler Zhanna and dearer lots.
- The casual bot buys a lot only when stock would run out within 12 hours and Dirty covers it above its reserve, which happens about once in three runs, and it sells about ◆50 of surplus a run. Smuggling sours her, so the bot's Zhanna ends most runs cool (around −17).
- `stats.shipmentsPaid` and `stats.surplusSold`, which the daily ledger has counted since M1, now move.
- Schema v7. A migrated save gets her first lot ready at once.

## Related
`engine/systems/rivals.ts` (`changeZhanna`, `zhannaDeals`, `zhannaHoldsPort`, `zhannaHostile`, `surplusRoomToday`), `engine/core/formulas.ts` (`shipmentPrice`), `engine/core/apply.ts` (`BUY_SHIPMENT`, `SELL_SURPLUS`, `START_OP`), `engine/systems/ops.ts` (`opConfigAt`), `engine/systems/districts.ts` (`takeDistrict`), `engine/model/migrate.ts` (`v6to7`), `app/components/ZhannaCard.tsx`, [systems/districts-and-rivals.md](../systems/districts-and-rivals.md#zhanna), [systems/supply-chain.md](../systems/supply-chain.md#batches).
