import { describe, expect, it } from 'vitest'
import { apply, contestOdds, reconcile, tryBuildConfig, type Config, type PlayerState } from '../engine'
import { act, fresh, H, T0 } from './helpers'

// Act III's consequences (ADR 0042): contests settled on a seeded roll, crew hurt by failed jobs and lost
// fights, the Clinic, and Tolya's boys coming for a business.

const configWith = (overlay: object) => {
  const { config: c, errors } = tryBuildConfig({ missions: { enabled: false }, ...overlay } as never)
  if (errors.length) throw new Error(errors.join('\n'))
  return c
}

// Deterministic: no luck in contests or jobs, and Tolya's boys come at every visit.
const sure = configWith({ ops: { noise: 0 }, rivals: { tolya: { attack: { chance: 1, chanceNoTurf: 1, chanceHostile: 1 }, pConditionHit: 0, pTribute: 0 } } })

function actThree(c: Config = sure): PlayerState {
  const s = act(fresh('consequences', c), [{ type: 'DEBUG_COMPLETE_GOALS' }, { type: 'DEBUG_SET_REP', reputation: c.rackets.types.clinic.unlockRep }], T0, c)
  s.tutorial.done = true
  s.clean = 20_000
  s.dirty = 20_000
  return s
}

// Tolya visits and his boys come: the state with the attack in its inbox, and the attack.
function withAttack(s: PlayerState, c: Config) {
  const out = act(s, [{ type: 'DEBUG_FORCE_TOLYA' }], T0, c)
  return { s: out, item: out.inbox.find((i) => i.ref === 'attack')! }
}
const attackOn = (s: PlayerState, c: Config) => withAttack(s, c).item

describe('contests and attacks', () => {
  it('sends Tolya’s boys from Act III, not before', () => {
    const early = act(fresh('consequences', sure), [{ type: 'DEBUG_FORCE_TOLYA' }], T0, sure)
    expect(early.inbox.some((i) => i.ref === 'attack')).toBe(false)
    const item = attackOn(actThree(), sure)
    expect(item.racketId).toBeDefined()
    expect(item.defaultOptionId).toBe('hunker')
  })

  it('makes the fight easier with an enforcer there, and the damage lighter beside a Stash House', () => {
    // One business to aim at, so the attack lands where the test looks.
    const s = actThree()
    s.rackets = s.rackets.filter((r) => r.type !== 'marketStall')
    const plain = attackOn(s, sure)
    const racket = s.rackets.find((r) => r.id === plain.racketId)!
    const base = sure.incidents.types.attack.options
    const fightCfg = base.find((o) => o.id === 'fight')!.contest!
    expect(plain.options.find((o) => o.id === 'fight')!.effects.contest!.diff).toBe(fightCfg.diff)
    expect(plain.options.find((o) => o.id === 'hunker')!.effects.condition).toBe(base.find((o) => o.id === 'hunker')!.condition)

    const minded = act(s, [{ type: 'ASSIGN_ENFORCER', crewId: s.crew[0].id, racketId: racket.id }, { type: 'BUY_RACKET', racketType: 'stashHouse', districtId: racket.districtId }], T0, sure)
    const again = act(minded, [{ type: 'DEBUG_FORCE_TOLYA' }], T0, sure).inbox.find((i) => i.ref === 'attack')!
    expect(again.racketId).toBe(racket.id)
    expect(again.options.find((o) => o.id === 'fight')!.effects.contest!.diff).toBe(fightCfg.diff - fightCfg.enforcerBonus!)
    expect(again.options.find((o) => o.id === 'hunker')!.effects.condition).toBe(Math.round(base.find((o) => o.id === 'hunker')!.condition! * 0.5))
  })

  it('settles a fight with the best idle crew member’s stat, and hurts them when it’s lost', () => {
    const { s, item } = withAttack(actThree(), sure)
    const strong = structuredClone(s)
    for (const m of strong.crew) m.muscle = 99
    expect(contestOdds(strong, sure, item.options.find((o) => o.id === 'fight')!.effects.contest!)).toBe(1)
    const won = act(strong, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'fight' }], T0, sure)
    expect(won.stats.contests.won).toBe(1)
    expect(won.crew.every((m) => m.status !== 'injured')).toBe(true)

    const weak = structuredClone(s)
    for (const m of weak.crew) m.muscle = 1
    const lost = act(weak, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'fight' }], T0, sure)
    expect(lost.stats.contests.lost).toBe(1)
    const hurt = lost.crew.find((m) => m.status === 'injured')!
    expect(hurt.injuredUntil).toBe(T0 + 12 * H)
    expect(apply(lost, { type: 'START_OP', opType: 'shakeDown', crewIds: [hurt.id] }, T0, sure).error).toMatch(/idle/)
  })
})

describe('injuries', () => {
  it('can hurt someone on a failed job that leans on Muscle, from Act III', () => {
    const c = configWith({ ops: { noise: 0 }, injuries: { chanceOnFail: 1 } })
    const s = actThree(c)
    for (const m of s.crew) m.muscle = 1
    const out = act(s, [{ type: 'START_OP', opType: 'shakeDown', crewIds: [s.crew[0].id] }, { type: 'DEBUG_COMPLETE_OPS' }], T0, c)
    expect(out.crew[0].status).toBe('injured')
    expect(out.stats.injuries).toBe(1)
  })

  it('brings them back at the boundary, sooner with a Clinic, which also lifts everyone’s loyalty', () => {
    const { s, item } = withAttack(act(actThree(), [{ type: 'BUY_RACKET', racketType: 'clinic', districtId: 'zarechye' }], T0, sure), sure)
    for (const m of s.crew) m.muscle = 1
    const lost = act(s, [{ type: 'RESOLVE_INBOX', itemId: item.id, optionId: 'fight' }], T0, sure)
    const hurt = lost.crew.find((m) => m.status === 'injured')!
    const hours = 12 * sure.rackets.types.clinic.injuryMult!
    expect(hurt.injuredUntil).toBe(T0 + hours * H)
    const back = reconcile(lost, T0 + hours * H, sure)
    expect(back.state.crew.find((m) => m.id === hurt.id)!.status).toBe('idle')
    expect(back.events.some((e) => e.type === 'CREW_RECOVERED')).toBe(true)
  })
})
