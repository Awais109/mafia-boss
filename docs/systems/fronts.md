# Fronts: laundering

Dirty money can't buy anything. Fronts turn it into Clean at a fixed rate per hour, which is the game's throttle.

**Code:** `engine/systems/fronts.ts` (`convertFronts`, `frontsHourBoundary`), `engine/core/formulas.ts` (`frontRate`, `frontBufferCap`, `frontUpgradeCost`, `frontSuspicion`), `engine/core/derive.ts` (`perFront`), the `DEPOSIT`, `BUY_FRONT` and `UPGRADE_FRONT` handlers in `engine/core/apply.ts`.
**Config:** `fronts.*`, `tutorial.firstConversionInstant`.

## Types

`fronts.types`: `currencyKiosk` (free; the game starts with it) and `restaurant` (unlocks at its `unlockRep`, costs Clean). You can run one of each type. New games start with every type whose `cost` and `unlockRep` are both 0.

## Depositing and converting

`DEPOSIT { frontId, amount }` moves Dirty into the front's buffer. It checks `amount ≤ dirty` and `buffer + amount ≤ bufferCap`.

```
bufferCap = throughput × fronts.bufferHours
rate      = type.rate + level × fronts.upgrade.rateStep
```

Over each reconcile segment of `h` hours:

```
converted = min(buffer, throughput × h)
buffer   −= converted
clean    += converted × rate            (also stats.cleanEarned)
```

**First conversion is instant.** While `tutorial.firstConversionInstant` is on, the very first deposit of the game converts immediately instead of entering the buffer. `DEPOSITED` then carries `instantClean`, and `state.firstConversionDone` is set. Without this, the first session would wait over an hour for its first Clean.

## Utilization and suspicion

At every whole game hour ([ADR 0013](../decisions/0013-front-suspicion-smoothing.md)):

```
hourUtil = min(1, convertedThisHour / throughput)
util    += (hourUtil − util) / fronts.utilSmoothingHours
```

A front running hot for hours draws attention, which adds exposure ([heat.md](heat.md)):

```
suspicion = fronts.suspicionFactor × throughput × max(0, util − fronts.suspicionStartUtil)
```

## Upgrades

`UPGRADE_FRONT { frontId }` raises `level` by 1, up to `fronts.upgrade.levels`. Each level adds `rateStep` to the rate.

```
cost (level L → L+1) = round(max(type.cost, upgrade.minCostBasis) × upgrade.costPctOfUnlock × (L+1))
```

`minCostBasis` gives the free Currency Kiosk a real upgrade price.

## Actions and events

| Action | Checks | Effect |
|---|---|---|
| `DEPOSIT { frontId, amount }` | amount > 0, enough Dirty, fits the buffer | `DEPOSITED` (with `instantClean` on the first conversion) |
| `BUY_FRONT { frontType }` | unlocked, not already owned, enough Clean | new front at level 0; `FRONT_BOUGHT` |
| `UPGRADE_FRONT { frontId }` | below max level, enough Clean | level +1; `FRONT_UPGRADED` |

## Open tuning issue

The bot uses fronts at only ~46% (target 70–90%): the Restaurant's throughput is far above the Dirty the economy produces in Act II. See [TUNING.md](../../TUNING.md) before changing throughput or rates.

**Tests:** `tests/apply.test.ts` (buffering after the first conversion, conversion at throughput).
