import { LEDGER_COUNTERS, LEDGER_ROWS, ledgerSnapshot, type LedgerCounter, type LedgerRow, type PlayerState } from '../model/state'

// The daily ledger (ADR 0026): cumulative stat snapshots at each day start. A day's figures are
// the difference between two snapshots, so the ledger can never disagree with stats.

export function ledgerDayBoundary(state: PlayerState, t: number): void {
  state.ledger.push(ledgerSnapshot(state.stats, t))
  if (state.ledger.length > LEDGER_ROWS) state.ledger.splice(0, state.ledger.length - LEDGER_ROWS)
}

export type LedgerDay = { startsAt: number; endsAt: number | null; today: boolean } & Record<LedgerCounter, number>

// Closed days oldest first, then today so far.
export function ledgerDays(state: PlayerState, now: number): LedgerDay[] {
  const rows = state.ledger
  const days: LedgerDay[] = []
  const diff = (a: LedgerRow, b: Record<LedgerCounter, number>) => {
    const out = {} as Record<LedgerCounter, number>
    for (const k of LEDGER_COUNTERS) out[k] = b[k] - a[k]
    return out
  }
  for (let i = 0; i < rows.length; i++) {
    const next = rows[i + 1]
    if (next) days.push({ startsAt: rows[i].startsAt, endsAt: next.startsAt, today: false, ...diff(rows[i], next) })
    else days.push({ startsAt: rows[i].startsAt, endsAt: null, today: true, ...diff(rows[i], state.stats) })
  }
  void now
  return days
}
