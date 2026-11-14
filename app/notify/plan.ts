import { hoursToMs, reconcile, type Config, type GameEvent, type PlayerState } from '../../engine'
import { fmt } from '../format'
import { itemTitle } from '../inboxTitle'

// Local notifications (ADR 0058; docs/notifications.md): what will happen if the player stays away. The engine
// is deterministic and seeded, so playing the save forward with nobody touching it gives exactly the moments
// to come: the vault filling, the crew coming back (with their report), a payday missed, Tolya's demand, an
// incident to decide, or a decision about to take its default. Pure, so it's tested; app/notify/notifier.ts schedules what this returns.

export type NotifyKind = 'payday' | 'tolya' | 'expiring' | 'decision' | 'back' | 'vault'

export type Planned = { kind: NotifyKind; at: number; title: string; body: string } // `at` in real ms

// How far ahead to look, how many to send, how long before a decision's default to warn, the quiet hours
// (local, [from, to)), and how close two can be before only the more urgent is kept. Presentation, not game
// numbers, like the sound mix.
export const NOTIFY = { aheadHours: 24, maxTotal: 4, expiringLeadMinutes: 60, quietFrom: 22, quietTo: 8, minGapMinutes: 20 }

// Most urgent first: when two land together, the earlier in this list is kept.
const URGENCY: NotifyKind[] = ['payday', 'tolya', 'expiring', 'decision', 'back', 'vault']

const MIN = 60_000

// `offsetMs`: game time minus real time (Debug's offset and the hours bought with gold). `tzOffsetMin`: the
// device's Date.getTimezoneOffset(), for the quiet hours.
export function planNotifications(state: PlayerState, c: Config, now: number, opts: { offsetMs: number; tzOffsetMin: number }): Planned[] {
  const ahead = reconcile(state, now + hoursToMs(c, NOTIFY.aheadHours), c)
  const events = ahead.events.filter((e) => e.t > now)
  const first: Partial<Record<NotifyKind, Planned>> = {}
  const offer = (kind: NotifyKind, gameAt: number, title: string, body: string) => {
    if (gameAt <= now || (first[kind] && first[kind].at <= gameAt - opts.offsetMs)) return
    first[kind] = { kind, at: gameAt - opts.offsetMs, title, body }
  }

  // A job that comes back files its crew's report at the same moment: that's one notification, not two.
  const reported = new Set(events.flatMap((e) => (e.type === 'REPORT_FILED' ? [e.opId] : [])))
  for (const e of events) {
    const back = backLine(e, ahead.state, c)
    if (back) offer('back', e.t, back.title, e.type === 'OP_RESOLVED' && reported.has(e.opId) ? `${back.body} Their report is waiting.` : back.body)
    if (e.type === 'VAULT_CAPPED') offer('vault', e.t, 'The vault’s full', 'Collect it to get income moving again.')
    if (e.type === 'WAGES_MISSED') offer('payday', e.t, 'Payday came up short', 'There wasn’t enough Clean for wages. The crew’s loyalty drops until they’re paid.')
    if (e.type === 'TOLYA_TICK' && e.result === 'tribute')
      offer('tolya', e.t, 'Tolya’s at the door', `He wants his cut: ◆${fmt(Math.round(e.amount ?? 0))}. Pay, haggle or refuse before he’s back.`)
    if (e.type === 'INCIDENT_RAISED') offer('decision', e.t, 'A decision is waiting', `${itemTitle({ kind: 'incident', ref: e.incidentType }, c)}.`)
    if (e.type === 'INCIDENT_RAISED' || e.type === 'REPORT_FILED')
      expiring(e.expiresAt, itemTitle(e.type === 'INCIDENT_RAISED' ? { kind: 'incident', ref: e.incidentType } : { kind: 'report', ref: e.opType }, c))
  }
  // Decisions already waiting can expire too.
  for (const item of state.inbox) expiring(item.expiresAt, itemTitle(item, c))
  function expiring(expiresAt: number, title: string) {
    offer('expiring', expiresAt - NOTIFY.expiringLeadMinutes * MIN, 'A decision expires within the hour', `${title}. If you don’t choose, the default happens.`)
  }

  return settle(Object.values(first), opts.tzOffsetMin)
}

// Nothing at night: a moment in the quiet hours waits for the morning. Then, of any that land within the gap
// of each other, only the most urgent, at the earlier time; then the soonest few.
export function settle(planned: Planned[], tzOffsetMin: number): Planned[] {
  const shifted = planned.map((p) => ({ ...p, at: morningIfQuiet(p.at, tzOffsetMin) }))
  shifted.sort((a, b) => a.at - b.at || URGENCY.indexOf(a.kind) - URGENCY.indexOf(b.kind))
  const kept: Planned[] = []
  for (const p of shifted) {
    const near = kept.findIndex((k) => Math.abs(k.at - p.at) < NOTIFY.minGapMinutes * MIN)
    if (near < 0) kept.push(p)
    else if (URGENCY.indexOf(p.kind) < URGENCY.indexOf(kept[near].kind)) kept[near] = { ...p, at: kept[near].at }
  }
  return kept.slice(0, NOTIFY.maxTotal)
}

// Who's back from what, for a job, mission, contract, errand or training that comes back.
function backLine(e: GameEvent, s: PlayerState, c: Config): { title: string; body: string } | null {
  const names = (ids: string[]) => {
    const first = ids.map((id) => s.crew.find((m) => m.id === id)?.name.split(' ')[0]).filter((n): n is string => !!n)
    if (!first.length) return 'The crew'
    return first.length === 1 ? first[0] : `${first.slice(0, -1).join(', ')} and ${first[first.length - 1]}`
  }
  const back = (ids: string[]) => `${names(ids)} ${ids.length === 1 ? 'is' : 'are'} back`
  switch (e.type) {
    case 'OP_RESOLVED': {
      const job = c.ops.list[e.opType]?.name ?? 'The job'
      return { title: back(e.crewIds), body: `${job}: ${e.outcome === 'full' ? 'clean' : e.outcome === 'partial' ? 'partly done' : 'it went wrong'}.` }
    }
    case 'MISSION_RESOLVED':
      return { title: back(e.crewIds), body: `${c.missions.list[e.missionId]?.name ?? 'The mission'}: come and see how it went.` }
    case 'CONTRACT_DONE':
      return { title: back(e.crewIds), body: `${e.name}: done. ●${fmt(Math.round(e.clean))} and ▰${e.gold} paid.` }
    case 'ERRAND_DONE':
      return { title: back(e.crewIds), body: `${e.name}: done.` }
    case 'TRAINING_DONE':
      return { title: back([e.crewId]), body: `${e.name}: done.` }
    default:
      return null
  }
}

// The real time to show it: as is, or 08:00 local after a quiet night.
export function morningIfQuiet(at: number, tzOffsetMin: number): number {
  const local = at - tzOffsetMin * MIN
  const hour = new Date(local).getUTCHours()
  if (hour >= NOTIFY.quietTo && hour < NOTIFY.quietFrom) return at
  const day = new Date(local)
  day.setUTCHours(NOTIFY.quietTo, 0, 0, 0)
  if (hour >= NOTIFY.quietFrom) day.setUTCDate(day.getUTCDate() + 1)
  return day.getTime() + tzOffsetMin * MIN
}
