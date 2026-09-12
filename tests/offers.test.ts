import { describe, expect, it } from 'vitest'
import { apply, reconcile, type GameEvent } from '../engine'
import { act, config, fresh, H } from './helpers'

const refresh = config.offers.refreshHours * H

describe('opportunities board', () => {
  it('a new game opens with a full board that expires at the first refresh', () => {
    const s = fresh()
    expect(s.offers.items).toHaveLength(config.offers.count)
    for (const o of s.offers.items) {
      expect(o.expiresAt).toBe(s.offers.refreshAt)
      expect(o.cfg.diff).toBeGreaterThanOrEqual(config.ops.list[o.opType].diff)
    }
  })

  it('refreshes on schedule, including through a long gap', () => {
    const s = fresh()
    const first = s.offers.refreshAt
    const r = reconcile(s, first + 2 * refresh + H, config)
    expect(r.state.offers.refreshCount).toBe(3)
    expect(r.state.offers.refreshAt).toBe(first + 3 * refresh)
    expect(r.events.filter((e) => e.type === 'OFFERS_REFRESHED')).toHaveLength(3)
  })

  it('taking an offer uses its own terms, even after the board refreshes', () => {
    const s0 = fresh()
    const late = s0.offers.refreshAt - 10 * 60_000
    let s = reconcile(s0, late, config).state
    const offer = s.offers.items[0]
    const crew = s.crew.slice(0, offer.cfg.crew).map((m) => m.id)
    s = act(s, [{ type: 'START_OP', opType: offer.opType, crewIds: crew, offerId: offer.id }], late)
    expect(s.offers.items.some((o) => o.id === offer.id)).toBe(false)
    const op = s.ops[0]
    expect(op.completesAt).toBe(late + offer.cfg.minutes * 60_000)
    const r = reconcile(s, late + offer.cfg.minutes * 60_000, config)
    const resolved = r.events.find((e): e is Extract<GameEvent, { type: 'OP_RESOLVED' }> => e.type === 'OP_RESOLVED')!
    expect(r.state.offers.refreshCount).toBe(1)
    expect(resolved.diff).toBe(offer.cfg.diff)
    expect(resolved.name).toBe(offer.name)
    expect(resolved.offerId).toBe(offer.id)
  })

  it('an offer that has been replaced is gone', () => {
    const s = fresh()
    const old = s.offers.items[0]
    const later = reconcile(s, s.offers.refreshAt + 1, config).state
    const crew = later.crew.slice(0, old.cfg.crew).map((m) => m.id)
    expect(apply(later, { type: 'START_OP', opType: old.opType, crewIds: crew, offerId: old.id }, later.updatedAt, config).error).toMatch(/gone/)
  })
})
