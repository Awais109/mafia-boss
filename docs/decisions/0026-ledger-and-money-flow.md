# 0026. The daily ledger is stat snapshots; the Money flow card reads derive

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
Nothing showed a player where their money went: wages, repairs, bribes and tribute left Dirty without a trace, so decisions about keeping or laundering Dirty were guesses. Mafia Empire's weekly report and empire overview address the same gap. A ledger could either keep its own accounting or reuse the stats the game already tracks.

## Decision
- **The ledger is snapshots, not a second accounting path.** At each game day start (last in the hour boundary, after wages settle), `ledgerDayBoundary` stores the cumulative counters in `LEDGER_COUNTERS`; `state.ledger` keeps the latest `LEDGER_ROWS` (8). A day is the difference between two snapshots, and today is `stats` minus the last one, so the ledger can never disagree with stats.
- New cumulative counters: `jobDirty`, `offerDirty`, `inboxDirty`, `wagesPaid`, `repairsPaid`, `bribesPaid`, `opsByType`, plus `trainingPaid`, `upkeepPaid`, `smugglingPaid`, `shipmentsPaid` and `surplusSold` for systems the plan adds later (0 until then).
- **Money flow** is an app card over `derive`: businesses into the vault, running costs, what the fronts are washing, and balances. A Fronts button launders all but `fronts.reserveHours` of running costs, the same horizon the bot keeps.
- The sim reports **wage share** = (wages + upkeep) ÷ Dirty earned per run, checked against the manual's 10–25%.

## Consequences
- Wage share reads about 7% over 8 bot days, below the manual's floor: crew are cheap once the economy grows. Reported, not fixed here.
- Counters must be incremented wherever money moves; a missing increment shows as a ledger line that doesn't match the balance.
- The ledger shows at most a week; the full history is in the exported log.

## Related
`engine/systems/ledger.ts`, `engine/model/state.ts` (`LEDGER_COUNTERS`, `ledgerSnapshot`), `app/ledger.ts`, `app/components/MoneyFlow.tsx`, `sim/report.ts` (`wageShare`), [systems/economy.md](../systems/economy.md#the-daily-ledger).
