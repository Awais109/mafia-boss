import { describe, expect, it } from 'vitest'
import { apply, derive, type Action, type PlayerState } from '../engine'
import { doNext, DO_NEXT } from '../app/doNext'
import { fresh, T0, withMissions as c } from './helpers'

// "Do this next" on Home (#38): one suggestion, in order, and nothing while something already waits at the top.

const game = (s: PlayerState, now = T0) => ({ state: s, derived: derive(s, c), config: c, now })

// Past the opening, nothing waiting, nothing idle: the bare state each case adds one thing to.
function settled(): PlayerState {
  const s = fresh('do-next', c)
  s.tutorial.done = true
  s.inbox = []
  s.rival.tolya.demand = null
  s.vault = 0
  s.dirty = 0
  for (const m of s.crew) m.status = 'on_op'
  return s
}

describe('the next-step card', () => {
  it('stays out of the way during the opening, and while Tolya or a decision waits', () => {
    expect(doNext(game(fresh('do-next', c)))).toBeNull()
    const tolya = settled()
    tolya.rival.tolya.demand = 20
    expect(doNext(game(tolya))).toBeNull()
    const decision = apply(settled(), { type: 'DEBUG_FORCE_INCIDENT' }, T0, c).state
    expect(decision.inbox.length).toBeGreaterThan(0)
    expect(doNext(game(decision))).toBeNull()
  })

  it('collects a vault that’s nearly full, with a button that does it', () => {
    const s = settled()
    s.vault = derive(s, c).vaultCap * DO_NEXT.collectAtFill
    expect(doNext(game(s))).toMatchObject({ key: 'collect', actions: [{ type: 'COLLECT' }] })
  })

  it('washes idle Dirty, best rate first, keeping back what payday needs', () => {
    const s = settled()
    s.dirty = 5000
    s.fronts = s.fronts.map((f) => ({ ...f, buffer: 0 }))
    const next = doNext(game(s))!
    expect(next.key).toBe('wash')
    let after = s
    for (const a of next.actions as Action[]) {
      const r = apply(after, a, T0, c)
      expect(r.error).toBeUndefined()
      after = r.state
    }
    const d = derive(s, c)
    const payday = Math.ceil(T0 / (24 * c.time.hourMs)) * 24 * c.time.hourMs
    const due = s.wagesOwed + s.upkeepOwed + (d.wagesPerHr + d.upkeepPerHr) * ((payday - T0) / c.time.hourMs)
    expect(after.dirty).toBeGreaterThanOrEqual(due - 1)
    // Too little to bother with: on to the next thing.
    s.dirty = Math.floor(d.yieldPerHr * DO_NEXT.washAtYieldHours * 0.5)
    expect(doNext(game(s))?.key).not.toBe('wash')
  })

  it('sends idle crew to Ops, then the act’s first goal that can be done now, then says when to come back', () => {
    const s = settled()
    s.crew[0].status = 'idle'
    expect(doNext(game(s))).toMatchObject({ key: 'crew', tab: 'ops' })
    s.crew[0].status = 'on_op'
    s.clean = 10_000 // the first open goal, a district, is affordable
    const goal = doNext(game(s))!
    expect(goal.key).toBe(`goal:${c.goals.list.find((id) => !s.goals.done.includes(id))}`)
    expect(goal.sub).toContain('Act I goal')
    s.goals.done = [...c.goals.list] // every goal done (Act II's gate isn't checked here)
    expect(doNext(game(s))).toMatchObject({ key: 'calm', title: 'Nothing needs you' })
  })

  it('skips a goal that waits on Rep, prefers one you can pay for, and names what the next act waits on first', () => {
    let s = settled()
    for (const a of [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_COMPLETE_MISSIONS' }] as Action[]) s = apply(s, a, T0, c).state
    s.vault = 0
    s.dirty = 0
    s.inbox = []
    s.rival.tolya.demand = null
    for (const m of s.crew) m.status = 'on_op'
    expect(s.act).toBe(2)
    // Act II's goals, in order: the Captain, a Stash House (waits on Rep here), a district, Zhanna's lot.
    expect(derive(s, c).unlocked.racket.stashHouse).toBe(false)
    s.influence = 0
    s.clean = 1000
    expect(doNext(game(s))).toMatchObject({ key: 'goal:newTurf', tab: 'turf' }) // the Captain's ✦ isn't there
    s.influence = 100
    expect(doNext(game(s))).toMatchObject({ key: 'goal:precinctCaptain', tab: 'heat' })
    s.influence = 0
    s.clean = 0
    expect(doNext(game(s))?.key).toBe('goal:zhannaLot') // nothing to pay with: one that isn't a purchase
    s.influence = 0
    s.goals.done.push('zhannaLot')
    expect(doNext(game(s))?.key).toBe('goal:precinctCaptain') // none affordable: the first, with what it needs
    // With the Rep for Act III in hand, the mission it waits on leads.
    s.reputation = c.progression.acts[3].rep!
    expect(doNext(game(s))).toMatchObject({ key: 'next', tab: 'ops' })
  })
})
