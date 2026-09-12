import { derive, type Config, type GameEvent, type OpOutcome, type PlayerState } from '../engine'

// "While you were away": what the catch-up reconcile did while the app was closed, in the
// background or skipped ahead in Debug (ADR 0023). Built from the state before and after that
// reconcile plus its events, because the money flows (vault accrual, laundering, wages) are
// continuous and never appear as events. Pure: no React and no store, so tests can build one.

export type AwayJob = { name: string; crew: string; outcome: OpOutcome; dirty: number; influence: number; rep: number }

export type AwayFront = { id: string; name: string; dirty: number; clean: number }

export type AwaySummary = {
  from: number // game time the gap started: the saved state's updatedAt
  to: number // game time it ended
  jobs: AwayJob[]
  racketsEarned: number // Dirty the rackets put in the vault
  lostToCap: number // Dirty the rackets would have made with room in the vault
  vaultFull: boolean
  fronts: AwayFront[] // what each front laundered, and the Clean it made
  cleanEarned: number
  wagesPaid: number
  wagesShort: number // owed at a payday but not covered
  upkeepPaid: number
  upkeepShort: number
  packsMade: number
  packsSold: number
  packsLost: number // made or brought in with no room in stock
  stockFrom: number
  stockTo: number
  tributeLost: number
  seized: number
  influenceEarned: number
  heatFrom: number
  heatTo: number
  pendingDecisions: number // inbox items still waiting when the gap ended
  events: GameEvent[] // everything else worth a line; the popup describes them
}

// Folded into the job and money lines, or never worth a line.
const FOLDED = new Set<GameEvent['type']>([
  'OP_RESOLVED',
  'WAGES_PAID',
  'WAGES_MISSED',
  'UPKEEP_PAID',
  'UPKEEP_MISSED',
  'STOCK_CAPPED',
  'VAULT_CAPPED',
  'OP_STARTED',
  'REPORT_FILED', // counted in pendingDecisions
  'OFFERS_REFRESHED',
  'COLLECTED',
  'DEPOSITED',
  'SESSION_START',
  'SESSION_END',
  'TUTORIAL_STEP',
  'DEBUG',
  'CONFIG_CHANGED',
])

export function buildAway(before: PlayerState, after: PlayerState, events: GameEvent[], c: Config, to: number): AwaySummary {
  // Names from the state at the gap's start: someone who walked out during it still gets named.
  const crewName = (id: string) =>
    before.crew.find((m) => m.id === id)?.name ?? after.crew.find((m) => m.id === id)?.name ?? 'someone'
  const jobs: AwayJob[] = []
  let wagesPaid = 0
  let wagesShort = 0
  let upkeepPaid = 0
  let upkeepShort = 0
  for (const e of events) {
    if (e.type === 'OP_RESOLVED') {
      jobs.push({
        name: e.name ?? c.ops.list[e.opType].name,
        crew: e.crewIds.map(crewName).join(' & '),
        outcome: e.outcome,
        dirty: e.dirty,
        influence: e.influence,
        rep: e.rep,
      })
    } else if (e.type === 'WAGES_PAID') {
      wagesPaid += e.amount
    } else if (e.type === 'WAGES_MISSED') {
      wagesPaid += e.paid
      wagesShort += e.owed - e.paid
    } else if (e.type === 'UPKEEP_PAID') {
      upkeepPaid += e.amount
    } else if (e.type === 'UPKEEP_MISSED') {
      upkeepPaid += e.paid
      upkeepShort += e.owed - e.paid
    }
  }
  // stats.dirtyEarned counts vault accrual and job rewards together.
  const jobDirty = jobs.reduce((sum, j) => sum + j.dirty, 0)
  const delta = (pick: (s: PlayerState) => number) => pick(after) - pick(before)

  // No deposits happen offline, so a buffer only ever went down: that's what the front laundered.
  const rates = new Map(derive(before, c).perFront.map((f) => [f.id, f.rate]))
  const fronts: AwayFront[] = []
  for (const f of before.fronts) {
    const dirty = f.buffer - (after.fronts.find((x) => x.id === f.id)?.buffer ?? 0)
    if (dirty > 1e-9) fronts.push({ id: f.id, name: c.fronts.types[f.type].name, dirty, clean: dirty * (rates.get(f.id) ?? 0) })
  }

  return {
    from: before.updatedAt,
    to,
    jobs,
    racketsEarned: delta((s) => s.stats.dirtyEarned) - jobDirty,
    lostToCap: delta((s) => s.stats.dirtyLostToCap),
    vaultFull: after.vault >= derive(after, c).vaultCap - 1e-6,
    fronts,
    cleanEarned: delta((s) => s.stats.cleanEarned),
    wagesPaid,
    wagesShort,
    upkeepPaid,
    upkeepShort,
    packsMade: delta((s) => s.stats.packsMade),
    packsSold: delta((s) => s.stats.packsSold),
    packsLost: delta((s) => s.stats.packsLostToCap),
    stockFrom: before.inventory.cigarettes,
    stockTo: after.inventory.cigarettes,
    tributeLost: delta((s) => s.stats.tributeLost),
    seized: delta((s) => s.stats.seized),
    influenceEarned: delta((s) => s.influence),
    heatFrom: before.heat,
    heatTo: after.heat,
    pendingDecisions: after.inbox.length,
    events: events.filter((e) => !FOLDED.has(e.type)),
  }
}

// A second gap before the popup is dismissed (Debug skips, mostly) extends the pending summary.
export function mergeAway(pending: AwaySummary | null, next: AwaySummary): AwaySummary {
  if (!pending) return next
  const fronts = pending.fronts.map((f) => ({ ...f }))
  for (const f of next.fronts) {
    const same = fronts.find((x) => x.id === f.id)
    if (same) {
      same.dirty += f.dirty
      same.clean += f.clean
    } else {
      fronts.push({ ...f })
    }
  }
  return {
    from: pending.from,
    to: next.to,
    jobs: [...pending.jobs, ...next.jobs],
    racketsEarned: pending.racketsEarned + next.racketsEarned,
    lostToCap: pending.lostToCap + next.lostToCap,
    vaultFull: next.vaultFull,
    fronts,
    cleanEarned: pending.cleanEarned + next.cleanEarned,
    wagesPaid: pending.wagesPaid + next.wagesPaid,
    wagesShort: pending.wagesShort + next.wagesShort,
    upkeepPaid: pending.upkeepPaid + next.upkeepPaid,
    upkeepShort: pending.upkeepShort + next.upkeepShort,
    packsMade: pending.packsMade + next.packsMade,
    packsSold: pending.packsSold + next.packsSold,
    packsLost: pending.packsLost + next.packsLost,
    stockFrom: pending.stockFrom,
    stockTo: next.stockTo,
    tributeLost: pending.tributeLost + next.tributeLost,
    seized: pending.seized + next.seized,
    influenceEarned: pending.influenceEarned + next.influenceEarned,
    heatFrom: pending.heatFrom,
    heatTo: next.heatTo,
    pendingDecisions: next.pendingDecisions,
    events: [...pending.events, ...next.events],
  }
}
