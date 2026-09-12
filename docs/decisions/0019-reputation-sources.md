# 0019. Rep comes from all Clean spending, jobs and districts

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan's action table gives Rep of `cost / 10` for buying and upgrading rackets and for recruiting, +20 for buying a district, and a config with `perCleanSpent`, `perOpSuccess` (5) and `perDistrict`. It doesn't say whether raises, fronts, front upgrades, crew slots or the buy-out's own Clean earn Rep, or whether a partial job does.

## Decision
- **Every Clean spend** goes through `spendClean` and earns `reputation.perCleanSpent` per Clean: rackets, upgrades, fronts, front upgrades, recruits, raises, crew slots and district buy-outs. One rule is easier to learn than a list.
- **Taking a district** by buy-out or by pressure adds `reputation.perDistrict`.
- **A job** earns `perOpSuccess × reward share`, so a partial success earns part of it.
- **`perOpSuccess` is 2, not the plan's 5.** At 5, Act I cleared at 1.3 days almost entirely from job Rep, and players reached Act II with no economy ([TUNING.md](../../TUNING.md)).
- **Rep never goes down, and acts never regress.** Lowering Rep with the debug tool doesn't take you back to Act I.

## Consequences
- Rep tracks Clean spent, so pace is set by Clean earned. That's why cost changes barely moved pacing and the Act II threshold was set against a measured curve instead ([0015](0015-act-ii-pacing.md)).
- Cheaper purchases earn less Rep each.
- Raises and crew slots are never "wasted" Clean; they still move you toward the next unlock.

## Related
`engine/systems/reputation.ts`, `engine/systems/ops.ts`, `engine/systems/districts.ts`, [systems/progression.md](../systems/progression.md#reputation).
