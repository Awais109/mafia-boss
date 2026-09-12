import type { Act, Config, FrontType, RacketType } from '../config/schema'

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

export function frontBufferCap(c: Config, type: FrontType): number {
  return c.fronts.types[type].throughput * c.fronts.bufferHours
}

// Cost to go from `level` to `level + 1`.
export function frontUpgradeCost(c: Config, type: FrontType, level: number): number {
  const basis = Math.max(c.fronts.types[type].cost, c.fronts.upgrade.minCostBasis)
  return Math.round(basis * c.fronts.upgrade.costPctOfUnlock * (level + 1))
}

// A front running hot draws attention: exposure grows with utilization past the start point.
export function frontSuspicion(c: Config, type: FrontType, util: number): number {
  return c.fronts.suspicionFactor * c.fronts.types[type].throughput * Math.max(0, util - c.fronts.suspicionStartUtil)
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
