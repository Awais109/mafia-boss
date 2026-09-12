# 0024. Pending decisions: crew reports and incidents with baked options and a default

- **Status:** Accepted; the rule that a default can't cost cigarettes is amended by [0032](0032-supply-chain.md)
- **Date:** 2026-09-13

## Context
Playing the prototype, a visit was four taps with no decisions: collect, deposit, send two crew on quick jobs, leave. Jobs resolved into a log line, and nothing happened *to* the player between visits. The dev manual names "nothing" as the worst reason a tester stops (§7). The expansion plan's first milestone adds decisions to the visit without shortening the leash.

## Decision
- **One mechanism** for crew reports and incidents: `state.inbox` of items, each with 2–3 options and a default.
- **Effects are materialized when an item is filed** (a share of a job's Dirty is stored as a number), so the save is self-describing and a replayed log doesn't depend on later config edits.
- **Every item expires** (`inbox.reportHours`, `inbox.incidentHours`) and takes its default. Expiry is a reconcile boundary. The default can never cost Dirty or cigarettes (validated), so an absence never blocks and never punishes a player who couldn't pay.
- **Reports** file for every finished job whose band is in `ops.reports.bands` (all three to start). Options come from `ops.reports.byOutcome` and redistribute the job's value (`dirtyPct`) rather than add to it.
- **Incidents** roll at whole hours on `rng.derive('incident', hourIndex)` with `incidents.chancePerHr`. They wait until the tutorial is done and `incidents.startAfterHours` into the game, stop at `inbox.maxPending` pending incidents, and only pick types whose `needs` hold. Reports don't count toward the limit.
- **The bot** answers every item by value, reusing its job valuation.

## Consequences
- Bot sessions gain about three decisions each (seed 42: 2.9 per session; 1% expire unanswered).
- Rep from boasting and blaming, and heat from the choices, moved pacing slightly: over 10 seeds Act II cleared 3.61 days after Act I (was 3.84) and mean heat rose to 32 (was 29). Both stay in range.
- Item ids come from `state.nextId`, so op ids (and therefore op rolls) differ from earlier builds for the same seed.
- A pending item survives any gap and shows on Home and in the away popup; tuning how many reports file is `ops.reports.bands`.

## Related
`engine/systems/inbox.ts`, `engine/config/defaults.ts` (`inbox`, `ops.reports`, `incidents`), `sim/persona.ts` (`valueOf`), `app/components/InboxCard.tsx`, [systems/inbox.md](../systems/inbox.md), [TUNING.md](../../TUNING.md).
