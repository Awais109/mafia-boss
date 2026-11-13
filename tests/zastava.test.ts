import { describe, expect, it } from 'vitest'
import {
  apply,
  convoyLoad,
  customsChance,
  derive,
  formulas,
  hijackChance,
  passageCost,
  reconcile,
  tryBuildConfig,
  type Config,
  type PlayerState,
} from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// Act IV, Zastava (ADR 0043): premium imported cigarettes, a stock no factory makes; convoys that bring them
// past the Colonel's men and the customs post; passage; the bonded warehouse and convoy depot; the importer.

const configWith = (overlay: object) => {
  const { config: c, errors } = tryBuildConfig({ missions: { enabled: false }, ...overlay } as never)
  if (errors.length) throw new Error(errors.join('\n'))
  return c
}

// No luck in jobs, no wear, and nothing from Tolya to muddy the numbers.
const steady = configWith({ ops: { noise: 0 }, rackets: { conditionDecayPerDay: 0 }, rivals: { tolya: { pConditionHit: 0, pTribute: 0, attack: { chance: 0, chanceNoTurf: 0, chanceHostile: 0 } } } })
const types = config.rackets.types

// Act IV with money, Rep for every Act IV business and three strong crew.
function actFour(c: Config = steady): PlayerState {
  let s = act(fresh('zastava', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: types.fuelDepot.unlockRep }], T0, c)
  s.clean = 1_000_000
  s.dirty = 100_000
  s = act(s, [{ type: 'RECRUIT', candidateId: s.recruitPool.candidates[0].id }], T0, c)
  for (const m of s.crew) Object.assign(m, { muscle: 95, brains: 95, nerve: 95, loyalty: 100 })
  s.tutorial.done = true
  return s
}

// Sends a convoy with the first three crew and lets it come home.
function runConvoy(s: PlayerState, c: Config = steady) {
  const started = act(s, [{ type: 'START_OP', opType: 'runConvoy', crewIds: s.crew.slice(0, 3).map((m) => m.id) }], T0, c)
  const done = reconcile(started, T0 + (c.ops.list.runConvoy.minutes / 60) * H + 1, c)
  const e = done.events.find((x) => x.type === 'OP_RESOLVED')
  if (!e || e.type !== 'OP_RESOLVED') throw new Error('the convoy never came back')
  return { before: started, s: done.state, e }
}

const zastava = (s: PlayerState) => s.districts.find((d) => d.id === 'zastava')!

