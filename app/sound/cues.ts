import type { Act, GameEvent } from '../../engine'
import type { SceneId } from '../scenes'

// Sound (ADR 0055; docs/sound.md): what plays, when, and how loud. Pure, so it's tested without a device.
// A name is a file: assets/sounds/sfx/<name>.mp3 or assets/sounds/music/<name>.mp3. `npm run sounds`
// (scripts/sounds.ts) prepares new files and lists the ones that exist in app/sound/files.ts. A sound with
// no file plays its fallback, or nothing, so the game is whole with any subset of the files.

export const SFX_NAMES = [
  'tap', 'page', 'refuse', 'collect', 'launder', 'buy', 'upgrade', 'gold', 'job-start', 'job-done', 'job-fail',
  'phone', 'knock', 'raid', 'panel', 'chapter', 'stamp', 'ink',
  'typewriter', 'envelope', 'keys', 'rank-up', 'election', 'skip', 'away', 'amb-cover',
] as const
export type SfxName = (typeof SFX_NAMES)[number]

export const MUSIC_NAMES = [
  'theme', 'city-1', 'city-2', 'tension', 'story', 'sting-failed', 'sting-won', 'sting-chapter', 'ending-holding', 'ending-empire',
] as const
export type MusicName = (typeof MUSIC_NAMES)[number]

// The mix. `priority`: of the sounds asked for together (one batch of events, or within `MIX.gapMs`), only the
// highest plays, so a raid isn't buried under the tap that caused it. `fallback`: what plays while the file
// is missing. `loop`: a bed that repeats (ambience), not a one-shot.
export type SfxCue = { volume: number; priority: number; fallback?: SfxName; loop?: true }
export const SFX: Record<SfxName, SfxCue> = {
  tap: { volume: 0.35, priority: 0 },
  page: { volume: 0.45, priority: 1 },
  panel: { volume: 0.5, priority: 1 },
  typewriter: { volume: 0.5, priority: 2 },
  away: { volume: 0.6, priority: 2 },
  refuse: { volume: 0.6, priority: 2 },
  'job-start': { volume: 0.7, priority: 3 },
  envelope: { volume: 0.7, priority: 3, fallback: 'buy' },
  buy: { volume: 0.7, priority: 4 },
  upgrade: { volume: 0.7, priority: 4 },
  collect: { volume: 0.75, priority: 5 },
  launder: { volume: 0.7, priority: 5 },
  skip: { volume: 0.7, priority: 5, fallback: 'gold' },
  gold: { volume: 0.75, priority: 6 },
  ink: { volume: 0.7, priority: 6 },
  'job-done': { volume: 0.7, priority: 7 },
  'rank-up': { volume: 0.7, priority: 8, fallback: 'upgrade' },
  election: { volume: 0.75, priority: 8, fallback: 'stamp' },
  chapter: { volume: 0.8, priority: 8, fallback: 'page' },
  stamp: { volume: 0.85, priority: 9 },
  'job-fail': { volume: 0.75, priority: 9 },
  phone: { volume: 0.8, priority: 10 },
  knock: { volume: 0.85, priority: 11 },
  keys: { volume: 0.8, priority: 12, fallback: 'job-fail' },
  raid: { volume: 0.9, priority: 13 },
  'amb-cover': { volume: 0.4, priority: 0, loop: true },
}

// Loops repeat until the context changes; stings play once over whatever loop is on.
export type MusicCue = { volume: number; loop: boolean; fallback?: MusicName }
export const MUSIC: Record<MusicName, MusicCue> = {
  theme: { volume: 0.55, loop: true, fallback: 'city-1' },
  'city-1': { volume: 0.45, loop: true },
  'city-2': { volume: 0.45, loop: true, fallback: 'city-1' },
  tension: { volume: 0.5, loop: true, fallback: 'story' },
  story: { volume: 0.5, loop: true, fallback: 'theme' },
  'ending-holding': { volume: 0.55, loop: true, fallback: 'theme' },
  'ending-empire': { volume: 0.55, loop: true, fallback: 'ending-holding' },
  'sting-failed': { volume: 0.7, loop: false },
  'sting-won': { volume: 0.7, loop: false },
  'sting-chapter': { volume: 0.7, loop: false },
}

// Timing, in real milliseconds. A tap waits `tapDeferMs` so the sound of what the press did can take its place.
export const MIX = { gapMs: 150, tapDeferMs: 40, fadeMs: 600, fadeSteps: 12 }

