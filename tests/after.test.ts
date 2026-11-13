import { describe, expect, it } from 'vitest'
import { apply, dayIncome, derive, empireValue, formulas, migrate, racketValue, reconcile, shiftTimes, tryBuildConfig, type Config, type PlayerState } from '../engine'
import { act, expectClose, fresh, H, T0 } from './helpers'

// After the story (ADR 0052): tiers past the book, the empire value, and the contracts board.

const configWith = (overlay: object) => {
  const { config: c, errors } = tryBuildConfig({ missions: { enabled: false }, ...overlay } as never)
  if (errors.length) throw new Error(errors.join('\n'))
  return c
}

// No wear, no luck, nothing from Tolya.
const steady = configWith({
  ops: { noise: 0 },
  rackets: { conditionDecayPerDay: 0 },
  rivals: { tolya: { pConditionHit: 0, pTribute: 0, attack: { chance: 0, chanceNoTurf: 0, chanceHostile: 0 } } },
})
const D = 24 * H

// Act VI the ordinary way (as in nagornaya.test.ts), with everyone idle.
function actSix(c: Config = steady): PlayerState {
  let s = act(fresh('after', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: c.progression.acts[6].rep! }], T0, c)
  s.clean = 20_000_000
  s.dirty = 2_000_000
  s.influence = 1000
  s = act(s, [{ type: 'BUY_DISTRICT', districtId: 'zastava' }, { type: 'BUY_FRONT', frontType: 'importExport' }, { type: 'BUY_DISTRICT', districtId: 'kombinat' }], T0, c)
  s.politics.opinion = 100
  s.politics.points = c.elections.maxPoints
  s = act(s, [{ type: 'DEBUG_HOLD_ELECTION' }], T0, c)
  s.tutorial.done = true
  for (const r of s.rackets) r.enforcerId = null
  for (const m of s.crew) {
    m.status = 'idle'
    delete m.assignedTo
  }
  return s
}

// The Holding: every business legal, which ends the story.
function holding(c: Config = steady): PlayerState {
  let s = actSix(c)
  for (const r of s.rackets.filter((x) => c.rackets.types[x.type].kind !== 'premises')) s = act(s, [{ type: 'LEGALIZE', racketId: r.id }], T0, c)
  expect(formulas.storyOver(s, c)).toBe(true)
  return s
}

const idleIds = (s: PlayerState) => s.crew.filter((m) => m.status === 'idle').map((m) => m.id)

describe('past the book', () => {
  it('stops joints and rackets at the book until the story is over, then takes them further at a dearer price', () => {
    const book = formulas.bookMaxTier(steady)
    const before = actSix()
    const early = before.rackets.find((r) => r.type === 'kiosk')!
    early.tier = book
    expect(apply(before, { type: 'UPGRADE_RACKET', racketId: early.id }, T0, steady).error).toBe('Already at max tier')

    const s = holding()
    const r = s.rackets.find((x) => x.type === 'kiosk')!
    r.tier = book
    const cost = formulas.racketUpgradeCost(steady, 'kiosk', book)
    const onCurve = formulas.racketPurchaseCost(steady, 'kiosk') * steady.costs.upgradeBaseFactor * steady.costs.upgradeTierMult ** (book - 1)
    expect(cost).toBe(Math.round(onCurve * steady.after.pastBookCostMult))
    let t = act(s, [{ type: 'UPGRADE_RACKET', racketId: r.id }], T0, steady)
    expect(t.rackets.find((x) => x.id === r.id)!.tier).toBe(book + 1)
    expect(t.clean).toBeCloseTo(s.clean - cost)
    expect(t.stats.after.pastBook).toBe(1)
    expect(derive(t, steady).maxTier).toBe(book + steady.after.extraTiers)

    t.clean = 1e18 // the top tiers cost more than any empire holds
    for (let i = 1; i < steady.after.extraTiers; i++) t = act(t, [{ type: 'UPGRADE_RACKET', racketId: r.id }], T0, steady)
    expect(t.rackets.find((x) => x.id === r.id)!.tier).toBe(book + steady.after.extraTiers)
    expect(apply(t, { type: 'UPGRADE_RACKET', racketId: r.id }, T0, steady).error).toBe('Already at max tier')

    // Premises keep their own cap.
    const premises = t.rackets.find((x) => steady.rackets.types[x.type].kind === 'premises')!
    premises.tier = steady.rackets.premises.maxTier
    expect(apply(t, { type: 'UPGRADE_RACKET', racketId: premises.id }, T0, steady).error).toBe('Already at max tier')
  })
})