describe('premium and convoys', () => {
  it('opens in Act IV: no premium lots, passage or convoys before', () => {
    const s = act(fresh('zastava', steady), [{ type: 'DEBUG_COMPLETE_GOALS' }], T0, steady)
    s.dirty = 100_000
    expect(apply(s, { type: 'BUY_SHIPMENT', product: 'premium' }, T0, steady).error).toBe('She sells premium from Act IV')
    expect(apply(s, { type: 'BUY_PASSAGE' }, T0, steady).error).toBe('Nobody runs the road yet')
    expect(actFour().act).toBe(4)
    expect(zastava(actFour()).controller).toBe('colonel')
  })

  it('lands a convoy’s load in premium stock, paid in Clean with no Rep, when the road is clear', () => {
    const c = configWith({ ops: { noise: 0 }, convoys: { hijackChance: 0, customsBase: 0, customsPerHeat: 0 } })
    const s = actFour(c)
    const { before, s: after, e } = runConvoy(s, c)
    expect(before.clean).toBe(s.clean - c.ops.list.runConvoy.costClean!)
    expect(before.reputation).toBe(s.reputation)
    expect(e.outcome).toBe('full')
    expect(e.premium).toBe(c.ops.list.runConvoy.premium)
    expect(after.inventory.premium).toBe(c.ops.list.runConvoy.premium)
    expect(after.stats.convoys).toEqual({ run: 1, landed: 1, hijacked: 0, seized: 0 })
  })

  it('loses the convoy on the Colonel’s road unless passage is paid, and customs can still take it', () => {
    const always = configWith({ ops: { noise: 0 }, convoys: { hijackChance: 1, customsBase: 0, customsPerHeat: 0 } })
    const taken = runConvoy(actFour(always), always)
    expect(taken.e.hijacked).toBe(true)
    expect(taken.s.inventory.premium).toBe(0)

    const paid = act(actFour(always), [{ type: 'BUY_PASSAGE' }], T0, always)
    expect(hijackChance(paid, always, T0)).toBe(0)
    expect(runConvoy(paid, always).e.hijacked).toBeUndefined()

    const customs = configWith({ ops: { noise: 0 }, convoys: { hijackChance: 0, customsBase: 1 } })
    const seized = runConvoy(actFour(customs), customs)
    expect(seized.e.seized).toBe(true)
    expect(seized.s.stats.convoys.seized).toBe(1)
  })

  it('rolls the road once per convoy, the same however the wait is split', () => {
    const c = configWith({ ops: { noise: 0 }, convoys: { hijackChance: 0.5, customsBase: 0.3 } })
    const started = act(actFour(c), [{ type: 'START_OP', opType: 'runConvoy', crewIds: actFour(c).crew.slice(0, 3).map((m) => m.id) }], T0, c)
    const end = T0 + 7 * H
    const whole = reconcile(started, end, c).state
    const split = reconcile(reconcile(started, T0 + 2.5 * H, c).state, end, c).state
    expect(split.inventory.premium).toBe(whole.inventory.premium)
    expect(split.stats.convoys).toEqual(whole.stats.convoys)
  })

  it('charges hours of Dirty yield for a day’s passage, warms the Colonel, and stacks', () => {
    const s = actFour()
    const cost = passageCost(s, steady)
    expect(cost).toBe(Math.round(steady.rivals.colonel.passage.hoursOfYield * derive(s, steady).yieldPerHr))
    const once = act(s, [{ type: 'BUY_PASSAGE' }], T0, steady)
    expect(once.dirty).toBeCloseTo(s.dirty - cost)
    expect(once.rival.colonel.passageUntil).toBe(T0 + steady.rivals.colonel.passage.hours * H)
    expect(once.rival.colonel.disposition).toBe(steady.rivals.colonel.dispositionPerPassage)
    const twice = act(once, [{ type: 'BUY_PASSAGE' }], T0, steady)
    expect(twice.rival.colonel.passageUntil).toBe(T0 + 2 * steady.rivals.colonel.passage.hours * H)
  })

  it('frees the road when Zastava is yours, and sours the Colonel for it', () => {
    const s = act(actFour(), [{ type: 'BUY_DISTRICT', districtId: 'zastava' }], T0, steady)
    expect(zastava(s).controller).toBe('player')
    expect(s.rival.colonel.disposition).toBe(steady.rivals.colonel.dispositionOnBuyout)
    expect(hijackChance(s, steady, T0)).toBe(0)
    expect(apply(s, { type: 'BUY_PASSAGE' }, T0, steady).error).toBe('The road is yours')
  })

  it('makes customs likelier with heat, and less likely with the Customs Chief or a bonded warehouse in Zastava', () => {
    const s = actFour()
    s.heat = 30
    const cv = steady.convoys
    expect(customsChance(s, steady)).toBeCloseTo(cv.customsBase + cv.customsPerHeat * 30)
    const chief = structuredClone(s)
    chief.officials.push('customsChief')
    expect(customsChance(chief, steady)).toBeCloseTo((cv.customsBase + cv.customsPerHeat * 30) * steady.officials.list.customsChief.seizureMult!)
    const elsewhere = act(s, [{ type: 'BUY_RACKET', racketType: 'bondedWarehouse', districtId: 'zarechye' }], T0, steady)
    expect(customsChance(elsewhere, steady)).toBeCloseTo(customsChance(s, steady))
    const there = act(s, [{ type: 'BUY_RACKET', racketType: 'bondedWarehouse', districtId: 'zastava' }], T0, steady)
    expect(customsChance(there, steady)).toBeCloseTo(customsChance(s, steady) * types.bondedWarehouse.seizureMult!)
    expect(derive(there, steady).premium.cap).toBe(steady.premium.baseCap + types.bondedWarehouse.premiumCapPerTier!)
  })

  it('adds a convoy depot’s bonus to every load and cuts what the road takes', () => {
    const s = actFour()
    const cfg = steady.ops.list.runConvoy
    expect(convoyLoad(s, steady, cfg)).toBe(cfg.premium)
    const withDepot = act(s, [{ type: 'BUY_RACKET', racketType: 'convoyDepot', districtId: 'zarechye' }], T0, steady)
    expect(convoyLoad(withDepot, steady, cfg)).toBeCloseTo(cfg.premium! * (1 + types.convoyDepot.convoyBonusPerTier!))
    expect(hijackChance(withDepot, steady, T0)).toBeCloseTo(steady.convoys.hijackChance * types.convoyDepot.hijackMult!)
  })
})