// What an event sounds like, if anything. Routine bookkeeping (wages paid, stock, hourly XP) stays quiet, and so
// do events a scene already plays (an act opening, a mission's stamp, an ending).
export function eventCue(e: GameEvent): SfxName | null {
  switch (e.type) {
    case 'RAID':
    case 'ARREST':
      return 'raid'
    case 'LOAN_REPOSSESSED':
      return 'keys'
    case 'INSPECTION_STARTED':
      return 'knock'
    case 'INCIDENT_RAISED':
    case 'REPORT_FILED':
    case 'ROCK_BOTTOM':
      return 'phone'
    case 'TOLYA_TICK':
      return e.result === 'tribute' ? 'phone' : e.result === 'conditionHit' ? 'job-fail' : null
    case 'OP_RESOLVED':
      return e.outcome === 'fail' ? 'job-fail' : 'job-done'
    case 'MISSION_RESOLVED':
      return e.result === 'lost' ? 'job-fail' : null // a failed overreach or a won rematch has its scene's stamp
    case 'CONTEST_RESOLVED':
      return e.won ? 'job-done' : 'job-fail'
    case 'CONTRACT_DONE':
    case 'ERRAND_DONE':
    case 'TRAINING_DONE':
    case 'LENDING_REPAID':
      return 'job-done'
    case 'WALKOUT':
    case 'TRIBUTE_REFUSED':
    case 'LENDING_DEFAULTED':
    case 'CREW_INJURED':
    case 'LOAN_MISSED':
    case 'WAGES_MISSED':
      return 'job-fail'
    case 'ELECTION_HELD':
      return 'election'
    case 'LEGALIZED':
      return 'stamp'
    case 'CREW_RANK_UP':
    case 'GOAL_DONE':
    case 'EMPIRE_BEST':
      return 'rank-up'
    case 'DISTRICT_BOUGHT':
    case 'DISTRICT_FLIPPED':
      return 'ink'
    case 'GOLD_GRANTED':
    case 'OP_RUSHED':
      return 'gold'
    case 'TIME_SKIPPED':
      return 'skip'
    case 'COLLECTED':
    case 'SURPLUS_SOLD':
      return 'collect'
    case 'DEPOSITED':
      return 'launder'
    case 'RACKET_UPGRADED':
    case 'FRONT_UPGRADED':
    case 'RACKET_REPAIRED':
      return 'upgrade'
    case 'RACKET_BOUGHT':
    case 'FRONT_BOUGHT':
    case 'OFFICIAL_BOUGHT':
    case 'CREW_SLOT_BOUGHT':
    case 'SHIPMENT_BOUGHT':
    case 'PASSAGE_BOUGHT':
    case 'RECRUITED':
    case 'CAMPAIGNED':
      return 'buy'
    case 'BRIBED':
    case 'TRIBUTE_PAID':
    case 'TRIBUTE_HAGGLED':
    case 'ENVELOPE_OPENED':
    case 'LOAN_TAKEN':
    case 'LOAN_REPAID':
    case 'LENT':
    case 'RAISED':
      return 'envelope'
    case 'OP_STARTED':
    case 'MISSION_STARTED':
    case 'CONTRACT_STARTED':
      return 'job-start'
    default:
      return null
  }
}

// The one sound for a batch of events: the highest priority among them.
export function cueForEvents(events: readonly GameEvent[]): SfxName | null {
  let best: SfxName | null = null
  for (const e of events) {
    const cue = eventCue(e)
    if (cue && (!best || SFX[cue].priority > SFX[best].priority)) best = cue
  }
  return best
}

// The sound that will actually play for `name`: itself if its file is there, else down its fallbacks.
export function pickSfx(name: SfxName, have: Partial<Record<SfxName, unknown>>): SfxName | null {
  for (let n: SfxName | undefined = name, seen = 0; n && seen < SFX_NAMES.length; n = SFX[n].fallback, seen++) if (have[n] !== undefined) return n
  return null
}

export function pickMusic(name: MusicName | null, have: Partial<Record<MusicName, unknown>>): MusicName | null {
  for (let n: MusicName | null | undefined = name, seen = 0; n && seen < MUSIC_NAMES.length; n = MUSIC[n].fallback, seen++) if (have[n] !== undefined) return n
  return null
}

// Each scene's music: the arcs' missions and Tolya under tension, the rest under the story's theme, each ending its own.
export const SCENE_MUSIC: Record<SceneId, MusicName> = {
  prologue: 'story',
  crew: 'story',
  tolya: 'tension',
  row: 'tension',
  crate: 'tension',
  terms: 'tension',
  bridge: 'tension',
  lunch: 'tension',
  truck: 'tension',
  road: 'tension',
  auction: 'tension',
  count: 'tension',
  governor: 'tension',
  envelope: 'story',
  keys: 'tension',
  'chapter-2': 'story',
  'chapter-3': 'story',
  'chapter-4': 'story',
  'chapter-5': 'story',
  'chapter-6': 'story',
  holding: 'ending-holding',
  empire: 'ending-empire',
}

// Where the player is, as far as music cares.
export type MusicView =
  | { screen: 'cover'; ending: 'holding' | 'empire' | null } // the first ending reached, if the story is over
  | { screen: 'scene'; scene: SceneId }
  | { screen: 'game'; act: Act; storyOver: boolean }

// Acts I–III are the street; from Act IV, and after the story, the city is bigger and colder.
export function musicFor(view: MusicView): MusicName {
  if (view.screen === 'cover') return view.ending ? `ending-${view.ending}` : 'theme'
  if (view.screen === 'scene') return SCENE_MUSIC[view.scene]
  return view.storyOver || view.act >= 4 ? 'city-2' : 'city-1'
}
