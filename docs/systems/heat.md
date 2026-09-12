# Heat, control and officials

Everything you run draws police attention. Heat drifts toward a target set by your exposure against your control; high heat cuts yield, triggers raids, and gets crew arrested.

**Code:** `engine/systems/heat.ts` (`heatHourBoundary`, `raid`, `arrest`), `engine/core/derive.ts` (`exposure`, `control`, `controlParts`, `heatTarget`), `engine/core/formulas.ts` (`heatTarget`, `convergeHeat`, `bribeCost`), the `BRIBE` and `BUY_OFFICIAL` handlers in `engine/core/apply.ts`, accrual in `engine/core/reconcile.ts`.
**Config:** `heat.*`, `officials.*`.

## Exposure, control, target

```
exposure = Σ racket exposure (economy.md) + Σ front suspicion (fronts.md)

control  = (heat.baseControl + Σ owned officials' control + bribeControl)
           × (1 + heat.districtControlPct × districts taken)      (home turf doesn't count)

target   = 100 × exposure / (exposure + control)                  (0 if both are 0)
```

A control-to-exposure ratio of about 1.9 puts heat around 34 ([ADR 0011](../decisions/0011-heat-target-formula.md)).

Over each reconcile segment of `h` hours, heat moves toward the target in closed form:

```
heat = target + (heat − target) × (1 − heat.convergePerHr)^h
```

Job heat spikes are added to heat directly (capped at 100) when a job resolves ([ops.md](ops.md)).

## Thresholds

Checked at every whole game hour (`heatHourBoundary`). The rolls are seeded by hour, so the same window always rolls the same way.

| Heat | Effect | Events |
|---|---|---|
| ≥ `inspectThreshold` | `state.inspected` is set; every racket's yield × `inspectYieldMult` until an hour check finds heat below the threshold | `INSPECTION_STARTED`, `INSPECTION_ENDED` |
| ≥ `raidThreshold` | `raidChancePerHr` chance: police seize `floor(vault × raidSeizePct)` from the vault (not Dirty) | `RAID` |
| ≥ `arrestThreshold` | `arrestChancePerHr` chance: a random idle crew member or enforcer is jailed for `arrestHours` | `ARREST`, later `RELEASED` |

Raids update `stats.raids`, `stats.seized` and `stats.firstRaidAt`; arrests update `stats.arrests`.

## Bribes

`BRIBE` is the emergency lever. It's only available while no bribe is active.

```
cost         = max(1, ceil(exposure × heat.bribe.costPerExposure))       (Dirty)
bribeControl = heat.bribe.controlPct × (baseControl + officials' control) × district multiplier
```

The bribe lasts `heat.bribe.hours` and then expires. Events: `BRIBED`, `BRIBE_EXPIRED`.

## Officials

Permanent control, bought with Influence. `officials.list` has a Ward Cop (Act I) and a Precinct Captain (Act II).

`BUY_OFFICIAL { officialId }` requires:
- the official's act has been reached, and they aren't already on the payroll;
- `influence ≥ cost`;
- the shared cooldown has passed. Buying any official sets `officialCooldownUntil = now + officials.cooldownDays × 24 h`.

It records `stats.officialBoughtAt` and emits `OFFICIAL_BOUGHT`.

**Influence** comes from two places:
- Each owned official produces `officials.influencePerHrEach` per hour, continuously.
- Influence jobs pay it too, up to `ops.influenceDailyCap` per game day ([ops.md](ops.md)).

The game starts with `vault.startingInfluence`.

## Debug

`DEBUG_SET_HEAT { heat }`, `DEBUG_FORCE_RAID`, `DEBUG_FORCE_ARREST`.

**Tests:** `tests/apply.test.ts` (bribe duration, heat convergence, official cooldown), `tests/reconcile.test.ts` (seeded raids and arrests are deterministic), `tests/sim.test.ts` (bot heat stays 25–35 with at most one raid).
