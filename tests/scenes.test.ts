import { describe, expect, it } from 'vitest'
import { apply, TUTORIAL_STEPS, type GameEvent } from '../engine'
import { buildNotices } from '../app/notices'
import { firstEndingOf, LAST_HEARING } from '../app/story'
import { dueScene, sceneAhead, sceneDue, SCENES, type SceneId } from '../app/scenes'
import { ART } from '../app/art/scenes'
import { act, blank, config, fresh, T0 } from './helpers'

// Scenes (ADR 0049): due from the save, not from events, so a scene missed while the app was shut still
// plays; seen once; and an old save's past counts as seen.

const step = (id: string) => TUTORIAL_STEPS.findIndex((st) => st.id === id)

describe('scenes', () => {
  it('plays the prologue at a new game, then nothing until the hire step', () => {
    let s = blank()
    expect(dueScene(s)?.id).toBe('prologue')
    s = act(s, [{ type: 'SEE_SCENE', sceneId: 'prologue' }], T0)
    expect(dueScene(s)).toBeNull()
    s.tutorial.step = step('hire')
    expect(dueScene(s)?.id).toBe('crew')
  })

  it('plays Tolya’s scene when his demand arrives at his step, not before', () => {
    const s = blank()
    s.story.seen.push('prologue', 'crew')
    s.tutorial.step = step('tolya')
    expect(sceneDue(s, 'tolya')).toBe(false)
    s.rival.tolya.demand = 25
    expect(dueScene(s)?.id).toBe('tolya')
  })

  it('plays each act’s chapter once the act is open, however long ago it opened', () => {
    let s = fresh('scenes')
    s.story.seen.push('prologue', 'crew', 'tolya')
    s.tutorial.done = true
    expect(dueScene(s)).toBeNull()
    s = act(s, [{ type: 'DEBUG_COMPLETE_GOALS' }], T0)
    expect(s.act).toBe(2)
    expect(dueScene(s)?.id).toBe('chapter-2')
    s = act(s, [{ type: 'SEE_SCENE', sceneId: 'chapter-2' }], T0)
    expect(dueScene(s)).toBeNull()
    // Two acts opened while away: both chapters, in order.
    s.act = 4
    expect(dueScene(s)?.id).toBe('chapter-3')
  })

  it('counts what an old save had passed as seen', () => {
    const s = blank()
    s.act = 3
    s.tutorial.done = true
    s.story = { seen: [], since: { act: 3, step: s.tutorial.step, done: true } }
    expect(dueScene(s)).toBeNull()
    s.act = 4
    expect(dueScene(s)?.id).toBe('chapter-4')
  })

  it('plays a mission’s scene before the chapter it opens, once the mission has come to it (ADR 0050)', () => {
    const s = blank()
    s.story.seen.push('prologue', 'crew', 'tolya')
    s.tutorial.done = true
    s.act = 2
    expect(dueScene(s)?.id).toBe('chapter-2')
    s.missions.crateThroughPort = { result: 'failed', at: T0 }
    expect(dueScene(s)?.id).toBe('crate')
    s.story.seen.push('crate', 'chapter-2')
    s.missions.herTerms = { result: 'lost', at: T0, retryAt: T0 + 12 * 3_600_000 }
    expect(dueScene(s)).toBeNull()
    s.missions.herTerms = { result: 'won', at: T0 }
    expect(dueScene(s)?.id).toBe('terms')
  })

  it('plays each ending once it’s reached, after the last chapter, and each only once (ADR 0053)', () => {
    const s = blank()
    s.tutorial.done = true
    s.act = 6
    s.story.seen.push(...(Object.keys(SCENES) as SceneId[]).filter((id) => id !== 'holding' && id !== 'empire'))
    expect(dueScene(s)).toBeNull()
    s.stats.endings.holding = T0
    expect(dueScene(s)?.id).toBe('holding')
    s.story.seen.push('holding')
    expect(dueScene(s)).toBeNull()
    s.stats.endings.empire = T0 + 1
    expect(dueScene(s)?.id).toBe('empire')
    expect(SCENES.holding.beats.slice(-2).map((b) => b.kind)).toEqual(['ending', 'credits'])
  })

  it('knows a scene played ahead of its moment, so a preview doesn’t count it as seen', () => {
    const s = blank()
    s.story.seen.push('prologue', 'crew', 'tolya')
    s.tutorial.done = true
    s.act = 3
    expect(sceneAhead(s, 'chapter-6')).toBe(true)
    expect(sceneAhead(s, 'holding')).toBe(true)
    expect(sceneAhead(s, 'chapter-3')).toBe(false) // its moment has come
    expect(sceneAhead(s, 'crew')).toBe(false) // already seen
    expect(sceneAhead(s, 'envelope')).toBe(false) // played when opened, never due
    // An old save's past isn't ahead, even if it was never seen.
    s.story = { seen: [], since: { act: 3, step: s.tutorial.step, done: true } }
    expect(sceneAhead(s, 'crate')).toBe(false)
  })

  it('plays the keys at the first repossession, in place of its notice, and only once (ADR 0059)', () => {
    const s = blank()
    s.tutorial.done = true
    s.act = 3
    s.story.seen.push(...(Object.keys(SCENES) as SceneId[]).filter((id) => id !== 'keys' && id !== 'holding' && id !== 'empire'))
    const before = structuredClone(s)
    expect(sceneDue(s, 'keys')).toBe(false)
    expect(sceneAhead(s, 'keys')).toBe(true) // a preview before it happens isn't recorded
    const taken = { type: 'LOAN_REPOSSESSED', t: T0, racketId: 'r1', racketType: 'kiosk', districtId: 'zarechye', owed: 300 } as GameEvent
    s.stats.loans.repossessed = 1
    expect(dueScene(s)?.id).toBe('keys')
    expect(buildNotices(before, s, [taken])).toEqual([])
    // Seen, a later repossession is the notice again.
    s.story.seen.push('keys')
    s.stats.loans.repossessed = 2
    expect(dueScene(s)).toBeNull()
    expect(buildNotices(before, s, [taken])).toEqual([{ kind: 'info', event: taken }])
    expect(SCENES.keys.beats.at(-1)?.kind).toBe('keys')
  })

  it('plays the last hearing at the first ending, just before it, with the answer for that road (ADR 0060)', () => {
    const s = blank()
    s.tutorial.done = true
    s.act = 6
    s.story.seen.push(...(Object.keys(SCENES) as SceneId[]).filter((id) => !['hearing', 'holding', 'empire'].includes(id)))
    expect(dueScene(s)).toBeNull()
    expect(sceneAhead(s, 'hearing')).toBe(true)
    s.stats.endings.empire = T0
    expect(dueScene(s)?.id).toBe('hearing')
    expect(firstEndingOf(s)).toBe('empire')
    s.story.seen.push('hearing')
    expect(dueScene(s)?.id).toBe('empire')
    // The other ending later plays its own scene, not the hearing again, and the first road stays the answer.
    s.story.seen.push('empire')
    s.stats.endings.holding = T0 + 1
    expect(dueScene(s)?.id).toBe('holding')
    expect(firstEndingOf(s)).toBe('empire')
    expect(Object.keys(LAST_HEARING).sort()).toEqual(['empire', 'holding'])
    expect(SCENES.hearing.beats.map((b) => b.kind)).toContain('defence')
  })

  it('records a scene once, and refuses an id that isn’t one', () => {
    let s = blank()
    s = act(s, [{ type: 'SEE_SCENE', sceneId: 'crew' }, { type: 'SEE_SCENE', sceneId: 'crew' }], T0)
    expect(s.story.seen).toEqual(['crew'])
    expect(apply(s, { type: 'SEE_SCENE', sceneId: 'Not a scene!' }, T0, config).error).toBe('Unknown scene')
  })

  it('draws every beat with art that exists', () => {
    for (const id of Object.keys(SCENES) as SceneId[]) {
      for (const beat of SCENES[id].beats) if ('art' in beat && beat.art) expect(ART[beat.art], `${id}: ${beat.art}`).toBeTruthy()
    }
  })
})
