import type { Config, Derived, DistrictId, FrontType, GameEvent, InboxItem, OfficialId, PlayerState, RacketType } from '../engine'

// What pops up as a modal while the player is actively in the app (ADR 0038), instead of only
// showing up quietly in the Log or stacked on Home. Diffing `inbox` catches all three decision
// kinds (report/incident/perk) uniformly, since a perk choice files with no event of its own —
// only `CREW_RANK_UP`, unconditionally, on every rank-up.

export type UnlockCategory = 'racket' | 'front' | 'district' | 'official'
export type UnlockedMap = Derived['unlocked']
type UnlockRef = { category: UnlockCategory; id: string }

export type QueuedNotice =
  | { kind: 'inbox'; item: InboxItem }
  | { kind: 'info'; event: GameEvent }
  | ({ kind: 'unlock' } & UnlockRef)
  | { kind: 'unlockBatch'; items: UnlockRef[] }

// Notable-but-not-a-decision events worth a pop-up. Bookkeeping (COLLECTED, OP_STARTED, config
// and debug events, etc.) stays out, same spirit as `away.ts`'s FOLDED set.
const INFO_EVENTS = new Set<GameEvent['type']>([
  'RAID',
  'ARREST',
  'WALKOUT',
  'WAGES_MISSED',
  'UPKEEP_MISSED',
  'DISTRICT_FLIPPED',
  'GOAL_DONE',
  'ACT_UNLOCKED',
  'ACT_CLEARED',
  'TOLYA_TICK',
  'CREW_INJURED',
  'LOAN_MISSED',
  'LENDING_DEFAULTED',
  'FRONT_FROZEN',
  'ELECTION_HELD',
  'ENDING_REACHED',
])

function isNoticeworthy(e: GameEvent): boolean {
  if (!INFO_EVENTS.has(e.type)) return false
  if (e.type === 'TOLYA_TICK' && e.result === 'nothing') return false
  return true
}

export function buildNotices(before: PlayerState, after: PlayerState, events: GameEvent[]): QueuedNotice[] {
  const notices: QueuedNotice[] = []
  const seen = new Set(before.inbox.map((i) => i.id))
  for (const item of after.inbox) {
    if (!seen.has(item.id)) notices.push({ kind: 'inbox', item })
  }
  for (const e of events) {
    if (isNoticeworthy(e)) notices.push({ kind: 'info', event: e })
  }
  return notices
}

// A racket/front/district/official newly unlocking (`derive().unlocked`) has no event of its own
// to hook — only `ACT_UNLOCKED` for the Act transition, not the individual things it opens up. So
// this diffs two `unlocked` snapshots directly instead. `prev === null` (nothing rendered yet)
// means "this is the starting state," not "everything in it just unlocked."
function newlyTrue<K extends string>(prev: Record<K, boolean>, next: Record<K, boolean>): K[] {
  return (Object.keys(next) as K[]).filter((k) => !prev[k] && next[k])
}

export function diffUnlocked(prev: UnlockedMap | null, next: UnlockedMap): QueuedNotice[] {
  if (!prev) return []
  const items: UnlockRef[] = [
    ...newlyTrue(prev.racket, next.racket).map((id): UnlockRef => ({ category: 'racket', id })),
    ...newlyTrue(prev.front, next.front).map((id): UnlockRef => ({ category: 'front', id })),
    ...newlyTrue(prev.district, next.district).map((id): UnlockRef => ({ category: 'district', id })),
    ...newlyTrue(prev.official, next.official).map((id): UnlockRef => ({ category: 'official', id })),
  ]
  if (items.length === 0) return []
  if (items.length === 1) return [{ kind: 'unlock', ...items[0] }]
  return [{ kind: 'unlockBatch', items }]
}

// Name + one-line description for an unlock notice, read from config (the single source for
// this copy — also reused by the How It Works screen).
export function unlockInfo(c: Config, ref: UnlockRef): { name: string; description: string; stats: string } {
  if (ref.category === 'racket') {
    const rt = c.rackets.types[ref.id as RacketType]
    return { name: rt.name, description: rt.description, stats: `◆${rt.baseYield}/hr · ▲${rt.baseHeat}` }
  }
  if (ref.category === 'front') {
    const ft = c.fronts.types[ref.id as FrontType]
    return { name: ft.name, description: ft.description, stats: `${Math.round(ft.rate * 100)}% rate · ◆${ft.throughput}/hr` }
  }
  if (ref.category === 'district') {
    const dc = c.districts.list[ref.id as DistrictId]
    return { name: dc.name, description: dc.description, stats: dc.buyout > 0 ? `●${dc.buyout} to buy out` : 'take it by pressure' }
  }
  const oc = c.officials.list[ref.id as OfficialId]
  return { name: oc.name, description: oc.description, stats: `+${oc.control} control · ✦${oc.cost}` }
}
