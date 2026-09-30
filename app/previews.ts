import { DISTRICT_IDS, FRONT_TYPES, OFFICIAL_IDS, RACKET_TYPES, type Act } from '../engine'
import type { QueuedNotice } from './notices'
import type { Snapshot } from './store'

// Notices to look at without waiting for the game to raise them: Debug's Preview panel and, on web, the
// screenshot rig's `?preview=<name>` (docs/app.md). Nothing here changes state: a previewed decision is a
// real pending one, and choosing in it resolves it.

export type PreviewName = 'decision' | 'unlock' | 'event' | 'chapter2' | 'chapter3' | 'chapter4' | 'chapter5' | 'chapter6'

export const PREVIEWS: { name: PreviewName; title: string }[] = [
  { name: 'decision', title: 'A decision' },
  { name: 'unlock', title: 'Just unlocked' },
  { name: 'event', title: 'An event' },
  { name: 'chapter2', title: 'Act II' },
  { name: 'chapter3', title: 'Act III' },
  { name: 'chapter4', title: 'Act IV' },
  { name: 'chapter5', title: 'Act V' },
  { name: 'chapter6', title: 'Act VI' },
]

// The notice for a preview, or null when there's nothing to show it with (no decision pending).
export function previewNotice(game: Snapshot, name: PreviewName): QueuedNotice | null {
  const { state: s, config: c, now } = game
  if (name === 'decision') return s.inbox[0] ? { kind: 'inbox', item: s.inbox[0] } : null
  if (name === 'unlock') {
    // Everything the current act opens, as the act page's companion notice would list it.
    const items = [
      ...DISTRICT_IDS.filter((id) => c.districts.list[id].act === s.act).map((id) => ({ category: 'district' as const, id })),
      ...FRONT_TYPES.filter((t) => c.fronts.types[t].act === s.act).map((id) => ({ category: 'front' as const, id })),
      ...RACKET_TYPES.filter((t) => c.rackets.types[t].act === s.act).map((id) => ({ category: 'racket' as const, id })),
      ...OFFICIAL_IDS.filter((id) => c.officials.list[id].act === s.act).map((id) => ({ category: 'official' as const, id })),
    ]
    return items.length ? { kind: 'unlockBatch', items } : null
  }
  if (name === 'event') return { kind: 'info', event: { type: 'RAID', t: now, heat: s.heat, seized: Math.round(s.vault * c.heat.raidSeizePct), shielded: 0 } }
  const act = Number(name.slice('chapter'.length)) as Act
  return { kind: 'info', event: { type: 'ACT_UNLOCKED', t: now, act } }
}
