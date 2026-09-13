import { describe, expect, it } from 'vitest'
import { apply, derive, nextWholeHour, reconcile, type GameEvent } from '../engine'
import { act, fresh, H, quiet, T0 } from './helpers'

// The tobacco chain (ADR 0032): stock moves with exact clamps, the shortage flag flips only on the
// hour, a shortage feeds joints beside a factory first, and smuggling lands packs up to the cap.

const find = <K extends GameEvent['type']>(events: GameEvent[], type: K) =>
  events.find((e): e is Extract<GameEvent, { type: K }> => e.type === type)

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('cigarette stock', () => {
  it('starts with the starting stock, and the factory makes more than the joints sell', () => {
    const s = fresh('supply', quiet)
    const sup = derive(s, quiet).supply
    const types = quiet.rackets.types
    expect(sup.stock).toBe(quiet.supply.startingStock)
    expect(sup.cap).toBe(quiet.supply.baseCap)
    expect(sup.madePerHr).toBeCloseTo(types.tobaccoFactory.makesPerHr!)
    expect(sup.demandPerHr).toBeCloseTo(types.kiosk.sellsPerHr! + types.marketStall.sellsPerHr!)
  })

  it('fills to its cap at the exact instant, then wastes what it can’t hold', () => {
    // Dirty on hand, so midnight's wages and upkeep are paid and the factory keeps its condition.
    const s = act(fresh('supply', quiet), [{ type: 'DEBUG_GRANT', dirty: 1000 }], T0, quiet)
    s.inventory.cigarettes = 10
    const sup = derive(s, quiet).supply
    const hours = (sup.cap - sup.stock) / (sup.madePerHr - sup.demandPerHr)
    const end = T0 + Math.ceil(hours + 3) * H
    const r = reconcile(s, end, quiet)
    expect(Math.abs(find(r.events, 'STOCK_CAPPED')!.t - (T0 + hours * H))).toBeLessThanOrEqual(1)
    expect(r.state.inventory.cigarettes).toBeCloseTo(sup.cap)
    expect(r.state.stats.packsLostToCap).toBeCloseTo((sup.madePerHr - sup.demandPerHr) * ((end - T0) / H - hours))
  })

  it('runs out at the exact instant, and joints go short only from the next whole hour', () => {
    const s = fresh('supply', quiet)
    s.rackets = s.rackets.filter((r) => r.type !== 'tobaccoFactory')
    s.inventory.cigarettes = 3
    const full = derive(s, quiet)
    const outAt = T0 + (3 / full.supply.demandPerHr) * H
    const hour = nextWholeHour(quiet, outAt)
    const soon = reconcile(s, Math.ceil(outAt) + 60_000, quiet)
    expect(Math.ceil(outAt) + 60_000).toBeLessThan(hour)
    expect(Math.abs(find(soon.events, 'STOCK_OUT')!.t - outAt)).toBeLessThanOrEqual(1)
    expect(soon.state.stockEmpty).toBe(false)
    const atHour = reconcile(s, hour, quiet)
    expect(find(atHour.events, 'SHORTAGE_STARTED')).toBeDefined()
    expect(atHour.state.stockEmpty).toBe(true)
    // No factory at all: each joint keeps only the trade that doesn't need cigarettes.
    derive(atHour.state, quiet).perRacket.forEach((rd, i) => {
      const share = quiet.rackets.types[atHour.state.rackets[i].type].cigaretteShare ?? 0
      expect(rd.grossYield).toBeCloseTo(full.perRacket[i].grossYield * (1 - share))
    })
    expect(atHour.state.stats.shortageHours).toBe(1)
  })

  it('in a shortage, joints beside a factory are served first and the rest share what’s left', () => {
    const s = act(
      fresh('supply', quiet),
      [
        { type: 'DEBUG_GRANT', clean: 1000 },
        { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'kioskRow' },
        { type: 'BUY_RACKET', racketType: 'marketStall', districtId: 'kioskRow' },
      ],
      T0,
      quiet,
    )
    s.inventory.cigarettes = 0
    s.stockEmpty = true
    const d = derive(s, quiet)
    const inDistrict = (id: string) => d.perRacket.filter((rd, i) => s.rackets[i].districtId === id && rd.kind === 'joint')
    const first = inDistrict('zarechye')
    const rest = inDistrict('kioskRow')
    expect(first.every((rd) => rd.served === 1)).toBe(true)
    const left = d.supply.madePerHr - sum(first.map((rd) => rd.packsPerHr))
    for (const rd of rest) expect(rd.served).toBeCloseTo(left / sum(rest.map((x) => x.packsPerHr)))
    expect(first[0].synergyMult).toBeCloseTo(quiet.rackets.synergies.find((x) => x.id === 'factoryJoints')!.effect.yieldMult!)
  })

  it('a cap below the stock wastes production while sales bring it down', () => {
    const s = fresh('supply', quiet)
    s.inventory.cigarettes = 80
    const sup = derive(s, quiet).supply
    const r = reconcile(s, T0 + 5 * H, quiet)
    expect(r.state.inventory.cigarettes).toBeCloseTo(80 - sup.demandPerHr * 5)
    expect(r.state.stats.packsLostToCap).toBeCloseTo(sup.madePerHr * 5)
    expect(r.state.stats.packsSold).toBeCloseTo(sup.demandPerHr * 5)
  })
})

describe('smuggling', () => {
  it('costs Clean without Rep, gets harder with heat, and lands its packs up to the cap', () => {
    const job = quiet.ops.list.smuggleCigarettes
    let s = act(fresh('smuggle', quiet), [{ type: 'DEBUG_GRANT', clean: 100 }, { type: 'DEBUG_SET_HEAT', heat: 50 }], T0, quiet)
    for (const m of s.crew) Object.assign(m, { nerve: 95, brains: 95 })
    s.inventory.cigarettes = 20
    const clean = s.clean
    const rep = s.reputation
    s = act(s, [{ type: 'START_OP', opType: 'smuggleCigarettes', crewIds: s.crew.map((m) => m.id) }], T0, quiet)
    expect(s.clean).toBe(clean - job.costClean!)
    expect(s.reputation).toBe(rep)
    expect(s.stats.smugglingPaid).toBe(job.costClean)
    expect(s.ops[0].cfg!.diff).toBe(job.diff + Math.round(job.heatDiffPerPoint! * 50))

    const sup = derive(s, quiet).supply
    const r = reconcile(s, s.ops[0].completesAt, quiet)
    const resolved = find(r.events, 'OP_RESOLVED')!
    expect(resolved.outcome).toBe('full')
    const before = 20 + (sup.madePerHr - sup.demandPerHr) * (job.minutes / 60)
    expect(resolved.cigarettes).toBeCloseTo(quiet.supply.baseCap - before)
    expect(r.state.inventory.cigarettes).toBeCloseTo(quiet.supply.baseCap)
    expect(r.state.stats.packsLostToCap).toBeCloseTo(job.cigarettes! - resolved.cigarettes!)
  })

  it('needs the Clean up front', () => {
    const s = fresh('smuggle', quiet)
    s.clean = 10
    const error = apply(s, { type: 'START_OP', opType: 'smuggleCigarettes', crewIds: s.crew.map((m) => m.id) }, T0, quiet).error
    expect(error).toMatch(/Clean/)
  })
})
