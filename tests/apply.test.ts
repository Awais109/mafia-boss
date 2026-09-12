import { describe, expect, it } from 'vitest'
import { apply, dayMs, derive, formulas, openLots, reconcile, tolyaIntervalHours, type Config, type GameEvent } from '../engine'
import { act, config, crewNamed, fresh, H, quiet, T0 } from './helpers'

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
    expect(s.reputation).toBeCloseTo(formulas.racketUpgradeCost(config, 'kiosk', 1) * config.reputation.perCleanSpent)
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
  it('crossing the Act II threshold unlocks the Restaurant and more crew slots', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 1000 }], T0)
    expect(apply(s, { type: 'BUY_FRONT', frontType: 'restaurant' }, T0, config).error).toBeDefined()
    s = act(s, [{ type: 'DEBUG_SET_REP', reputation: config.reputation.actThresholds[2] - 1 }, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' }], T0)
    expect(s.act).toBe(2)
    expect(s.stats.actClearedAt[1]).toBe(T0)
    s = act(s, [{ type: 'BUY_FRONT', frontType: 'restaurant' }], T0)
    expect(derive(s, config).crewSlots).toBe(4)
  })

  it('districts only host their own kind of business', () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 5000 }, { type: 'DEBUG_SET_REP', reputation: 900 }], T0)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'cargoBay', districtId: 'kioskRow' }, T0, config).error).toMatch(/fit/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'zarechye' }, T0, config).error).toMatch(/already/)
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
      [{ type: 'DEBUG_GRANT', influence: 50 }, { type: 'DEBUG_SET_REP', reputation: config.reputation.actThresholds[2] }, { type: 'BUY_OFFICIAL', officialId: 'wardCop' }],
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

describe('business kinds and premises lots', () => {
  it('premises go on free lots, one of each type per district', () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 5000 }, { type: 'DEBUG_SET_REP', reputation: 30 }], T0)
    // The starting factory already takes one of Zarechye's lots.
    expect(openLots(s, config, 'zarechye')).toBe(config.districts.list.zarechye.premisesLots - 1)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'zarechye' }, T0, config).error).toMatch(/already have one/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'zarechye' }, T0, config).error).toBeUndefined()
    const row = act(s, [{ type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'kioskRow' }], T0)
    expect(apply(row, { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'kioskRow' }, T0, config).error).toMatch(/No free lot/)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'portQuarter' }, T0, config).error).toMatch(/not open/)
  })

  it('a premises limited per city refuses a second one anywhere', () => {
    const c: Config = JSON.parse(JSON.stringify(config))
    c.rackets.types.warehouse.maxInCity = 1
    const s = act(
      fresh('city', c),
      [{ type: 'DEBUG_GRANT', clean: 5000 }, { type: 'DEBUG_SET_REP', reputation: 30 }, { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'zarechye' }],
      T0,
      c,
    )
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'stationSquare' }, T0, c).error).toMatch(/Only one in the city/)
  })

  it('premises earn nothing, take no enforcer, never specialize, and stop at their own max tier', () => {
    const c: Config = JSON.parse(JSON.stringify(config))
    c.rackets.premises.maxTier = 3
    let s = act(fresh('premises', c), [{ type: 'DEBUG_GRANT', clean: 5000 }], T0, c)
    const factory = s.rackets.find((r) => r.type === 'tobaccoFactory')!.id
    const fd = derive(s, c).perRacket.find((rd) => rd.id === factory)!
    expect(fd.yield).toBe(0)
    expect(fd.upkeep).toBeCloseTo(c.rackets.types.tobaccoFactory.upkeepPerHr!)
    expect(apply(s, { type: 'ASSIGN_ENFORCER', crewId: s.crew[0].id, racketId: factory }, T0, c).error).toMatch(/minding/)
    s = act(s, [{ type: 'UPGRADE_RACKET', racketId: factory }], T0, c)
    expect(apply(s, { type: 'UPGRADE_RACKET', racketId: factory, specialization: 'greed' }, T0, c).error).toMatch(/specialize/)
    s = act(s, [{ type: 'UPGRADE_RACKET', racketId: factory }], T0, c)
    expect(apply(s, { type: 'UPGRADE_RACKET', racketId: factory }, T0, c).error).toMatch(/max tier/)
    expect(derive(s, c).perRacket.find((rd) => rd.id === factory)!.packsPerHr).toBeCloseTo(formulas.factoryOutput(c, 'tobaccoFactory', 3))
  })

  it('upkeep accrues, settles after wages, and a short day wears the premises down', () => {
    const day = dayMs(quiet)
    const nextDay = Math.ceil(T0 / day) * day
    const s = act(fresh('upkeep', quiet), [{ type: 'DEBUG_GRANT', dirty: 1000 }], T0, quiet) // wages and upkeep both covered
    const upkeep = derive(s, quiet).upkeepPerHr
    const paid = reconcile(s, nextDay, quiet)
    expect(find(paid.events, 'UPKEEP_PAID')!.amount).toBeCloseTo((upkeep * (nextDay - T0)) / H)
    expect(paid.state.upkeepOwed).toBe(0)
    expect(paid.state.stats.upkeepPaid).toBeCloseTo((upkeep * (nextDay - T0)) / H)

    const broke = fresh('upkeep', quiet)
    broke.rackets = broke.rackets.filter((r) => r.type === 'tobaccoFactory') // nothing earns
    broke.crew = []
    broke.vault = 0
    const missed = reconcile(broke, nextDay, quiet)
    expect(find(missed.events, 'UPKEEP_MISSED')).toBeDefined()
    expect(missed.state.stats.missedUpkeep).toBe(1)
    expect(missed.state.rackets[0].condition).toBe(100 - quiet.rackets.premises.missedUpkeepConditionHit)
  })
})

