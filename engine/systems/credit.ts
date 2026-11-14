import type { Config } from '../config/schema'
import { emit, newId, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { dayIndex, hoursToMs } from '../core/time'
import type { Loan, PlayerState } from '../model/state'
import { raiseIncident } from './inbox'
import { ledgerDays } from './ledger'

// Credit (ADR 0042), from Act III. Borrowing brings Clean forward: one loan at a time, capped at a few days
// of the Clean you've been laundering, interest on what's owed and a share of the principal due from Clean
// at every day start. A missed payment sends the collectors; a second in a row takes a business (ADR 0051). Repaying
// only ever comes from Clean, so a loan is never a way to turn Dirty into Clean.
// Lending goes the other way: a loan desk puts idle Dirty out for a couple of days at interest. Most
// borrowers pay; some skip town, fewer on a prosperous street.

export const creditOpen = (state: PlayerState, c: Config): boolean => state.act >= c.credit.fromAct

// How much you can borrow: days of the mean daily Clean over the ledger's closed days, at least minCap.
export function loanCap(state: PlayerState, c: Config): number {
  const closed = ledgerDays(state, 0).filter((d) => !d.today)
  const mean = closed.length ? closed.reduce((sum, d) => sum + d.cleanEarned, 0) / closed.length : 0
  return Math.max(c.credit.minCap, Math.round(c.credit.maxDaysOfClean * mean))
}

// The next day start's terms: the day's interest, and what it will ask for (a share of the principal plus that
// interest, never more than is owed once the interest is on). The Credit card and the day start both read this.
function loanTerms(loan: Loan, c: Config): { interest: number; due: number } {
  const interest = loan.owed * c.credit.interestPerDay
  return { interest, due: Math.min(loan.owed + interest, loan.principal * c.credit.repayPctPerDay + interest) }
}

export function loanDue(state: PlayerState, c: Config): number {
  return state.loan ? loanTerms(state.loan, c).due : 0
}

export function takeLoan(state: PlayerState, ctx: Ctx, t: number, amount: number): string | null {
  const { c } = ctx
  if (!creditOpen(state, c)) return 'Nobody lends to you yet'
  if (state.loan) return 'Pay off the loan you have first'
  if (!Number.isInteger(amount) || amount < 1) return 'Borrow a whole amount'
  const cap = loanCap(state, c)
  if (amount > cap) return `They’ll lend up to ${cap}`
  state.clean += amount
  state.loan = { principal: amount, owed: amount, missed: 0 }
  state.stats.loans.borrowed += amount
  emit(ctx, t, { type: 'LOAN_TAKEN', amount, owed: amount })
  return null
}

export function repayLoan(state: PlayerState, ctx: Ctx, t: number, amount: number): string | null {
  const loan = state.loan
  if (!loan) return 'You don’t owe anyone'
  if (!(amount > 0)) return 'Repay something'
  if (state.clean < Math.min(amount, loan.owed) - 1e-6) return 'Not enough Clean'
  pay(state, ctx, t, Math.min(amount, loan.owed))
  return null
}

function pay(state: PlayerState, ctx: Ctx, t: number, amount: number): void {
  const loan = state.loan!
  state.clean -= amount
  loan.owed -= amount
  state.stats.loans.repaid += amount
  if (loan.owed < ctx.c.credit.paidOffBelow) {
    state.loan = null
    emit(ctx, t, { type: 'LOAN_REPAID', paid: amount })
  } else {
    emit(ctx, t, { type: 'LOAN_PAYMENT', paid: amount, owed: loan.owed })
  }
}

// Day start, after wages and upkeep: interest, then the day's payment from Clean. A payment Clean can't
// cover is missed: the collectors come. At `missesToRepossess` misses in a row the lender's men take one
// business and close the loan, so the debt never grows for ever (ADR 0051). A payment met ends the run.
export function creditDayBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const loan = state.loan
  if (!loan) return
  const { c } = ctx
  const { interest, due } = loanTerms(loan, c)
  loan.owed += interest
  state.stats.loans.interest += interest
  if (state.clean >= due - 1e-6) {
    loan.missed = 0
    pay(state, ctx, t, due)
    return
  }
  loan.missed++
  state.stats.loans.missed++
  emit(ctx, t, { type: 'LOAN_MISSED', due, missed: loan.missed })
  if (loan.missed >= c.credit.missesToRepossess) return repossess(state, ctx, t)
  const rand = ctx.rng.derive('collectors', dayIndex(c, t))
  const targets = state.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises')
  const racketId = targets.length ? rand.pick(targets).id : undefined
  raiseIncident(state, ctx, t, 'collectors', rand.next, { racketId, due })
}

