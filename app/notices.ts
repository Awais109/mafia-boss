import type { Config, Derived, DistrictId, FrontType, GameEvent, InboxItem, OfficialId, PlayerState, RacketType } from '../engine'
import { fmt } from './format'

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
// and debug events, etc.) stays out, same spirit as `away.ts`'s FOLDED set. An act opening isn't here: its
// chapter is a scene, due from state (ADR 0049), so it plays even if the act opened while the app was shut.
const INFO_EVENTS = new Set<GameEvent['type']>([
  'RAID',
  'ARREST',
  'WALKOUT',
  'WAGES_MISSED',
  'UPKEEP_MISSED',
  'DISTRICT_FLIPPED',
  'GOAL_DONE',
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

// What an unlock notice says about one thing (design: Notice · Just unlocked): its name, its kind, its
// description from config, and a line of figures with glyphs (price, yield or rate, heat, what it sells).
// Prices come from `derive`, so they're what the player would pay now.
export function unlockInfo(c: Config, d: Derived, ref: UnlockRef): { name: string; kind: string; description: string; stats: string } {
  if (ref.category === 'racket') {
    const rt = c.rackets.types[ref.id as RacketType]
    const figures =
      rt.kind === 'premises'
        ? [`●${fmt(d.costs.racket[ref.id as RacketType])}`, rt.upkeepPerHr ? `◆${fmt(rt.upkeepPerHr)}/h upkeep` : '']
        : [`●${fmt(d.costs.racket[ref.id as RacketType])}`, `◆${fmt(rt.baseYield)}/h`, `▲${fmt(rt.baseHeat)}`, rt.kind === 'joint' && rt.sellsPerHr ? `sells ▮${fmt(rt.sellsPerHr)}/h` : '']
    return { name: rt.name, kind: rt.kind, description: rt.description, stats: figures.filter(Boolean).join(' · ') }
  }
  if (ref.category === 'front') {
    const ft = c.fronts.types[ref.id as FrontType]
    return { name: ft.name, kind: 'front', description: ft.description, stats: `●${fmt(ft.cost)} · rate ${Math.round(ft.rate * 100)}% · washes ◆${fmt(ft.throughput)}/h` }
  }
  if (ref.category === 'district') {
    const dc = c.districts.list[ref.id as DistrictId]
    const lots = `${dc.premisesLots} lot${dc.premisesLots === 1 ? '' : 's'}`
    const cut = dc.tribute > 0 ? `${Math.round(dc.tribute * 100)}% tribute` : 'no tribute'
    const take = dc.auction ? `●${fmt(dc.buyout)} at auction` : dc.buyout > 0 ? `●${fmt(dc.buyout)} to buy out` : 'yours when you arrive'
    return { name: dc.name, kind: 'district', description: dc.description, stats: `${dc.allows.length} spots · ${lots} · ${cut} · ${take}` }
  }
  const oc = c.officials.list[ref.id as OfficialId]
  return {
    name: oc.name,
    kind: 'official',
    description: oc.description,
    stats: `payroll ✦${fmt(oc.cost)} · +${fmt(oc.control)} control · +✦${fmt(c.officials.influencePerHrEach * 24)} a day`,
  }
}
