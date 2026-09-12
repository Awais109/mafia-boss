# Fronts: laundering

Dirty money can't buy anything. Fronts turn it into Clean at a fixed rate per hour, which is the game's throttle. Each front has a dial (push, normal, lay low) and two upgrade tracks (rate and capacity).

**Code:** `engine/systems/fronts.ts` (`convertFronts`, `frontsHourBoundary`), `engine/core/formulas.ts` (`frontRate`, `frontBaseThroughput`, `frontModeMult`, `frontThroughput`, `frontBufferCap`, `frontUpgradeCost`, `frontCapacityUpgradeCost`, `frontSuspicion`), `engine/core/derive.ts` (`perFront`), the `DEPOSIT`, `BUY_FRONT`, `UPGRADE_FRONT` and `SET_FRONT_MODE` handlers in `engine/core/apply.ts`.
**Config:** `fronts.*`, `tutorial.firstConversionInstant`.

## Types

`fronts.types`: `currencyKiosk` (free; the game starts with it) and `restaurant` (unlocks at its `unlockRep`, costs Clean). You can run one of each type. New games start with every type whose `cost` and `unlockRep` are both 0.

## Depositing and converting

`DEPOSIT { frontId, amount }` moves Dirty into the front's buffer. It checks `amount ≤ dirty` and `buffer + amount ≤ bufferCap`.

```
baseThroughput = type.throughput × (1 + upgrade.capacity.step × capacityLevel)
throughput     = baseThroughput × mode multiplier                 (push, normal = 1, layLow)
bufferCap      = baseThroughput × fronts.bufferHours              (the dial doesn't resize the buffer)
rate           = type.rate + level × fronts.upgrade.rateStep
```

Over each reconcile segment of `h` hours:

```
converted = min(buffer, throughput × h)
buffer   −= converted
clean    += converted × rate            (also stats.cleanEarned)
```

**First conversion is instant.** While `tutorial.firstConversionInstant` is on, the very first deposit of the game converts immediately instead of entering the buffer. `DEPOSITED` then carries `instantClean`, and `state.firstConversionDone` is set. Without this, the first session would wait over an hour for its first Clean.

## Modes

([ADR 0028](../decisions/0028-front-modes-and-capacity.md)) `Front.mode` is `push`, `normal` or `layLow`, set with `SET_FRONT_MODE { frontId, mode }` (`FRONT_MODE_SET`, `stats.frontModeChanges`). It changes only when the player acts, so reconcile segments stay exact.

| Mode | Throughput | Suspicion starts at |
|---|---|---|
| `push` | × `fronts.modes.push.throughputMult` | `fronts.modes.push.suspicionStartUtil` |
| `normal` | × 1 | `fronts.suspicionStartUtil` |
| `layLow` | × `fronts.modes.layLow.throughputMult` | never, while `fronts.modes.layLow.suspicion` is false |

Push is for washing a backlog fast when heat can take it; lay low is for when it can't.

## Utilization and suspicion

At every whole game hour ([ADR 0013](../decisions/0013-front-suspicion-smoothing.md)):

```
hourUtil = min(1, convertedThisHour / throughput)
util    += (hourUtil − util) / fronts.utilSmoothingHours
```

A front running hot for hours draws attention, which adds exposure ([heat.md](heat.md)):

```
suspicion = fronts.suspicionFactor × throughput × max(0, util − start)      (start from the mode table; 0 when lying low)
```

## Upgrades

`UPGRADE_FRONT { frontId, track? }` has two tracks:

| Track | Raises | Up to | Cost (L → L+1) |
|---|---|---|---|
| `rate` (default) | `level`: rate + `rateStep` | `fronts.upgrade.levels` | `round(max(type.cost, upgrade.minCostBasis) × upgrade.costPctOfUnlock × (L+1))` |
| `capacity` | `capacityLevel`: throughput and buffer × (1 + `capacity.step` per level) | `fronts.upgrade.capacity.levels` | `round(max(type.cost, upgrade.minCostBasis) × upgrade.capacity.costPctOfUnlock × (L+1))` |

`minCostBasis` gives the free Currency Kiosk a real upgrade price. Both emit `FRONT_UPGRADED { frontId, level, cost, track }`.

## Actions and events

| Action | Checks | Effect |
|---|---|---|
| `DEPOSIT { frontId, amount }` | amount > 0, enough Dirty, fits the buffer | `DEPOSITED` (with `instantClean` on the first conversion) |
| `BUY_FRONT { frontType }` | unlocked, not already owned, enough Clean | new front at level 0, capacity 0, mode `normal`; `FRONT_BOUGHT` |
| `UPGRADE_FRONT { frontId, track? }` | below that track's max ("Fully upgraded", "No room left to expand"), enough Clean | level or capacity level +1; `FRONT_UPGRADED` |
| `SET_FRONT_MODE { frontId, mode }` | a known mode, not the current one ("Already running that way") | `FRONT_MODE_SET` |

## Open tuning issue

The bot uses fronts at ~49% (target 70–90%). The Restaurant now starts at a smaller throughput and grows through the capacity track, which keeps Act II laundering a decision, but the casual economy's Dirty still sits below what fronts can wash. See [TUNING.md](../../TUNING.md) before changing throughput or rates.

**Tests:** `tests/apply.test.ts` (buffering after the first conversion, conversion at throughput, each mode's conversion, no suspicion lying low, capacity raising throughput and the buffer), `tests/reconcile.test.ts` (split invariance with a pushed front).
