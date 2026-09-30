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
  delete s.goals
  delete s.rival.zhanna
  delete s.raidPenaltyUntil
  delete s.loan
  delete s.lending
  for (const k of ['loans', 'lending', 'injuries', 'attacks', 'contests']) delete s.stats[k]
  delete s.premiumEmpty
  delete s.rival.colonel
  delete s.politics
  delete s.story
  for (const k of ['elections', 'campaignPaid', 'frontsFrozen', 'legalized', 'legalClean', 'hearings', 'endings']) delete s.stats[k]
  for (const k of ['premiumMade', 'premiumSold', 'premiumLostToCap', 'premiumShortageHours', 'convoys', 'passagesPaid']) delete s.stats[k]
  s.districts = s.districts
    .filter((d: { id: string }) => !['stationSquare', 'centre', 'zastava', 'kombinat', 'nagornaya'].includes(d.id))
    .map(({ prosperity: _, ...d }: { prosperity: number }) => d)
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
    expect(m.goals).toEqual({ done: [] })
    // A save caught in the old tutorial can't resume the new opening.
    expect(m.tutorial.done).toBe(true)
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
    expect(m.districts.find((d) => d.id === 'stationSquare')).toEqual({ id: 'stationSquare', controller: 'none', pressureCount: 0, prosperity: config.prosperity.base })
  })

  it('opens Act III\'s credit with nothing owed or lent, and zeroed counters', () => {
    const m = migrate(asV1())
    expect(m.loan).toBeNull()
    expect(m.lending).toBeNull()
    expect(m.stats.loans).toEqual({ borrowed: 0, interest: 0, repaid: 0, missed: 0, seized: 0 })
    expect(m.stats.contests).toEqual({ won: 0, lost: 0 })
  })

  it('starts the story’s seen-list where the save stands, so its past counts as seen (ADR 0049)', () => {
    const m = migrate(asV1())
    expect(m.story).toEqual({ seen: [], since: { act: m.act, step: m.tutorial.step, done: m.tutorial.done } })
  })

  it('puts Nagornaya on the map, nobody’s until Act VI, with nothing legal and no ending', () => {
    const m = migrate(asV1())
    expect(m.districts.find((d) => d.id === 'nagornaya')).toEqual({ id: 'nagornaya', controller: 'none', pressureCount: 0, prosperity: config.prosperity.base })
    expect(m.rackets.some((r) => r.legal)).toBe(false)
    expect(m.stats.hearings).toEqual({ held: 0, won: 0 })
    expect(m.stats.endings).toEqual({})
  })

  it('puts the Kombinat on the map, still the state’s, with opinion at its base and no election yet', () => {
    const m = migrate(asV1())
    expect(m.districts.find((d) => d.id === 'kombinat')).toEqual({ id: 'kombinat', controller: 'state', pressureCount: 0, prosperity: config.prosperity.base })
    expect(m.politics).toEqual({ opinion: config.opinion.base, attention: 0, nextElectionAt: 0, elections: 0, points: 0, mayor: false })
    expect(m.stats.elections).toEqual({ held: 0, won: 0 })
    expect(m.stats.frontsFrozen).toBe(0)
  })

  it('puts Zastava on the map under the Colonel, with no premium stock and no passage', () => {
    const m = migrate(asV1())
    expect(m.districts.find((d) => d.id === 'zastava')).toEqual({ id: 'zastava', controller: 'colonel', pressureCount: 0, prosperity: config.prosperity.base })
    expect(m.inventory.premium).toBe(config.premium.startingStock)
    expect(m.premiumEmpty).toBe(false)
    expect(m.rival.colonel).toEqual({ disposition: 0, passageUntil: 0, passagesBought: 0 })
    expect(m.stats.convoys).toEqual({ run: 0, landed: 0, hijacked: 0, seized: 0 })
  })

  it('gives every district a prosperity and puts the Centre on the map', () => {
    const m = migrate(asV1())
    expect(m.districts.every((d) => d.prosperity === config.prosperity.base)).toBe(true)
    expect(m.districts.find((d) => d.id === 'centre')).toEqual({ id: 'centre', controller: 'none', pressureCount: 0, prosperity: config.prosperity.base })
    expect(m.raidPenaltyUntil).toBe(0)
  })

  it('turns an old "Act II cleared" into the road to Act III', () => {
    // Before six acts, clearing Act II ended the prototype. Now it's a door: the old date goes, and Act III
    // opens at its own gate, dated when it does.
    const v8 = { ...JSON.parse(JSON.stringify(fresh())), schemaVersion: 8, act: 2, reputation: 700 }
    v8.stats.actClearedAt = { 1: v8.updatedAt - 5 * H, 2: v8.updatedAt - H }
    const m = migrate(v8)
    expect(m.stats.actClearedAt).toEqual({ 1: v8.updatedAt - 5 * H })
    m.reputation = config.progression.acts[3].rep!
    const r = reconcile(m, m.updatedAt + H, config)
    expect(r.state.act).toBe(3)
    expect(r.state.stats.actClearedAt[2]).toBeGreaterThan(v8.updatedAt)
  })

  it("opens Zhanna's trade with her first lot ready", () => {
    const m = migrate(asV1())
    expect(m.rival.zhanna).toEqual({ disposition: 0, nextShipmentAt: m.updatedAt, shipmentsBought: 0, surplusToday: { day: 0, packs: 0 } })
  })

  it('hands an old save the starting gold', () => {
    const m = migrate(asV1())
    expect(m.gold).toBe(config.gold.starting)
    expect(m.skippedMs).toBe(0)
    expect(m.stats.gold.granted).toBe(config.gold.starting)
  })

  it('drops the retired actII goal from an old save, keeping everything else it finished', () => {
    const v7 = { ...JSON.parse(JSON.stringify(fresh())), schemaVersion: 7, goals: { done: ['wardCop', 'actII', 'soldier'] } }
    const m = migrate(v7)
    expect(m.goals.done).toEqual(['wardCop', 'soldier'])
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
