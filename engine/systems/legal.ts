import type { Config, Ending } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive, type Derived } from '../core/derive'
import * as F from '../core/formulas'
import { dayIndex } from '../core/time'
import type { PlayerState } from '../model/state'
import { openAfterStory } from './after'
import { raiseIncident } from './inbox'
import { spendClean } from './reputation'

// Act VI (ADR 0045): the endgame turns Lyosha's rule around. A business made legal earns Clean directly, at
// `legalize.cleanShare` of its gross yield (the rest is tax), draws no heat and pays no tribute; it needs no
// front, and no vault. The past keeps its books: a case file built from a lifetime of raids, arrests, frozen
// fronts and missed payments makes hearings harder to fight, and hearings come at day starts while any of
// the business is still illegal. Two endings, both recorded and neither final: the Holding (everything legal)
// and the Empire (every district held, and enough hearings beaten in court).

export const legalOn = (state: PlayerState, c: Config): boolean => state.act >= c.legalize.fromAct

// What legalizing a business costs: hours of its tier yield, in Clean.
export function legalizeCost(state: PlayerState, c: Config, racketId: string): number {
  const r = state.rackets.find((x) => x.id === racketId)
  return r ? Math.round(c.legalize.hoursOfYield * F.tierYield(c, r.type, r.tier)) : 0
}

// Why this business can't be made legal right now, or null (Clean aside).
export function legalizeBlocked(state: PlayerState, c: Config, racketId: string): string | null {
  if (!legalOn(state, c)) return 'Nothing can be made legal yet'
  const r = state.rackets.find((x) => x.id === racketId)
  if (!r) return 'No such business'
  if (c.rackets.types[r.type].kind === 'premises') return 'Premises have nothing to make legal'
  if (r.legal) return 'Already legal'
  if (state.politics.opinion < c.legalize.minOpinion) return `The city won’t stand for it: opinion ${c.legalize.minOpinion} needed`
  return null
}

export function legalize(state: PlayerState, ctx: Ctx, t: number, racketId: string): string | null {
  const { c } = ctx
  const blocked = legalizeBlocked(state, c, racketId)
  if (blocked) return blocked
  const cost = legalizeCost(state, c, racketId)
  if (state.clean < cost - 1e-6) return 'Not enough Clean'
  const r = state.rackets.find((x) => x.id === racketId)!
  spendClean(state, ctx, t, cost)
  r.legal = true
  state.stats.legalized++
  emit(ctx, t, { type: 'LEGALIZED', racketId, cost })
  checkEndings(state, ctx, t)
  return null
}

// The case file: what the prosecutor has on you, from lifetime stats.
export function caseFile(state: PlayerState, c: Config): number {
  const rk = c.reckoning
  const st = state.stats
  const points = st.raids * rk.perRaid + st.arrests * rk.perArrest + st.frontsFrozen * rk.perFreeze + st.loans.missed * rk.perMissedPayment
  return Math.min(rk.maxCase, points)
}

// The share of gross yield still illegal: all of it until something goes legal.
export function illegalShare(d: Derived): number {
  const total = d.yieldPerHr + d.tributePerHr + d.legalGrossPerHr
  return total > 0 ? (d.yieldPerHr + d.tributePerHr) / total : 0
}

export function hearingChance(state: PlayerState, c: Config, d: Derived = derive(state, c)): number {
  if (state.act < c.reckoning.fromAct || illegalShare(d) <= 0) return 0
  return Math.min(1, c.reckoning.base + c.reckoning.perIllegalShare * illegalShare(d))
}

// Day start: a hearing may be filed, one at a time, on its own stream.
export function reckoningDayBoundary(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (state.act < c.reckoning.fromAct || state.inbox.some((i) => i.ref === 'hearing')) return
  const rand = ctx.rng.derive('hearing', String(dayIndex(c, t)))
  if (!rand.chance(hearingChance(state, c))) return
  state.stats.hearings.held++
  raiseIncident(state, ctx, t, 'hearing', () => rand.next(), { caseFile: caseFile(state, c) })
}

export function endingMet(state: PlayerState, c: Config, ending: Ending): boolean {
  if (ending === 'holding') {
    const earners = state.rackets.filter((r) => c.rackets.types[r.type].kind !== 'premises')
    return earners.length > 0 && earners.every((r) => r.legal)
  }
  return state.districts.every((d) => d.controller === 'player') && state.stats.hearings.won >= c.reckoning.empireWins
}

// Records each ending the first time it's met; the first one clears Act VI. Play carries on.
export function checkEndings(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  if (state.act < c.legalize.fromAct) return
  for (const ending of ['holding', 'empire'] as const) {
    if (state.stats.endings[ending] !== undefined || !endingMet(state, c, ending)) continue
    state.stats.endings[ending] = t
    emit(ctx, t, { type: 'ENDING_REACHED', ending })
    if (state.act === c.progression.finalAct && state.stats.actClearedAt[state.act] === undefined) {
      state.stats.actClearedAt[state.act] = t
      emit(ctx, t, { type: 'ACT_CLEARED', act: state.act })
      openAfterStory(state, ctx, t)
    }
  }
}
