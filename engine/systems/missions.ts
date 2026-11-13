import type { Config, LaterAct, MissionId, OpConfig } from '../config/schema'
import { emit, newId, type Ctx } from '../core/ctx'
import { derive } from '../core/derive'
import { hoursToMs, minutesToMs } from '../core/time'
import type { CrewMember, OpInstance, PlayerState } from '../model/state'
import { checkActs, gateMet } from './acts'
import { changeColonel } from './convoys'
import { grantXp, jobXp } from './experience'
import { injure } from './injuries'
import { opMinutesFor, rollOp } from './ops'
import { gainRep } from './reputation'
import { changeDisposition, changeZhanna } from './rivals'

// The boss missions (ADR 0050). An overreach is the last step of an act: it appears once the rest of the
// next act's gate holds, fails by design at a fixed small cost, and opens that act. A rematch is open all
// through its act, rolled like a job on its own stream, and can be tried again after `retryHours` if lost.
// Both ride the job machinery: a job of type 'mission' with the mission's terms snapshotted on it.

// Done for the gate: an overreach sent (it always fails), a rematch won.
export function missionDone(state: PlayerState, id: MissionId): boolean {
  const r = state.missions[id]
  return r?.result === 'failed' || r?.result === 'won'
}

export function missionOut(state: PlayerState, id: MissionId): boolean {
  return state.ops.some((o) => o.missionId === id)
}

// The mission's terms as a job: what it's rolled on, how long it takes.
export function missionOp(c: Config, id: MissionId): OpConfig {
  const m = c.missions.list[id]
  return { name: m.name, band: 'long', minutes: m.minutes, crew: m.crew, w: m.w, diff: m.diff, spike: 0 }
}

// Why the mission can't be sent now, or null.
export function missionBlocked(state: PlayerState, c: Config, id: MissionId, t: number): string | null {
  const m = c.missions.list[id]
  if (!c.missions.enabled) return 'Missions are off'
  if (missionDone(state, id)) return 'Already done'
  if (missionOut(state, id)) return 'Already out'
  if (state.act < m.act) return 'Not in this act'
  if (state.act > m.act) return 'Its act is over'
  const r = state.missions[id]
  if (r?.result === 'lost' && r.retryAt !== undefined && r.retryAt > t) return 'Not yet: try again later'
  if (m.kind === 'overreach') {
    // The door to the next act: everything else that act asks for comes first.
    const gate = c.progression.acts[(m.act + 1) as LaterAct]
    if (!gateMet(state, c, { ...gate, missions: (gate.missions ?? []).filter((x) => x !== id) })) return 'The rest of the act comes first'
  }
  return null
}

// What an overreach would stake right now: hours of Dirty yield, or what's on hand if that's less.
export function missionStake(state: PlayerState, c: Config, id: MissionId): number {
  const hours = c.missions.list[id].stakeHours ?? 0
  return Math.min(Math.floor(state.dirty), Math.round(derive(state, c).yieldPerHr * hours))
}

export function startMission(state: PlayerState, ctx: Ctx, t: number, id: MissionId, crewIds: string[]): string | null {
  const { c } = ctx
  if (!c.missions.list[id]) return 'Unknown mission'
  const blocked = missionBlocked(state, c, id, t)
  if (blocked) return blocked
  const m = c.missions.list[id]
  const ids = [...new Set(crewIds)]
  if (ids.length !== m.crew) return `Needs ${m.crew} crew`
  const team = ids.map((x) => state.crew.find((cm) => cm.id === x))
  if (team.some((cm) => !cm || cm.status !== 'idle')) return 'Everyone on the job must be idle'
  const stake = m.kind === 'overreach' ? missionStake(state, c, id) : 0
  state.dirty -= stake
  const cfg = missionOp(c, id)
  const opId = newId(state, 'op')
  state.ops.push({
    id: opId,
    type: 'mission',
    missionId: id,
    cfg,
    name: m.name,
    crewIds: ids,
    startedAt: t,
    completesAt: t + minutesToMs(c, opMinutesFor(c, cfg, team as CrewMember[])),
    ...(stake > 0 ? { stake } : {}),
  })
  for (const cm of team as CrewMember[]) {
    cm.status = 'on_op'
    cm.assignedTo = opId
  }
  state.stats.missions.sent++
  emit(ctx, t, { type: 'MISSION_STARTED', missionId: id, opId, crewIds: ids, stake })
  return null
}

export function resolveMission(state: PlayerState, ctx: Ctx, op: OpInstance, t: number): void {
  const { c } = ctx
  const id = op.missionId!
  const m = c.missions.list[id]
  state.ops = state.ops.filter((o) => o.id !== op.id)
  const team = op.crewIds.map((x) => state.crew.find((cm) => cm.id === x)).filter((cm): cm is CrewMember => cm !== undefined)
  for (const cm of team) {
    if (cm.status === 'on_op' && cm.assignedTo === op.id) {
      cm.status = 'idle'
      delete cm.assignedTo
    }
  }

  if (m.kind === 'overreach') {
    // It fails, by design, at a fixed cost: the stake (already paid), the first one sent hurt, heat.
    const hurt = m.injureHours && team[0] ? team[0] : undefined
    if (hurt) injure(state, ctx, t, hurt, m.injureHours!)
    const heat = m.heat ?? 0
    state.heat = Math.min(100, state.heat + heat)
    state.missions[id] = { result: 'failed', at: t, ...(op.stake ? { stake: op.stake } : {}) }
    emit(ctx, t, { type: 'MISSION_RESOLVED', missionId: id, result: 'failed', crewIds: op.crewIds, stake: op.stake ?? 0, heat, ...(hurt ? { injuredId: hurt.id } : {}) })
    checkActs(state, ctx, t)
    return
  }

  // A rematch rolls like a job, on its own stream: clean or partial wins it.
  const cfg = op.cfg ?? missionOp(c, id)
  const { outcome } = team.length ? rollOp(c, cfg, team, ctx.rng.derive('mission', op.id)) : { outcome: 'fail' as const }
  const won = outcome !== 'fail'
  const xpByMember = team.map((cm) => jobXp(c, cfg, outcome, cm, team))
  team.forEach((cm, i) => grantXp(state, ctx, t, cm, xpByMember[i]))
  const reward = m.reward ?? {}
  if (won) {
    state.missions[id] = { result: 'won', at: t }
    state.stats.missions.won++
    if (reward.influence) state.influence += reward.influence
    if (reward.disposition?.zhanna) changeZhanna(state, reward.disposition.zhanna)
    if (reward.disposition?.tolya) changeDisposition(state, reward.disposition.tolya)
    if (reward.disposition?.colonel) changeColonel(state, reward.disposition.colonel)
  } else {
    state.missions[id] = { result: 'lost', at: t, retryAt: t + hoursToMs(c, c.missions.retryHours) }
    state.stats.missions.lost++
  }
  emit(ctx, t, {
    type: 'MISSION_RESOLVED',
    missionId: id,
    result: won ? 'won' : 'lost',
    crewIds: op.crewIds,
    outcome,
    ...(won && reward.rep ? { rep: reward.rep } : {}),
    ...(won && reward.influence ? { influence: reward.influence } : {}),
  })
  if (won && reward.rep) gainRep(state, ctx, t, reward.rep)
  checkActs(state, ctx, t)
}
