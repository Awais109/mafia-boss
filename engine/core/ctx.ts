import type { Config } from '../config/schema'
import type { EventBody, GameEvent } from '../model/events'
import type { PlayerState } from '../model/state'
import type { RngFactory } from './rng'

// Shared context threaded through system functions during reconcile/apply.
export type Ctx = {
  c: Config
  rng: RngFactory
  events: GameEvent[]
}

export function emit(ctx: Ctx, t: number, body: EventBody): void {
  ctx.events.push({ ...body, t } as GameEvent)
}

export function newId(state: PlayerState, prefix: string): string {
  return `${prefix}${state.nextId++}`
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}
