import { currentTutorialStep, TUTORIAL_STEPS, type Act, type Ending, type LaterAct, type MissionId, type PlayerState, type TutorialStepId } from '../engine'
import type { ArtId } from './art/scenes'
import type { PersonId } from './art/people'
import { ACT_NAME } from './acts'
import { ACT_TITLE } from './story'

// The story's scenes as data (ADR 0049; scripts: design/sevgorod-design-brief.md, Part 5). A scene is a list
// of beats played full screen one at a time (`SceneViewer`). Which scene is due is worked out from the save,
// not from events: the scene's trigger has happened, it isn't in `story.seen`, and it didn't pass before the
// seen-list began (`story.since`). So a scene missed while the app was closed still plays on return.

export type SceneId =
  | 'prologue' | 'crew' | 'tolya'
  | 'row' | 'crate' | 'terms' | 'bridge' | 'lunch' | 'truck' | 'road' | 'auction' | 'count' | 'governor'
  | 'envelope'
  | 'holding' | 'empire'
  | `chapter-${LaterAct}`

// Part of a panel of art, as fractions of its height: the prologue shows the cover's window, then its table.
export type Crop = { top: number; height: number }

export type Beat =
  | { kind: 'art'; art: ArtId; crop?: Crop; caption?: string; speech?: string } // a panel with a caption box, a speech bubble, or both
  | { kind: 'portrait'; person: PersonId; caption: string } // a portrait on paper (Lyosha's photograph)
  | { kind: 'intro'; art?: ArtId; person: PersonId; speech?: string; caption?: string } // a splash: their art (or portrait), a line, their card
  | { kind: 'face'; person: PersonId; speech?: string; caption?: string } // a portrait on screentone, with a line
  | { kind: 'slug'; caption: string } // a panel of words alone: a place and a time, a wordless beat
  | { kind: 'result'; mission: MissionId } // the stamp: FAILED in red ink with its cost, or WON in brass
  | { kind: 'envelope' } // Lyosha's second envelope: this act's note, and the stake
  | { kind: 'hire' } // the three crew as cards, each with Hire; it waits until two are hired
  | { kind: 'tribute'; art: ArtId; caption: string } // the stare-down with Tolya's demand under it; it waits for an answer
  | { kind: 'title'; act: Act } // VOLUME and the act's title
  | { kind: 'chapter'; act: LaterAct } // the whole chapter page
  | { kind: 'map'; caption: string } // the notebook map as it stands, with a caption
  | { kind: 'ending'; ending: Ending } // the whole ending page: the city from the hills, Where to?, its name
  | { kind: 'credits'; ending: Ending } // the cast and your numbers, then Keep going

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
  // The boss arcs (ADR 0050; design brief, Scenes 4–13): each rematch and overreach, and the three arcs the
  // game already had a moment for (the Row, the road, the count).
  row: {
    id: 'row',
    number: 4,
    title: 'The Row',
    beats: [
      { kind: 'slug', caption: 'Kiosk Row at dawn. The shutters coming up.' },
      { kind: 'face', person: 'tolya', caption: 'Tolya alone on a bench with his thermos. The lads are gone.' },
      { kind: 'face', person: 'tolya', speech: 'Forty kiosks. I counted them every morning for five years.' },
      { kind: 'face', person: 'tolya', speech: 'Count them yourself now.' },
      { kind: 'slug', caption: 'He didn’t say goodbye. That was the part to worry about.' },
    ],
  },
  crate: {
    id: 'crate',
    number: 5,
    title: 'A crate through the Port',
    beats: [
      { kind: 'slug', caption: 'The Port Quarter at night: two cranes, a lorry at the east gate, snow in the headlights.' },
      { kind: 'slug', caption: 'A flashlight beam. Men in freight-company jackets step out of the dark. Nobody shouts.' },
      { kind: 'art', art: 'overreachMorning', speech: 'Gate wasn’t empty.' },
      { kind: 'result', mission: 'crateThroughPort' },
      { kind: 'intro', person: 'zhanna', caption: 'Zhanna Arkadyevna sends her condolences, four months late, and asks whether you’re buying or selling.' },
      { kind: 'title', act: 2 },
    ],
  },
  terms: {
    id: 'terms',
    number: 6,
    title: 'Her terms',
    beats: [
      { kind: 'slug', caption: 'The freight co-operative’s office. Ledgers to the ceiling.' },
      { kind: 'face', person: 'zhanna', speech: 'You’re early. That usually costs extra.' },
      { kind: 'face', person: 'dima', speech: 'The Minsk drivers want paying on the day. We pay on the day.' },
      { kind: 'face', person: 'zhanna', speech: 'Fine. Forty a lot, not forty-five. Don’t make me regret the five.' },
      { kind: 'result', mission: 'herTerms' },
    ],
  },
  bridge: {
    id: 'bridge',
    number: 7,
    title: 'Across the bridge',
    beats: [
      { kind: 'slug', caption: 'The bridge over the Seva in morning fog. Your handcart stall, halfway across.' },
      { kind: 'slug', caption: 'A militia sergeant at a cordon, one gloved hand raised: “Trade on the north bank is licensed by City Hall.”' },
      { kind: 'slug', caption: 'The handcart back on the south bank, one wheel broken. They didn’t hit anyone. They didn’t need to.' },
      { kind: 'result', mission: 'acrossTheBridge' },
      { kind: 'intro', person: 'ignatov', caption: 'Lunch, Thursday, the Hotel Sevgorod. Wear something that wasn’t bought on Kiosk Row.' },
      { kind: 'title', act: 3 },
    ],
  },
  lunch: {
    id: 'lunch',
    number: 8,
    title: 'The second lunch',
    beats: [
      { kind: 'slug', caption: 'The Hotel Sevgorod restaurant: white tablecloths, a string trio.' },
      { kind: 'face', person: 'ignatov', speech: 'The Centre is a respectable district. Respectable districts are expensive.' },
      { kind: 'slug', caption: 'An envelope, slid under a folded napkin.' },
      { kind: 'face', person: 'ignatov', speech: 'It will be noted that you were helpful. The bridge is open. Mind the tolls.' },
      { kind: 'result', mission: 'secondLunch' },
    ],
  },
  truck: {
    id: 'truck',
    number: 9,
    title: 'The first truck',
    beats: [
      { kind: 'slug', caption: 'The highway west, birches, sixty kilometres. A striped barrier across the road.' },
      { kind: 'slug', caption: 'Men in army surplus. A lorry park behind them. The driver’s hands tight on the wheel.' },
      { kind: 'slug', caption: 'Dawn in your yard. The truck, doors open, empty.' },
      { kind: 'face', person: 'colonel', speech: 'The Colonel sends his regards. And his rates.' },
      { kind: 'result', mission: 'firstTruck' },
    ],
  },
  road: {
    id: 'road',
    number: 10,
    title: 'The road',
    beats: [
      { kind: 'slug', caption: 'The lorry park at Zastava, winter. The Colonel’s men loading their own lorries. The barrier raised.' },
      { kind: 'face', person: 'colonel', speech: 'You bought the road. You didn’t buy the men.' },
      { kind: 'face', person: 'colonel', speech: 'They’ll work for whoever pays on time. I taught them that.' },
      { kind: 'slug', caption: 'He salutes the road, not you. The barrier stays up now.' },
    ],
  },
  auction: {
    id: 'auction',
    number: 11,
    title: 'The first auction round',
    beats: [
      { kind: 'slug', caption: 'A hall in the Combine’s Palace of Culture. Folding chairs. A banner: PRIVATISATION · ROUND ONE.' },
      { kind: 'face', person: 'golovin', speech: 'Voronin’s family. I signed your uncle’s dismissal in 1984.' },
      { kind: 'slug', caption: 'The vouchers were the workers’. The workers hadn’t been paid in six months.' },
      { kind: 'result', mission: 'firstAuction' },
      { kind: 'title', act: 5 },
    ],
  },
  count: {
    id: 'count',
    number: 12,
    title: 'The count',
    beats: [
      { kind: 'slug', caption: 'A school gymnasium at midnight: ballot boxes, a tally board. Golovin in his coat, arms folded.' },
      { kind: 'face', person: 'dima', speech: 'That’s the Blocks. That’s the Blocks as well. That’s… all of the Blocks.' },
      { kind: 'face', person: 'golovin', speech: 'Voronin. The plant will outlive both of us.' },
      { kind: 'face', person: 'vitya', speech: 'Lights up there. The dachas.' },
    ],
  },
  governor: {
    id: 'governor',
    number: 13,
    title: 'Over the Governor’s head',
    beats: [
      { kind: 'slug', caption: 'The capital. A corridor with no end, pale rectangles on the wallpaper where portraits used to hang.' },
      { kind: 'slug', caption: 'You, on a bench. Nine hours later.' },
      { kind: 'face', person: 'prosecutor', speech: 'You came to ask us to stop looking. That was the interesting part.' },
      { kind: 'result', mission: 'overGovernor' },
      { kind: 'face', person: 'vitya', speech: 'Home?', caption: 'You don’t answer.' },
      { kind: 'title', act: 6 },
    ],
  },
  // Rock bottom (ADR 0051; Scene 15): played when the envelope is opened, not due from the save.
  envelope: {
    id: 'envelope',
    number: 15,
    title: 'The second envelope',
    beats: [
      { kind: 'slug', caption: 'The flat in Zarechye at night. A tram passing, empty.' },
      { kind: 'slug', caption: 'Payday came and there was nothing there. Vitya said nothing, which is how you know.' },
      { kind: 'face', person: 'dima', speech: 'It was in the notebook. Behind the map.' },
      { kind: 'envelope' },
    ],
  },
  // The endings (ADR 0053; Scenes 17 and 18): each plays when it's first reached, then the credits.
  holding: {
    id: 'holding',
    number: 17,
    title: 'The Holding',
    beats: [
      { kind: 'slug', caption: 'Nagornaya at dawn. A villa, and the whole city below it.' },
      { kind: 'slug', caption: 'On the table, a stack of tax receipts, squared off neatly.' },
      { kind: 'ending', ending: 'holding' },
      { kind: 'credits', ending: 'holding' },
    ],
  },
  empire: {
    id: 'empire',
    number: 18,
    title: 'The Empire',
    beats: [
      { kind: 'slug', caption: 'Nagornaya at night. The whole city lit.' },
      { kind: 'map', caption: 'The notebook, open at the map. Every district inked, every one marked yours.' },
      { kind: 'ending', ending: 'empire' },
      { kind: 'credits', ending: 'empire' },
    ],
  },
  'chapter-2': { id: 'chapter-2', title: ACT_TITLE[2], beats: [{ kind: 'chapter', act: 2 }] },
  'chapter-3': { id: 'chapter-3', title: ACT_TITLE[3], beats: [{ kind: 'chapter', act: 3 }] },
  'chapter-4': { id: 'chapter-4', title: ACT_TITLE[4], beats: [{ kind: 'chapter', act: 4 }] },
  'chapter-5': { id: 'chapter-5', title: ACT_TITLE[5], beats: [{ kind: 'chapter', act: 5 }] },
  'chapter-6': { id: 'chapter-6', title: ACT_TITLE[6], beats: [{ kind: 'chapter', act: 6 }] },
}

