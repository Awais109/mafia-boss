# Businesses: vault, joints, rackets and premises

Your businesses make Dirty money into a capped vault. You collect it, launder it through fronts ([fronts.md](fronts.md)) into Clean, and spend Clean on more and better businesses. Joints and rackets earn; premises make, keep or improve something and cost upkeep ([ADR 0031](../decisions/0031-business-kinds.md)).

**Code:** `engine/systems/rackets.ts` (`accrueVault`, `decayCondition`, `settleUpkeep`), `engine/systems/districts.ts` (`openSpots`, `openLots`, `premisesBlocked`), `engine/core/formulas.ts` (costs, tier curves, `racketMaxTier`, `premisesUpkeep`, `factoryOutput`, `jointSales`, `warehouseCapacity`, vault cap), `engine/core/derive.ts` (`perRacket`, `yieldPerHr`, `upkeepPerHr`, `influencePerHr`, `synergies`, `vaultCap`, `vaultCapBase`, `stashHours`, `raidShield`), handlers in `engine/core/apply.ts`.
**Config:** `vault.*`, `rackets.*` (including `rackets.premises` and `rackets.synergies`), `costs.*`, and `districts.list.*.allows` and `premisesLots` in `engine/config/defaults.ts`.

## Vault and Dirty

Two buckets ([ADR 0016](../decisions/0016-vault-and-dirty.md)):

- **Vault**: joints and rackets accrue into it, up to a cap. Raids seize from it. The game starts with `vault.startingDirty` in it.
- **Dirty**: spendable and uncapped. `COLLECT` moves the whole vault into Dirty.

```
vaultCap     = max(vault.floorCap, yieldPerHr × (vault.targetHoursByAct[act] + stashHours))
vaultCapBase = max(vault.floorCap, yieldPerHr × vault.targetHoursByAct[act])
```

