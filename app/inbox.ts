import { contestOdds, dayMs, electionScheduled, RANK_NAMES, winChance, type Config, type IncidentType, type InboxEffects, type InboxItem, type OpType, type PerkId, type PlayerState } from '../engine'
import type { IconName, Resource } from './components/Glyph'
import { glyph } from './components/ui'
import { fmt, fmtDuration, pct } from './format'
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

export function effectsText(e: InboxEffects, c?: Config, game?: Snapshot): string {
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
    e.closeHours ? `shut for ${fmt(e.closeHours)}h` : '',
    e.injureHours ? `hurt for ${fmt(e.injureHours)}h` : '',
    e.freezeHours ? `your busiest front frozen for ${fmt(e.freezeHours)}h` : '',
    e.hearingWon ? 'one hearing toward the Empire' : '',
  ].filter(Boolean)
  // A contest: who'd go, the odds, and what each branch does (ADR 0042).
  if (e.contest) {
    const k = e.contest
    const odds = game ? ` (${pct(contestOdds(game.state, game.config, k))})` : ''
    const win = effectsText(k.win, c) || 'nothing more'
    const lose = effectsText(k.lose, c) || 'nothing more'
    parts.push(`best ${STAT_WORD[k.stat]} vs ${fmt(k.diff)}${odds}: win ${win}; lose ${lose}`)
  }
  return parts.join(' · ')
}

const STAT_WORD = { muscle: 'Muscle', brains: 'Brains', nerve: 'Nerve' } as const

// Home's alerts (design: Home · Alerts): what's wrong, why in a line, and the tab that fixes it.
export type HomeAlert = { key: string; title: string; sub?: string; icon: Resource | IconName; tone: 'warn' | 'bad'; tab?: TabId; cta?: string }

const names = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const first = (name: string) => name.split(' ')[0]

export function homeAlerts(game: Snapshot): HomeAlert[] {
  const { state: s, derived: d, config: c, now } = game
  const out: HomeAlert[] = []
  const d$ = glyph.dirty
  if (s.vault >= d.vaultCap - 1e-6) {
    out.push({ key: 'vault', title: 'The vault is full', sub: 'Income has stopped until you collect', icon: 'dirty', tone: 'bad', tab: 'home' })
  }
  const nextPayday = (Math.floor(now / dayMs(c)) + 1) * dayMs(c)
  const costsDue = s.wagesOwed + s.upkeepOwed + (d.wagesPerHr + d.upkeepPerHr) * ((nextPayday - now) / c.time.hourMs)
  if (costsDue > 0 && s.dirty + s.vault < costsDue) {
    out.push({
      key: 'costs',
      title: 'Dirty won’t cover payday',
      sub: `${d$}${fmt(costsDue)} due in ${fmtDuration(nextPayday - now, c)}, ${d$}${fmt(s.dirty + s.vault)} on hand and in the vault`,
      icon: 'dirty',
      tone: 'bad',
      tab: 'fronts',
      cta: 'Fronts',
    })
  }
  const low = s.crew.filter((m) => !m.nephew && m.loyalty < c.crew.loyalty.lowThreshold)
  if (low.length) {
    out.push({
      key: 'walkout',
      title: `${names(low.map((m) => first(m.name)))} might walk out`,
      sub: `Loyalty under ${c.crew.loyalty.lowThreshold}: a ${pct(c.crew.loyalty.lowEventChancePerDay)} chance each morning`,
      icon: 'walkout',
      tone: 'bad',
      tab: 'crew',
      cta: 'Crew',
    })
  }
  if (s.stockEmpty) {
    out.push({ key: 'stock', title: 'Cigarettes are out', sub: `Made ${fmt(d.supply.madePerHr)} an hour, the joints want ${fmt(d.supply.demandPerHr)}`, icon: 'packs', tone: 'bad', tab: 'rackets', cta: 'Business' })
  } else if (d.supply.hoursToEmpty < 6) {
    const left = fmtDuration(d.supply.hoursToEmpty * c.time.hourMs, c)
    out.push({ key: 'stock', title: `Cigarettes run out in ${left}`, sub: `Made ${fmt(d.supply.madePerHr)} an hour, sold ${fmt(d.supply.soldPerHr)}`, icon: 'packs', tone: 'warn', tab: 'rackets', cta: 'Business' })
  }
  if (s.premiumEmpty) {
    out.push({ key: 'premium', title: 'Premium is out', sub: `The road joints want ${fmt(d.premium.demandPerHr)} an hour; convoys and Zhanna refill it`, icon: 'premium', tone: 'bad', tab: 'ops', cta: 'Ops' })
  } else if (d.premium.hoursToEmpty < 6) {
    const left = fmtDuration(d.premium.hoursToEmpty * c.time.hourMs, c)
    const made = d.premium.madePerHr > 0 ? `Made ${fmt(d.premium.madePerHr)} an hour, sold ${fmt(d.premium.soldPerHr)}` : `Sold ${fmt(d.premium.soldPerHr)} an hour; convoys and Zhanna refill it`
    out.push({ key: 'premium', title: `Premium runs out in ${left}`, sub: made, icon: 'premium', tone: 'warn', tab: 'ops', cta: 'Ops' })
  }
  if (s.inspected) {
    out.push({
      key: 'inspected',
      title: 'Inspections are cutting income',
      sub: `Heat ${Math.round(s.heat)} · −${pct(1 - c.heat.inspectYieldMult)} until it’s under ${c.heat.inspectThreshold}`,
      icon: 'heat',
      tone: 'warn',
      tab: 'heat',
      cta: 'Heat',
    })
  }
  // Act V (ADR 0044): Moscow closing in, and a count you'd lose.
  if (s.act >= c.opinion.fromAct && s.politics.attention >= c.ministry.freezeAt - 10 && !s.fronts.some((f) => f.frozenUntil !== undefined)) {
    out.push({ key: 'ministry', title: 'The Ministry is close to a freeze', sub: `Attention ${Math.round(s.politics.attention)} of ${c.ministry.freezeAt}: then it freezes a front`, icon: 'ministry', tone: 'bad', tab: 'turf', cta: 'Map' })
  }
  if (electionScheduled(s) && s.politics.nextElectionAt - now <= 24 * c.time.hourMs && winChance(s, c) < 0.5) {
    out.push({
      key: 'election',
      title: 'You’d lose the coming election',
      sub: `${pct(winChance(s, c))} to win · the count in ${fmtDuration(s.politics.nextElectionAt - now, c)}`,
      icon: 'election',
      tone: 'warn',
      tab: 'turf',
      cta: 'Map',
    })
  }
  const soon = s.offers.items.filter((o) => o.expiresAt > now && o.expiresAt - now <= c.time.hourMs)
  const idle = s.crew.filter((m) => m.status === 'idle')
  if (soon.length && idle.length) {
    out.push({
      key: 'offers',
      title: `${soon.length} offer${soon.length === 1 ? '' : 's'} on the board go${soon.length === 1 ? 'es' : ''} in ${fmtDuration(soon[0].expiresAt - now, c)}`,
      sub: `${names(idle.map((m) => first(m.name)))} ${idle.length === 1 ? 'is' : 'are'} free`,
      icon: 'ops',
      tone: 'warn',
      tab: 'ops',
      cta: 'Ops',
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