// The order scenes are checked in: the opening's, then the chapters.
// A mission's scene plays before the chapter it opens.
const ORDER: SceneId[] = [
  'prologue', 'crew', 'tolya', 'row', 'crate', 'chapter-2', 'terms', 'bridge', 'chapter-3', 'lunch', 'truck', 'chapter-4',
  'road', 'auction', 'chapter-5', 'count', 'governor', 'chapter-6', 'holding', 'empire',
]

// The arcs' scenes: the act each belongs to, and the moment it plays.
const ARC: Partial<Record<SceneId, { act: Act; happened: (s: PlayerState) => boolean }>> = {
  row: { act: 1, happened: (s) => s.districts.find((d) => d.id === 'kioskRow')?.controller === 'player' },
  crate: { act: 1, happened: (s) => s.missions.crateThroughPort?.result === 'failed' },
  terms: { act: 2, happened: (s) => s.missions.herTerms?.result === 'won' },
  bridge: { act: 2, happened: (s) => s.missions.acrossTheBridge?.result === 'failed' },
  lunch: { act: 3, happened: (s) => s.missions.secondLunch?.result === 'won' },
  truck: { act: 3, happened: (s) => s.missions.firstTruck?.result === 'failed' },
  road: { act: 4, happened: (s) => s.districts.find((d) => d.id === 'zastava')?.controller === 'player' },
  auction: { act: 4, happened: (s) => s.missions.firstAuction?.result === 'failed' },
  count: { act: 5, happened: (s) => s.politics.mayor },
  governor: { act: 5, happened: (s) => s.missions.overGovernor?.result === 'failed' },
  holding: { act: 6, happened: (s) => s.stats.endings.holding !== undefined },
  empire: { act: 6, happened: (s) => s.stats.endings.empire !== undefined },
}

// Whether the scene's moment passed before the save kept a seen-list (an old save), so it counts as seen.
function passedBefore(s: PlayerState, id: SceneId): boolean {
  const since = s.story.since
  const arc = ARC[id]
  if (arc) return since.act > arc.act
  if (id.startsWith('chapter-')) return since.act >= Number(id.slice('chapter-'.length))
  const at = id === 'prologue' ? 0 : id === 'crew' ? stepIndex('hire') : stepIndex('tolya')
  return since.done || since.act > 1 || since.step > at
}

// Whether the scene's moment has come.
function triggered(s: PlayerState, id: SceneId): boolean {
  const arc = ARC[id]
  if (arc) return arc.happened(s)
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