describe('the empire value', () => {
  it('adds up what you own at cost, the cash, and a day of income', () => {
    const s = holding()
    const d = derive(s, steady)
    const v = empireValue(s, steady)
    expect(v.total).toBeCloseTo(v.businesses + v.fronts + v.cash + v.income)
    expect(v.cash).toBeCloseTo(s.dirty + s.clean + s.vault)
    expect(v.income).toBeCloseTo(24 * (d.yieldPerHr + d.legalCleanPerHr))
    expect(dayIncome(d)).toBeCloseTo(v.income)
    const r = s.rackets[0]
    r.tier = 4
    let paid = formulas.racketPurchaseCost(steady, r.type)
    for (let tier = 1; tier < r.tier; tier++) paid += formulas.racketUpgradeCost(steady, r.type, tier)
    expect(racketValue(steady, r)).toBe(paid)
    expect(empireValue(s, steady).businesses).toBe(s.rackets.reduce((sum, x) => sum + racketValue(steady, x), 0))
    s.loan = { principal: 1000, owed: 1200, missed: 0 }
    expect(empireValue(s, steady).cash).toBeCloseTo(v.cash - 1200)
  })

  it('goes into the history at each day start, and a new best is marked once the story is over', () => {
    const after = holding()
    after.after.best = 1
    const r = reconcile(after, T0 + D, steady).state
    expect(r.after.history).toHaveLength(1)
    expect(r.after.best).toBe(r.after.history[0].value)
    expect(r.log.filter((e) => e.type === 'EMPIRE_BEST')).toHaveLength(1)
    expect(r.stats.after.bests).toBe(1)

    const before = actSix()
    before.after.best = 1
    const b = reconcile(before, T0 + D, steady).state
    expect(b.after.best).toBe(b.after.history[0].value)
    expect(b.log.some((e) => e.type === 'EMPIRE_BEST')).toBe(false)

    after.after.best = 1e15
    const none = reconcile(after, T0 + D, steady).state
    expect(none.after.best).toBe(1e15)
    expect(none.log.some((e) => e.type === 'EMPIRE_BEST')).toBe(false)
  })
})

