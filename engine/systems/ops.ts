import { STATS, type Config, type OpConfig, type OpOutcome, type OpType } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { opRewardMult } from '../core/formulas'
import type { Rand } from '../core/rng'
import { dayIndex } from '../core/time'
import type { CrewMember, OpInstance, PlayerState } from '../model/state'
import { changeLoyalty, effectiveStat } from './crew'
import { addPressure } from './districts'
import { grantXp, hasPerk, jobXp } from './experience'
import { fileReport } from './inbox'
import { gainRep } from './reputation'
import { addStock } from './supply'

// Resolution:
//   score = Σ w·(best effective stat on the team) / Σ w + teamBonus·(crew − 1) + U(−noise, noise)
//           − U(0, randomPenalty) per alcoholic on the team
//   full: score ≥ diff + fullMargin · partial: score ≥ diff · fail otherwise
// Training jobs don't roll: they pay XP and nothing else.

export function opUnlocked(state: PlayerState, c: Config, type: OpType): boolean {
  return (c.ops.list[type].act ?? 1) <= state.act
}

export function opBaseScore(c: Config, op: OpConfig, team: CrewMember[]): number {
  if (team.length === 0) return 0
  let score = 0
  let wSum = 0
  for (const stat of STATS) {
    const w = op.w[stat] ?? 0
    if (w <= 0) continue
    wSum += w
    score += w * Math.max(...team.map((m) => effectiveStat(c, m, stat)))
  }
  return (wSum > 0 ? score / wSum : 0) + c.ops.teamBonusPerExtra * (team.length - 1)
}

export function outcomeFor(c: Config, diff: number, score: number): OpOutcome {
  if (score >= diff + c.ops.fullMargin) return 'full'
  if (score >= diff) return 'partial'
  return 'fail'
}

export function rollOp(c: Config, op: OpConfig, team: CrewMember[], rand: Rand): { score: number; outcome: OpOutcome } {
  let score = opBaseScore(c, op, team) + rand.range(-c.ops.noise, c.ops.noise)
  for (const m of team) {
    if (m.traits.includes('alcoholic')) score -= rand.range(0, c.crew.traits.alcoholic.randomPenalty)
  }
  return { score, outcome: outcomeFor(c, op.diff, score) }
}

// Odds shown in the UI and used by the sim persona. Exact for the uniform noise;
// alcoholic penalties are folded in at their mean.
export function outcomeOdds(c: Config, op: OpConfig, team: CrewMember[]): Record<OpOutcome, number> {
  if (op.training) return { full: 1, partial: 0, fail: 0 }
  const alcoholics = team.filter((m) => m.traits.includes('alcoholic')).length
  const mean = opBaseScore(c, op, team) - (alcoholics * c.crew.traits.alcoholic.randomPenalty) / 2
  const n = c.ops.noise
  const atLeast = (x: number) => (n <= 0 ? (mean >= x ? 1 : 0) : Math.min(1, Math.max(0, (mean + n - x) / (2 * n))))
  const success = atLeast(op.diff)
  const full = atLeast(op.diff + c.ops.fullMargin)
  return { full, partial: success - full, fail: 1 - success }
}

export function rewardShare(c: Config, outcome: OpOutcome): number {
  return outcome === 'full' ? 1 : outcome === 'partial' ? c.ops.partialRewardPct : 0
}

export function spikeShare(c: Config, outcome: OpOutcome): number {
  return outcome === 'full' ? 1 : outcome === 'partial' ? c.ops.partialSpikePct : c.ops.failSpikePct
}

export function influenceRoom(state: PlayerState, c: Config, t: number): number {
  const used = state.influenceToday.day === dayIndex(c, t) ? state.influenceToday.amount : 0
  return Math.max(0, c.ops.influenceDailyCap - used)
}

// A job taken from the board resolves with its own snapshotted config.
export function opConfigOf(c: Config, op: OpInstance): OpConfig {
  return op.cfg ?? c.ops.list[op.type]
}

// The terms a job starts on right now. Smuggling gets harder with heat (plan (o)); START_OP stores
// the result on the job, so the odds shown are the odds rolled.
export function opConfigAt(c: Config, state: PlayerState, cfg: OpConfig): OpConfig {
  if (!cfg.heatDiffPerPoint) return cfg
  const out: OpConfig = { ...cfg, diff: cfg.diff + Math.round(cfg.heatDiffPerPoint * state.heat) }
  delete out.heatDiffPerPoint
  return out
}

// Dirty a job pays; an Earner on the team adds their perk.
export function opDirtyRewardFor(c: Config, state: PlayerState, cfg: OpConfig, outcome: OpOutcome, team: CrewMember[] = []): number {
  const earner = hasPerk(team, 'earner') ? (c.crew.experience.perks.earner.jobDirtyMult ?? 1) : 1
  return Math.round((cfg.dirty ?? 0) * rewardShare(c, outcome) * opRewardMult(c, state.act) * earner)
}

