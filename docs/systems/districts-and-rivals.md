# Districts and rivals

The city is four districts. Rivals take a cut of what you run on their turf until you buy them out or push them out, and Tolya, the old boss, keeps sending his boys around.

**Code:** `engine/systems/districts.ts` (`getDistrict`, `districtUnlocked`, `takenDistrictCount`, `openSpots`, `canPressure`, `takeDistrict`, `addPressure`), `engine/systems/rivals.ts` (`changeDisposition`, `tolyaHostile`, `tolyaIntervalHours`, `tolyaTick`), tribute in `engine/core/derive.ts`.
**Config:** `districts.*`, `rivals.tolya.*`.

## Districts

Each entry in `districts.list` has:
- `name` and `act`;
- `startsAs`: the starting controller (`player`, `tolya`, `zhanna` or `none`);
- `home`: your starting turf;
- `allows`: the businesses it can host, one of each ([ADR 0009](../decisions/0009-districts-one-of-each-business.md));
- `buyout` (Clean) and `tribute` (share of yield);
- `mod`: perks that apply while you control it. `yieldMult` per racket type for rackets there, and `wageMult` for all crew wages.

| District | Act | Starts as | Hosts | Perk once yours |
|---|---|---|---|---|
| Zarechye | I | yours (home) | Kiosk, Market Stall | none |
| Kiosk Row | I | Tolya | Kiosk, Market Stall | Kiosk and Market Stall yield bonus |
| Sovietsky Blocks | II | nobody | Auto Shop, Café, Bathhouse | lower crew wages |
| Port Quarter | II | Zhanna | Petrol Station, Cargo Bay | none |

**Tribute.** Rackets in a district Tolya or Zhanna controls lose `district.tribute` of their gross yield, tracked in `stats.tributeLost`. Unclaimed and home districts take no tribute.

## Taking a district

Two ways:

- **Buy it out:** `BUY_DISTRICT { districtId }` for `buyout` Clean. That's Clean spent, so it earns Rep too (`DISTRICT_BOUGHT`).
- **Pressure it:** each full or partial Pressure job adds one to `pressureCount` (`DISTRICT_PRESSURED`). At `districts.pressureOpsToFlip` it's yours (`DISTRICT_FLIPPED`).

Either way you get `reputation.perDistrict` Rep, its `mod` perks, and `heat.districtControlPct` more control ([heat.md](heat.md)). Home turf doesn't count toward the control bonus.

## Tolya

([ADR 0017](../decisions/0017-tolya-and-zhanna.md))

Tolya visits on a schedule, all game, and targets any of your rackets.

```
interval = rivals.tolya.tickHours
           (tickHoursEscalated once you own ≥ escalateAtRackets rackets)
           × hostileTickMult while disposition < hostileBelow
```

Each visit (`tolyaTick`, seeded by visit count):

1. **An unpaid demand** from last time is refused. Disposition drops by `dispositionPerTribute` and a random racket loses `refuseConditionHit` condition (`TRIBUTE_REFUSED`).
2. **A roll:**
   - below `pConditionHit`: a random racket loses `conditionHit` condition;
   - below `pConditionHit + pTribute`: he demands `max(1, round(vaultCap × tributePctOfVault))` Dirty;
   - otherwise he does nothing.

   All three emit `TOLYA_TICK` with a `result`.
3. The next visit is scheduled.

`PAY_TRIBUTE` pays the demand from Dirty, clears it, and raises disposition by `dispositionPerTribute` (`TRIBUTE_PAID`).

**Disposition** runs from −100 to 100 and starts at 0.

| Your move | Disposition change |
|---|---|
| Paying a demand | `+dispositionPerTribute` |
| Refusing a demand | `−dispositionPerTribute` |
| Each Pressure success on his district | `dispositionPerPressure` |
| Buying out his district | `dispositionOnBuyout` |
| Flipping his district by pressure | `dispositionOnFlip` |

`DEBUG_FORCE_TOLYA` triggers a visit now.

## Zhanna

Zhanna controls the Port Quarter. Her only effect in this prototype is the Port Quarter's tribute, plus a log note when Act II opens. **Her supply chain is not built.**

**Tests:** `tests/apply.test.ts` (three pressure jobs flip a district and end its tribute, a refused demand damages a racket, paying clears it).
