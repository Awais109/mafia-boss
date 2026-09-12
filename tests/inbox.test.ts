import { describe, expect, it } from 'vitest'
import { apply, buildConfig, reconcile, type GameEvent } from '../engine'
import { act, config, crewNamed, fresh, H, T0 } from './helpers'

const find = <K extends GameEvent['type']>(events: GameEvent[], type: K) =>
  events.find((e): e is Extract<GameEvent, { type: K }> => e.type === type)

describe('crew reports', () => {
  it('a finished job files a report with its options baked in', () => {
    const s = act(fresh(), [{ type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(fresh(), 'Vitya').id] }], T0)
    const r = reconcile(s, T0 + 15 * 60_000, config)
    const resolved = find(r.events, 'OP_RESOLVED')!
    const filed = find(r.events, 'REPORT_FILED')!
    expect(filed.opId).toBe(resolved.opId)
    const item = r.state.inbox.find((i) => i.id === filed.itemId)!
    const choices = config.ops.reports.byOutcome[resolved.outcome]
    expect(item.kind).toBe('report')
    expect(item.options.map((o) => o.id)).toEqual(choices.map((ch) => ch.id))
    expect(item.defaultOptionId).toBe(choices.find((ch) => ch.default)!.id)
    expect(item.expiresAt).toBe(resolved.t + config.inbox.reportHours * H)
    choices.forEach((ch, i) => {
      const dirty = Math.round((ch.dirtyPct ?? 0) * resolved.dirty) + (ch.dirtyPerAct ?? 0) * s.act
      expect(item.options[i].effects.dirty ?? 0).toBe(dirty)
    })
  })
})

describe('incidents', () => {
  it('answering applies the option and removes the item', () => {
    let s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 100 }, { type: 'DEBUG_FORCE_INCIDENT', incidentType: 'copFavour' }], T0)
    const item = s.inbox[0]
    expect(item.kind).toBe('incident')
    const influence = s.influence
    s = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'doIt' }], T0)
    expect(s.dirty).toBe(100 - 15)
    expect(s.influence).toBe(influence + 1)
    expect(s.inbox).toHaveLength(0)
    expect(s.stats.inbox.resolved).toBe(1)
    expect(s.stats.inboxDirty).toBe(-15)
  })

  it("can't pick an option you can't cover", () => {
    const s = act(fresh(), [{ type: 'DEBUG_FORCE_INCIDENT', incidentType: 'copFavour' }], T0)
    expect(apply(s, { type: 'RESOLVE_INBOX', itemId: s.inbox[0].id, optionId: 'doIt' }, T0, config).error).toMatch(/cover/)
  })

  it('an unanswered item takes its default when it expires', () => {
    const base = fresh()
    const s = act(base, [{ type: 'DEBUG_FORCE_INCIDENT', incidentType: 'copFavour' }], T0)
    const item = s.inbox[0]
    const withIncident = reconcile(s, item.expiresAt, config)
    const without = reconcile(base, item.expiresAt, config)
    const auto = find(withIncident.events, 'INBOX_RESOLVED')!
    expect(auto).toMatchObject({ auto: true, optionId: 'refuse' })
    expect(withIncident.state.inbox).toHaveLength(0)
    expect(withIncident.state.heat - without.state.heat).toBeCloseTo(2)
  })

  it('never rolls during the tutorial', () => {
    const s = fresh()
    const r = reconcile(s, T0 + 60 * H, buildConfig('default', { 'incidents.chancePerHr': 1 }))
    expect(find(r.events, 'INCIDENT_RAISED')).toBeUndefined()
  })

  it('rolls only at whole hours and never above maxPending', () => {
    const c = buildConfig('default', { 'incidents.chancePerHr': 1 })
    const s = fresh()
    s.tutorial.done = true
    const r = reconcile(s, T0 + 30 * H, c)
    const raised = r.events.filter((e) => e.type === 'INCIDENT_RAISED')
    expect(raised.length).toBeGreaterThan(0)
    for (const e of raised) expect(e.t % H).toBe(0)
    expect(raised[0].t).toBeGreaterThanOrEqual(T0 + c.incidents.startAfterHours * H)
    expect(r.state.inbox.filter((i) => i.kind === 'incident').length).toBeLessThanOrEqual(c.inbox.maxPending)
  })
})