describe('the bigger Act I', () => {
  it('Station Square hosts the new businesses and falls to three pressure jobs', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 5000 }, { type: 'DEBUG_SET_REP', reputation: 60 }], T0)
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'slotHall', districtId: 'stationSquare' }, T0, config).error).toBeUndefined()
    expect(apply(s, { type: 'BUY_RACKET', racketType: 'slotHall', districtId: 'zarechye' }, T0, config).error).toMatch(/fit/)
    for (const m of s.crew) Object.assign(m, { muscle: 95, nerve: 95 })
    let t = T0
    for (let i = 0; i < config.districts.pressureOpsToFlip; i++) {
      s = act(s, [{ type: 'START_OP', opType: 'pressure', crewIds: s.crew.map((m) => m.id), districtId: 'stationSquare' }], t)
      t += config.ops.list.pressure.minutes * 60_000
      s = reconcile(s, t, config).state
    }
    expect(s.districts.find((d) => d.id === 'stationSquare')!.controller).toBe('player')
  })

  it("Tolya's visits speed up with joints and rackets, not with premises", () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 5000 }, { type: 'DEBUG_SET_REP', reputation: 30 }], T0)
    const withPremises = act(
      s,
      [
        { type: 'BUY_RACKET', racketType: 'warehouse', districtId: 'zarechye' },
        { type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'kioskRow' },
        { type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'stationSquare' },
      ],
      T0,
    )
    expect(tolyaIntervalHours(withPremises, config)).toBe(config.rivals.tolya.tickHours)
    const spots = [
      { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'marketStall', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'beerTent', districtId: 'zarechye' },
      { type: 'BUY_RACKET', racketType: 'videoSalon', districtId: 'kioskRow' },
      { type: 'BUY_RACKET', racketType: 'beerTent', districtId: 'stationSquare' },
    ] as const
    const running = s.rackets.filter((r) => config.rackets.types[r.type].kind !== 'premises').length
    const busy = act(s, spots.slice(0, config.rivals.tolya.escalateAtRackets - running), T0)
    expect(tolyaIntervalHours(busy, config)).toBe(config.rivals.tolya.tickHoursEscalated)
  })
})

describe('tier-3 specialization', () => {
  it('the upgrade to tier 3 needs a choice, and no other upgrade takes one', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', clean: 5000 }], T0)
    const id = s.rackets[0].id
    expect(apply(s, { type: 'UPGRADE_RACKET', racketId: id, specialization: 'greed' }, T0, config).error).toMatch(/specialize/)
    s = act(s, [{ type: 'UPGRADE_RACKET', racketId: id }], T0)
    expect(apply(s, { type: 'UPGRADE_RACKET', racketId: id }, T0, config).error).toMatch(/greed or stealth/)
    const before = derive(s, config).perRacket[0]
    const spec = config.rackets.specialization
    const greed = derive(act(s, [{ type: 'UPGRADE_RACKET', racketId: id, specialization: 'greed' }], T0), config).perRacket[0]
    expect(greed.grossYield).toBeCloseTo(before.grossYield * config.rackets.tierYieldMult * spec.greed.yieldMult)
    expect(greed.exposure).toBeCloseTo(before.exposure * config.rackets.tierHeatMult * spec.greed.exposureMult)
    const stealth = derive(act(s, [{ type: 'UPGRADE_RACKET', racketId: id, specialization: 'stealth' }], T0), config).perRacket[0]
    expect(stealth.exposure).toBeGreaterThan(before.exposure) // never cooler than the tier below
  })
})

