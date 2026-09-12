import { describe, expect, it } from 'vitest'
import { apply, derive, reconcile, type GameEvent } from '../engine'
import { act, config, crewNamed, fresh, H, T0 } from './helpers'

const find = <K extends GameEvent['type']>(events: GameEvent[], type: K) =>
  events.find((e): e is Extract<GameEvent, { type: K }> => e.type === type)

describe('first session', () => {
  it('collect → deposit converts instantly → spend → op → heat', () => {
    let s = fresh()
    expect(s.vault).toBe(30)
    s = act(s, [{ type: 'COLLECT' }], T0)
    expect(s.dirty).toBe(30)
    expect(s.vault).toBe(0)
    s = act(s, [{ type: 'DEPOSIT', frontId: s.fronts[0].id, amount: 30 }], T0)
    expect(s.clean).toBeCloseTo(60 + 30 * 0.55)
    expect(s.fronts[0].buffer).toBe(0)
    s = act(s, [{ type: 'UPGRADE_RACKET', racketId: s.rackets[0].id }], T0)
    expect(s.rackets[0].tier).toBe(2)
    expect(s.reputation).toBeCloseTo(3.6)
    s = act(s, [{ type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(s, 'Vitya').id] }], T0)
    expect(s.tutorial.step).toBe(4)
    s = act(s, [{ type: 'TUTORIAL_ADVANCE' }], T0)
    expect(s.tutorial.done).toBe(true)
  })
})

describe('fronts', () => {
  it('buffers after the first conversion and launders at throughput', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 300 }], T0)
    const f = s.fronts[0].id
    s = act(s, [{ type: 'DEPOSIT', frontId: f, amount: 1 }, { type: 'DEPOSIT', frontId: f, amount: 250 }], T0)
    expect(apply(s, { type: 'DEPOSIT', frontId: f, amount: 1 }, T0, config).error).toMatch(/buffer/)
    const later = reconcile(s, T0 + 2 * H, config).state
    expect(later.fronts[0].buffer).toBeCloseTo(200)
    expect(later.clean - s.clean).toBeCloseTo(50 * 0.55)
  })
})

describe('reputation and acts', () => {
  it('crossing the Act II threshold unlocks the Restaurant and two more crew slots', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 1000 }], T0)
    expect(apply(s, { type: 'BUY_FRONT', frontType: 'restaurant' }, T0, config).error).toBeDefined()
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: 79 }, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' }], T0)
    expect(s.act).toBe(2)
    expect(s.stats.actClearedAt[1]).toBe(T0)
    s = act(s, [{ type: 'BUY_FRONT', frontType: 'restaurant' }], T0)
    expect(derive(s, config).crewSlots).toBe(4)
  })

  it('districts only host their own kind of business', () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 5000 }, { type: 'DEBUG_SET_REP', reputation: 900 }], T0)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'cargoBay', districtId: 'kioskRow' }, T0, config).error).toMatch(/fit/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'zarechye' }, T0, config).error).toMatch(/slot/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'cargoBay', districtId: 'portQuarter' }, T0, config).error).toBeUndefined()
  })
})

describe('ops', () => {
  it('take their crew, resolve at completion, and give them back', () => {
    let s = fresh()
    const vitya = crewNamed(s, 'Vitya').id
    s = act(s, [{ type: 'START_OP', opType: 'shakeDown', crewIds: [vitya] }], T0)
    expect(crewNamed(s, 'Vitya').status).toBe('on_op')
    expect(apply(s, { type: 'START_OP', opType: 'collectDebt', crewIds: [vitya] }, T0, config).error).toBeDefined()
    const r = reconcile(s, T0 + 15 * 60_000, config)
    const resolved = find(r.events, 'OP_RESOLVED')
    expect(resolved).toBeDefined()
    expect(crewNamed(r.state, 'Vitya').status).toBe('idle')
    expect(r.state.dirty).toBe(resolved!.dirty)
  })

  it('three successful pressure ops flip a district and end its tribute', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 500 }, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' }], T0)
    expect(derive(s, config).tributePerHr).toBeGreaterThan(0)
    for (const m of s.crew) Object.assign(m, { muscle: 95, nerve: 95 })
    let t = T0
    for (let i = 0; i < 3; i++) {
      s = act(s, [{ type: 'START_OP', opType: 'pressure', crewIds: s.crew.map((m) => m.id), districtId: 'kioskRow' }], t)
      t += config.ops.list.pressure.minutes * 60_000
      s = reconcile(s, t, config).state
    }
    expect(s.districts.find((d) => d.id === 'kioskRow')!.controller).toBe('player')
    expect(derive(s, config).tributePerHr).toBe(0)
    expect(s.rival.tolya.disposition).toBe(3 * config.rivals.tolya.dispositionPerPressure + config.rivals.tolya.dispositionOnFlip)
  })
})

