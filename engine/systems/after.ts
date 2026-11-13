import { CONTRACT_IDS, type Config } from '../config/schema'
import { emit, newId, type Ctx } from '../core/ctx'
import { derive, type Derived } from '../core/derive'
import * as F from '../core/formulas'
import { hoursToMs } from '../core/time'
import { EMPIRE_DAYS, type Contract, type CrewMember, type Front, type OpInstance, type PlayerState, type Racket } from '../model/state'
import { grantGold } from './gold'
import { spendClean } from './reputation'

// After the story (ADR 0052). Once an ending clears the final act, play carries on: joints and rackets tier
// past the book (formulas.racketMaxTier), the empire value gives a number to grow, and a board of big
// contracts pays Clean and gold. A contract rides the job machinery: a job of type 'contract' naming the
// board item, which always comes back done.

export type EmpireValue = {
  businesses: number // every business at what it cost: bought, then each tier
  fronts: number // every front at what it cost: bought, then each rate and capacity level
  cash: number // Dirty, Clean and the vault, less anything owed to the lender
  income: number // a day of income: Dirty yield and legal Clean, × 24
  total: number
}

// A day of income: yield and legal Clean (after tax) over 24 hours, before running costs.
export const dayIncome = (d: Derived): number => 24 * (d.yieldPerHr + d.legalCleanPerHr)

export function racketValue(c: Config, r: Racket): number {
  let v = F.racketPurchaseCost(c, r.type)
  for (let tier = 1; tier < r.tier; tier++) v += F.racketUpgradeCost(c, r.type, tier)
  return v
}

export function frontValue(c: Config, f: Front): number {
  let v = c.fronts.types[f.type].cost
  for (let l = 0; l < f.level; l++) v += F.frontUpgradeCost(c, f.type, l)
  for (let l = 0; l < f.capacityLevel; l++) v += F.frontCapacityUpgradeCost(c, f.type, l)
  return v
}

// Everything you own, plus a day of income.
export function empireValue(state: PlayerState, c: Config, d: Derived = derive(state, c)): EmpireValue {
  const businesses = state.rackets.reduce((sum, r) => sum + racketValue(c, r), 0)
  const fronts = state.fronts.reduce((sum, f) => sum + frontValue(c, f), 0)
  const cash = state.dirty + state.clean + state.vault - (state.loan?.owed ?? 0)
  const income = dayIncome(d)
  return { businesses, fronts, cash, income, total: businesses + fronts + cash + income }
}

// At each day start: the empire value goes into its history, and a new best is marked once the story is over.
export function afterDayBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const a = state.after
  const value = Math.round(empireValue(state, c).total)
  a.history.push({ at: t, value })
  if (a.history.length > EMPIRE_DAYS) a.history.splice(0, a.history.length - EMPIRE_DAYS)
  if (value <= a.best) return
  const had = a.best > 0
  a.best = value
  if (had && F.storyOver(state, c)) {
    state.stats.after.bests++
    emit(ctx, t, { type: 'EMPIRE_BEST', value })
  }
}

// Two significant figures: the council pays in round sums.
const round2 = (x: number): number => {
  if (x <= 0) return 0
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1))
  return Math.round(x / step) * step
}

// A fresh board: anything under way stays, the rest is replaced, up to `count`. Terms are fixed now, in days
// of income.
export function postContracts(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const board = state.after.contracts
  board.refreshCount++
  const rand = ctx.rng.derive('contracts', board.refreshCount)
  const kept = board.items.filter((k) => k.opId)
  const income = Math.max(c.after.contracts.minDayIncome, dayIncome(derive(state, c)))
  const pool = CONTRACT_IDS.filter((id) => !kept.some((k) => k.kind === id))
  const fresh: Contract[] = []
  for (let n = 0; kept.length + fresh.length < c.after.contracts.count && pool.length > 0; n++) {
    const kind = pool.splice(Math.floor(rand.next() * pool.length), 1)[0]
    const k = c.after.contracts.list[kind]
    fresh.push({
      id: `contract${board.refreshCount}-${n}`,
      kind,
      name: k.name,
      crew: k.crew,
      hours: k.hours,
      cost: round2(k.costDays * income),
      pay: round2(k.payDays * income),
      gold: k.gold,
      expiresAt: board.refreshAt,
    })
  }
  board.items = [...kept, ...fresh]
  emit(ctx, t, { type: 'CONTRACTS_POSTED', count: fresh.length })
}

