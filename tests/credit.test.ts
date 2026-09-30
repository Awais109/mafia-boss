import { describe, expect, it } from 'vitest'
import { apply, derive, lendCap, loanCap, reconcile, tryBuildConfig, type Config, type PlayerState } from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Credit (ADR 0042): borrow Clean against your laundering and pay it back from Clean each morning; lend
// Dirty out through a loan desk and get it back with interest, unless the borrower skips town.

const cr = config.credit
const D = 24 * H
const nextDay = (t: number) => (Math.floor(t / D) + 1) * D

function actThree(c: Config = config): PlayerState {
  const s = act(fresh('credit', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: c.rackets.types.loanDesk.unlockRep }], T0, c)
  s.tutorial.done = true
  s.clean = 10_000
  s.dirty = 10_000
  return s
}

const configWith = (overlay: object) => {
  const { config: c, errors } = tryBuildConfig({ missions: { enabled: false }, ...overlay } as never)
  if (errors.length) throw new Error(errors.join('\n'))
  return c
}

describe('borrowing', () => {
  it('opens in Act III, one loan at a time, up to the cap, earning no Rep', () => {
    const early = fresh('credit')
    early.clean = 0
    expect(apply(early, { type: 'TAKE_LOAN', amount: 100 }, T0, config).error).toMatch(/Nobody lends/)
    const s = actThree()
    const cap = loanCap(s, config)
    expect(cap).toBe(cr.minCap) // no closed ledger days with Clean yet
    expect(apply(s, { type: 'TAKE_LOAN', amount: cap + 1 }, T0, config).error).toMatch(/lend up to/)
    const rep = s.reputation
    const out = act(s, [{ type: 'TAKE_LOAN', amount: 1000 }], T0)
    expect(out.clean).toBe(11_000)
    expect(out.reputation).toBe(rep)
    expect(out.loan).toEqual({ principal: 1000, owed: 1000, missed: 0 })
    expect(apply(out, { type: 'TAKE_LOAN', amount: 10 }, T0, config).error).toMatch(/Pay off/)
  })

  it('caps the loan at days of the Clean the ledger shows you laundering', () => {
    const s = actThree()
    s.ledger = [
      { ...s.ledger[0], startsAt: T0 - 2 * D, cleanEarned: 0 },
      { ...s.ledger[0], startsAt: T0 - D, cleanEarned: 3000 },
      { ...s.ledger[0], startsAt: T0, cleanEarned: 6000 },
    ]
    expect(loanCap(s, config)).toBe(Math.max(cr.minCap, cr.maxDaysOfClean * 3000))
  })

  it('charges interest and takes a share of the principal from Clean each morning, until it is paid', () => {
    const s = act(actThree(), [{ type: 'TAKE_LOAN', amount: 1000 }], T0)
    const day = nextDay(T0)
    const r = reconcile(s, day, config)
    const interest = 1000 * cr.interestPerDay
    const due = 1000 * cr.repayPctPerDay + interest
    expect(r.state.loan!.owed).toBeCloseTo(1000 + interest - due)
    expect(r.events.some((e) => e.type === 'LOAN_PAYMENT')).toBe(true)
    const repaid = act(r.state, [{ type: 'REPAY_LOAN', amount: 10_000 }], day)
    expect(repaid.loan).toBeNull()
    expect(repaid.stats.loans.interest).toBeCloseTo(interest)
  })

  it('sends the collectors when a payment is missed, and takes from the vault on the second', () => {
    let s = act(actThree(), [{ type: 'TAKE_LOAN', amount: 1000 }], T0)
    s.clean = 0
    s.vault = 1000
    const day = nextDay(T0)
    s = reconcile(s, day, config).state
    expect(s.loan!.missed).toBe(1)
    const item = s.inbox.find((i) => i.ref === 'collectors')!
    expect(item.racketId).toBeDefined()
    const due = 1000 * cr.repayPctPerDay + 1000 * cr.interestPerDay
    expect(item.options.find((o) => o.id === 'payDouble')!.effects.clean).toBe(-Math.round(2 * due))
    s.clean = 0
    const vault = s.vault
    s = reconcile(s, day + D, config).state
    expect(s.loan!.missed).toBe(0)
    expect(s.stats.loans.seized).toBe(Math.floor(vault * cr.secondMissVaultPct))
  })
})

describe('lending', () => {
  it('needs a loan desk and lends up to its hours of yield, one loan at a time', () => {
    const s = actThree()
    expect(apply(s, { type: 'LEND', amount: 100 }, T0, config).error).toMatch(/loan desk/)
    const withDesk = act(s, [{ type: 'BUY_RACKET', racketType: 'loanDesk', districtId: 'zarechye' }], T0)
    const cap = lendCap(withDesk, config)
    expect(cap).toBe(Math.floor(config.rackets.types.loanDesk.lendHoursPerTier! * derive(withDesk, config).yieldPerHr))
    expect(apply(withDesk, { type: 'LEND', amount: cap + 1 }, T0, config).error).toMatch(/can put out/)
    const lent = act(withDesk, [{ type: 'LEND', amount: cap }], T0)
    expect(lent.dirty).toBe(withDesk.dirty - cap)
    expect(lent.lending).toMatchObject({ amount: cap, dueAt: T0 + cr.lending.termHours * H })
    expect(apply(lent, { type: 'LEND', amount: 1 }, T0, config).error).toMatch(/already out/)
  })

  it('pays the loan back with interest when it comes due', () => {
    const c = configWith({ credit: { lending: { defaultBase: 0, minDefault: 0 } } })
    const s = act(actThree(c), [{ type: 'BUY_RACKET', racketType: 'loanDesk', districtId: 'zarechye' }, { type: 'LEND', amount: 50 }], T0, c)
    const r = reconcile(s, T0 + c.credit.lending.termHours * H, c)
    expect(r.state.lending).toBeNull()
    expect(r.events.find((e) => e.type === 'LENDING_REPAID')).toMatchObject({ amount: 50, returned: Math.round(50 * (1 + c.credit.lending.returnPct)) })
  })

  it('files a chase when a borrower skips town, which can win half of it back', () => {
    const c = configWith({ credit: { lending: { defaultBase: 1, minDefault: 1 } }, ops: { noise: 0 } })
    let s = act(actThree(c), [{ type: 'BUY_RACKET', racketType: 'loanDesk', districtId: 'zarechye' }, { type: 'LEND', amount: 50 }], T0, c)
    s = reconcile(s, T0 + c.credit.lending.termHours * H, c).state
    const item = s.inbox.find((i) => i.ref === 'lendingDefault')!
    const chase = item.options.find((o) => o.id === 'chase')!
    expect(chase.effects.contest!.win.dirty).toBe(25)
    // With no luck in it, the best Nerve on the crew decides it.
    for (const m of s.crew) m.nerve = 99
    const dirty = s.dirty
    s = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'chase' }], s.updatedAt, c)
    expect(s.dirty).toBe(dirty + 25)
    expect(s.stats.contests.won).toBe(1)
  })
})
