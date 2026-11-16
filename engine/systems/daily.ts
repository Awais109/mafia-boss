import type { Config } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { dayIndex } from '../core/time'
import type { PlayerState } from '../model/state'
import { grantGold } from './gold'

// The daily reward (ADR 0069). The first claim of each game day pays `daily.gold[day − 1]` bars, by day of the
// streak; past the last day the week starts over. A missed day takes `dropPerMissedDay` days off the streak
// rather than all of it. Game days, like paydays: Debug's offset is Debug's, a gold skip of up to a day costs
// more than a claim pays, and a device clock moved forward is #21's to stop.

// What claiming at t would pay, and the streak it makes; null when there's nothing to claim.
export function dailyOffer(state: PlayerState, c: Config, t: number): { gold: number; streak: number } | null {
  if (!c.daily.enabled || !state.tutorial.done) return null
  const today = dayIndex(c, t)
  const last = state.daily.lastAt === null ? null : dayIndex(c, state.daily.lastAt)
  if (last !== null && last >= today) return null
  const missed = last === null ? 0 : today - last - 1
  const streak = Math.max(0, state.daily.streak - missed * c.daily.dropPerMissedDay) + 1
  return { gold: c.daily.gold[(streak - 1) % c.daily.gold.length], streak }
}

// CLAIM_DAILY.
export function claimDaily(state: PlayerState, ctx: Ctx, t: number): string | null {
  const { c } = ctx
  if (!c.daily.enabled) return 'No daily reward in this build'
  if (!state.tutorial.done) return 'After the opening'
  const offer = dailyOffer(state, c, t)
  if (!offer) return 'Already claimed today'
  state.daily = { lastAt: t, streak: offer.streak }
  state.stats.daily.claims++
  state.stats.daily.gold += offer.gold
  state.stats.daily.best = Math.max(state.stats.daily.best, offer.streak)
  emit(ctx, t, { type: 'DAILY_CLAIMED', streak: offer.streak, gold: offer.gold })
  grantGold(state, ctx, t, offer.gold, 'daily')
  return null
}
