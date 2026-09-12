import { describe, expect, it } from 'vitest'
import { migrate, reconcile, SCHEMA_VERSION } from '../engine'
import { config, fresh, H } from './helpers'

// Saves from earlier builds must load and keep playing (ADR 0007; one step per schema version).

function asV1(): Record<string, unknown> {
  const s = JSON.parse(JSON.stringify(fresh())) as Record<string, unknown>
  delete s.inbox
  delete s.offers
  delete s.ledger
  const stats = s.stats as Record<string, unknown>
  for (const k of ['opsByType', 'jobDirty', 'offerDirty', 'inboxDirty', 'wagesPaid', 'repairsPaid', 'bribesPaid', 'trainingPaid', 'upkeepPaid', 'smugglingPaid', 'shipmentsPaid', 'surplusSold', 'inbox']) {
    delete stats[k]
  }
  stats.sessions = 3
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