describe('premium joints and the importer', () => {
  // A Motel on the road with some premium stock.
  function withMotel(): PlayerState {
    const s = act(actFour(), [{ type: 'BUY_RACKET', racketType: 'motel', districtId: 'zastava' }], T0, steady)
    s.inventory.premium = 10
    return s
  }

  it('sells premium from its own stock, and loses that share of its trade when the stock runs out', () => {
    const s = withMotel()
    const d = derive(s, steady)
    const i = s.rackets.findIndex((r) => r.type === 'motel')
    expect(d.premium.demandPerHr).toBeCloseTo(formulas.premiumSales(steady, 'motel', 1))
    expect(d.perRacket[i].premiumServed).toBe(1)
    const full = d.perRacket[i].yield

    // Stock runs out at the exact instant, and the joint goes short at the next whole hour.
    const hours = 10 / d.premium.demandPerHr
    const r = reconcile(s, T0 + Math.ceil(hours + 1) * H, steady)
    const out = r.events.find((e) => e.type === 'STOCK_OUT')
    expect(out && out.type === 'STOCK_OUT' && out.product).toBe('premium')
    expect(Math.abs(out!.t - (T0 + hours * H))).toBeLessThanOrEqual(1)
    expect(r.state.premiumEmpty).toBe(true)
    const short = derive(r.state, steady).perRacket[i]
    expect(short.premiumServed).toBe(0)
    // Against the same moment with stock on the shelf: only the premium share is gone.
    const stocked = derive({ ...r.state, premiumEmpty: false }, steady).perRacket[i]
    expect(full).toBeGreaterThan(0)
    expect(short.yield / stocked.yield).toBeCloseTo(1 - types.motel.premiumShare!)
  })

  it('launders through the Import–Export Company only as much as premium sales explain', () => {
    const s = withMotel()
    const opened = act(s, [{ type: 'BUY_FRONT', frontType: 'importExport' }], T0, steady)
    const d = derive(opened, steady)
    const f = d.perFront.find((x) => x.type === 'importExport')!
    expect(f.throughput).toBeCloseTo(d.premium.soldPerHr * steady.fronts.types.importExport.coverPerPremiumPack!)
    opened.premiumEmpty = true
    opened.inventory.premium = 0
    expect(derive(opened, steady).perFront.find((x) => x.type === 'importExport')!.throughput).toBe(0)
  })

  it('sells Zhanna’s premium lots at her price times the markup, on her one cooldown', () => {
    const s = actFour()
    const price = formulas.shipmentPrice(steady, s.rival.zhanna.disposition) * steady.rivals.zhanna.premium.priceMult
    const bought = act(s, [{ type: 'BUY_SHIPMENT', product: 'premium' }], T0, steady)
    expect(bought.inventory.premium).toBe(steady.rivals.zhanna.premium.packs)
    expect(bought.dirty).toBeCloseTo(s.dirty - price)
    expect(apply(bought, { type: 'BUY_SHIPMENT' }, T0, steady).error).toBeTruthy()
  })
})
