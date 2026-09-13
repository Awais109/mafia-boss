import { describe, expect, it } from 'vitest'
import { apply, formulas, jobXp, nextWholeHour, reconcile } from '../engine'
import { act, config, crewNamed, fresh, H, T0 } from './helpers'

// Crew grow with work (ADR 0030): XP by job weights and outcome, stat points at a cost, ceilings,
// ranks with perk choices, training, and enforcers learning on the hour.

const x = config.crew.experience

describe('crew experience', () => {
  it('a job splits XP by its weights and outcome', () => {
    const v = crewNamed(fresh(), 'Vitya')
    const xp = jobXp(config, config.ops.list.shakeDown, 'partial', v, [v])
    const total = x.xpByBand.quick * x.outcomeMult.partial
    expect(xp.muscle).toBeCloseTo(total * 0.7)
    expect(xp.nerve).toBeCloseTo(total * 0.3)
    expect(xp.brains).toBeUndefined()
  })

  it('the lower-ranked member of a team earns the mentor bonus', () => {
    const [a, b] = fresh().crew
    b.rank = 1
    const cfg = config.ops.list.leanOnWard
    expect(jobXp(config, cfg, 'full', a, [a, b]).brains! / jobXp(config, cfg, 'full', b, [a, b]).brains!).toBeCloseTo(1 + x.mentorBonus)
  })

  it('training costs Dirty, pays XP, and raises a stat when XP covers the cost', () => {
    let s = fresh()
    s.dirty = 200
    const id = crewNamed(s, 'Vitya').id
    const train = config.ops.list.trainMuscle
    s = act(s, [{ type: 'START_OP', opType: 'trainMuscle', crewIds: [id] }], T0)
    expect(s.dirty).toBe(200 - train.costDirty! * s.act)
    s = reconcile(s, T0 + (train.minutes / 60) * H, config).state
    expect(crewNamed(s, 'Vitya').muscle).toBe(48)
    expect(crewNamed(s, 'Vitya').xp.muscle).toBeCloseTo(train.xp!)
    const t2 = T0 + (train.minutes / 60) * H
    s = act(s, [{ type: 'START_OP', opType: 'trainMuscle', crewIds: [id] }], t2)
    s = reconcile(s, t2 + (train.minutes / 60) * H, config).state
    const v = crewNamed(s, 'Vitya')
    expect(v.muscle).toBe(49)
    expect(v.xp.muscle).toBeCloseTo(2 * train.xp! - formulas.statPointCost(config, 48))
    expect(s.stats.opOutcomes).toEqual({ full: 0, partial: 0, fail: 0 })
    expect(s.inbox.some((i) => i.kind === 'report')).toBe(false)
  })

  it('a stat stops at its ceiling', () => {
    const s = fresh()
    const m = s.crew[0]
    m.muscle = m.potential.muscle
    m.xp.muscle = 50
    const later = reconcile(s, nextWholeHour(config, T0), config).state
    expect(later.crew[0].muscle).toBe(m.potential.muscle)
    expect(later.crew[0].xp.muscle).toBe(0)
  })

  it('a promotion files a perk choice, and choosing it adds the perk', () => {
    const s = fresh()
    const m = s.crew[0]
    m.gained = x.ranks.soldier - 1
    m.xp.muscle = formulas.statPointCost(config, m.muscle)
    const hour = nextWholeHour(config, T0)
    let later = reconcile(s, hour, config).state
    expect(later.crew[0].rank).toBe(1)
    const item = later.inbox.find((i) => i.kind === 'perk')!
    expect(item.options).toHaveLength(x.perkChoices)
    later = act(later, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: item.options[1].id }], hour)
    expect(later.crew[0].perks).toEqual([item.options[1].id])
  })

  it('enforcers bank Muscle XP continuously and spend it only on the hour', () => {
    let s = fresh()
    const vitya = crewNamed(s, 'Vitya')
    s = act(s, [{ type: 'ASSIGN_ENFORCER', crewId: vitya.id, racketId: s.rackets[0].id }], T0)
    s.crew.find((m) => m.id === vitya.id)!.xp.muscle = formulas.statPointCost(config, 48) - 0.01
    const hour = nextWholeHour(config, T0)
    const before = reconcile(s, hour - 1, config).state
    expect(crewNamed(before, 'Vitya').muscle).toBe(48)
    expect(crewNamed(before, 'Vitya').xp.muscle).toBeGreaterThan(formulas.statPointCost(config, 48))
    expect(crewNamed(reconcile(s, hour, config).state, 'Vitya').muscle).toBe(49)
  })

  it('perks change jobs: a Fixer is faster, a Ghost cooler, an Earner better paid', () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 100 }], T0)
    const v = s.crew.find((m) => m.name === 'Vitya')!
    v.perks = ['fixer', 'ghost', 'earner']
    v.muscle = 95
    const started = act(s, [{ type: 'START_OP', opType: 'shakeDown', crewIds: [v.id] }], T0)
    const minutes = config.ops.list.shakeDown.minutes * x.perks.fixer.jobMinutesMult!
    expect(started.ops[0].completesAt - T0).toBe(Math.round((minutes / 60) * H))
    const r = reconcile(started, started.ops[0].completesAt, config)
    const resolved = r.events.find((e) => e.type === 'OP_RESOLVED') as { dirty: number; spike: number; outcome: string }
    expect(resolved.outcome).toBe('full')
    expect(resolved.spike).toBeCloseTo(config.ops.list.shakeDown.spike * x.perks.ghost.jobSpikeMult!)
    expect(resolved.dirty).toBe(Math.round(config.ops.list.shakeDown.dirty! * x.perks.earner.jobDirtyMult!))
    expect(apply(started, { type: 'START_OP', opType: 'trainMuscle', crewIds: [v.id] }, T0, config).error).toBeDefined()
  })
})