`stashHours` is what your best Stash House adds (see [Premises](#premises)); without one the two caps are equal. Tolya's demand and the sim report read `vaultCapBase` ([ADR 0037](../decisions/0037-act-ii-premises.md)).

The cap is the session leash: once the vault is full, income stops until you collect. Yield that would have gone past the cap is counted in `stats.dirtyLostToCap`, and the moment the vault fills emits `VAULT_CAPPED`. Wages and upkeep are paid from Dirty first, then from the vault ([crew.md](crew.md)).

## Kinds of business

| Kind | Earns | Needs cigarettes | Goes on | Types |
|---|---|---|---|---|
| Joint | Dirty | for `cigaretteShare` of its yield | a spot its district allows | Kiosk, Market Stall, Beer Tent, Slot Hall; Café, Bathhouse |
| Racket | Dirty, with more heat per Dirty | no | a spot its district allows | Video Salon, Taxi Rank; Auto Shop, Petrol Station, Cargo Bay |
| Premises | nothing; costs upkeep | no | a lot in any open district | Tobacco Factory, Warehouse; Stash House, Union Office |
| Front | Clean | no | one of each, city-wide ([fronts.md](fronts.md)) | Currency Kiosk, Restaurant |

Every business except fronts lives in `state.rackets` and uses `BUY_RACKET`, `UPGRADE_RACKET` and `REPAIR_RACKET`; `rackets.types[type].kind` says which kind it is. The rule for any new type: joints and rackets answer "does it make money"; premises answer "does it supply, improve or protect something".

A type can be bought when `type.act ≤ act` and `reputation ≥ type.unlockRep`, in a district that's open (`district.act ≤ act`):
- **Joints and rackets** need a spot: the district allows the type and doesn't already run one ([ADR 0009](../decisions/0009-districts-one-of-each-business.md)). `openSpots(state, config, districtId)` lists what's still buildable.
- **Premises** need a lot: `districts.list[id].premisesLots`, any premises type, one of each type per district, and at most `maxInCity` in the city when the type sets it. `openLots` counts free lots; `premisesBlocked` returns why one can't go in: "You already have one there", "Only one in the city", "No free lot there".

Spots and lots per district are in [districts-and-rivals.md](districts-and-rivals.md#districts). The opening has the player buy a Kiosk, a Market Stall and a Tobacco Factory in Zarechye ([ADR 0035](../decisions/0035-guided-opening.md)).

### Yield and exposure

Per joint or racket, in `derive`:

```
gross    = baseYield × tierYieldMult^(tier−1)
           × condition/100
           × districtYieldMult      (district's mod.yieldMult[type], only while you control the district)
           × inspectYieldMult       (heat.inspectYieldMult while state.inspected)
           × enforcer.yieldMult     (if an enforcer is assigned)
           × specialization.yieldMult    (greed or stealth, from tier 3)
           × synergy yieldMult      (see Synergies)
           × (1 − cigaretteShare + cigaretteShare × served)    (joints; served is 1 unless stock is out)
tribute  = gross × district.tribute (while Tolya or Zhanna controls the district)
yield    = gross − tribute
exposure = baseHeat × tierHeatMult^(tier−1) × enforcer.heatMult (if enforced) × specialization.exposureMult
```

`tierHeatMult` must stay above `tierYieldMult`: tiering always costs more heat than it earns ([heat.md](heat.md)). How `served` falls in a shortage is in [supply-chain.md](supply-chain.md#shortages).

### Premises

- They earn no yield and pay no tribute. Exposure is `baseHeat × tierHeatMult^(tier−1)`, like any business.
- They tier up to `rackets.premises.maxTier` in any act. They can't take an enforcer ("Premises don’t need minding") or specialize ("Premises don’t specialize").
- What they do scales with condition: a factory makes `makesPerHr × tierMakeMult^(tier−1) × condition/100` packs an hour, and a warehouse adds `capPerTier × tier × condition/100` to the stock cap ([supply-chain.md](supply-chain.md)).
- **Act II premises** ([ADR 0037](../decisions/0037-act-ii-premises.md)):
  - A **Stash House** lengthens the vault leash and hides part of a raid. Your best one adds `leashHoursPerTier × tier × condition/100` hours to the vault cap (`Derived.stashHours`; several don't stack). Each also shields `shieldPerTier × tier × condition/100 × (its district's joint and racket yield ÷ total yield)` of a raid, and the shares add up to at most `rackets.premises.maxShield` (`Derived.raidShield`, [heat.md](heat.md)). So a stash belongs where the money is.
  - A **Union Office**, one per city, makes `influencePerHrPerTier × tier × condition/100` Influence an hour, times any synergy `influenceMult`. It's added to `Derived.influencePerHr` beside the officials' and sits outside the daily cap on Influence from jobs.

**Upkeep.** `upkeep = upkeepPerHr × upkeepTierMult^(tier−1) × synergy upkeep multipliers`. `Derived.upkeepPerHr` accrues into `upkeepOwed` continuously. At every day start, right after wages, `settleUpkeep` pays it from Dirty, then the vault:
- **Paid in full:** `UPKEEP_PAID` (quiet), `stats.upkeepPaid`.
- **Short:** whatever is there gets paid and the rest is forgiven; `stats.missedUpkeep` increments and every premises loses `rackets.premises.missedUpkeepConditionHit` condition (`UPKEEP_MISSED`).

### Synergies

`rackets.synergies`, evaluated per district in `derive`. A synergy is active in a district that has its `a` business, and a `b` when one is named (`'joints'` means any joint); `district` limits it to one district. `Derived.synergies` lists the active ones, and the Business tab shows them.

| Synergy | In one district | Effect |
|---|---|---|
| `factoryJoints` | a Tobacco Factory and any joint | the joints earn × `effect.yieldMult` and get cigarettes first in a shortage (`servedFirst`) |
| `warehouseFactory` | a Warehouse and a Tobacco Factory | the Warehouse's upkeep × `effect.upkeepMultOf.warehouse` |
| `stashWarehouse` | a Stash House and a Warehouse | the Warehouse's upkeep × `effect.upkeepMultOf.warehouse` (0: it's free) |
| `unionSovietsky` | a Union Office, in Sovietsky Blocks only | its Influence × `effect.influenceMult` |

A `yieldMult` lands on the `b` businesses; `upkeepMultOf` names the types whose upkeep it changes; an `influenceMult` lands on the `a` premises.

### Tier-3 specialization

([ADR 0027](../decisions/0027-tier-3-specialization.md)) For joints and rackets, the upgrade to `rackets.specialization.atTier` is a choice: `UPGRADE_RACKET { racketId, specialization: 'greed' | 'stealth' }`. Without one it's rejected ("Pick greed or stealth"); a specialization on any other upgrade is rejected too. The choice is stored as `Racket.specialization`, multiplies yield and exposure from then on, and counts in `stats.specializations`.

- **Greed** (`greed.yieldMult`, `greed.exposureMult`): more money, much more heat.
- **Stealth** (`stealth.yieldMult`, `stealth.exposureMult`): the same money, less heat than greed would have.

`validateConfig` keeps both honest: `greed.exposureMult ≥ greed.yieldMult`, and `stealth.exposureMult ≥ 1 / tierHeatMult`, so a stealth tier 3 is never cooler than tier 2. Businesses that were already past tier 3 before specialization existed stay neutral.

### Costs

All costs come from `engine/core/formulas.ts`:

```
purchase          = costs.overrides[type].purchase  ??  type.purchase (premises)  ??  round(baseYield × costs.paybackHoursByAct[type.act])
upgrade (t → t+1) = round(purchase × costs.upgradeBaseFactor × costs.upgradeTierMult^(t−1))
repair            = max(1, round(purchase × rackets.conditionRepairPct))   (Dirty; restores condition to 100)
```

Purchases, upgrades and all other Clean spending give Rep ([progression.md](progression.md)). Tiers stop at `rackets.maxTierByAct[act]` for joints and rackets and at `rackets.premises.maxTier` for premises (`racketMaxTier`).

### Condition

Starts at 100. It loses `rackets.conditionDecayPerDay / 24` at every whole game hour, Tolya's visits knock off more from any business ([districts-and-rivals.md](districts-and-rivals.md)), and a missed upkeep day hits premises. Yield, factory output and warehouse capacity scale with condition. `REPAIR_RACKET` restores it to 100 for a flat Dirty cost, however damaged it is.

### Enforcers

An idle crew member assigned to a joint or racket multiplies its yield by `rackets.enforcer.yieldMult` and its exposure by `rackets.enforcer.heatMult`. Enforcers can't work jobs but still draw wages, and they slowly earn Muscle XP ([crew.md](crew.md#experience)). The link is cleared if they're arrested, fired or walk out.

## The daily ledger

([ADR 0026](../decisions/0026-ledger-and-money-flow.md)) `state.ledger` holds up to `LEDGER_ROWS` (8) snapshots of the cumulative counters in `LEDGER_COUNTERS`, taken at each game day start by `ledgerDayBoundary` (last in the hour boundary, after wages and upkeep settle). `newGame` takes the first at `createdAt`. A day's figures are the difference between two snapshots; today's are `stats` minus the last snapshot. `ledgerDays(state, now)` in `engine/systems/ledger.ts` returns them, and Home's "This week" renders them through `app/ledger.ts`.

The counters: `dirtyEarned`, `jobDirty`, `inboxDirty`, `cleanEarned`, `cleanSpent`, `wagesPaid`, `repairsPaid`, `bribesPaid`, `tributeLost`, `seized`, `trainingPaid`, `upkeepPaid`, `smugglingPaid`, `shipmentsPaid`, `surplusSold`. Counters for systems that aren't built yet stay at 0.

Home's **Money flow** card reads `derive` directly: what the businesses put in the vault per hour, running costs per hour (wages and upkeep), what the fronts are washing, and Dirty and Clean on hand, with a warning when Dirty on hand won't cover `fronts.reserveHours` of running costs.

## Actions and events

| Action | Checks | Effect |
|---|---|---|
| `COLLECT` | none | vault → Dirty; `COLLECTED` |
| `BUY_RACKET { racketType, districtId }` | type unlocked, district open, enough Clean; a joint or racket needs a free spot the district allows, premises a free lot (`premisesBlocked`) | new business at tier 1, condition 100; `RACKET_BOUGHT` |
| `UPGRADE_RACKET { racketId, specialization? }` | below `racketMaxTier`, enough Clean, a specialization exactly on a joint or racket's upgrade to `specialization.atTier` | tier +1; `RACKET_UPGRADED { racketId, tier, cost, specialization? }` |
| `REPAIR_RACKET { racketId }` | condition below 100, enough Dirty | condition 100, `stats.repairsPaid`; `RACKET_REPAIRED` |
| `ASSIGN_ENFORCER { crewId, racketId \| null }` | crew idle, a joint or racket with no enforcer (or `null` to unassign an enforcer) | `ENFORCER_ASSIGNED` / `ENFORCER_REMOVED` |

Also emitted: `VAULT_CAPPED`, `UPKEEP_PAID` (quiet), `UPKEEP_MISSED`, and `OFFLINE_CAPPED` from the reconcile walk ([architecture.md](../architecture.md#the-reconcile-walk)).

**Tests:** `tests/apply.test.ts` (first session, districts host one of each, enforcer multipliers, tier-3 specialization, premises lots and the per-city limit, premises rules, upkeep paid and missed, a Stash House's leash and raid shield, the Union Office's Influence and its Sovietsky bonus, a free Warehouse beside a stash), `tests/reconcile.test.ts` (vault stops at its cap, offline cap), `tests/ledger.test.ts` (snapshots at day starts, rows add up to stats).
