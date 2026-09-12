# Economy: vault and rackets

Rackets make Dirty money into a capped vault. You collect it, launder it through fronts ([fronts.md](fronts.md)) into Clean, and spend Clean on more and better rackets.

**Code:** `engine/systems/rackets.ts` (vault accrual, condition decay), `engine/core/formulas.ts` (costs, tier curves, vault cap), `engine/core/derive.ts` (`perRacket`, `yieldPerHr`, `vaultCap`), handlers in `engine/core/apply.ts`.
**Config:** `vault.*`, `rackets.*`, `costs.*`, and `districts.list.*.allows` in `engine/config/defaults.ts`.

## Vault and Dirty

Two buckets ([ADR 0016](../decisions/0016-vault-and-dirty.md)):

- **Vault**: rackets accrue into it, up to a cap. Raids seize from it. The game starts with `vault.startingDirty` in it.
- **Dirty**: spendable and uncapped. `COLLECT` moves the whole vault into Dirty.

```
vaultCap = max(vault.floorCap, yieldPerHr × vault.targetHoursByAct[act])
```

The cap is the session leash: once the vault is full, income stops until you collect. Yield that would have gone past the cap is counted in `stats.dirtyLostToCap`, and the moment the vault fills emits `VAULT_CAPPED`. Wages are paid from Dirty first, then from the vault ([crew.md](crew.md)).

## Rackets

Seven types in `rackets.types` (`kiosk`, `marketStall` in Act I; `autoShop`, `cafe`, `bathhouse`, `petrol`, `cargoBay` in Act II), each with `baseYield`, `baseHeat`, `act`, `unlockRep`.

A racket type can be bought when `type.act ≤ act` and `reputation ≥ type.unlockRep`. It goes in a district that's open (`district.act ≤ act`), that allows the type, and doesn't already run one ([ADR 0009](../decisions/0009-districts-one-of-each-business.md)). `openSpots(state, config, districtId)` lists what's still buildable.

| District | Allows |
|---|---|
| Zarechye (home) | Kiosk, Market Stall |
| Kiosk Row | Kiosk, Market Stall |
| Sovietsky Blocks (Act II) | Auto Shop, Café, Bathhouse |
| Port Quarter (Act II) | Petrol Station, Cargo Bay |

You start with a Kiosk and a Market Stall in Zarechye ([ADR 0010](../decisions/0010-starting-position.md)).

### Yield and exposure

Per racket, in `derive`:

```
gross    = baseYield × tierYieldMult^(tier−1)
           × condition/100
           × districtYieldMult      (district's mod.yieldMult[type], only while you control the district)
           × inspectYieldMult       (heat.inspectYieldMult while state.inspected)
           × enforcer.yieldMult     (if an enforcer is assigned)
tribute  = gross × district.tribute (while Tolya or Zhanna controls the district)
yield    = gross − tribute
exposure = baseHeat × tierHeatMult^(tier−1) × enforcer.heatMult (if enforced)
```

`tierHeatMult` must stay above `tierYieldMult`: tiering always costs more heat than it earns ([heat.md](heat.md)).

### Costs

All costs come from `engine/core/formulas.ts`:

```
purchase         = costs.overrides[type].purchase  ??  round(baseYield × costs.paybackHoursByAct[type.act])
upgrade (t → t+1) = round(purchase × costs.upgradeBaseFactor × costs.upgradeTierMult^(t−1))
repair           = max(1, round(purchase × rackets.conditionRepairPct))   (Dirty; restores condition to 100)
```

Purchases, upgrades and all other Clean spending give Rep ([progression.md](progression.md)). Tiers stop at `rackets.maxTierByAct[act]`.

### Condition

Starts at 100. It loses `rackets.conditionDecayPerDay / 24` at every whole game hour, and Tolya's visits knock off more ([districts-and-rivals.md](districts-and-rivals.md)). Yield scales with condition. `REPAIR_RACKET` restores it to 100 for a flat Dirty cost, however damaged it is.

### Enforcers

An idle crew member assigned to a racket multiplies its yield by `rackets.enforcer.yieldMult` and its exposure by `rackets.enforcer.heatMult`. Enforcers can't work jobs but still draw wages. The link is cleared if they're arrested, fired or walk out.

## The daily ledger

([ADR 0026](../decisions/0026-ledger-and-money-flow.md)) `state.ledger` holds up to `LEDGER_ROWS` (8) snapshots of the cumulative counters in `LEDGER_COUNTERS`, taken at each game day start by `ledgerDayBoundary` (last in the hour boundary, after wages settle). `newGame` takes the first at `createdAt`. A day's figures are the difference between two snapshots; today's are `stats` minus the last snapshot. `ledgerDays(state, now)` in `engine/systems/ledger.ts` returns them, and Home's "This week" renders them through `app/ledger.ts`.

The counters: `dirtyEarned`, `jobDirty`, `inboxDirty`, `cleanEarned`, `cleanSpent`, `wagesPaid`, `repairsPaid`, `bribesPaid`, `tributeLost`, `seized`, `trainingPaid`, `upkeepPaid`, `smugglingPaid`, `shipmentsPaid`, `surplusSold`. Counters for systems that aren't built yet stay at 0.

Home's **Money flow** card reads `derive` directly: what the businesses put in the vault per hour, running costs per hour (wages and upkeep), what the fronts are washing, and Dirty and Clean on hand, with a warning when Dirty on hand won't cover `fronts.reserveHours` of running costs.

## Actions and events

| Action | Checks | Effect |
|---|---|---|
| `COLLECT` | none | vault → Dirty; `COLLECTED` |
| `BUY_RACKET { racketType, districtId }` | type unlocked, district open and allows the type, not already built there, enough Clean | new racket at tier 1, condition 100; `RACKET_BOUGHT` |
| `UPGRADE_RACKET { racketId }` | below max tier, enough Clean | tier +1; `RACKET_UPGRADED` |
| `REPAIR_RACKET { racketId }` | condition below 100, enough Dirty | condition 100, `stats.repairsPaid`; `RACKET_REPAIRED` |
| `ASSIGN_ENFORCER { crewId, racketId \| null }` | crew idle, racket has no enforcer (or `null` to unassign an enforcer) | `ENFORCER_ASSIGNED` / `ENFORCER_REMOVED` |

Also emitted: `VAULT_CAPPED`, and `OFFLINE_CAPPED` from the reconcile walk ([architecture.md](../architecture.md#the-reconcile-walk)).

**Tests:** `tests/apply.test.ts` (first session, districts host one of each, enforcer multipliers), `tests/reconcile.test.ts` (vault stops at its cap, offline cap), `tests/ledger.test.ts` (snapshots at day starts, rows add up to stats).
