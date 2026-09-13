import { describe, expect, it } from 'vitest'
import { apply, formulas, type PlayerState } from '../engine'
import { act, config, crewNamed, fresh, H, T0 } from './helpers'

// Zhanna (ADR 0036): lots of cigarettes for Dirty, cheaper as she warms to you; a buyer for the surplus up
// to a daily limit; and smuggling past her Port is harder while she holds it.

const z = config.rivals.zhanna

// A game in Act II with money to trade.
function inActII(): PlayerState {
  const s = act(fresh('zhanna'), [{ type: 'DEBUG_SET_REP', reputation: config.reputation.actThresholds[2] }], T0)
  s.dirty = 1000
  s.clean = 1000
  return s
}

const crew = (s: PlayerState) => [crewNamed(s, 'Vitya').id, crewNamed(s, 'Dima').id]

describe('Zhanna', () => {
  it('prices a lot by her mood, with a markup while she is hostile', () => {
    expect(formulas.shipmentPrice(config, 0)).toBe(z.shipment.basePrice)
    expect(formulas.shipmentPrice(config, 100)).toBeLessThan(z.shipment.basePrice)
    expect(formulas.shipmentPrice(config, 1000)).toBe(Math.round(z.shipment.basePrice * z.shipment.priceClamp[0]))
    const atLine = formulas.shipmentPrice(config, z.hostileBelow)
    const hostile = formulas.shipmentPrice(config, z.hostileBelow - 1)
    expect(hostile).toBeGreaterThan(atLine * (z.shipment.hostileMarkup - 0.1))
  })

  it('sells a lot only from Act II, once per cooldown, into stock', () => {
    const early = fresh('zhanna')
    early.dirty = 1000
    expect(apply(early, { type: 'BUY_SHIPMENT' }, T0, config).error).toMatch(/Act II/)
    let s = inActII()
    s.inventory.cigarettes = 0
    const price = formulas.shipmentPrice(config, s.rival.zhanna.disposition)
    s = act(s, [{ type: 'BUY_SHIPMENT' }], T0)
    expect(s.dirty).toBe(1000 - price)
    expect(s.inventory.cigarettes).toBe(z.shipment.cigarettes)
    expect(s.rival.zhanna.disposition).toBe(z.dispositionPerShipment)
    expect(s.stats.shipmentsPaid).toBe(price)
    expect(apply(s, { type: 'BUY_SHIPMENT' }, T0 + H, config).error).toMatch(/next lot/)
    expect(apply(s, { type: 'BUY_SHIPMENT' }, T0 + z.shipment.cooldownHours * H, config).error).toBeUndefined()
  })

  it('buys the surplus up to a daily limit, warming a little per ten packs', () => {
    let s = inActII()
    s.inventory.cigarettes = 100
    s = act(s, [{ type: 'SELL_SURPLUS', packs: 20 }], T0)
    expect(s.dirty).toBe(1000 + 20 * z.surplus.pricePerPack)
    expect(s.inventory.cigarettes).toBe(80)
    expect(s.stats.surplusSold).toBe(20 * z.surplus.pricePerPack)
    expect(s.rival.zhanna.disposition).toBe(2 * z.surplus.dispositionPer10)
    expect(apply(s, { type: 'SELL_SURPLUS', packs: z.surplus.maxPerDay }, T0, config).error).toMatch(/more today/)
    const tomorrow = (Math.floor(T0 / (24 * H)) + 1) * 24 * H + H
    expect(apply(s, { type: 'SELL_SURPLUS', packs: z.surplus.maxPerDay }, tomorrow, config).error).toBeUndefined()
  })

  it('makes smuggling harder while she holds the Port, and sours with every run', () => {
    const job = config.ops.list.smuggleCigarettes
    const early = fresh('zhanna')
    early.heat = 0
    expect(act(early, [{ type: 'START_OP', opType: 'smuggleCigarettes', crewIds: crew(early) }], T0).ops[0].cfg!.diff).toBe(job.diff)
    const s = inActII()
    s.heat = 0
    const held = act(s, [{ type: 'START_OP', opType: 'smuggleCigarettes', crewIds: crew(s) }], T0)
    expect(held.ops[0].cfg!.diff).toBe(job.diff + z.seizureDiff)
    expect(held.rival.zhanna.disposition).toBe(z.dispositionPerSmuggle)
    s.districts.find((d) => d.id === 'portQuarter')!.controller = 'player'
    expect(act(s, [{ type: 'START_OP', opType: 'smuggleCigarettes', crewIds: crew(s) }], T0).ops[0].cfg!.diff).toBe(job.diff)
  })

  it('taking her Port sours her', () => {
    const s = act(inActII(), [{ type: 'BUY_DISTRICT', districtId: 'portQuarter' }], T0)
    expect(s.rival.zhanna.disposition).toBe(z.dispositionOnBuyout)
  })
})
