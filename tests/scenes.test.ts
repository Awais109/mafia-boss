import { describe, expect, it } from 'vitest'
import { apply, TUTORIAL_STEPS } from '../engine'
import { dueScene, sceneDue, SCENES, type SceneId } from '../app/scenes'
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
