import { currentTutorialStep, TUTORIAL_STEPS, type Act, type LaterAct, type PlayerState, type TutorialStepId } from '../engine'
import type { ArtId } from './art/scenes'
import type { PersonId } from './art/people'
import { ACT_NAME } from './acts'
import { ACT_TITLE } from './story'

// The story's scenes as data (ADR 0049; scripts: design/sevgorod-design-brief.md, Part 5). A scene is a list
// of beats played full screen one at a time (`SceneViewer`). Which scene is due is worked out from the save,
// not from events: the scene's trigger has happened, it isn't in `story.seen`, and it didn't pass before the
// seen-list began (`story.since`). So a scene missed while the app was closed still plays on return.

export type SceneId = 'prologue' | 'crew' | 'tolya' | `chapter-${LaterAct}`

// Part of a panel of art, as fractions of its height: the prologue shows the cover's window, then its table.
export type Crop = { top: number; height: number }

export type Beat =
  | { kind: 'art'; art: ArtId; crop?: Crop; caption?: string; speech?: string } // a panel with a caption box, a speech bubble, or both
  | { kind: 'portrait'; person: PersonId; caption: string } // a portrait on paper (Lyosha's photograph)
  | { kind: 'intro'; art: ArtId; person: PersonId; speech: string } // a splash: the art, their line, their card
  | { kind: 'hire' } // the three crew as cards, each with Hire; it waits until two are hired
  | { kind: 'tribute'; art: ArtId; caption: string } // the stare-down with Tolya's demand under it; it waits for an answer
  | { kind: 'title'; act: Act } // VOLUME and the act's title
  | { kind: 'chapter'; act: LaterAct } // the whole chapter page

export type Scene = { id: SceneId; number?: number; title: string; beats: Beat[] }

const stepIndex = (id: TutorialStepId) => TUTORIAL_STEPS.findIndex((st) => st.id === id)
const TOP: Crop = { top: 0, height: 0.52 }
const TABLE: Crop = { top: 0.52, height: 0.48 }

export const SCENES: Record<SceneId, Scene> = {
  prologue: {
    id: 'prologue',
    number: 1,
    title: 'The envelope',
    beats: [
      { kind: 'art', art: 'cover', crop: TOP, caption: 'Sevgorod, February 1993. Zarechye. Third floor, the window over the tram.' },
      { kind: 'portrait', person: 'lyosha', caption: 'Uncle Lyosha died on the number 4 tram. Of his heart. Undramatically.' },
      { kind: 'art', art: 'cover', crop: TABLE, caption: 'He left an envelope, a notebook, and a rule.' },
      { kind: 'art', art: 'cover', crop: TABLE, caption: 'Never spend money that has no story.' },
      { kind: 'art', art: 'vitya', speech: 'Car’s downstairs.' },
      { kind: 'art', art: 'vitya', speech: 'He said you’d know what to do.', caption: 'You don’t. Yet.' },
      { kind: 'title', act: 1 },
    ],
  },
  crew: {
    id: 'crew',
    number: 2,
    title: 'Two people you trust',
    beats: [{ kind: 'hire' }, { kind: 'art', art: 'cover', crop: TOP, caption: 'Two is enough to start. Lyosha started with one.' }],
  },
  tolya: {
    id: 'tolya',
    number: 3,
    title: 'Your uncle paid on the day',
    beats: [
      { kind: 'intro', art: 'tolyaSplash', person: 'tolya', speech: 'Your uncle paid on the day.' },
      { kind: 'tribute', art: 'tolyaStare', caption: 'He knows to the rouble what a kiosk earns.' },
      { kind: 'art', art: 'tolyaSplash', speech: 'Lyosha owed me. Now you do.' },
    ],
  },
  'chapter-2': { id: 'chapter-2', title: ACT_TITLE[2], beats: [{ kind: 'chapter', act: 2 }] },
  'chapter-3': { id: 'chapter-3', title: ACT_TITLE[3], beats: [{ kind: 'chapter', act: 3 }] },
  'chapter-4': { id: 'chapter-4', title: ACT_TITLE[4], beats: [{ kind: 'chapter', act: 4 }] },
  'chapter-5': { id: 'chapter-5', title: ACT_TITLE[5], beats: [{ kind: 'chapter', act: 5 }] },
  'chapter-6': { id: 'chapter-6', title: ACT_TITLE[6], beats: [{ kind: 'chapter', act: 6 }] },
}

// The order scenes are checked in: the opening's, then the chapters.
const ORDER: SceneId[] = ['prologue', 'crew', 'tolya', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'chapter-6']

// Whether the scene's moment passed before the save kept a seen-list (an old save), so it counts as seen.
function passedBefore(s: PlayerState, id: SceneId): boolean {
  const since = s.story.since
  if (id.startsWith('chapter-')) return since.act >= Number(id.slice('chapter-'.length))
  const at = id === 'prologue' ? 0 : id === 'crew' ? stepIndex('hire') : stepIndex('tolya')
  return since.done || since.act > 1 || since.step > at
}

// Whether the scene's moment has come.
function triggered(s: PlayerState, id: SceneId): boolean {
  if (id.startsWith('chapter-')) return s.act >= Number(id.slice('chapter-'.length))
  if (s.tutorial.done) return false
  const step = currentTutorialStep(s)
  if (id === 'prologue') return s.tutorial.step === 0
  if (id === 'crew') return step === 'hire'
  return step === 'tolya' && s.rival.tolya.demand !== null
}

export function sceneDue(s: PlayerState, id: SceneId): boolean {
  return triggered(s, id) && !s.story.seen.includes(id) && !passedBefore(s, id)
}

// The scene to play now, if any.
export function dueScene(s: PlayerState): Scene | null {
  const id = ORDER.find((x) => sceneDue(s, x))
  return id ? SCENES[id] : null
}

// "Scene 2 · Two people you trust", "Volume IV · The road out".
export function sceneLabel(scene: Scene): string {
  if (scene.id.startsWith('chapter-')) return `Volume ${ACT_NAME[Number(scene.id.slice('chapter-'.length)) as Act]} · ${scene.title}`
  return scene.number ? `Scene ${scene.number} · ${scene.title}` : scene.title
}
