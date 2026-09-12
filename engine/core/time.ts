import type { Config } from '../config/schema'
import type { PlayerState } from '../model/state'

// All durations in config are in game hours; hourMs maps them to milliseconds.
// Hour and day boundaries are aligned to the epoch so every split of a reconcile
// window sees the same boundaries.

export const dayMs = (c: Config): number => c.time.hourMs * 24
export const hoursToMs = (c: Config, hours: number): number => Math.max(1, Math.round(hours * c.time.hourMs))
export const minutesToMs = (c: Config, minutes: number): number => hoursToMs(c, minutes / 60)
export const msToHours = (c: Config, ms: number): number => ms / c.time.hourMs

export const hourIndex = (c: Config, t: number): number => Math.floor(t / c.time.hourMs)
export const dayIndex = (c: Config, t: number): number => Math.floor(t / dayMs(c))
export const nextWholeHour = (c: Config, t: number): number => (hourIndex(c, t) + 1) * c.time.hourMs
export const isWholeHour = (c: Config, t: number): boolean => t % c.time.hourMs === 0
export const isDayStart = (c: Config, t: number): boolean => t % dayMs(c) === 0

// Day 1 is the day the game started.
export function gameDay(c: Config, state: PlayerState, t: number): number {
  return dayIndex(c, t) - dayIndex(c, state.createdAt) + 1
}

// Shift every timestamp in a state by `delta` ms. Resetting the debug offset uses this,
// so game time doesn't freeze until the real clock catches up.
export function shiftTimes(state: PlayerState, delta: number): PlayerState {
  const s: PlayerState = JSON.parse(JSON.stringify(state))
  const shift = (t: number) => t + delta
  s.createdAt = shift(s.createdAt)
  s.updatedAt = shift(s.updatedAt)
  s.officialCooldownUntil = shift(s.officialCooldownUntil)
  s.bribeUntil = shift(s.bribeUntil)
  s.recruitPool.refreshAt = shift(s.recruitPool.refreshAt)
  s.rival.tolya.nextTickAt = shift(s.rival.tolya.nextTickAt)
  for (const op of s.ops) {
    op.startedAt = shift(op.startedAt)
    op.completesAt = shift(op.completesAt)
  }
  for (const m of s.crew) if (m.jailedUntil !== undefined) m.jailedUntil = shift(m.jailedUntil)
  for (const item of s.inbox) {
    item.createdAt = shift(item.createdAt)
    item.expiresAt = shift(item.expiresAt)
  }
  s.offers.refreshAt = shift(s.offers.refreshAt)
  for (const o of s.offers.items) o.expiresAt = shift(o.expiresAt)
  for (const row of s.ledger) row.startsAt = shift(row.startsAt)
  for (const e of s.log) e.t = shift(e.t)
  const st = s.stats
  if (st.actClearedAt[1] !== undefined) st.actClearedAt[1] = shift(st.actClearedAt[1])
  if (st.actClearedAt[2] !== undefined) st.actClearedAt[2] = shift(st.actClearedAt[2])
  if (st.firstRaidAt !== null) st.firstRaidAt = shift(st.firstRaidAt)
  if (st.lastSessionAt !== null) st.lastSessionAt = shift(st.lastSessionAt)
  for (const k of Object.keys(st.officialBoughtAt) as (keyof typeof st.officialBoughtAt)[]) {
    st.officialBoughtAt[k] = shift(st.officialBoughtAt[k]!)
  }
  return s
}
