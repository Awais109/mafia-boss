import { describe, expect, it } from 'vitest'
import {
  apply,
  derive,
  gameCleared,
  ministryTarget,
  opinionTarget,
  pointCost,
  reconcile,
  tryBuildConfig,
  voteShare,
  winChance,
  type Config,
  type PlayerState,
} from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Act V, the Kombinat (ADR 0044): the auction, public opinion, the Ministry's attention, and the elections.

const configWith = (overlay: object) => {
  const { config: c, errors } = tryBuildConfig(overlay as never)
  if (errors.length) throw new Error(errors.join('\n'))
  return c
}

// No wear, no luck in jobs, nothing from Tolya.
const steady = configWith({
  ops: { noise: 0 },
  rackets: { conditionDecayPerDay: 0 },
  rivals: { tolya: { pConditionHit: 0, pTribute: 0, attack: { chance: 0, chanceNoTurf: 0, chanceHostile: 0 } } },
})
const types = config.rackets.types
const D = 24 * H

// Act V the ordinary way: Act IV's gate is Rep, the road and the importer. Money, and Rep for every Act V business.
function actFive(c: Config = steady): PlayerState {
  let s = act(fresh('kombinat', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: types.tvStation.unlockRep }], T0, c)
  s.clean = 2_000_000
  s.dirty = 2_000_000
  s.influence = 1000
  s = act(s, [{ type: 'BUY_DISTRICT', districtId: 'zastava' }, { type: 'BUY_FRONT', frontType: 'importExport' }], T0, c)
  s.tutorial.done = true
  return s
}

// …and the Kombinat bought at auction.
const owned = (c: Config = steady) => act(actFive(c), [{ type: 'BUY_DISTRICT', districtId: 'kombinat' }], T0, c)
const kombinat = (s: PlayerState) => s.districts.find((d) => d.id === 'kombinat')!

describe('the Kombinat', () => {
  it('opens Act V with opinion at its target, no attention, and the first election a week out', () => {
    const s = actFive()
    expect(s.act).toBe(5)
    expect(s.politics.opinion).toBeCloseTo(opinionTarget(s, steady, T0))
    expect(s.politics.attention).toBe(0)
    expect(s.politics.nextElectionAt).toBe(T0 + steady.elections.everyDays * D)
  })

  it('sells the Kombinat at auction only: no pressure, and nothing built until it’s yours', () => {
    const s = actFive()
    expect(kombinat(s).controller).toBe('state')
    const crew = s.crew.slice(0, 2).map((m) => m.id)
    expect(apply(s, { type: 'START_OP', opType: 'pressure', crewIds: crew, districtId: 'kombinat' }, T0, steady).error).toBe(
      'The state isn’t pressured: it sells at auction',
    )
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'palaceOfCulture', districtId: 'kombinat' }, T0, steady).error).toBe('Buy it at auction first')
    const bought = owned()
    expect(kombinat(bought).controller).toBe('player')
    expect(bought.clean).toBe(s.clean - steady.districts.list.kombinat.buyout)
    expect(apply(bought, { type: 'BUY_RACKET', racketType: 'palaceOfCulture', districtId: 'kombinat' }, T0, steady).error).toBeUndefined()
  })

  it('keeps its lots for the Combine and the media, and the Combine for its lots', () => {
    const s = owned()
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'kombinat' }, T0, steady).error).toMatch(/^Its lots are for/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'combine', districtId: 'centre' }, T0, steady).error).toBe('Only in Kombinat')
    const built = act(s, [{ type: 'BUY_RACKET', racketType: 'combine', districtId: 'kombinat' }], T0, steady)
    const d = derive(built, steady)
    // The Combine makes both products.
    expect(d.supply.madePerHr).toBeGreaterThanOrEqual(types.combine.makesPerHr!)
    expect(d.premium.madePerHr).toBeCloseTo(types.combine.premiumMakesPerHr!)
  })
})