// The story has just ended: the first board goes up now, the next one in `refreshDays`.
export function openAfterStory(state: PlayerState, ctx: Ctx, t: number): void {
  state.after.contracts.refreshAt = t + hoursToMs(ctx.c, ctx.c.after.contracts.refreshDays * 24)
  postContracts(state, ctx, t)
}

// Scheduled postings, on a fixed schedule so any split of a reconcile agrees. An old save whose story was
// already over has its first posting due at once (the v17 migration).
export function refreshContractsIfDue(state: PlayerState, ctx: Ctx, t: number): void {
  const board = state.after.contracts
  if (board.refreshAt === 0 || board.refreshAt > t || !F.storyOver(state, ctx.c)) return
  const interval = hoursToMs(ctx.c, ctx.c.after.contracts.refreshDays * 24)
  while (board.refreshAt <= t) board.refreshAt += interval
  postContracts(state, ctx, t)
}

// Why this contract can't be taken now, or null.
export function contractBlocked(state: PlayerState, c: Config, k: Contract, t: number): string | null {
  if (!F.storyOver(state, c)) return 'After the story'
  if (k.opId) return 'Already under way'
  if (k.expiresAt <= t) return 'Gone from the board'
  if (state.clean < k.cost - 1e-6) return 'Not enough Clean'
  return null
}

export function startContract(state: PlayerState, ctx: Ctx, t: number, contractId: string, crewIds: string[]): string | null {
  const { c } = ctx
  const k = state.after.contracts.items.find((x) => x.id === contractId)
  if (!k) return 'No such contract'
  const blocked = contractBlocked(state, c, k, t)
  if (blocked) return blocked
  const ids = [...new Set(crewIds)]
  if (ids.length !== k.crew) return `Needs ${k.crew} crew`
  const team = ids.map((x) => state.crew.find((m) => m.id === x))
  if (team.some((m) => !m || m.status !== 'idle')) return 'Everyone on it must be idle'
  const opId = newId(state, 'op')
  state.ops.push({ id: opId, type: 'contract', contractId: k.id, name: k.name, crewIds: ids, startedAt: t, completesAt: t + hoursToMs(c, k.hours) })
  for (const m of team as CrewMember[]) {
    m.status = 'on_op'
    m.assignedTo = opId
  }
  k.opId = opId
  emit(ctx, t, { type: 'CONTRACT_STARTED', contractId: k.id, kind: k.kind, name: k.name, opId, crewIds: ids, cost: k.cost })
  spendClean(state, ctx, t, k.cost)
  return null
}

// A contract always comes back done: its Clean and gold, and it leaves the board.
export function resolveContract(state: PlayerState, ctx: Ctx, op: OpInstance, t: number): void {
  state.ops = state.ops.filter((o) => o.id !== op.id)
  for (const m of state.crew) {
    if (m.status === 'on_op' && m.assignedTo === op.id) {
      m.status = 'idle'
      delete m.assignedTo
    }
  }
  const board = state.after.contracts
  const k = board.items.find((x) => x.id === op.contractId)
  if (!k) return
  board.items = board.items.filter((x) => x.id !== k.id)
  state.clean += k.pay
  state.stats.cleanEarned += k.pay
  state.stats.after.contracts++
  state.stats.after.contractClean += k.pay
  state.stats.after.contractGold += k.gold
  emit(ctx, t, { type: 'CONTRACT_DONE', contractId: k.id, kind: k.kind, name: k.name, crewIds: op.crewIds, clean: k.pay, gold: k.gold })
  grantGold(state, ctx, t, k.gold, 'contract')
}