describe('heat', () => {
  it('a bribe adds control for its duration, then expires', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 100 }], T0)
    const before = derive(s, config)
    s = act(s, [{ type: 'BRIBE' }], T0)
    expect(derive(s, config).control).toBeCloseTo(before.control * (1 + config.heat.bribe.controlPct))
    expect(apply(s, { type: 'BRIBE' }, T0 + H, config).error).toBeDefined()
    const after = reconcile(s, T0 + 7 * H, config)
    expect(find(after.events, 'BRIBE_EXPIRED')).toBeDefined()
    expect(derive(after.state, config).control).toBeCloseTo(before.control)
  })

  it('converges toward the target', () => {
    const s = fresh()
    const target = derive(s, config).heatTarget
    const later = reconcile(s, T0 + 24 * H, config).state
    expect(Math.abs(later.heat - target)).toBeLessThan(Math.abs(s.heat - target) * 0.15)
  })

  it('officials share a purchase cooldown', () => {
    const s = act(
      fresh(),
      [{ type: 'DEBUG_GRANT', influence: 50 }, { type: 'DEBUG_SET_REP', reputation: 80 }, { type: 'BUY_OFFICIAL', officialId: 'wardCop' }],
      T0,
    )
    expect(apply(s, { type: 'BUY_OFFICIAL', officialId: 'precinctCaptain' }, T0 + 24 * H, config).error).toMatch(/soon/)
    expect(apply(s, { type: 'BUY_OFFICIAL', officialId: 'precinctCaptain' }, T0 + 73 * H, config).error).toBeUndefined()
  })
})

describe('crew', () => {
  it('a missed wage day costs everyone loyalty', () => {
    const s = fresh()
    s.rackets = []
    s.vault = 0
    const r = reconcile(s, T0 + 24 * H, config)
    expect(find(r.events, 'WAGES_MISSED')).toBeDefined()
    expect(r.state.stats.missedWages).toBe(1)
    expect(crewNamed(r.state, 'Vitya').loyalty).toBe(70 + config.crew.loyalty.perMissedWageDay + config.crew.loyalty.driftPerDay)
  })

  it("won't fire family", () => {
    const s = fresh()
    expect(apply(s, { type: 'FIRE', crewId: crewNamed(s, 'Dima').id }, T0, config).error).toMatch(/family/)
    expect(apply(s, { type: 'FIRE', crewId: crewNamed(s, 'Vitya').id }, T0, config).error).toBeUndefined()
  })

  it('an enforcer raises yield and lowers exposure on their racket', () => {
    const s = fresh()
    const before = derive(s, config).perRacket[0]
    const after = derive(act(s, [{ type: 'ASSIGN_ENFORCER', crewId: crewNamed(s, 'Vitya').id, racketId: s.rackets[0].id }], T0), config).perRacket[0]
    expect(after.yield).toBeCloseTo(before.yield * config.rackets.enforcer.yieldMult)
    expect(after.exposure).toBeCloseTo(before.exposure * config.rackets.enforcer.heatMult)
  })
})

describe('Tolya', () => {
  it('an unpaid demand is refused at the next tick and damages a racket', () => {
    const s = fresh()
    s.rival.tolya.demand = 10
    const r = reconcile(s, s.rival.tolya.nextTickAt, config)
    expect(find(r.events, 'TRIBUTE_REFUSED')).toBeDefined()
    expect(r.state.rival.tolya.disposition).toBe(-config.rivals.tolya.dispositionPerTribute)
    expect(r.state.rackets[0].condition).toBeLessThan(90)
  })

  it('paying clears the demand and improves disposition', () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 50 }], T0)
    s.rival.tolya.demand = 10
    const paid = act(s, [{ type: 'PAY_TRIBUTE' }], T0)
    expect(paid.rival.tolya.demand).toBeNull()
    expect(paid.dirty).toBe(40)
    expect(paid.rival.tolya.disposition).toBe(config.rivals.tolya.dispositionPerTribute)
  })
})
