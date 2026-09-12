# 0013. Front suspicion reads smoothed utilization

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan gives `fronts.suspicionStartUtil` and `fronts.suspicionFactor`. The manual says a Restaurant at full utilization adds about 17 exposure. `factor × throughput × (util − start)` = 0.3 × 185 × 0.3 ≈ 17, which matches. The first implementation used the last whole hour's utilization. The Restaurant burns through a session's deposit in about 90 minutes, so exposure jumped from ~6 to ~26 for the hour after every deposit. That punished depositing, not laundering a lot.

## Decision
```
suspicion = suspicionFactor × throughput × max(0, util − suspicionStartUtil)
util     += (hourUtil − util) / fronts.utilSmoothingHours     (at every whole hour)
```
`fronts.utilSmoothingHours` is a new config key (6), validated as ≥ 1.

## Consequences
- Suspicion follows sustained laundering, the throttle the design is about, not deposit timing.
- It stays split-invariant, because utilization still only changes at whole hours.
- It reacts over several hours: a front run hot for a long time keeps drawing attention for a while after it slows.
- The state field is `Front.util` (renamed from `lastUtil`).

## Related
`engine/systems/fronts.ts`, `engine/core/formulas.ts` (`frontSuspicion`), `engine/config/schema.ts`, [systems/fronts.md](../systems/fronts.md#utilization-and-suspicion).
