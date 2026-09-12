# 0020. How the sim report measures the dev manual's targets

- **Status:** Accepted; the two act clear rows are superseded by [0022](0022-end-of-prototype-state.md)
- **Date:** 2026-09-12

## Context
Manual §3 lists the targets that define "on pace" (act clear times, vault fill, heat, raids, front utilization, Dirty left unconverted, partial outcomes, missed wages), and §6 shows a sample report. Neither says exactly how each is measured, and the choice of definition moves the numbers.

## Decision
Definitions in `sim/report.ts`:

| Metric | Measured as |
|---|---|
| Act I clear | Days from game start to `stats.actClearedAt[1]` |
| Act II clear | Days from Act I clear to `stats.actClearedAt[2]` |
| Heat mean, min, max | Over hourly samples |
| hours ≥ 40 | Hourly samples at or above `heat.inspectThreshold` |
| Front utilization | Throughput-weighted smoothed utilization, averaged over every hour, including hours before a front exists |
| Dirty idle | Mean over sessions of `min(1, Dirty held after the session ÷ Dirty earned since the last session ended)` |
| Vault fill | `vaultCap ÷ yield` at each session's end. Act I from day-1 Act I sessions; Act II from Act II sessions on day 4 or later |
| Partial outcomes | Partial share of all resolved jobs |
| Raids, missed wages | Counts from `stats` |

With `--runs`, each check shows its mean across seeds and how many individual runs were in range.

## Consequences
- **Front utilization** includes early Act II, when the new Restaurant dwarfs Dirty supply. That's part of why it reads ~46%.
- **Dirty idle** includes the bot's deliberate reserve of 12 h of wages plus a bribe, so it reads high while incomes are small.
- **Vault fill** measures the cap as designed, not how long players actually take to fill it.
- Changing a definition changes every comparison against `sim/baseline.csv` and past [TUNING.md](../../TUNING.md) lines. Record the change here and regenerate the baseline.

## Related
`sim/report.ts`, `sim/driver.ts` (`Recorder`), [sim.md](../sim.md#report), [0014](0014-sim-persona-policy.md).