describe('front modes and capacity', () => {
  const withBuffer = () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 1000, clean: 1000 }], T0)
    const f = s.fronts[0].id
    return { s: act(s, [{ type: 'DEPOSIT', frontId: f, amount: 1 }, { type: 'DEPOSIT', frontId: f, amount: 200 }], T0), f }
  }
  const washedInAnHour = (s: ReturnType<typeof fresh>) => s.fronts[0].buffer - reconcile(s, T0 + H, config).state.fronts[0].buffer
  const tp = config.fronts.types.currencyKiosk.throughput

  it('push launders faster, lay low slower and without suspicion', () => {
    const { s, f } = withBuffer()
    expect(washedInAnHour(act(s, [{ type: 'SET_FRONT_MODE', frontId: f, mode: 'push' }], T0))).toBeCloseTo(tp * config.fronts.modes.push.throughputMult)
    const low = act(s, [{ type: 'SET_FRONT_MODE', frontId: f, mode: 'layLow' }], T0)
    expect(washedInAnHour(low)).toBeCloseTo(tp * config.fronts.modes.layLow.throughputMult)
    low.fronts[0].util = 1
    expect(derive(low, config).perFront[0].suspicion).toBe(0)
    expect(apply(s, { type: 'SET_FRONT_MODE', frontId: f, mode: 'normal' }, T0, config).error).toMatch(/Already/)
  })

  it('capacity raises throughput and the buffer with it', () => {
    const { s, f } = withBuffer()
    const fd = derive(act(s, [{ type: 'UPGRADE_FRONT', frontId: f, track: 'capacity' }], T0), config).perFront[0]
    expect(fd.throughput).toBeCloseTo(tp * (1 + config.fronts.upgrade.capacity.step))
    expect(fd.bufferCap).toBeCloseTo(fd.throughput * config.fronts.bufferHours)
    expect(fd.capacityLevel).toBe(1)
  })
})

describe('Tolya negotiation', () => {
  const withDemand = (nerve: number) => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 100 }], T0)
    s.rival.tolya.demand = 20
    for (const m of s.crew) m.nerve = nerve
    return s
  }

  it('a good talker pays the haggled price', () => {
    const s = act(withDemand(95), [{ type: 'PAY_TRIBUTE', choice: 'haggle' }], T0)
    expect(s.rival.tolya.demand).toBeNull()
    expect(s.dirty).toBe(100 - Math.round(20 * config.rivals.tolya.haggle.pricePct))
    expect(s.stats.haggles.won).toBe(1)
  })

  it('a poor one insults him once, and the demand stands', () => {
    const s = act(withDemand(5), [{ type: 'PAY_TRIBUTE', choice: 'haggle' }], T0)
    expect(s.rival.tolya.demand).toBe(20)
    expect(s.rival.tolya.disposition).toBe(config.rivals.tolya.haggle.dispositionOnInsult)
    expect(apply(s, { type: 'PAY_TRIBUTE', choice: 'haggle' }, T0, config).error).toMatch(/twice/)
    expect(act(s, [{ type: 'PAY_TRIBUTE' }], T0).rival.tolya.demand).toBeNull()
  })

  it('refusing breaks a business now', () => {
    const s = act(withDemand(40), [{ type: 'PAY_TRIBUTE', choice: 'refuse' }], T0)
    expect(s.rival.tolya.demand).toBeNull()
    expect(Math.min(...s.rackets.map((r) => r.condition))).toBe(100 - config.rivals.tolya.refuseConditionHit)
  })
})

describe('Tolya', () => {
  it('an unpaid demand is refused at the next tick and damages a racket', () => {
    const s = fresh()
    s.rival.tolya.demand = 10
    const r = reconcile(s, s.rival.tolya.nextTickAt, config)
    expect(find(r.events, 'TRIBUTE_REFUSED')).toBeDefined()
    expect(r.state.rival.tolya.disposition).toBe(-config.rivals.tolya.dispositionPerTribute)
    // Any business can take the hit, premises included.
    expect(Math.min(...r.state.rackets.map((x) => x.condition))).toBeLessThan(90)
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
