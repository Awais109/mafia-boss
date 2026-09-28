import { describe, expect, it } from 'vitest'
import { apply, derive, formulas, reconcile, type PlayerState } from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Act III, the Centre (ADR 0041): tier 6 and its second choice, the Print Shop's investigator, Capo perks,
// and the act's official and job.

const types = config.rackets.types

function actThree(): PlayerState {
  const s = act(fresh('centre'), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: types.printShop.unlockRep }], T0)
  s.clean = 500_000
  s.dirty = 50_000
  return s
}

// A business taken to tier 5 the ordinary way, choosing greed at tier 3.
function atTierFive(s: PlayerState, type: 'kiosk' | 'tobaccoFactory'): PlayerState {
  const id = s.rackets.find((r) => r.type === type)!.id
  let out = s
  for (let tier = out.rackets.find((r) => r.id === id)!.tier; tier < 5; tier++) {
    const spec = tier + 1 === config.rackets.specialization.atTier && type !== 'tobaccoFactory' ? 'greed' : undefined
    out = act(out, [{ type: 'UPGRADE_RACKET', racketId: id, ...(spec ? { specialization: spec } : {}) }], T0)
  }
  return out
}

describe('the Centre', () => {
  it('asks for a second greed-or-stealth choice on the way to tier 6, and multiplies again', () => {
    const s = atTierFive(actThree(), 'kiosk')
    const k = s.rackets.find((r) => r.type === 'kiosk')!
    expect(apply(s, { type: 'UPGRADE_RACKET', racketId: k.id }, T0, config).error).toBe('Pick greed or stealth')
    const before = derive(s, config).perRacket[s.rackets.indexOf(k)]
    const after = act(s, [{ type: 'UPGRADE_RACKET', racketId: k.id, specialization: 'greed' }], T0)
    const k6 = after.rackets.find((r) => r.id === k.id)!
    expect(k6.tier).toBe(6)
    expect(k6.specialization).toBe('greed')
    expect(k6.specialization6).toBe('greed')
    const rd = derive(after, config).perRacket[after.rackets.indexOf(k6)]
    const g = config.rackets.specialization6.greed
    expect(rd.grossYield / before.grossYield).toBeCloseTo(config.rackets.tierYieldMult * g.yieldMult)
    expect(rd.exposure / before.exposure).toBeCloseTo(config.rackets.tierHeatMult * g.exposureMult)
  })

  it('keeps premises at their own max tier, even in Act III', () => {
    const s = atTierFive(actThree(), 'tobaccoFactory')
    const f = s.rackets.find((r) => r.type === 'tobaccoFactory')!
    expect(apply(s, { type: 'UPGRADE_RACKET', racketId: f.id }, T0, config).error).toBe('Already at max tier')
  })

  it('sends an investigator to the Print Shop: shut it for a day, or pay three hours of takings', () => {
    let s = act(actThree(), [{ type: 'BUY_RACKET', racketType: 'printShop', districtId: 'centre' }, { type: 'DEBUG_FORCE_INCIDENT', incidentType: 'investigation' }], T0)
    const shop = s.rackets.find((r) => r.type === 'printShop')!
    const item = s.inbox.find((i) => i.ref === 'investigation')!
    expect(item.racketId).toBe(shop.id)
    expect(item.options.find((o) => o.id === 'pay')!.effects.dirty).toBe(-Math.round(3 * derive(s, config).yieldPerHr))
    s = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'shut' }], T0)
    const i = s.rackets.findIndex((r) => r.id === shop.id)
    expect(s.rackets[i].closedUntil).toBe(T0 + 24 * H)
    const d = derive(s, config)
    expect(d.perRacket[i].yield).toBe(0)
    expect(d.perRacket[i].exposure).toBe(0)
    const open = reconcile(s, T0 + 24 * H, config)
    expect(open.state.rackets[i].closedUntil).toBeUndefined()
    expect(open.events.some((e) => e.type === 'RACKET_REOPENED')).toBe(true)
    expect(derive(open.state, config).perRacket[i].yield).toBeGreaterThan(0)
  })

  it('files a perk choice at Capo as well as Soldier and Made', () => {
    // One stat point short of Capo, with the XP for it banked: the next whole hour spends it.
    const s = actThree()
    const m = s.crew[0]
    m.potential = { muscle: 100, brains: 100, nerve: 100 }
    m.gained = config.crew.experience.ranks.capo - 1
    m.rank = 2
    m.xp.muscle = formulas.statPointCost(config, m.muscle)
    const after = reconcile(s, T0 + H, config).state
    expect(after.crew[0].rank).toBe(3)
    expect(after.inbox.filter((i) => i.kind === 'perk' && i.ref === m.id)).toHaveLength(1)
  })

  it('opens City Hall and the Big Score in Act III', () => {
    const s = actThree()
    expect(derive(s, config).unlocked.official.cityHall).toBe(true)
    const two = act(fresh('centre'), [{ type: 'DEBUG_COMPLETE_GOALS' }], T0)
    expect(derive(two, config).unlocked.official.cityHall).toBe(false)
    expect(config.ops.list.bigScore.crew).toBe(3)
    expect(config.ops.list.bigScore.act).toBe(3)
  })
})
