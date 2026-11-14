import type { Config, OfficialId } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive, type Derived } from '../core/derive'
import { hoursToMs } from '../core/time'
import type { PlayerState } from '../model/state'
import { spendClean } from './reputation'

// Officials' retainers (ADR 0064). An official's control isn't permanent: every `officials.retainer.everyDays`
// from purchase, their retainer comes due in Clean, `retainerHours` of the Dirty yield at the time, so it keeps
// pace with the city. It's paid by itself when the Clean is there (as Clean spent, it earns Rep like any); when it
// isn't, their control lapses (derive leaves them out) until the player pays it. Clean is what growth runs on, so
// a careful player keeps some back for it and a greedy one spends it and meets the heat.

const EPS = 1e-9

export function retainerFee(state: PlayerState, c: Config, id: OfficialId, d: Derived = derive(state, c)): number {
  return Math.max(1, Math.round(c.officials.list[id].retainerHours * d.yieldPerHr))
}

const period = (c: Config): number => hoursToMs(c, c.officials.retainer.everyDays * 24)

// An official whose control counts: on the payroll, and not lapsed.
export const onPayroll = (state: PlayerState, id: OfficialId): boolean => state.officials.includes(id) && !state.retainers[id]?.lapsed

// A new official's first retainer, due a period from now.
export function hireRetainer(state: PlayerState, c: Config, id: OfficialId, t: number): void {
  state.retainers[id] = { dueAt: t + period(c), lapsed: false }
}

// The retainers due within `hours`, at today's yield: what a careful player keeps back (the bot does).
export function retainersDueWithin(state: PlayerState, c: Config, t: number, hours: number): number {
  const d = derive(state, c)
  return state.officials.reduce((sum, id) => {
    const r = state.retainers[id]
    return r && !r.lapsed && r.dueAt <= t + hoursToMs(c, hours) ? sum + retainerFee(state, c, id, d) : sum
  }, 0)
}

// Retainers due at or before t, earliest first: paid from Clean, or lapsed.
export function retainersDue(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  const due = state.officials
    .filter((id) => {
      const r = state.retainers[id]
      return r && !r.lapsed && r.dueAt <= t
    })
    .sort((a, b) => state.retainers[a]!.dueAt - state.retainers[b]!.dueAt || state.officials.indexOf(a) - state.officials.indexOf(b))
  if (!due.length) return
  const d = derive(state, c)
  for (const id of due) {
    const r = state.retainers[id]!
    const fee = retainerFee(state, c, id, d)
    const at = r.dueAt
    if (state.clean >= fee - EPS) {
      spendClean(state, ctx, at, fee)
      r.dueAt = at + period(c)
      state.stats.retainers.paid++
      state.stats.retainers.clean += fee
      emit(ctx, at, { type: 'RETAINER_PAID', officialId: id, fee, auto: true })
    } else {
      r.lapsed = true
      state.stats.retainers.missed++
      emit(ctx, at, { type: 'RETAINER_MISSED', officialId: id, fee })
    }
  }
}

// PAY_RETAINER: a lapsed official back on the payroll, the next retainer a period from now.
export function payRetainer(state: PlayerState, ctx: Ctx, t: number, id: OfficialId): string | null {
  const { c } = ctx
  const r = state.retainers[id]
  if (!state.officials.includes(id) || !r) return 'Not on the payroll'
  if (!r.lapsed) return 'Already paid up'
  const fee = retainerFee(state, c, id)
  if (state.clean < fee - EPS) return 'Not enough Clean'
  spendClean(state, ctx, t, fee)
  r.lapsed = false
  r.dueAt = t + period(c)
  state.stats.retainers.paid++
  state.stats.retainers.clean += fee
  emit(ctx, t, { type: 'RETAINER_PAID', officialId: id, fee, auto: false })
  return null
}
