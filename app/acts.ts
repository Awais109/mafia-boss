import { ACTS, gameCleared, nextGate, type Act, type Config, type PlayerState } from '../engine'
import { fmt } from './format'

// The six acts as the app shows them (ADR 0040): numerals, what the next act asks for, and what it opens.

export const ACT_NAME: Record<Act, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' }

// What each act opens, in a line, for Home's "Next" card and the act notice.
export const ACT_OPENS: Record<Act, string> = {
  1: 'the streets: three districts, a factory, a front and a crew',
  2: 'the Restaurant front, more crew slots, the Port Quarter and Sovietsky Blocks',
  3: 'the Centre across the bridge: prosperity, the Card Club and Print Shop, hotels, the Cooperative Bank, City Hall and tier 6',
  4: 'Zastava and the road to the border: premium cigarettes by convoy, the Colonel, the Import–Export Company and the Customs Chief',
  5: 'the Kombinat upriver: the Combine at auction, public opinion, the Ministry’s attention, and the election against Golovin',
  6: 'Nagornaya, the hills: Legalize, the Holding, the reckoning, and the two endings',
}

export type ActProgress = {
  act: Act
  cleared: boolean // the final built act's gate has been met
  nextAct: Act | null
  label: string // the header's Rep line after the number
  value: number // bar progress
  max: number
  requirements: { text: string; done: boolean }[] // everything the next gate asks for
}

export function actProgress(s: PlayerState, c: Config): ActProgress {
  const cleared = gameCleared(s, c)
  const next = nextGate(s, c)
  const requirements: ActProgress['requirements'] = []
  if (next) {
    const g = next.gate
    if (g.goals) {
      const done = s.goals.done.length
      requirements.push({ text: `every Act I goal (${done}/${c.goals.list.length})`, done: c.goals.list.every((id) => s.goals.done.includes(id)) })
    }
    if (g.rep !== undefined) requirements.push({ text: `★${fmt(g.rep)} Reputation`, done: s.reputation >= g.rep })
    for (const id of g.holds ?? []) {
      requirements.push({ text: `hold ${c.districts.list[id].name}`, done: s.districts.find((d) => d.id === id)?.controller === 'player' })
    }
    for (const f of g.fronts ?? []) requirements.push({ text: `own the ${c.fronts.types[f].name}`, done: s.fronts.some((x) => x.type === f) })
    if (g.mayor) requirements.push({ text: 'win an election', done: s.politics.mayor })
  }
  const clearedAt = s.stats.actClearedAt[s.act]
  if (cleared && clearedAt !== undefined) {
    return { act: s.act, cleared, nextAct: null, label: `${fmt(s.reputation)} · Act ${ACT_NAME[s.act]} cleared`, value: 1, max: 1, requirements: [] }
  }
  if (!next) {
    // Act VI has no gate after it: either ending clears it (ADR 0045).
    const earners = s.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises')
    const legal = earners.filter((r) => r.legal).length
    const held = s.districts.filter((d) => d.controller === 'player').length
    const won = Math.min(s.stats.hearings.won, c.reckoning.empireWins)
    requirements.push({ text: `the Holding: every business legal (${legal}/${earners.length})`, done: s.stats.endings.holding !== undefined })
    requirements.push({
      text: `the Empire: every district held (${held}/${s.districts.length}) and ${c.reckoning.empireWins} hearings won (${won})`,
      done: s.stats.endings.empire !== undefined,
    })
    const toward = Math.max(earners.length ? legal / earners.length : 0, (held / s.districts.length + won / c.reckoning.empireWins) / 2)
    return { act: s.act, cleared, nextAct: null, label: `${fmt(s.reputation)} · ${legal}/${earners.length} legal · ${won}/${c.reckoning.empireWins} hearings won`, value: toward, max: 1, requirements }
  }
  const beyond = next.act > c.progression.finalAct
  const target = beyond ? `to clear Act ${ACT_NAME[s.act]}` : `to Act ${ACT_NAME[next.act]}`
  if (next.gate.goals) {
    const done = s.goals.done.length
    return { act: s.act, cleared, nextAct: next.act, label: `${fmt(s.reputation)} · ${done}/${c.goals.list.length} goals ${target}`, value: done, max: c.goals.list.length, requirements }
  }
  const rep = next.gate.rep ?? 0
  const extra = requirements.filter((r) => !r.text.includes('Reputation') && !r.done).length
  return {
    act: s.act,
    cleared,
    nextAct: beyond ? null : next.act,
    label: `${fmt(s.reputation)}/${fmt(rep)} ${target}${extra ? ` (+${extra} more)` : ''}`,
    value: Math.min(s.reputation, rep),
    max: Math.max(1, rep),
    requirements,
  }
}

// The act milestones a save has passed, oldest first: "Act II reached", …, "Act III cleared".
export function actMilestones(s: PlayerState, c: Config): { label: string; t: number }[] {
  const out: { label: string; t: number }[] = []
  for (const a of ACTS) {
    const t = s.stats.actClearedAt[a]
    if (t === undefined) continue
    const opened = a < 6 && s.act > a
    out.push({ label: opened ? `Act ${ACT_NAME[(a + 1) as Act]} reached` : `Act ${ACT_NAME[a]} cleared`, t })
  }
  return out
}

