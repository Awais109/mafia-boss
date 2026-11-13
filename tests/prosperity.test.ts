import { describe, expect, it } from 'vitest'
import { apply, derive, frontBlocked, prosperityTarget, prosperityYieldMult, reconcile, type PlayerState } from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Prosperity (ADR 0041): from Act III each district has a prosperity from 0 to 100, stepped toward a
// target at whole hours. Joints earn with it; the Card Club and the Bank need it.

const p = config.prosperity
const types = config.rackets.types

// A game in Act III with money to spend and every Act III business unlocked.
function actThree(): PlayerState {
  const s = act(fresh('prosperity'), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: types.printShop.unlockRep }], T0)
  s.clean = 200_000
  s.dirty = 10_000
  return s
}

const district = (s: PlayerState, id: string) => s.districts.find((d) => d.id === id)!
const hourAfter = (t: number) => (Math.floor(t / H) + 1) * H

describe('prosperity', () => {
  it('stays still before Act III, and joints earn as they always did', () => {
    const s = fresh('prosperity')
    const r = reconcile(s, T0 + 5 * H, config)
    expect(r.state.districts.every((d) => d.prosperity === p.base)).toBe(true)
    expect(derive(r.state, config).perRacket.every((rd) => rd.prosperityMult === 1)).toBe(true)
  })

  it('aims for the base plus what each business adds, minus the city-wide penalties', () => {
    const s = actThree()
    // The quick start put a Kiosk, a Market Stall and the Tobacco Factory in Zarechye.
    const expected = p.base + types.kiosk.prosperity! + types.marketStall.prosperity! + types.tobaccoFactory.prosperity!
    expect(prosperityTarget(s, config, 'zarechye', T0)).toBeCloseTo(expected)
    s.inspected = true
    s.stockEmpty = true
    s.raidPenaltyUntil = T0 + H
    expect(prosperityTarget(s, config, 'zarechye', T0)).toBeCloseTo(expected - p.inspectedPenalty - p.shortagePenalty - p.raidPenalty)
    // The raid penalty lapses.
    expect(prosperityTarget(s, config, 'zarechye', T0 + 2 * H)).toBeCloseTo(expected - p.inspectedPenalty - p.shortagePenalty)
  })

  it('steps a share of the gap at each whole hour, and never in between', () => {
    const s = actThree()
    district(s, 'zarechye').prosperity = 20
    const hour = hourAfter(T0)
    const before = reconcile(s, hour - 1, config).state
    expect(district(before, 'zarechye').prosperity).toBe(20)
    const after = reconcile(s, hour, config).state
    const target = prosperityTarget(before, config, 'zarechye', hour)
    expect(district(after, 'zarechye').prosperity).toBeCloseTo(20 + (target - 20) * p.stepPerHr)
  })

  it('moves joints’ income with their street, and leaves rackets alone', () => {
    const s = act(actThree(), [{ type: 'BUY_RACKET', racketType: 'videoSalon', districtId: 'kioskRow' }], T0)
    const kiosk = s.rackets.findIndex((r) => r.type === 'kiosk')
    const salon = s.rackets.findIndex((r) => r.type === 'videoSalon')
    district(s, 'zarechye').prosperity = 100
    district(s, 'kioskRow').prosperity = 0
    const d = derive(s, config)
    expect(d.perRacket[kiosk].prosperityMult).toBeCloseTo(p.yieldMult[1])
    expect(d.perRacket[salon].prosperityMult).toBe(1)
    district(s, 'zarechye').prosperity = 50
    expect(derive(s, config).perRacket[kiosk].prosperityMult).toBeCloseTo(prosperityYieldMult(config, 50))
  })

  it('opens the Card Club only on a street prosperous enough, and a hotel gets it there', () => {
    let s = actThree()
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'cardClub', districtId: 'centre' }, T0, config).error).toMatch(/prosperity/)
    s = act(s, [{ type: 'BUY_RACKET', racketType: 'hotel', districtId: 'centre' }], T0)
    expect(prosperityTarget(s, config, 'centre', T0)).toBeCloseTo(p.base + types.hotel.prosperityPerTier!)
    district(s, 'centre').prosperity = types.cardClub.minProsperity!
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'cardClub', districtId: 'centre' }, T0, config).error).toBeUndefined()
  })

  it('lets a hotel lift every joint on its street', () => {
    const s = act(actThree(), [{ type: 'BUY_RACKET', racketType: 'hotel', districtId: 'zarechye' }], T0)
    const kiosk = s.rackets.findIndex((r) => r.type === 'kiosk')
    const mult = config.rackets.synergies.find((x) => x.id === 'hotelJoints')!.effect.yieldMult!
    expect(derive(s, config).perRacket[kiosk].synergyMult).toBeCloseTo(mult * 1.15) // beside the factory too
  })

  it('opens the Bank only in a prosperous city', () => {
    const s = actThree()
    expect(frontBlocked(s, config, 'cooperativeBank')).toMatch(/prosperity/)
    for (const d of s.districts) d.prosperity = config.fronts.types.cooperativeBank.minProsperity!
    expect(frontBlocked(s, config, 'cooperativeBank')).toBeNull()
    expect(act(s, [{ type: 'BUY_FRONT', frontType: 'cooperativeBank' }], T0).fronts.some((f) => f.type === 'cooperativeBank')).toBe(true)
  })

  it('remembers a raid for a day', () => {
    const s = act(actThree(), [{ type: 'DEBUG_FORCE_RAID' }], T0)
    expect(s.raidPenaltyUntil).toBe(T0 + p.raidPenaltyHours * H)
  })
})