describe('contracts', () => {
  it('posts the first board when the story ends, its terms in days of income', () => {
    expect(actSix().after.contracts.items).toEqual([])
    const s = holding()
    const board = s.after.contracts
    expect(board.items).toHaveLength(steady.after.contracts.count)
    expect(new Set(board.items.map((k) => k.kind)).size).toBe(board.items.length)
    expect(board.refreshAt).toBe(T0 + steady.after.contracts.refreshDays * D)
    const income = Math.max(steady.after.contracts.minDayIncome, dayIncome(derive(s, steady)))
    for (const k of board.items) {
      const terms = steady.after.contracts.list[k.kind]
      expect(Math.abs(k.cost - terms.costDays * income)).toBeLessThanOrEqual(0.05 * terms.costDays * income)
      expect(Math.abs(k.pay - terms.payDays * income)).toBeLessThanOrEqual(0.05 * terms.payDays * income)
      expect(k.gold).toBe(terms.gold)
      expect(k.expiresAt).toBe(board.refreshAt)
    }
    expect(s.log.some((e) => e.type === 'CONTRACTS_POSTED')).toBe(true)
  })

  it('takes its crew and Clean up front, can’t be rushed, and always comes back done with Clean and gold', () => {
    const s = holding()
    const k = [...s.after.contracts.items].sort((a, b) => a.crew - b.crew)[0]
    const team = idleIds(s).slice(0, k.crew)
    expect(team).toHaveLength(k.crew)
    expect(apply(s, { type: 'START_CONTRACT', contractId: k.id, crewIds: [] }, T0, steady).error).toBe(`Needs ${k.crew} crew`)
    const poor = { ...s, clean: k.cost - 1 }
    expect(apply(poor, { type: 'START_CONTRACT', contractId: k.id, crewIds: team }, T0, steady).error).toBe('Not enough Clean')

    const started = act(s, [{ type: 'START_CONTRACT', contractId: k.id, crewIds: team }], T0, steady)
    expect(started.clean).toBeCloseTo(s.clean - k.cost)
    const op = started.ops.find((o) => o.contractId === k.id)!
    expect(op.type).toBe('contract')
    expect(op.completesAt).toBe(T0 + k.hours * H)
    expect(started.after.contracts.items.find((x) => x.id === k.id)!.opId).toBe(op.id)
    for (const id of team) expect(started.crew.find((m) => m.id === id)!.status).toBe('on_op')
    expect(apply(started, { type: 'START_CONTRACT', contractId: k.id, crewIds: team }, T0, steady).error).toBe('Already under way')
    expect(apply(started, { type: 'RUSH_OP', opId: op.id }, T0, steady).error).toBe('A contract takes the time it takes')

    const done = reconcile(started, op.completesAt, steady).state
    expect(done.ops.some((o) => o.id === op.id)).toBe(false)
    expect(done.after.contracts.items.some((x) => x.id === k.id)).toBe(false)
    expect(done.stats.after).toMatchObject({ contracts: 1, contractClean: k.pay, contractGold: k.gold })
    expect(done.log.some((e) => e.type === 'CONTRACT_DONE' && e.clean === k.pay && e.gold === k.gold)).toBe(true)
    expect(done.log.some((e) => e.type === 'GOLD_GRANTED' && e.source === 'contract' && e.amount === k.gold)).toBe(true)
    for (const id of team) expect(done.crew.find((m) => m.id === id)!.status).toBe('idle')
  })

  it('posts the board anew each week, keeping a contract that’s under way', () => {
    const s = holding()
    const at = s.after.contracts.refreshAt - H
    let r = reconcile(s, at, steady).state
    const idle = idleIds(r)
    const k = r.after.contracts.items.find((x) => x.crew <= idle.length)!
    r = act(r, [{ type: 'START_CONTRACT', contractId: k.id, crewIds: idle.slice(0, k.crew) }], at, steady)
    const next = reconcile(r, at + 2 * H, steady).state
    const board = next.after.contracts
    expect(board.refreshCount).toBe(2)
    expect(board.refreshAt).toBe(s.after.contracts.refreshAt + steady.after.contracts.refreshDays * D)
    expect(board.items).toHaveLength(steady.after.contracts.count)
    expect(board.items[0].id).toBe(k.id)
    expect(board.items.filter((x) => x.kind === k.kind)).toHaveLength(1)
    expect(board.items.slice(1).every((x) => x.expiresAt === board.refreshAt)).toBe(true)
  })

  it('comes out the same however the wait is split: a contract done and a posting', () => {
    const s = holding()
    const posting = s.after.contracts.refreshAt
    const from = posting - 2 * D
    let r = s
    for (const t of [T0 + 2 * D, T0 + 4 * D, from]) r = reconcile(r, t, steady).state
    const k = [...r.after.contracts.items].sort((a, b) => a.hours - b.hours)[0]
    const started = act(r, [{ type: 'START_CONTRACT', contractId: k.id, crewIds: idleIds(r).slice(0, k.crew) }], from, steady)
    const end = posting + 20 * H // inside time.maxOfflineHours of `from`
    expect(from + k.hours * H).toBeLessThan(end)
    const once = reconcile(started, end, steady).state
    expect(once.after.contracts.refreshCount).toBe(2)
    expect(once.stats.after.contracts).toBe(1)
    let split = started
    for (const t of [from + 5 * H + 17, from + k.hours * H, posting - 1, posting, end]) split = reconcile(split, t, steady).state
    expectClose(split, once)
  })

  it('posts an old save’s first board on its next reconcile, if its story was already over', () => {
    const toV16 = (s: PlayerState) => {
      const doc = JSON.parse(JSON.stringify(s))
      doc.schemaVersion = 16
      delete doc.after
      delete doc.stats.after
      return doc
    }
    const m = migrate(toV16(holding()))
    expect(m.after).toEqual({ contracts: { items: [], refreshAt: m.updatedAt, refreshCount: 0 }, best: 0, history: [] })
    expect(m.stats.after).toEqual({ contracts: 0, contractClean: 0, contractGold: 0, pastBook: 0, bests: 0 })
    const r = reconcile(m, m.updatedAt + H, steady).state
    expect(r.after.contracts.items).toHaveLength(steady.after.contracts.count)
    expect(r.after.contracts.refreshAt).toBe(m.updatedAt + steady.after.contracts.refreshDays * D)

    expect(migrate(toV16(actSix())).after.contracts.refreshAt).toBe(0)
  })
})

describe('the clock', () => {
  it('moves the ending, the board and the empire history when it’s shifted', () => {
    const s = holding()
    s.after.history.push({ at: T0, value: 1 })
    const m = shiftTimes(s, 5 * H)
    expect(m.stats.endings.holding).toBe(T0 + 5 * H)
    expect(m.after.contracts.refreshAt).toBe(s.after.contracts.refreshAt + 5 * H)
    expect(m.after.contracts.items[0].expiresAt).toBe(s.after.contracts.items[0].expiresAt + 5 * H)
    expect(m.after.history[0].at).toBe(T0 + 5 * H)
  })
})