describe('public opinion', () => {
  it('rises toward a target the media and the Fund push up, a step at each whole hour', () => {
    const s = act(owned(), [{ type: 'BUY_RACKET', racketType: 'newspaper', districtId: 'kombinat' }], T0, steady)
    const before = s.politics.opinion
    const target = opinionTarget(s, steady, T0)
    expect(target).toBeCloseTo(opinionTarget(actFive(), steady, T0) + types.newspaper.opinionPerTier!)
    const hour = Math.ceil(T0 / H) * H
    const r = reconcile(s, hour + 1, steady).state
    expect(r.politics.opinion).toBeCloseTo(before + (target - before) * steady.opinion.stepPerHr)
    // The Development Fund adds its share while it runs.
    const fund = act(r, [{ type: 'BUY_FRONT', frontType: 'developmentFund' }], hour + 1, steady)
    fund.fronts.find((f) => f.type === 'developmentFund')!.util = 0.5
    expect(opinionTarget(fund, steady, hour + 1)).toBeCloseTo(target + 0.5 * steady.fronts.types.developmentFund.opinionAtFullUtil!)
  })

  it('multiplies control, and pays the Construction Trust', () => {
    const s = act(owned(), [{ type: 'BUY_RACKET', racketType: 'constructionTrust', districtId: 'kombinat' }], T0, steady)
    s.politics.opinion = 0
    const low = derive(s, steady)
    s.politics.opinion = 100
    const high = derive(s, steady)
    expect(high.controlParts.opinionMult).toBeCloseTo(1 + steady.opinion.controlBonus)
    expect(high.control / low.control).toBeCloseTo(1 + steady.opinion.controlBonus)
    const i = s.rackets.findIndex((r) => r.type === 'constructionTrust')
    const [lo, hi] = types.constructionTrust.opinionYield!
    expect(high.perRacket[i].grossYield / low.perRacket[i].grossYield).toBeCloseTo(hi / lo)
  })
})

describe('the Ministry', () => {
  it('watches the size of the operation, less opinion and the Governor', () => {
    const s = owned()
    const d = derive(s, steady)
    const m = steady.ministry
    s.politics.opinion = 50
    expect(ministryTarget(s, steady, d)).toBeCloseTo(Math.max(0, Math.min(100, m.perYield * (d.yieldPerHr + d.tributePerHr) - m.opinionRelief * 0.5)))
  })

  it('freezes the front moving the most money at the peak, then thaws it', () => {
    const s = owned()
    s.politics.attention = steady.ministry.freezeAt + 5
    s.politics.opinion = 0
    const hour = Math.ceil(T0 / H) * H
    // Keep the attention up: a huge operation.
    const c = configWith({ ...steady, ministry: { perYield: 1 } })
    const r = reconcile(s, hour + 1, c)
    const frozen = r.state.fronts.find((f) => f.frozenUntil !== undefined)!
    const busiest = [...derive(s, c).perFront].sort((a, b) => b.throughput - a.throughput)[0]
    expect(frozen.id).toBe(busiest.id)
    expect(r.state.politics.attention).toBe(c.ministry.afterFreeze)
    expect(r.events.some((e) => e.type === 'FRONT_FROZEN' && e.frontId === frozen.id)).toBe(true)
    expect(derive(r.state, c).perFront.find((f) => f.id === frozen.id)!.throughput).toBe(0)
    expect(apply(r.state, { type: 'DEPOSIT', frontId: frozen.id, amount: 10 }, hour + 1, c).error).toBe('The Ministry has frozen it')
    const later = reconcile(r.state, frozen.frozenUntil! + 1, c)
    expect(later.state.fronts.find((f) => f.id === frozen.id)!.frozenUntil).toBeUndefined()
    expect(later.events.some((e) => e.type === 'FRONT_THAWED')).toBe(true)
  })

  it('lets only the mayor put the Governor on the payroll', () => {
    const s = owned()
    s.officialCooldownUntil = 0
    expect(apply(s, { type: 'BUY_OFFICIAL', officialId: 'governor' }, T0, steady).error).toBe('He only takes calls from the mayor')
    s.politics.mayor = true
    const gov = act(s, [{ type: 'BUY_OFFICIAL', officialId: 'governor' }], T0, steady)
    s.politics.opinion = 0
    gov.politics.opinion = 0
    expect(ministryTarget(s, steady)).toBeGreaterThan(ministryTarget(gov, steady))
  })
})