// The best working loan desk.
function loanDesk(state: PlayerState, c: Config) {
  const desks = state.rackets.filter((r) => r.closedUntil === undefined && c.rackets.types[r.type].lendHoursPerTier !== undefined)
  return desks.sort((a, b) => b.tier * b.condition - a.tier * a.condition)[0]
}

// How much Dirty the desk can put out: hours of yield per tier, at its condition.
export function lendCap(state: PlayerState, c: Config): number {
  const desk = loanDesk(state, c)
  if (!desk) return 0
  const hours = (c.rackets.types[desk.type].lendHoursPerTier ?? 0) * desk.tier * (desk.condition / 100)
  return Math.floor(hours * derive(state, c).yieldPerHr)
}

// The chance a borrower skips town: lower on a prosperous street.
export function defaultChance(state: PlayerState, c: Config): number {
  const l = c.credit.lending
  const desk = loanDesk(state, c)
  const prosperity = desk ? (state.districts.find((d) => d.id === desk.districtId)?.prosperity ?? 0) : 0
  return Math.max(l.minDefault, l.defaultBase - l.defaultPerProsperity * prosperity)
}

export function lend(state: PlayerState, ctx: Ctx, t: number, amount: number): string | null {
  const { c } = ctx
  if (!creditOpen(state, c)) return 'Nobody borrows from you yet'
  if (state.lending) return 'Money is already out'
  const cap = lendCap(state, c)
  if (cap <= 0) return 'You need a loan desk'
  if (!Number.isInteger(amount) || amount < 1) return 'Lend a whole amount'
  if (amount > cap) return `The desk can put out ${cap}`
  if (state.dirty < amount - 1e-6) return 'Not enough Dirty'
  state.dirty -= amount
  state.lending = { id: newId(state, 'lend'), amount, dueAt: t + hoursToMs(c, c.credit.lending.termHours) }
  state.stats.lending.lent += amount
  emit(ctx, t, { type: 'LENT', amount, dueAt: state.lending.dueAt })
  return null
}

// The loan comes due: repaid with interest, or the borrower is gone. One roll per loan, seeded by its id.
export function lendingDue(state: PlayerState, ctx: Ctx, t: number): void {
  const l = state.lending
  if (!l || l.dueAt > t) return
  const { c } = ctx
  state.lending = null
  const rand = ctx.rng.derive('lend', l.id)
  if (rand.chance(defaultChance(state, c))) {
    state.stats.lending.defaults++
    emit(ctx, t, { type: 'LENDING_DEFAULTED', amount: l.amount })
    raiseIncident(state, ctx, t, 'lendingDefault', rand.next, { due: l.amount })
    return
  }
  const returned = Math.round(l.amount * (1 + c.credit.lending.returnPct))
  state.dirty += returned
  state.stats.lending.returned += returned
  emit(ctx, t, { type: 'LENDING_REPAID', amount: l.amount, returned })
}

// The keys (ADR 0051): the lender's men take one business and the loan is closed. Not the worst thing you
// own, and not the best: the middle earner by yield (or, with nothing earning, a premises).
function repossess(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const owed = state.loan?.owed ?? 0
  state.loan = null
  state.stats.loans.repossessed++
  const d = derive(state, c)
  const ranked = state.rackets
    .map((r, i) => ({ r, yield: d.perRacket[i].yield + d.perRacket[i].legalClean }))
    .sort((a, b) => b.yield - a.yield || a.r.id.localeCompare(b.r.id))
  const earning = ranked.filter(({ r }) => c.rackets.types[r.type].kind !== 'premises')
  const pool = earning.length ? earning : ranked
  if (!pool.length) return
  const taken = pool[Math.floor(pool.length / 2)].r
  // Whoever minded it comes home.
  for (const m of state.crew) {
    if (m.status === 'enforcer' && m.assignedTo === taken.id) {
      m.status = 'idle'
      delete m.assignedTo
    }
  }
  state.rackets = state.rackets.filter((r) => r.id !== taken.id)
  emit(ctx, t, { type: 'LOAN_REPOSSESSED', racketId: taken.id, racketType: taken.type, districtId: taken.districtId, owed })
}
