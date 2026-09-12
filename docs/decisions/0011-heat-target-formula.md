# 0011. Heat target = 100 × exposure ÷ (exposure + control)

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The spec's heat equilibrium formula wasn't available. The plan and manual give its behaviour instead:
- a control-to-exposure ratio of about 1.8–2.0 puts on-schedule heat at 33–36;
- heat should rise past 40 when tiering without the Ward Cop, and stay around 27 when buying on schedule;
- convergence closes about 10% of the gap per hour, and ~90% within a day.

## Decision
```
exposure = Σ racket exposure + Σ front suspicion
control  = (baseControl + officials' control + bribeControl) × (1 + districtControlPct × districts taken)
target   = 100 × exposure / (exposure + control)
heat(h)  = target + (heat − target) × (1 − convergePerHr)^h
```
- **Bribes** add `bribe.controlPct × (baseControl + officials) × district multiplier`: they scale with permanent control, not with themselves.
- **Job spikes** add straight to heat, capped at 100.
- **Thresholds** (inspection, raid, arrest) are checked at whole hours ([0003](0003-split-invariant-reconcile.md)).

## Consequences
- Ratio 1.9 gives 34.5; ratio 1.5 gives 40; ratio 1.0 gives 50. The manual's validation holds.
- Heat approaches 100 only when control is negligible next to exposure.
- A big official purchase makes heat drop sharply and then climb back as you tier: the sawtooth the manual expects.
- A bribe is weak before you have officials, so early on it's an emergency lever, not a strategy.

## Related
`engine/core/formulas.ts` (`heatTarget`, `convergeHeat`, `bribeCost`), `engine/core/derive.ts`, `engine/systems/heat.ts`, [systems/heat.md](../systems/heat.md).
