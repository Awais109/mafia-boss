import { describe, expect, it } from 'vitest'
import { migrate, reconcile, SCHEMA_VERSION } from '../engine'
import { config, fresh, H } from './helpers'

// Saves from earlier builds must load and keep playing (ADR 0007; one step per schema version).

const V2_STATS = ['opsByType', 'jobDirty', 'offerDirty', 'inboxDirty', 'wagesPaid', 'repairsPaid', 'bribesPaid', 'trainingPaid', 'upkeepPaid', 'smugglingPaid', 'shipmentsPaid', 'surplusSold', 'inbox']
const V3_STATS = ['specializations', 'frontModeChanges', 'haggles', 'statPointsGained']
const V4_STATS = ['missedUpkeep', 'packsMade', 'packsSold', 'packsLostToCap', 'shortageHours']
const V5_STATS = ['gold']
const PROGRESS = ['xp', 'potential', 'gained', 'rank', 'perks']

// A fresh save stripped back to the schema 1 shape.
function asV1(): Record<string, unknown> {
  const s = JSON.parse(JSON.stringify(fresh())) as Record<string, any>
  delete s.inbox
  delete s.offers
  delete s.ledger
  for (const k of [...V2_STATS, ...V3_STATS, ...V4_STATS, ...V5_STATS]) delete s.stats[k]
  for (const m of [...s.crew, ...s.recruitPool.candidates]) for (const k of PROGRESS) delete m[k]
  for (const f of s.fronts) {
    delete f.mode
    delete f.capacityLevel
  }
  delete s.rival.tolya.haggledTick
  delete s.inventory
  delete s.stockEmpty
  delete s.upkeepOwed
  delete s.gold
  delete s.skippedMs
  s.districts = s.districts.filter((d: { id: string }) => d.id !== 'stationSquare')
  s.rackets = s.rackets.filter((r: { type: string }) => r.type === 'kiosk' || r.type === 'marketStall')
  s.stats.sessions = 3
  return { ...s, schemaVersion: 1 }
}

describe('migrate', () => {
  it('brings a schema 1 save up to the current schema', () => {
    const m = migrate(asV1())
    expect(m.schemaVersion).toBe(SCHEMA_VERSION)
    expect(m.inbox).toEqual([])
    expect(m.offers.items).toEqual([])
    expect(m.ledger).toHaveLength(1)
    expect(m.stats.sessions).toBe(3)
    expect(m.stats.jobDirty).toBe(0)
    expect(m.stats.inbox).toEqual({ filed: 0, resolved: 0, auto: 0 })
    expect(m.stats.haggles).toEqual({ won: 0, lost: 0 })
    expect(m.stats.packsMade).toBe(0)
  })

  it('gives existing crew room to grow and fronts the default dial', () => {
    const m = migrate(asV1())
    for (const member of [...m.crew, ...m.recruitPool.candidates]) {
      expect(member.xp).toEqual({ muscle: 0, brains: 0, nerve: 0 })
      expect(member.potential.muscle).toBe(Math.min(100, member.muscle + 10))
      expect(member.rank).toBe(0)
      expect(member.perks).toEqual([])
    }
    expect(m.fronts.every((f) => f.mode === 'normal' && f.capacityLevel === 0)).toBe(true)
    expect(m.rival.tolya.haggledTick).toBeNull()
  })

  it('stocks the tobacco chain and opens Station Square', () => {
    const m = migrate(asV1())
    expect(m.inventory.cigarettes).toBe(config.supply.startingStock)
    expect(m.stockEmpty).toBe(false)
    expect(m.upkeepOwed).toBe(0)
    expect(m.districts.find((d) => d.id === 'stationSquare')).toEqual({ id: 'stationSquare', controller: 'none', pressureCount: 0 })
  })

  it('hands an old save the starting gold', () => {
    const m = migrate(asV1())
    expect(m.gold).toBe(config.gold.starting)
    expect(m.skippedMs).toBe(0)
    expect(m.stats.gold.granted).toBe(config.gold.starting)
  })

  it('a migrated save keeps playing: the board fills on the next catch-up', () => {
    const m = migrate(asV1())
    const r = reconcile(m, m.updatedAt + H, config)
    expect(r.state.offers.items).toHaveLength(config.offers.count)
  })

  it('refuses a save from a newer build', () => {
    expect(() => migrate({ ...fresh(), schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/newer/)
  })
})
