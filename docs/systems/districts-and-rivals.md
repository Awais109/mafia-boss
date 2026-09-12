# Districts and rivals

The city is four districts. Rivals take a cut of what you run on their turf until you buy them out or push them out, and Tolya, the old boss, keeps sending his boys around.

**Code:** `engine/systems/districts.ts` (`getDistrict`, `districtUnlocked`, `takenDistrictCount`, `openSpots`, `canPressure`, `takeDistrict`, `addPressure`), `engine/systems/rivals.ts` (`changeDisposition`, `tolyaHostile`, `tolyaIntervalHours`, `refuseDemand`, `bestHaggler`, `haggleOdds`, `canHaggle`, `haggle`, `tolyaTick`), tribute in `engine/core/derive.ts`, the `PAY_TRIBUTE` handler in `engine/core/apply.ts`.
**Config:** `districts.*`, `rivals.tolya.*` (including `rivals.tolya.haggle`).

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

1. **An unpaid demand** from last time is refused (`refuseDemand`). Disposition drops by `dispositionPerTribute` and a random racket loses `refuseConditionHit` condition (`TRIBUTE_REFUSED`).
2. **A roll:**
   - below `pConditionHit`: a random racket loses `conditionHit` condition;
   - below `pConditionHit + pTribute`: he demands `max(1, round(vaultCap × tributePctOfVault))` Dirty;
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

Zhanna controls the Port Quarter. Her only effect in this prototype is the Port Quarter's tribute, plus a log note when Act II opens. **Her supply chain is not built.**

**Tests:** `tests/apply.test.ts` (three pressure jobs flip a district and end its tribute, a refused demand damages a racket, paying clears it, a good talker pays the haggled price, a failed haggle insults him once and the demand stands, an explicit refusal breaks a business now).