export function opDirtyReward(c: Config, state: PlayerState, type: OpType, outcome: OpOutcome): number {
  return opDirtyRewardFor(c, state, c.ops.list[type], outcome)
}

// Minutes a job takes for this team; a Fixer shortens it.
export function opMinutesFor(c: Config, cfg: OpConfig, team: CrewMember[]): number {
  return cfg.minutes * (hasPerk(team, 'fixer') ? (c.crew.experience.perks.fixer.jobMinutesMult ?? 1) : 1)
}

function freeCrew(team: CrewMember[], op: OpInstance): void {
  for (const m of team) {
    if (m.status === 'on_op' && m.assignedTo === op.id) {
      m.status = 'idle'
      delete m.assignedTo
    }
  }
}

export function resolveOp(state: PlayerState, ctx: Ctx, op: OpInstance, t: number): void {
  const { c } = ctx
  const cfg = opConfigOf(c, op)
  state.ops = state.ops.filter((o) => o.id !== op.id)
  const team = op.crewIds
    .map((id) => state.crew.find((m) => m.id === id))
    .filter((m): m is CrewMember => m !== undefined)

  if (cfg.training) {
    freeCrew(team, op)
    const m = team[0]
    if (m) {
      grantXp(state, ctx, t, m, { [cfg.training]: cfg.xp ?? 0 })
      emit(ctx, t, { type: 'TRAINING_DONE', opId: op.id, crewId: m.id, name: m.name, stat: cfg.training, xp: cfg.xp ?? 0 })
    }
    return
  }

  const { score, outcome } = team.length
    ? rollOp(c, cfg, team, ctx.rng.derive('op', op.id))
    : { score: 0, outcome: 'fail' as const }
  const share = rewardShare(c, outcome)

  const dirty = opDirtyRewardFor(c, state, cfg, outcome, team)
  state.dirty += dirty
  state.stats.dirtyEarned += dirty
  state.stats.jobDirty += dirty
  if (op.offerId) state.stats.offerDirty += dirty

  let influence = 0
  let influenceLostToCap = 0
  if (cfg.influence && share > 0) {
    const earned = Math.max(1, Math.round(cfg.influence * share))
    influence = Math.min(earned, influenceRoom(state, c, t))
    influenceLostToCap = earned - influence
    const day = dayIndex(c, t)
    if (state.influenceToday.day !== day) state.influenceToday = { day, amount: 0 }
    state.influenceToday.amount += influence
    state.influence += influence
  }

  // A smuggling run lands its packs: what fits in stock goes in (ADR 0032).
  const cigarettes = cfg.cigarettes && share > 0 ? addStock(state, derive(state, c).supply.cap, Math.round(cfg.cigarettes * share)) : 0

  // Spikes land on displayed heat immediately and feed the next hour's raid roll (spec §10).
  const ghost = hasPerk(team, 'ghost') ? (c.crew.experience.perks.ghost.jobSpikeMult ?? 1) : 1
  const spike = cfg.spike * spikeShare(c, outcome) * ghost
  state.heat = Math.min(100, state.heat + spike)

  const loyalty =
    outcome === 'full'
      ? c.crew.loyalty.perOpSuccess
      : outcome === 'partial'
        ? Math.round(c.crew.loyalty.perOpSuccess * c.ops.partialRewardPct)
        : c.ops.failLoyalty
  for (const m of team) changeLoyalty(m, loyalty)
  freeCrew(team, op)
  state.stats.opOutcomes[outcome]++

  const rep = c.reputation.perOpSuccess * share
  emit(ctx, t, {
    type: 'OP_RESOLVED',
    opId: op.id,
    opType: op.type,
    crewIds: op.crewIds,
    outcome,
    score: Math.round(score * 10) / 10,
    diff: cfg.diff,
    dirty,
    influence,
    influenceLostToCap,
    spike,
    rep,
    districtId: op.districtId,
    ...(op.name ? { name: op.name } : {}),
    ...(op.offerId ? { offerId: op.offerId } : {}),
    ...(cigarettes > 0 ? { cigarettes } : {}),
  })
  gainRep(state, ctx, t, rep)
  if (cfg.districtPressure && op.districtId && outcome !== 'fail') addPressure(state, ctx, t, op.districtId)
  // XP is computed for the whole team first, so one member's promotion can't change a partner's mentor bonus.
  const xpByMember = team.map((m) => jobXp(c, cfg, outcome, m, team))
  team.forEach((m, i) => grantXp(state, ctx, t, m, xpByMember[i]))
  fileReport(state, ctx, t, op, cfg, outcome, dirty)
}
