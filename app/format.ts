import type { Config } from '../engine'

// Number and time formatting. Game durations are shown in game time, so the `fast`
// preset still reads "2h 15m" for a Standard op.

export function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs < 10 && !Number.isInteger(v)) return v.toFixed(1)
  const whole = Math.floor(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return v < 0 ? `-${whole}` : whole
}

export const fmtRate = (v: number): string => `${fmt(v)}/h`

export const pct = (v: number): string => `${Math.round(v * 100)}%`

export function fmtDuration(ms: number, c: Config): string {
  if (ms <= 0) return 'now'
  const totalMinutes = Math.ceil((ms / c.time.hourMs) * 60)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
}

const two = (n: number) => String(n).padStart(2, '0')

// "Day 3 · 14:05". Real-time presets show the device's clock; compressed presets show the game clock.
export function fmtClock(t: number, createdAt: number, c: Config): string {
  const dayMs = c.time.hourMs * 24
  const day = Math.floor(t / dayMs) - Math.floor(createdAt / dayMs) + 1
  if (c.time.hourMs === 3_600_000) {
    const d = new Date(t)
    return `Day ${day} · ${two(d.getHours())}:${two(d.getMinutes())}`
  }
  const minutesIntoDay = Math.floor(((t % dayMs) / c.time.hourMs) * 60)
  return `Day ${day} · ${two(Math.floor(minutesIntoDay / 60))}:${two(minutesIntoDay % 60)}`
}
