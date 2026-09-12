import type { Config } from '../config/schema'
import { frontRate, frontThroughput } from '../core/formulas'
import type { PlayerState } from '../model/state'

// Fronts launder at a fixed throughput: min(buffer, throughput × h) × rate → Clean.
// Throughput includes capacity upgrades and the mode dial; both change only at action time,
// so it's constant within a reconcile segment.

export function convertFronts(state: PlayerState, c: Config, hours: number): void {
  for (const f of state.fronts) {
    if (f.buffer <= 0) continue
    const amount = Math.min(f.buffer, frontThroughput(c, f) * hours)
    f.buffer -= amount
    f.convertedThisHour += amount
    const clean = amount * frontRate(c, f.type, f.level)
    state.clean += clean
    state.stats.cleanEarned += clean
  }
}

// Utilization is updated once per whole hour, so suspicion (and exposure) is constant within
// an hour. It's a moving average: suspicion answers sustained running, not the one busy
// hour after a big deposit.
export function frontsHourBoundary(state: PlayerState, c: Config): void {
  for (const f of state.fronts) {
    const hourUtil = Math.min(1, f.convertedThisHour / frontThroughput(c, f))
    f.util += (hourUtil - f.util) / c.fronts.utilSmoothingHours
    f.convertedThisHour = 0
  }
}
