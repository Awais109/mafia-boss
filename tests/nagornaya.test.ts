import { describe, expect, it } from 'vitest'
import { apply, caseFile, derive, formulas, gameCleared, hearingChance, reconcile, tryBuildConfig, type Config, type PlayerState } from '../engine'
import { act, fresh, H, T0 } from './helpers'

// Act VI, Nagornaya (ADR 0045): Legalize, the Holding, the reckoning's hearings, and the two endings.

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

// Act VI the ordinary way: the road and the importer, the Kombinat, and the election won.
function actSix(c: Config = steady): PlayerState {
  let s = act(fresh('nagornaya', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: c.progression.acts[6].rep! }], T0, c)
  s.clean = 20_000_000
  s.dirty = 2_000_000
  s.influence = 1000
  s = act(s, [{ type: 'BUY_DISTRICT', districtId: 'zastava' }, { type: 'BUY_FRONT', frontType: 'importExport' }, { type: 'BUY_DISTRICT', districtId: 'kombinat' }], T0, c)
  s.politics.opinion = 100
  s.politics.points = c.elections.maxPoints
  s = act(s, [{ type: 'DEBUG_HOLD_ELECTION' }], T0, c)
  s.tutorial.done = true
  return s
}

const earners = (s: PlayerState, c: Config = steady) => s.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises')

describe('Nagornaya', () => {
  it('opens Act VI with the hills already yours: there’s no one to buy them from', () => {
    const s = actSix()
    expect(s.act).toBe(6)
    expect(s.districts.find((d) => d.id === 'nagornaya')!.controller).toBe('player')
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'nagornaya' }, T0, steady).error).toMatch(/^Its lots are for/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'holding', districtId: 'nagornaya' }, T0, steady).error).toBeUndefined()
  })
})

describe('Legalize', () => {
  it('opens in Act VI, needs opinion, and not for premises', () => {
    const early = act(fresh('nagornaya', steady), [], T0, steady)
    const kiosk = early.rackets.find((r) => r.type === 'kiosk')!
    expect(apply(early, { type: 'LEGALIZE', racketId: kiosk.id }, T0, steady).error).toBe('Nothing can be made legal yet')
    const s = actSix()
    s.politics.opinion = steady.legalize.minOpinion - 1
    expect(apply(s, { type: 'LEGALIZE', racketId: kiosk.id }, T0, steady).error).toMatch(/^The city won’t stand for it/)
    s.politics.opinion = 100
    const factory = s.rackets.find((r) => r.type === 'tobaccoFactory')!
    expect(apply(s, { type: 'LEGALIZE', racketId: factory.id }, T0, steady).error).toBe('Premises have nothing to make legal')
  })

  it('costs hours of its tier yield in Clean, then earns Clean directly with no heat and no vault', () => {
    const s = actSix()
    const stall = s.rackets.find((r) => r.type === 'marketStall')!
    const i = s.rackets.indexOf(stall)
    const before = derive(s, steady)
    const cost = Math.round(steady.legalize.hoursOfYield * formulas.tierYield(steady, stall.type, stall.tier))
    const r = act(s, [{ type: 'LEGALIZE', racketId: stall.id }], T0, steady)
    expect(r.clean).toBeCloseTo(s.clean - cost)
    expect(r.reputation).toBeGreaterThan(s.reputation) // Clean spent earns Rep, like any purchase
    expect(apply(r, { type: 'LEGALIZE', racketId: stall.id }, T0, steady).error).toBe('Already legal')
    const d = derive(r, steady)
    expect(d.perRacket[i].yield).toBe(0)
    expect(d.perRacket[i].exposure).toBe(0)
    expect(d.perRacket[i].legalClean).toBeCloseTo(d.perRacket[i].grossYield * steady.legalize.cleanShare)
    expect(d.yieldPerHr).toBeCloseTo(before.yieldPerHr - before.perRacket[i].yield)
    // Clean accrues straight in.
    const later = reconcile(r, T0 + 30 * 60 * 1000, steady).state
    expect(later.stats.legalClean).toBeCloseTo(d.legalCleanPerHr * 0.5)
  })

  it('earns more with the Holding, a tenth a tier', () => {
    const s = act(actSix(), [{ type: 'BUY_RACKET', racketType: 'holding', districtId: 'nagornaya' }], T0, steady)
    const d = derive(s, steady)
    expect(d.holdingMult).toBeCloseTo(1 + steady.rackets.types.holding.legalBonusPerTier!)
  })
})

