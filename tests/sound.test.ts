import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../engine'
import { SCENES, type SceneId } from '../app/scenes'
import { cueForEvents, eventCue, MUSIC, MUSIC_NAMES, musicFor, pickMusic, pickSfx, SCENE_MUSIC, SFX, SFX_NAMES } from '../app/sound/cues'

// Sound (ADR 0055): which event makes which sound, one sound per batch, fallbacks while files are missing,
// the music for each screen, and a manifest that lists exactly the files there are.

const ev = (e: Record<string, unknown>) => ({ t: 0, ...e }) as GameEvent

describe('sound', () => {
  it('gives the events that matter a sound, and keeps bookkeeping quiet', () => {
    expect(eventCue(ev({ type: 'RAID' }))).toBe('raid')
    expect(eventCue(ev({ type: 'INSPECTION_STARTED' }))).toBe('knock')
    expect(eventCue(ev({ type: 'INCIDENT_RAISED' }))).toBe('phone')
    expect(eventCue(ev({ type: 'OP_RESOLVED', outcome: 'full' }))).toBe('job-done')
    expect(eventCue(ev({ type: 'OP_RESOLVED', outcome: 'fail' }))).toBe('job-fail')
    expect(eventCue(ev({ type: 'TOLYA_TICK', result: 'tribute' }))).toBe('phone')
    expect(eventCue(ev({ type: 'TOLYA_TICK', result: 'nothing' }))).toBeNull()
    expect(eventCue(ev({ type: 'COLLECTED' }))).toBe('collect')
    expect(eventCue(ev({ type: 'DEPOSITED' }))).toBe('launder')
    // A scene has these: the mission's stamp, the chapter, the ending.
    expect(eventCue(ev({ type: 'MISSION_RESOLVED', result: 'failed' }))).toBeNull()
    expect(eventCue(ev({ type: 'MISSION_RESOLVED', result: 'lost' }))).toBe('job-fail')
    expect(eventCue(ev({ type: 'ACT_UNLOCKED' }))).toBeNull()
    expect(eventCue(ev({ type: 'ENDING_REACHED' }))).toBeNull()
    for (const type of ['WAGES_PAID', 'UPKEEP_PAID', 'CREW_STAT_UP', 'LOAN_PAYMENT', 'SESSION_START', 'TUTORIAL_STEP', 'VAULT_CAPPED']) {
      expect(eventCue(ev({ type })), type).toBeNull()
    }
  })

  it('plays one sound for a batch: the highest priority', () => {
    expect(cueForEvents([ev({ type: 'COLLECTED' }), ev({ type: 'RAID' }), ev({ type: 'DEPOSITED' })])).toBe('raid')
    expect(cueForEvents([ev({ type: 'OP_STARTED' }), ev({ type: 'GOLD_GRANTED' })])).toBe('gold')
    expect(cueForEvents([ev({ type: 'WAGES_PAID' })])).toBeNull()
    expect(cueForEvents([])).toBeNull()
  })

  it('falls back while a file is missing, and never loops', () => {
    expect(pickSfx('keys', { keys: 1 })).toBe('keys')
    expect(pickSfx('keys', { 'job-fail': 1 })).toBe('job-fail')
    expect(pickSfx('keys', {})).toBeNull()
    expect(pickMusic('city-2', { 'city-1': 1 })).toBe('city-1')
    expect(pickMusic('ending-empire', { theme: 1 })).toBe('theme')
    expect(pickMusic(null, { theme: 1 })).toBeNull()
    const acyclic = <N extends string>(names: readonly N[], next: (n: N) => N | undefined) => {
      for (const name of names) {
        const seen = new Set<N>()
        for (let n: N | undefined = name; n; n = next(n)) {
          expect(seen.has(n), `${name} falls back in a circle`).toBe(false)
          seen.add(n)
        }
      }
    }
    acyclic(SFX_NAMES, (n) => SFX[n].fallback)
    acyclic(MUSIC_NAMES, (n) => MUSIC[n].fallback)
  })

  it('keeps the mix in range: volumes in (0, 1], loops where they belong', () => {
    for (const n of SFX_NAMES) expect(SFX[n].volume > 0 && SFX[n].volume <= 1, n).toBe(true)
    for (const n of MUSIC_NAMES) expect(MUSIC[n].volume > 0 && MUSIC[n].volume <= 1, n).toBe(true)
    expect(SFX_NAMES.filter((n) => SFX[n].loop)).toEqual(['amb-cover'])
    expect(MUSIC_NAMES.filter((n) => !MUSIC[n].loop)).toEqual(['sting-failed', 'sting-won', 'sting-chapter'])
    // A loop never falls back to a sting, or a sting to a loop.
    for (const n of MUSIC_NAMES) {
      const f = MUSIC[n].fallback
      if (f) expect(MUSIC[f].loop, `${n} → ${f}`).toBe(MUSIC[n].loop)
    }
  })

  it('picks the music for the screen', () => {
    expect(musicFor({ screen: 'cover', ending: null })).toBe('theme')
    expect(musicFor({ screen: 'cover', ending: 'empire' })).toBe('ending-empire')
    expect(musicFor({ screen: 'scene', scene: 'crate' })).toBe('tension')
    expect(musicFor({ screen: 'scene', scene: 'chapter-3' })).toBe('story')
    expect(musicFor({ screen: 'scene', scene: 'holding' })).toBe('ending-holding')
    expect(musicFor({ screen: 'game', act: 3, storyOver: false })).toBe('city-1')
    expect(musicFor({ screen: 'game', act: 4, storyOver: false })).toBe('city-2')
    expect(musicFor({ screen: 'game', act: 6, storyOver: true })).toBe('city-2')
    // Every scene has its music, and only loops play under scenes.
    for (const id of Object.keys(SCENES) as SceneId[]) expect(MUSIC[SCENE_MUSIC[id]].loop, id).toBe(true)
  })

  it('lists exactly the files there are (npm run sounds)', () => {
    const root = join(__dirname, '..')
    const manifest = readFileSync(join(root, 'app/sound/files.ts'), 'utf8')
    const listed = [...manifest.matchAll(/require\('\.\.\/\.\.\/assets\/sounds\/(sfx|music)\/([\w-]+)\.mp3'\)/g)].map((m) => `${m[1]}/${m[2]}`).sort()
    const onDisk = (['sfx', 'music'] as const)
      .flatMap((kind) => {
        const dir = join(root, 'assets/sounds', kind)
        const names: readonly string[] = kind === 'sfx' ? SFX_NAMES : MUSIC_NAMES
        return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3') && names.includes(f.slice(0, -4))).map((f) => `${kind}/${f.slice(0, -4)}`) : []
      })
      .sort()
    expect(listed, 'run `npm run sounds` after adding or removing a sound file').toEqual(onDisk)
  })
})
