# 0003. Reconcile walks hour-bounded segments so any split gives the same result

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §6 computes offline progress by walking time in segments rather than ticking, and asks for the property `reconcile(s, t2) == reconcile(reconcile(s, t1), t2)`. A naive walk breaks it: yield depends on racket condition, the inspection penalty and front utilization. If those change continuously, the rates computed at a segment's start depend on where the caller happened to split.

## Decision
- A segment ends at the earliest of `now`, the next whole game hour, or a scheduled event (job completion, bribe expiry, recruit pool refresh, Tolya's visit, jail release).
- Anything that feeds a rate changes **only at whole hours**: condition decay, the `inspected` flag, and front utilization (`frontsHourBoundary`). So every rate is constant within a segment.
- Continuous quantities use updates that compose exactly: linear accrual, vault growth up to a cap, buffer draining, and heat convergence in closed form (`(1−k)^h`).
- At a boundary, whole-hour work (utilization, condition, inspection, raid and arrest rolls, day-start crew settlement) runs before events due at that instant. A job's heat spike therefore feeds the next hour's raid roll.
- `tests/reconcile.test.ts` checks the property on 1,000 random splits, over states and event streams, with a small float tolerance.

## Consequences
- The inspection penalty can lag heat by up to an hour, which plan §6 accepts.
- A new continuous mechanic must follow the same rule: change inputs to rates only at whole hours or events, or use a closed form that composes. The property test catches violations.
- The walk costs one `derive` per segment, at most about an hour apart.

## Related
`engine/core/reconcile.ts`, `engine/systems/fronts.ts`, `engine/systems/rackets.ts`, `engine/systems/heat.ts`, [architecture.md](../architecture.md#the-reconcile-walk).
