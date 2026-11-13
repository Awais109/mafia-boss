import { DISTRICT_IDS, FRONT_TYPES, OFFICIAL_IDS, RACKET_TYPES } from '../engine'
import type { QueuedNotice } from './notices'
import { SCENES, type SceneId } from './scenes'
import { store, type Snapshot } from './store'

// Pop-ups and scenes to look at without waiting for the game to raise them: Debug's Preview panel and, on
// web, the screenshot rig's `?preview=<name>` (docs/app.md). A preview changes nothing: a previewed decision
// is a real pending one (choosing in it resolves it), and a scene replays without touching what's due.

type NoticePreview = 'decision' | 'unlock' | 'event' | 'keys'
export type PreviewName = NoticePreview | SceneId

export const PREVIEWS: { name: PreviewName; title: string }[] = [
  { name: 'decision', title: 'A decision' },
  { name: 'unlock', title: 'Just unlocked' },
  { name: 'event', title: 'An event' },
  { name: 'keys', title: 'The keys' },
  ...(Object.keys(SCENES) as SceneId[]).map((id) => ({ name: id, title: SCENES[id].title })),
]

// The notice for a notice preview, or null when there's nothing to show it with (no decision pending).
function previewNotice(game: Snapshot, name: NoticePreview): QueuedNotice | null {
  const { state: s, config: c, now } = game
  if (name === 'decision') return s.inbox[0] ? { kind: 'inbox', item: s.inbox[0] } : null
  if (name === 'unlock') {
    // Everything the current act opens, as the act's own unlock notice would list it.
    const items = [
      ...DISTRICT_IDS.filter((id) => c.districts.list[id].act === s.act).map((id) => ({ category: 'district' as const, id })),
      ...FRONT_TYPES.filter((t) => c.fronts.types[t].act === s.act).map((id) => ({ category: 'front' as const, id })),
      ...RACKET_TYPES.filter((t) => c.rackets.types[t].act === s.act).map((id) => ({ category: 'racket' as const, id })),
      ...OFFICIAL_IDS.filter((id) => c.officials.list[id].act === s.act).map((id) => ({ category: 'official' as const, id })),
    ]
    return items.length ? { kind: 'unlockBatch', items } : null
  }
  if (name === 'keys') {
    const r = s.rackets[0]
    return r ? { kind: 'info', event: { type: 'LOAN_REPOSSESSED', t: now, racketId: r.id, racketType: r.type, districtId: r.districtId, owed: 0 } } : null
  }
  return { kind: 'info', event: { type: 'RAID', t: now, heat: s.heat, seized: Math.round(s.vault * c.heat.raidSeizePct), shielded: 0 } }
}

// Whether the preview has something to show.
export function canPreview(game: Snapshot, name: PreviewName): boolean {
  return name in SCENES || previewNotice(game, name as NoticePreview) !== null
}

export function showPreview(game: Snapshot, name: PreviewName): void {
  if (name in SCENES) return store.playScene(name as SceneId)
  const notice = previewNotice(game, name as NoticePreview)
  if (notice) store.previewNotice(notice)
}
