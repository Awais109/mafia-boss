import { dayMs, RANK_NAMES, type Config, type IncidentType, type InboxEffects, type InboxItem, type OpType, type PerkId, type PlayerState } from '../engine'
import { colors, glyph } from './components/ui'
import { fmt, fmtDuration } from './format'
import type { TabId } from './screens/types'
import type { Snapshot } from './store'

// What Home puts in front of the player (plan (e)): pending decisions first, then anything else
// that's costing them while they look away. Pure, so the tab badge and Home read the same list.

const OUTCOME = { full: 'a clean job', partial: 'got some of it', fail: 'it went wrong' } as const

export function itemTitle(item: InboxItem, c: Config): string {
  if (item.kind === 'incident') return c.incidents.types[item.ref as IncidentType]?.name ?? 'An incident'
  if (item.kind === 'report') return `${c.ops.list[item.ref as OpType]?.name ?? 'A job'}: the crew reports`
  return 'A promotion'
}

export function itemBody(item: InboxItem, s: PlayerState, c: Config): string {
  const names = (item.crewIds ?? []).map((id) => s.crew.find((m) => m.id === id)?.name ?? 'someone').join(' & ')
  if (item.kind === 'incident') {
    const text = c.incidents.types[item.ref as IncidentType]?.text ?? ''
    return names ? `${text} (${names})` : text
  }
  if (item.kind === 'report') return `${names || 'The crew'}: ${OUTCOME[item.outcome ?? 'partial']}. How do you want to handle it?`
  const m = s.crew.find((x) => x.id === item.ref)
  return `${names} made ${m ? RANK_NAMES[m.rank] : 'a new rank'}. Pick a perk: it stays for good.`
}

export function effectsText(e: InboxEffects, c?: Config): string {
  if (e.perk) return c ? c.crew.experience.perks[e.perk as PerkId].text : e.perk
  const sign = (n: number) => (n > 0 ? '+' : '−')
  const parts = [
    e.dirty ? `${sign(e.dirty)}${glyph.dirty}${fmt(Math.abs(e.dirty))}` : '',
    e.clean ? `${sign(e.clean)}${glyph.clean}${fmt(Math.abs(e.clean))}` : '',
    e.influence ? `${sign(e.influence)}${glyph.influence}${fmt(Math.abs(e.influence))}` : '',
    e.rep ? `${sign(e.rep)}${glyph.rep}${fmt(Math.abs(e.rep))}` : '',
    e.heat ? `${sign(e.heat)}${glyph.heat}${fmt(Math.abs(e.heat))}` : '',
    e.loyalty ? `${sign(e.loyalty)}${Math.abs(e.loyalty)} loyalty` : '',
    e.condition ? `${sign(e.condition)}${Math.abs(e.condition)}% condition` : '',
    e.disposition ? `Tolya ${sign(e.disposition)}${Math.abs(e.disposition)}` : '',
    e.cigarettes ? `${sign(e.cigarettes)}${fmt(Math.abs(e.cigarettes))} packs` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

export type HomeAlert = { key: string; text: string; color: string; tab?: TabId; cta?: string }

export function homeAlerts(game: Snapshot): HomeAlert[] {
  const { state: s, derived: d, config: c, now } = game
  const out: HomeAlert[] = []
  if (s.vault >= d.vaultCap - 1e-6) out.push({ key: 'vault', text: 'The vault is full: income has stopped.', color: colors.heat, tab: 'home' })
  const nextPayday = (Math.floor(now / dayMs(c)) + 1) * dayMs(c)
  const costsDue = s.wagesOwed + d.wagesPerHr * ((nextPayday - now) / c.time.hourMs)
  if (costsDue > 0 && s.dirty + s.vault < costsDue) {
    out.push({ key: 'costs', text: `Dirty on hand won’t cover the ◆${fmt(costsDue)} due at payday.`, color: colors.heat, tab: 'fronts', cta: 'Fronts →' })
  }
  const soon = s.offers.items.filter((o) => o.expiresAt > now && o.expiresAt - now <= c.time.hourMs)
  if (soon.length && s.crew.some((m) => m.status === 'idle')) {
    out.push({
      key: 'offers',
      text: `${soon.length} offer${soon.length === 1 ? '' : 's'} on the board expire${soon.length === 1 ? 's' : ''} in ${fmtDuration(soon[0].expiresAt - now, c)}.`,
      color: colors.warn,
      tab: 'ops',
      cta: 'Ops →',
    })
  }
  return out
}

export function sortedInbox(s: PlayerState): InboxItem[] {
  return [...s.inbox].sort((a, b) => a.expiresAt - b.expiresAt)
}

export function homeNeedsAttention(game: Snapshot): boolean {
  return game.state.inbox.length > 0 || game.state.rival.tolya.demand !== null || homeAlerts(game).length > 0
}
