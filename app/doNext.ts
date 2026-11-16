import { dayMs, type Action, type Config, type Derived, type PlayerState } from '../engine'
import { ACT_NAME, nextStep } from './acts'
import { fmt, fmtDuration } from './format'
import { glyph } from './glyphs'
import { GOAL_TAB, goalsView } from './goals'
import type { TabId } from './screens/types'

// "Do this next" on Home (#38, ADR 0068): one suggestion, and a button that does it or goes to it. Pure, so it's
// tested and can't disagree with the rest of Home. Nothing while the opening's banner leads, or while Tolya, a
// decision or rock bottom waits at the top of Home already. Otherwise the first of:
//   1. the vault nearly full: collect it (does it);
//   2. Dirty the fronts have room for, past what payday needs: deposit it, best rate first (does it);
//   3. crew with nothing to do: Ops;
//   4. what the next act waits on, once the Rep is in hand (`nextStep`, ADR 0050);
//   5. the act's first goal that can be done and paid for now, or else the first that can be done (ADR 0067);
//   6. nothing: when the vault will be full, so you know when to come back.

export type DoNext = { key: string; title: string; sub: string; cta?: string; tab?: TabId; actions?: Action[] }

// Presentation thresholds, like the sound mix: how full the vault is before collecting leads, and how many
// hours of yield idle Dirty is before washing it does.
export const DO_NEXT = { collectAtFill: 0.9, washAtYieldHours: 1 }

type Game = { state: PlayerState; derived: Derived; config: Config; now: number }

export function doNext(game: Game): DoNext | null {
  const { state: s, derived: d, config: c, now } = game
  if (!s.tutorial.done || s.rival.tolya.demand !== null || s.inbox.length > 0) return null
  if (s.rockBottom.pending && !s.rockBottom.usedActs.includes(s.act)) return null
  const H = c.time.hourMs

  if (s.vault >= 1 && s.vault >= d.vaultCap * DO_NEXT.collectAtFill) {
    const full = s.vault >= d.vaultCap - 1e-6
    const left = d.yieldPerHr > 0 ? ((d.vaultCap - s.vault) / d.yieldPerHr) * H : 0
    return {
      key: 'collect',
      title: full ? 'The vault’s full' : 'The vault’s nearly full',
      sub: full ? 'Income has stopped until you collect' : `Full in ${fmtDuration(left, c)}: then income stops`,
      cta: `Collect ${glyph.dirty}${fmt(s.vault)}`,
      actions: [{ type: 'COLLECT' }],
    }
  }

  // Payday is paid from Dirty, then the vault: what the vault can't cover stays back (Home's "won't cover payday").
  const payday = (Math.floor(now / dayMs(c)) + 1) * dayMs(c)
  const due = s.wagesOwed + s.upkeepOwed + (d.wagesPerHr + d.upkeepPerHr) * ((payday - now) / H)
  const keep = Math.max(0, due - s.vault)
  const deposits: Action[] = []
  let total = 0
  for (const f of [...d.perFront].sort((a, b) => b.rate - a.rate)) {
    if (f.frozen) continue
    const buffer = s.fronts.find((x) => x.id === f.id)?.buffer ?? 0
    const amount = Math.floor(Math.min(s.dirty - keep - total, f.bufferCap - buffer))
    if (amount < 1) continue
    deposits.push({ type: 'DEPOSIT', frontId: f.id, amount })
    total += amount
  }
  if (total >= Math.max(1, d.yieldPerHr * DO_NEXT.washAtYieldHours)) {
    return {
      key: 'wash',
      title: `Wash ${glyph.dirty}${fmt(total)} through the fronts`,
      sub: keep >= 1 ? `Dirty earns nothing sitting there · ${glyph.dirty}${fmt(keep)} stays back for payday` : 'Dirty earns nothing sitting there',
      cta: `Deposit ${glyph.dirty}${fmt(total)}`,
      actions: deposits,
    }
  }

  const idle = s.crew.filter((m) => m.status === 'idle')
  if (idle.length) {
    const who = idle.length === 1 ? `${idle[0].name.split(' ')[0]} is free` : `${idle.length} crew are free`
    return { key: 'crew', title: who, sub: 'Send them on a job: Dirty for you, experience for them', cta: 'Ops', tab: 'ops' }
  }

  const step = nextStep(s, c, now)
  if (step && !step.waiting) return { key: 'next', title: step.title, sub: step.sub, cta: 'Go', tab: step.tab }

  const goals = goalsView(s, c, d)
  // One you can do and pay for now, or else the first you can do, with what it needs in the hint.
  const open = goals?.rows.filter((g) => !g.done && !g.locked) ?? []
  const goal = open.find((g) => g.affordable) ?? open[0]
  if (goals && goal) {
    const hint = goal.hint ? ` · ${goal.hint}` : ''
    return { key: `goal:${goal.id}`, title: goal.text, sub: `Act ${ACT_NAME[goals.act]} goal, ${glyph.gold}${goals.gold}${hint}`, cta: 'Go', tab: GOAL_TAB[goal.id] }
  }

  const hours = d.yieldPerHr > 0 ? (d.vaultCap - s.vault) / d.yieldPerHr : Infinity
  return { key: 'calm', title: 'Nothing needs you', sub: Number.isFinite(hours) ? `The vault’s full in ${fmtDuration(hours * H, c)}` : 'Nothing’s earning: buy a business' }
}
