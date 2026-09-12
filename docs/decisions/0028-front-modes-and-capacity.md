# 0028. Fronts have a push / lay low dial and a capacity upgrade track

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
After buying a front there was nothing to decide: deposit, wait, occasionally buy a rate level. The Restaurant also arrived oversized (185 Dirty/h against an Act II economy that used about 45% of it; TUNING.md "Open"), and cutting its throughput alone had been tried and rejected. The expansion note's other front idea, shrinking the buffer from 10 h to 4 h, would have forced extra visits to move money the player already has, so it was dropped.

## Decision
- `Front.mode`: `push` (throughput × 1.5, suspicion from 50% utilization), `normal`, `layLow` (× 0.5, no suspicion). `SET_FRONT_MODE` changes it only on an action, so reconcile segments stay exact. The buffer is sized from throughput before the dial, so switching modes never strands a deposit.
- `UPGRADE_FRONT { track }`: `rate` as before, or `capacity`, which adds 25% throughput (and buffer) per level up to 3 levels, priced like rate levels at `capacity.costPctOfUnlock`.
- The Restaurant starts at 120 Dirty/h and reaches 210 at capacity 3, so Act II laundering grows through a decision instead of arriving all at once.
- All laundering code reads `formulas.frontThroughput`; suspicion reads `formulas.frontSuspicion(front, util)` with the mode's start point.
- The bot lies low above its bribe line, pushes a backlog of more than 6 h of throughput when the heat target stays in budget, and buys capacity when utilization is at least `fronts.suspicionStartUtil`.

## Consequences
- Pushing trades heat for speed, so the dial ties laundering to the heat system.
- With the dial and capacity, 10-seed front utilization went from 0.47 to 0.49: still below the manual's 70–90%, which remains an open tuning item.
- Heat mean across M2 rose to about 34, close to the 35 ceiling. The bot pushes only within its heat budget; watch it when tuning.

## Related
`engine/core/formulas.ts`, `engine/systems/fronts.ts`, `engine/core/apply.ts` (`UPGRADE_FRONT`, `SET_FRONT_MODE`), `sim/persona.ts`, `app/screens/FrontsScreen.tsx`, [systems/fronts.md](../systems/fronts.md), [TUNING.md](../../TUNING.md).
