# Districts and rivals

The city is five districts. Rivals take a cut of what you run on their turf until you buy them out or push them out, and Tolya, the old boss, keeps sending his boys around.

**Code:** `engine/systems/districts.ts` (`getDistrict`, `districtUnlocked`, `takenDistrictCount`, `openSpots`, `openLots`, `premisesBlocked`, `canPressure`, `takeDistrict`, `addPressure`), `engine/systems/rivals.ts` (`changeDisposition`, `tolyaHostile`, `tolyaIntervalHours`, `refuseDemand`, `bestHaggler`, `haggleOdds`, `canHaggle`, `haggle`, `tolyaTick`, `changeZhanna`, `zhannaHostile`, `zhannaDeals`, `zhannaHoldsPort`, `surplusRoomToday`), `shipmentPrice` in `engine/core/formulas.ts`, tribute in `engine/core/derive.ts`, the `PAY_TRIBUTE`, `BUY_SHIPMENT` and `SELL_SURPLUS` handlers in `engine/core/apply.ts`. App: `app/components/TributeCard.tsx`, `app/components/ZhannaCard.tsx`.
**Config:** `districts.*`, `rivals.tolya.*` (including `rivals.tolya.haggle`), `rivals.zhanna.*`.

## Districts

Each entry in `districts.list` has:
- `name` and `act`;
- `startsAs`: the starting controller (`player`, `tolya`, `zhanna` or `none`);
- `home`: your starting turf;
- `allows`: the joints and rackets it can host, one of each ([ADR 0009](../decisions/0009-districts-one-of-each-business.md));
- `premisesLots`: lots for premises of any type, one of each type ([economy.md](economy.md#kinds-of-business));
- `buyout` (Clean) and `tribute` (share of yield);
- `mod`: perks that apply while you control it. `yieldMult` per racket type for rackets there, and `wageMult` for all crew wages.

| District | Act | Starts as | Hosts | Lots | Perk once yours |
|---|---|---|---|---|---|
| Zarechye | I | yours (home) | Kiosk, Market Stall, Beer Tent | 2 | none |
| Kiosk Row | I | Tolya | Kiosk, Market Stall, Video Salon | 1 | Kiosk and Market Stall yield bonus |
| Station Square | I | nobody | Beer Tent, Video Salon, Taxi Rank, Slot Hall | 2 | Taxi Rank and Slot Hall yield bonus |
| Sovietsky Blocks | II | nobody | Auto Shop, Café, Bathhouse | 2 | lower crew wages |
| Port Quarter | II | Zhanna | Petrol Station, Cargo Bay | 2 | none |

Station Square ([ADR 0033](../decisions/0033-bigger-act-i.md)) is Act I's unclaimed district: nobody takes tribute there, and like Sovietsky it can be bought out or taken with pressure jobs.

**Tribute.** Rackets in a district Tolya or Zhanna controls lose `district.tribute` of their gross yield, tracked in `stats.tributeLost`. Unclaimed and home districts take no tribute.

## Taking a district

Two ways:

- **Buy it out:** `BUY_DISTRICT { districtId }` for `buyout` Clean. That's Clean spent, so it earns Rep too (`DISTRICT_BOUGHT`).
- **Pressure it:** each full or partial Pressure job adds one to `pressureCount` (`DISTRICT_PRESSURED`). At `districts.pressureOpsToFlip` it's yours (`DISTRICT_FLIPPED`).

Either way you get `reputation.perDistrict` Rep, its `mod` perks, and `heat.districtControlPct` more control ([heat.md](heat.md)). Home turf doesn't count toward the control bonus.

## Tolya

([ADR 0017](../decisions/0017-tolya-and-zhanna.md))

Tolya visits on a schedule, all game, and targets any of your businesses, premises included.

```
interval = rivals.tolya.tickHours
           (tickHoursEscalated once you run ≥ escalateAtRackets joints and rackets; premises don't count)
           × hostileTickMult while disposition < hostileBelow
```

Each visit (`tolyaTick`, seeded by visit count):

1. **An unpaid demand** from last time is refused (`refuseDemand`). Disposition drops by `dispositionPerTribute` and a random racket loses `refuseConditionHit` condition (`TRIBUTE_REFUSED`).
2. **A roll:**
   - below `pConditionHit`: a random racket loses `conditionHit` condition;
   - below `pConditionHit + pTribute`: he demands `max(1, round(vaultCapBase × tributePctOfVault))` Dirty (the vault cap without a Stash House's extra hours, so a stash doesn't raise his price);
   - otherwise he does nothing.

   All three emit `TOLYA_TICK` with a `result`. When `tolya.forceResult` is `'tribute'`, this one visit demands tribute without rolling, and the flag clears (for the guided opening).
3. The next visit is scheduled.

### Answering a demand

([ADR 0029](../decisions/0029-tolya-negotiation.md)) `PAY_TRIBUTE { choice? }`, default `pay`, so old logs replay:

| Choice | Checks | Effect |
|---|---|---|
| `pay` | enough Dirty | pays the demand, clears it, disposition + `dispositionPerTribute` (`TRIBUTE_PAID`) |
| `haggle` | not already haggled over this demand ("He won’t hear it twice"), someone idle ("Nobody free to talk to him"), Dirty for the haggled price | one roll, below |
| `refuse` | a demand | the visit-time refusal happens now, on `rng.derive('refuse', tickCount)` (`TRIBUTE_REFUSED { explicit: true }`) |

**Haggling.** The best idle talker (`bestHaggler`: highest effective Nerve + the Bargainer perk's `haggleBonus`) rolls once per demand on `rng.derive('haggle', tickCount)`:

```
score = talker's Nerve + Bargainer bonus + U(−haggle.noise, +haggle.noise)
won   = score ≥ haggle.diff
price = max(1, round(demand × haggle.pricePct))
```

- **Won:** pays `price`, clears the demand, disposition + `dispositionOnWin`, `stats.haggles.won`.
- **Lost:** the demand stands, disposition + `dispositionOnInsult` (negative), `haggledTick = tickCount` so he won't hear another offer on it, `stats.haggles.lost`. Paying or refusing is still open.

Both emit `TRIBUTE_HAGGLED { crewId, name, won, demand, paid }`. `haggleOdds(state, config)` is the closed form of the same check, shown on the demand card and used by the bot. What's paid counts in `stats.tributeLost`.

**Disposition** runs from −100 to 100 and starts at 0.

| Your move | Disposition change |
|---|---|
| Paying a demand | `+dispositionPerTribute` |
| Haggling him down | `haggle.dispositionOnWin` |
| A haggle that insults him | `haggle.dispositionOnInsult` |
| Refusing a demand, or leaving it unpaid until his next visit | `−dispositionPerTribute` |
| Each Pressure success on his district | `dispositionPerPressure` |
| Buying out his district | `dispositionOnBuyout` |
| Flipping his district by pressure | `dispositionOnFlip` |

`DEBUG_FORCE_TOLYA` triggers a visit now.

## Zhanna

([ADR 0036](../decisions/0036-zhanna-and-the-port.md)) Zhanna controls the Port Quarter, which opens in Act II. Businesses there pay her tribute, and from Act II she trades in cigarettes ([supply-chain.md](supply-chain.md)): she sells lots, buys the surplus, and watches every crate that moves through her Port. Her state is `rival.zhanna = { disposition, nextShipmentAt, shipmentsBought, surplusToday }`. Nothing about her runs in the reconcile walk: the lot's cooldown and the daily surplus count are read when you act.

**Her lots.** `BUY_SHIPMENT` needs Act II ("Zhanna deals from Act II"), her next lot to be in ("Her next lot isn’t in yet") and the price in Dirty. It adds `shipment.cigarettes` packs to stock (whatever doesn't fit under the cap is lost), counts the price in `stats.shipmentsPaid`, schedules the next lot `shipment.cooldownHours` later, and emits `SHIPMENT_BOUGHT { packs, cost }`. A new game's first lot is ready at once.

```
price = round(shipment.basePrice
              × clamp(1 + shipment.pricePerDisposition × disposition ÷ 100, shipment.priceClamp)
              × shipment.hostileMarkup    (while disposition < hostileBelow))
```

`pricePerDisposition` is negative, so her lots get cheaper as she warms to you (`formulas.shipmentPrice`).

**The surplus.** `SELL_SURPLUS { packs }` sells whole packs from stock for `surplus.pricePerPack` Dirty each, up to `surplus.maxPerDay` packs a game day (`surplusRoomToday`; otherwise "She’ll take N more today" or "She’s bought all she wants today"). The Dirty counts in `stats.surplusSold`; `SURPLUS_SOLD { packs, dirty }` is quiet.

**The Port.** While she holds the Port Quarter, a smuggling run starts `seizureDiff` harder, on top of the heat term ([ops.md](ops.md)). The job's snapshot keeps it, so the odds shown are the odds rolled.

**Disposition** runs from −100 to 100 and starts at 0. Below `hostileBelow` she's hostile and her lots cost `shipment.hostileMarkup` times as much.

| Your move | Disposition change |
|---|---|
| Buying a lot | `dispositionPerShipment` |
| Selling her surplus | `surplus.dispositionPer10` for every 10 packs she's bought today |
| Starting a smuggling run (from Act II) | `dispositionPerSmuggle` |
| Buying out her Port | `dispositionOnBuyout` |
| Flipping her Port by pressure | `dispositionOnFlip` |

The Turf tab's Zhanna card shows her mood, her next lot and its price, Buy, and Sell 10 or everything she'll still take today.

**Tests:** `tests/apply.test.ts` (three pressure jobs flip a district and end its tribute, a refused demand damages a racket, paying clears it, a good talker pays the haggled price, a failed haggle insults him once and the demand stands, an explicit refusal breaks a business now, Station Square hosts the new businesses and falls to pressure, Tolya's visits speed up with joints and rackets but not premises, his demand reads the vault's base cap), `tests/zhanna.test.ts` (her price by mood and the hostile markup, lots only from Act II and once per cooldown, the daily surplus limit, smuggling harder while she holds the Port, taking her Port sours her).