describe('elections', () => {
  it('sells campaign points for hours of yield or Influence, up to the cap', () => {
    const s = owned()
    const each = pointCost(s, steady, 'dirty')
    expect(each).toBe(Math.round(steady.elections.pointHoursOfYield * derive(s, steady).yieldPerHr))
    const after = act(s, [{ type: 'CAMPAIGN', points: 5, pay: 'dirty' }, { type: 'CAMPAIGN', points: 2, pay: 'influence' }], T0, steady)
    expect(after.politics.points).toBe(7)
    expect(after.dirty).toBeCloseTo(s.dirty - 5 * each)
    expect(after.influence).toBeCloseTo(s.influence - 2 * steady.elections.influencePerPoint)
    expect(voteShare(after, steady) - voteShare(s, steady)).toBeCloseTo(7 * steady.elections.perPoint)
    expect(apply(after, { type: 'CAMPAIGN', points: steady.elections.maxPoints, pay: 'dirty' }, T0, steady).error).toMatch(/can use \d+ more/)
  })

  it('counts at the boundary: a loss schedules the next and spends the points', () => {
    const s = owned()
    s.politics.opinion = 0
    expect(winChance(s, steady)).toBe(0)
    const at = s.politics.nextElectionAt
    const r = reconcile(act(s, [{ type: 'CAMPAIGN', points: 3, pay: 'dirty' }], T0, steady), at + 1, steady)
    const e = r.events.find((x) => x.type === 'ELECTION_HELD')
    expect(e && e.type === 'ELECTION_HELD' && e.won).toBe(false)
    expect(r.state.politics.points).toBe(0)
    expect(r.state.politics.nextElectionAt).toBe(at + steady.elections.everyDays * D)
    expect(r.state.stats.elections).toEqual({ held: 1, won: 0 })
  })

  it('makes a winner mayor for good: no tribute, bigger perks, more control, no more elections', () => {
    const s = owned()
    // A business on the Colonel's old road, now under someone else, to see tribute go.
    s.politics.opinion = 100
    s.politics.points = steady.elections.maxPoints
    // The count comes before opinion can drift back to its target.
    s.politics.nextElectionAt = T0 + 1000
    expect(winChance(s, steady)).toBe(1)
    const before = derive(s, steady)
    const r = reconcile(s, s.politics.nextElectionAt + 1, steady)
    expect(r.state.politics.mayor).toBe(true)
    expect(r.state.politics.nextElectionAt).toBe(0)
    const after = derive(r.state, steady)
    expect(after.tributePerHr).toBe(0)
    expect(after.controlParts.mayor).toBe(steady.elections.mayor.control)
    expect(after.control).toBeGreaterThan(before.control)
    expect(apply(r.state, { type: 'CAMPAIGN', points: 1, pay: 'dirty' }, s.politics.nextElectionAt + 1, steady).error).toBe('You’re already mayor')
  })

  it('amplifies district perks for the mayor', () => {
    const s = owned()
    const trust = act(s, [{ type: 'BUY_RACKET', racketType: 'constructionTrust', districtId: 'kombinat' }], T0, steady)
    const i = trust.rackets.findIndex((r) => r.type === 'constructionTrust')
    const m = steady.districts.list.kombinat.mod.yieldMult!.constructionTrust!
    expect(derive(trust, steady).perRacket[i].districtMult).toBeCloseTo(m)
    trust.politics.mayor = true
    expect(derive(trust, steady).perRacket[i].districtMult).toBeCloseTo(1 + (m - 1) * steady.elections.mayor.perkMult)
  })

  it('counts the same however the wait is split', () => {
    const s = owned()
    s.politics.opinion = 50
    s.politics.points = 20
    s.politics.nextElectionAt = T0 + Math.round(5.3 * H)
    const end = T0 + 9 * H
    const whole = reconcile(s, end, steady).state
    const split = reconcile(reconcile(s, T0 + Math.round(2.1 * H), steady).state, end, steady).state
    expect(whole.stats.elections.held).toBe(1)
    expect(split.politics).toEqual(whole.politics)
  })

  it('adds the votes a crew delivers to the campaign', () => {
    const s = owned()
    for (const m of s.crew) Object.assign(m, { muscle: 99, brains: 99, nerve: 99 })
    const started = act(s, [{ type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id }], T0, steady)
    for (const m of started.crew) Object.assign(m, { muscle: 99, brains: 99, nerve: 99 })
    const sent = act(started, [{ type: 'START_OP', opType: 'deliverVote', crewIds: started.crew.slice(0, 3).map((m) => m.id) }], T0, steady)
    const r = reconcile(sent, T0 + (steady.ops.list.deliverVote.minutes / 60) * H + 1, steady)
    expect(r.state.politics.points).toBe(steady.ops.list.deliverVote.votes)
  })

  it('opens Act VI on the mayor’s office and its Rep, and Debug can hold the count now', () => {
    const s = owned()
    s.reputation = steady.progression.acts[6].rep!
    s.politics.opinion = 100
    s.politics.points = steady.elections.maxPoints
    const r = act(s, [{ type: 'DEBUG_HOLD_ELECTION' }], T0, steady)
    expect(r.politics.mayor).toBe(true)
    expect(r.stats.actClearedAt[5]).toBe(T0)
    expect(r.act).toBe(6)
    expect(gameCleared(r, steady)).toBe(false)
  })
})
