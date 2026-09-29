import type { ActGate, Config, LaterAct } from '../config/schema'
import { emit, type Ctx } from '../core/ctx'
import type { PlayerState } from '../model/state'
import { grantGold } from './gold'
import { checkEndings } from './legal'
import { initPolitics } from './politics'
import { initProsperity } from './prosperity'

// Six acts (ADR 0040). Each act after the first opens when its gate in `progression.acts` holds: the Act I
// goals, a Reputation, districts held, fronts owned. `progression.finalAct` is the last act this build has
// content for; meeting the gate after it marks that act cleared and the game carries on in it.

export function gateMet(state: PlayerState, c: Config, gate: ActGate): boolean {
  if (gate.goals && !c.goals.list.every((id) => state.goals.done.includes(id))) return false
  if (gate.rep !== undefined && state.reputation < gate.rep) return false
  if (gate.holds?.some((id) => state.districts.find((d) => d.id === id)?.controller !== 'player')) return false
  if (gate.fronts?.some((f) => !state.fronts.some((x) => x.type === f))) return false
  if (gate.mayor && !state.politics.mayor) return false
  return true
}

// The act after this one and what opens it, or null in Act VI.
export function nextGate(state: PlayerState, c: Config): { act: LaterAct; gate: ActGate } | null {
  if (state.act >= 6) return null
  const act = (state.act + 1) as LaterAct
  return { act, gate: c.progression.acts[act] }
}

// The built game is over: the final act's gate has been met. Play continues.
export function gameCleared(state: PlayerState, c: Config): boolean {
  return state.act === c.progression.finalAct && state.stats.actClearedAt[state.act] !== undefined
}

// Opens every act whose gate holds, in order. Called whenever Reputation, goals, districts or fronts change.
export function checkActs(state: PlayerState, ctx: Ctx, t: number): void {
  const { c } = ctx
  // Act VI has no gate after it: an ending clears it (ADR 0045).
  checkEndings(state, ctx, t)
  for (let guard = 0; guard < 6; guard++) {
    const next = nextGate(state, c)
    if (!next || !gateMet(state, c, next.gate)) return
    if (next.act > c.progression.finalAct) {
      if (state.stats.actClearedAt[state.act] === undefined) {
        state.stats.actClearedAt[state.act] = t
        emit(ctx, t, { type: 'ACT_CLEARED', act: state.act })
      }
      return
    }
    openAct(state, ctx, t, next.act)
  }
}

function openAct(state: PlayerState, ctx: Ctx, t: number, act: LaterAct): void {
  const { c } = ctx
  const prev = state.act
  state.act = act
  state.stats.actClearedAt[prev] = t
  emit(ctx, t, { type: 'ACT_UNLOCKED', act })
  grantGold(state, ctx, t, c.gold.perActUnlocked[act], 'act')
  if (act === c.prosperity.fromAct) initProsperity(state, c, t)
  if (act === c.opinion.fromAct) initPolitics(state, c, t)
  // A district with nobody to buy it from is yours when its act opens (Nagornaya, ADR 0045).
  for (const d of state.districts) {
    if (c.districts.list[d.id].grantedOnOpen && c.districts.list[d.id].act === act) d.controller = 'player'
  }
  // Zhanna's trade opens with the Port (ADR 0036).
  if (act === 2) emit(ctx, t, { type: 'NOTE', text: 'Zhanna runs the Port Quarter. Her people watch every crate that moves.' })
}
