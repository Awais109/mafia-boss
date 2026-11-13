import { describe, expect, it } from 'vitest'
import { apply, derive, incidentEligible, reconcile, tryBuildConfig, type Config, type InboxItem, type PlayerState } from '../engine'
import { act, config, fresh, H, T0 } from './helpers'

// The city's story (ADR 0054): decisions that move public opinion and the Ministry's attention, and send
// someone on the crew out for a few hours.

const configWith = (overlay: object) => {
  const { config: c, errors } = tryBuildConfig({ missions: { enabled: false }, ...overlay } as never)
  if (errors.length) throw new Error(errors.join('\n'))
  return c
}

// No wear, no luck in jobs, nothing from Tolya, no incidents but the ones a test raises.
const steady = configWith({
  ops: { noise: 0 },
  rackets: { conditionDecayPerDay: 0 },
  incidents: { chancePerHr: 0 },
  rivals: { tolya: { pConditionHit: 0, pTribute: 0, attack: { chance: 0, chanceNoTurf: 0, chanceHostile: 0 } } },
})

// Act V the ordinary way (as in kombinat.test.ts), everyone idle.
function actFive(c: Config = steady): PlayerState {
  let s = act(fresh('city', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: c.rackets.types.tvStation.unlockRep }], T0, c)
  s.clean = 2_000_000
  s.dirty = 2_000_000
  s.influence = 1000
  s = act(s, [{ type: 'BUY_DISTRICT', districtId: 'zastava' }, { type: 'BUY_FRONT', frontType: 'importExport' }], T0, c)
  s.tutorial.done = true
  for (const r of s.rackets) r.enforcerId = null
  for (const m of s.crew) {
    m.status = 'idle'
    delete m.assignedTo
  }
  return s
}

const raise = (s: PlayerState, incidentType: 'frontPage' | 'workersAtGate' | 'schoolRoof') => {
  const r = act(s, [{ type: 'DEBUG_FORCE_INCIDENT', incidentType }], T0, steady)
  return { s: r, item: r.inbox.at(-1)! }
}
const option = (item: InboxItem, id: string) => item.options.find((o) => o.id === id)!

describe('the city’s story', () => {
  it('names who’d go, and sending them keeps them busy on an errand that brings them back', () => {
    const { s, item } = raise(actFive(), 'workersAtGate')
    const who = s.crew.find((m) => m.id === item.crewIds![0])!
    const listen = option(item, 'listen')
    expect(listen.name).toBe(`Send ${who.name.split(' ')[0]} to listen`)
    expect(listen.effects).toEqual({ opinion: 2, busyHours: 4 })

    const sent = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'listen' }], T0, steady)
    expect(sent.politics.opinion).toBeCloseTo(s.politics.opinion + 2)
    const errand = sent.ops.find((o) => o.type === 'errand')!
    expect(errand).toMatchObject({ crewIds: [who.id], name: steady.incidents.types.workersAtGate.name, completesAt: T0 + 4 * H })
    expect(sent.crew.find((m) => m.id === who.id)!.status).toBe('on_op')

    const back = reconcile(sent, T0 + 4 * H, steady)
    expect(back.state.ops.some((o) => o.type === 'errand')).toBe(false)
    expect(back.state.crew.find((m) => m.id === who.id)!.status).toBe('idle')
    expect(back.events.some((e) => e.type === 'ERRAND_DONE' && e.crewIds[0] === who.id)).toBe(true)
  })

  it('moves opinion and the Ministry now, for hours of the city’s income in Clean', () => {
    const { s, item } = raise(actFive(), 'workersAtGate')
    const d = derive(s, steady)
    const pay = option(item, 'pay')
    expect(pay.effects.clean).toBe(Math.round(-3 * (d.yieldPerHr + d.tributePerHr + d.legalGrossPerHr)))
    const paid = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'pay' }], T0, steady)
    expect(paid.politics.opinion).toBeCloseTo(s.politics.opinion + 5)
    expect(paid.politics.attention).toBeCloseTo(s.politics.attention + 6)
    expect(paid.clean).toBeCloseTo(s.clean + pay.effects.clean!)

    s.politics.opinion = 1
    const left = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'leave' }], T0, steady)
    expect(left.politics.opinion).toBe(0)
  })

  it('sends nobody when nobody is free', () => {
    const base = actFive()
    for (const m of base.crew) m.status = 'jailed'
    const { item } = raise(base, 'workersAtGate')
    expect(item.crewIds).toBeUndefined()
    expect(option(item, 'listen').name).toBe('Send someone to listen')
    expect(option(item, 'listen').effects.busyHours).toBeUndefined()
  })

  it('rolls each only in its acts: the front pages from Act V, the workers in Act V alone, the school after the story', () => {
    const five = actFive()
    expect(incidentEligible(five, steady, 'frontPage')).toBe(true)
    expect(incidentEligible(five, steady, 'workersAtGate')).toBe(true)
    expect(incidentEligible(five, steady, 'schoolRoof')).toBe(false)
    const four = { ...five, act: 4 as const }
    expect(incidentEligible(four, steady, 'frontPage')).toBe(false)
    const six = { ...five, act: 6 as const }
    expect(incidentEligible(six, steady, 'workersAtGate')).toBe(false)
    expect(incidentEligible(six, steady, 'schoolRoof')).toBe(false)
    const after = { ...six, stats: { ...six.stats, actClearedAt: { ...six.stats.actClearedAt, 6: T0 } } }
    expect(incidentEligible(after, steady, 'schoolRoof')).toBe(true)
  })

  it('checks a busy spell is positive and a story’s last act isn’t before its first', () => {
    const { errors } = tryBuildConfig({ incidents: { types: { schoolRoof: { options: [{ id: 'council', name: 'x', default: true }, { id: 'tar', name: 'y', busyHours: 0 }] }, workersAtGate: { lastAct: 4 } } } } as never)
    expect(errors).toContain('incidents.types.schoolRoof.options.tar.busyHours: 0 must be > 0')
    expect(errors).toContain('incidents.types.workersAtGate.lastAct: before its act')
    expect(apply(actFive(), { type: 'DEBUG_FORCE_INCIDENT', incidentType: 'frontPage' }, T0, config).error).toBeUndefined()
  })
})