describe('the reckoning', () => {
  const always = configWith({ ...steady, reckoning: { base: 1 } })

  it('files a hearing at a day start while anything is illegal, harder to fight the fatter the file', () => {
    const s = actSix(always)
    s.stats.raids = 2
    s.stats.arrests = 1
    expect(caseFile(s, always)).toBe(2 * always.reckoning.perRaid + always.reckoning.perArrest + s.stats.frontsFrozen * always.reckoning.perFreeze)
    const nextDay = (Math.floor(T0 / D) + 1) * D
    const r = reconcile(s, nextDay + 1, always)
    const item = r.state.inbox.find((i) => i.ref === 'hearing')!
    expect(item).toBeDefined()
    expect(item.defaultOptionId).toBe('letRun')
    // It waits most of a day, so a player who visits once a day can answer it.
    expect(item.expiresAt - item.createdAt).toBe(always.incidents.types.hearing.hours! * H)
    const fight = item.options.find((o) => o.id === 'fight')!.effects.contest!
    expect(fight.diff).toBe(always.incidents.types.hearing.options.find((o) => o.id === 'fight')!.contest!.diff + Math.round(0.5 * caseFile(s, always)))
    expect(r.state.stats.hearings.held).toBe(1)
    // One at a time: while one waits, the next day files nothing.
    const slow = configWith({ ...always, incidents: { types: { hearing: { hours: 48 } } } })
    const waiting = reconcile(actSix(slow), nextDay + D + 1, slow).state
    expect(waiting.inbox.filter((i) => i.ref === 'hearing')).toHaveLength(1)
    expect(waiting.stats.hearings.held).toBe(1)
  })

  it('files nothing once everything is legal', () => {
    const s = actSix(always)
    for (const r of earners(s)) r.legal = true
    expect(hearingChance(s, always)).toBe(0)
  })

  it('costs the busiest front a day if left to run, Clean to settle, and counts a win in court', () => {
    const s = actSix(always)
    const nextDay = (Math.floor(T0 / D) + 1) * D
    const r = reconcile(s, nextDay + 1, always).state
    const item = r.inbox.find((i) => i.ref === 'hearing')!
    const ran = act(r, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'letRun' }], nextDay + 1, always)
    expect(ran.fronts.some((f) => f.frozenUntil !== undefined)).toBe(true)
    const settle = item.options.find((o) => o.id === 'settle')!.effects.clean!
    expect(settle).toBeLessThan(0)
    const settled = act(r, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'settle' }], nextDay + 1, always)
    expect(settled.clean).toBeCloseTo(r.clean + settle)
    // A sure win: the best Brains in the city.
    for (const m of r.crew) m.brains = 200
    const won = act(r, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'fight' }], nextDay + 1, always)
    expect(won.stats.hearings.won).toBe(1)
  })
})

describe('the endings', () => {
  it('reaches the Holding when every business is legal, which clears Act VI and the game carries on', () => {
    let s = actSix()
    const list = earners(s)
    for (const r of list.slice(0, -1)) s = act(s, [{ type: 'LEGALIZE', racketId: r.id }], T0, steady)
    expect(gameCleared(s, steady)).toBe(false)
    s = act(s, [{ type: 'LEGALIZE', racketId: list.at(-1)!.id }], T0, steady)
    expect(s.stats.endings.holding).toBe(T0)
    expect(s.stats.actClearedAt[6]).toBe(T0)
    expect(gameCleared(s, steady)).toBe(true)
    expect(s.log.filter((e) => e.type === 'ENDING_REACHED')).toHaveLength(1)
  })

  it('reaches the Empire with every district held and enough hearings won', () => {
    let s = actSix()
    for (const d of s.districts) if (d.controller !== 'player') s = act(s, [{ type: 'BUY_DISTRICT', districtId: d.id }], T0, steady)
    s.stats.hearings.won = steady.reckoning.empireWins - 1
    s = act(s, [{ type: 'DEBUG_GRANT', clean: 1 }], T0, steady)
    expect(s.stats.endings.empire).toBeUndefined()
    s.stats.hearings.won = steady.reckoning.empireWins
    s = act(s, [{ type: 'DEBUG_GRANT', clean: 1 }], T0, steady)
    expect(s.stats.endings.empire).toBe(T0)
    expect(gameCleared(s, steady)).toBe(true)
  })
})
