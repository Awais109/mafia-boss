import { describe, expect, it } from 'vitest'
import { apply, buildConfig, currentTutorialStep, derive, reconcile, TUTORIAL_STEPS, type Action, type PlayerState } from '../engine'
import { blank, config, T0 } from './helpers'

// The guided opening (ADR 0035): a new game starts with money and empty turf, the tutorial walks the
// player through buying the old starting setup and then the loop, and Skip buys the same setup.

const step = (s: PlayerState) => currentTutorialStep(s)

function play(s: PlayerState, t: number, action: Action): PlayerState {
  const r = apply(s, action, t, config)
  if (r.error) throw new Error(`${action.type} rejected: ${r.error}`)
  expect(r.state.clean).toBeGreaterThanOrEqual(0)
  return r.state
}

describe('the guided opening', () => {
  it('starts with the opening money, empty turf and three people looking for work', () => {
    const s = blank()
    expect([s.rackets.length, s.fronts.length, s.crew.length]).toEqual([0, 0, 0])
    expect(s.clean).toBe(config.vault.startingClean)
    expect(s.dirty).toBe(config.vault.startingDirtyOnHand)
    expect(s.vault).toBe(config.vault.startingDirty)
    expect(s.recruitPool.candidates.map((m) => m.name)).toEqual(config.crew.openingPool.map((m) => m.name))
    expect(step(s)).toBe('kiosk')
  })

  it('walks the scripted path in order, never short of Clean, and its shopping ends where Skip does', () => {
    const t = T0
    let s = blank()
    s = play(s, t, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'zarechye' })
    expect(step(s)).toBe('stall')
    s = play(s, t, { type: 'BUY_RACKET', racketType: 'marketStall', districtId: 'zarechye' })
    s = play(s, t, { type: 'BUY_RACKET', racketType: 'tobaccoFactory', districtId: 'zarechye' })
    expect(step(s)).toBe('front')
    s = play(s, t, { type: 'BUY_FRONT', frontType: 'currencyKiosk' })
    s = play(s, t, { type: 'RECRUIT', candidateId: 'cand0-0' })
    expect(step(s)).toBe('hire')
    s = play(s, t, { type: 'RECRUIT', candidateId: 'cand0-1' })
    expect(step(s)).toBe('collect')

    const skipped = apply(blank(), { type: 'TUTORIAL_SKIP' }, t, config).state
    expect(s.rackets.map((r) => `${r.type}@${r.districtId}`)).toEqual(skipped.rackets.map((r) => `${r.type}@${r.districtId}`))
    expect(s.fronts.map((f) => f.type)).toEqual(skipped.fronts.map((f) => f.type))
    expect(s.crew.map((m) => m.name)).toEqual(skipped.crew.map((m) => m.name))
    expect(s.clean).toBe(skipped.clean)
    expect(s.reputation).toBeCloseTo(skipped.reputation)

    s = play(s, t, { type: 'COLLECT' })
    s = play(s, t, { type: 'DEPOSIT', frontId: s.fronts[0].id, amount: 60 })
    expect(step(s)).toBe('job')
    s = play(s, t, { type: 'START_OP', opType: 'shakeDown', crewIds: [s.crew[0].id] })
    s = play(s, t, { type: 'UPGRADE_RACKET', racketId: s.rackets[0].id })
    expect(step(s)).toBe('heat')
    s = play(s, t, { type: 'TUTORIAL_ADVANCE' })
    expect(step(s)).toBe('tolya')

    // Tolya comes by with a demand minutes after the heat lesson.
    const visit = t + config.tutorial.tolyaAfterMinutes * (config.time.hourMs / 60)
    expect(s.rival.tolya.nextTickAt).toBe(visit)
    s = reconcile(s, visit, config).state
    expect(s.rival.tolya.demand).not.toBeNull()
    s = play(s, visit, { type: 'PAY_TRIBUTE' })
    expect(step(s)).toBe('report')

    const back = s.ops[0].completesAt
    s = reconcile(s, back, config).state
    const report = s.inbox.find((i) => i.kind === 'report')!
    s = play(s, back, { type: 'RESOLVE_INBOX', itemId: report.id, optionId: report.defaultOptionId })
    expect(step(s)).toBe('city')
    s = play(s, back, { type: 'TUTORIAL_ADVANCE' })
    expect(s.tutorial).toEqual({ step: TUTORIAL_STEPS.length, done: true })
  })

  it('buying out of order never strands the player', () => {
    let s = blank()
    s = play(s, T0, { type: 'BUY_RACKET', racketType: 'marketStall', districtId: 'zarechye' })
    expect(step(s)).toBe('kiosk')
    s = play(s, T0, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'zarechye' })
    expect(step(s)).toBe('factory')
  })

  it('skipping part-way buys only what is missing', () => {
    let s = blank()
    s = play(s, T0, { type: 'BUY_RACKET', racketType: 'kiosk', districtId: 'zarechye' })
    s = play(s, T0, { type: 'RECRUIT', candidateId: 'cand0-2' })
    s = play(s, T0, { type: 'TUTORIAL_SKIP' })
    expect(s.tutorial.done).toBe(true)
    expect(s.rackets.map((r) => r.type).sort()).toEqual(config.opening.quickStart.rackets.map((r) => r.type).sort())
    expect(s.crew.map((m) => m.name)).toEqual([config.crew.openingPool[2].name, config.crew.openingPool[0].name])
  })

  it('a skip with too little Clean still places the whole setup', () => {
    const s = blank()
    s.clean = 0
    const skipped = play(s, T0, { type: 'TUTORIAL_SKIP' })
    const q = config.opening.quickStart
    expect([skipped.rackets.length, skipped.fronts.length, skipped.crew.length]).toEqual([q.rackets.length, q.fronts.length, q.recruits.length])
    expect(skipped.clean).toBe(0)
  })

  it('with the tutorial off, a new game starts from the quick start', () => {
    const c = buildConfig('default', { 'tutorial.enabled': false })
    const d = derive(blank('costs', config), config)
    const setup = d.costs.racket.kiosk + d.costs.racket.marketStall + d.costs.racket.tobaccoFactory + d.costs.front.currencyKiosk + 2 * d.costs.recruit
    const s = blank('no-tutorial', c)
    expect(s.tutorial.done).toBe(true)
    expect(s.rackets.map((r) => r.type)).toEqual(c.opening.quickStart.rackets.map((r) => r.type))
    expect(s.clean).toBe(c.vault.startingClean - setup)
    expect(s.reputation).toBeCloseTo(setup * c.reputation.perCleanSpent)
  })
})
