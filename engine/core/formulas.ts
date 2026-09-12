import type { Act, Config, FrontMode, FrontType, RacketType } from '../config/schema'

type FrontLike = { type: FrontType; capacityLevel?: number; mode?: FrontMode }

// Pure curves. Every cost the UI shows or an action charges comes through here.

// spec §6.2: purchase = baseYield × payback hours for the racket's act, unless overridden.
export function racketPurchaseCost(c: Config, type: RacketType): number {
  const override = c.costs.overrides[type]?.purchase
  if (override !== undefined) return override
  const t = c.rackets.types[type]
  return Math.round(t.baseYield * c.costs.paybackHoursByAct[t.act])
}

// Cost to go from `tier` to `tier + 1`.
export function racketUpgradeCost(c: Config, type: RacketType, tier: number): number {
  return Math.round(
    racketPurchaseCost(c, type) * c.costs.upgradeBaseFactor * Math.pow(c.costs.upgradeTierMult, tier - 1),
  )
}

export function racketRepairCost(c: Config, type: RacketType): number {
  return Math.max(1, Math.round(racketPurchaseCost(c, type) * c.rackets.conditionRepairPct))
}

// spec §7.1: yield and heat both compound per tier; heat compounds faster.
export function tierYield(c: Config, type: RacketType, tier: number): number {
  return c.rackets.types[type].baseYield * Math.pow(c.rackets.tierYieldMult, tier - 1)
}

export function tierHeat(c: Config, type: RacketType, tier: number): number {
  return c.rackets.types[type].baseHeat * Math.pow(c.rackets.tierHeatMult, tier - 1)
}

export function frontRate(c: Config, type: FrontType, level: number): number {
  return c.fronts.types[type].rate + level * c.fronts.upgrade.rateStep
}

// Throughput after capacity upgrades, before the mode dial. The buffer is sized from this.
export function frontBaseThroughput(c: Config, f: FrontLike): number {
  return c.fronts.types[f.type].throughput * (1 + c.fronts.upgrade.capacity.step * (f.capacityLevel ?? 0))
}

export function frontModeMult(c: Config, mode: FrontMode | undefined): number {
  if (mode === 'push') return c.fronts.modes.push.throughputMult
  if (mode === 'layLow') return c.fronts.modes.layLow.throughputMult
  return 1
}

// What the front actually launders per hour.
export function frontThroughput(c: Config, f: FrontLike): number {
  return frontBaseThroughput(c, f) * frontModeMult(c, f.mode)
}

export function frontBufferCap(c: Config, f: FrontLike): number {
  return frontBaseThroughput(c, f) * c.fronts.bufferHours
}

// Cost to go from `level` to `level + 1`.
export function frontUpgradeCost(c: Config, type: FrontType, level: number): number {
  const basis = Math.max(c.fronts.types[type].cost, c.fronts.upgrade.minCostBasis)
  return Math.round(basis * c.fronts.upgrade.costPctOfUnlock * (level + 1))
}

export function frontCapacityUpgradeCost(c: Config, type: FrontType, level: number): number {
  const basis = Math.max(c.fronts.types[type].cost, c.fronts.upgrade.minCostBasis)
  return Math.round(basis * c.fronts.upgrade.capacity.costPctOfUnlock * (level + 1))
}

// A front running hot draws attention: exposure grows with utilization past the start point.
// Pushing starts it sooner; lying low draws none.
export function frontSuspicion(c: Config, f: FrontLike, util: number): number {
  if (f.mode === 'layLow' && !c.fronts.modes.layLow.suspicion) return 0
  const start = f.mode === 'push' ? c.fronts.modes.push.suspicionStartUtil : c.fronts.suspicionStartUtil
  return c.fronts.suspicionFactor * frontThroughput(c, f) * Math.max(0, util - start)
}

// XP a stat needs for its next point.
export function statPointCost(c: Config, value: number): number {
  const p = c.crew.experience.pointCost
  return p.base + p.perAbove30 * Math.max(0, value - 30)
}

// Heat equilibrium = share of pressure that control doesn't cover.
// Control ÷ exposure of 1.8–2.0 puts heat at 33–36 (spec §7.3).
export function heatTarget(exposure: number, control: number): number {
  const total = exposure + control
  return total <= 0 ? 0 : (100 * exposure) / total
}

// Closed-form convergence: the gap to target shrinks by `perHr` each hour.
// Composes exactly across splits, which the reconcile property test relies on.
export function convergeHeat(heat: number, target: number, hours: number, perHr: number): number {
  return target + (heat - target) * Math.pow(1 - perHr, hours)
}

export function vaultCap(c: Config, yieldPerHr: number, act: Act): number {
  return Math.max(c.vault.floorCap, yieldPerHr * c.vault.targetHoursByAct[act])
}

export function bribeCost(c: Config, exposure: number): number {
  return Math.max(1, Math.ceil(exposure * c.heat.bribe.costPerExposure))
}

export function opRewardMult(c: Config, act: Act): number {
  return Math.pow(act, c.ops.rewardActScaling)
}

export function recruitCost(c: Config, act: Act): number {
  return c.crew.recruitCostPerAct * act
}

export function raiseCost(c: Config, act: Act): number {
  return c.crew.raiseCostPerAct * act
}

export function crewSlotCost(c: Config, cleanEarned: number): number {
  return Math.max(c.crew.extraSlotMinCost, Math.round(cleanEarned * c.crew.extraSlotCostPctOfBudget))
}

export function tributeDemand(c: Config, cap: number): number {
  return Math.max(1, Math.round(cap * c.rivals.tolya.tributePctOfVault))
}
