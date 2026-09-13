import { expect } from 'vitest'
import { apply, buildConfig, newGame, TUTORIAL_STEPS, type Action, type Config, type PlayerState } from '../engine'

export const config: Config = buildConfig('default')
// Defaults with nothing wearing down or random from Tolya: no condition decay, no hits, no demands.
export const quiet: Config = buildConfig('default', {
  'rackets.conditionDecayPerDay': 0,
  'rivals.tolya.pConditionHit': 0,
  'rivals.tolya.pTribute': 0,
})
export const H = config.time.hourMs
// An arbitrary start that is not aligned to an hour, so boundaries land mid-segment.
export const T0 = Date.UTC(2026, 0, 5, 7, 23, 11)

// A game just past the opening's shopping: the quick-start setup Skip buys (ADR 0035), with the tutorial
// parked at its first lesson so incidents and goals stay off unless a test turns them on.
export function fresh(playerId = 'test-player', c: Config = config, t = T0): PlayerState {
  const s = apply(newGame(c, playerId, t), { type: 'TUTORIAL_SKIP' }, t, c).state
  s.tutorial = { step: TUTORIAL_STEPS.findIndex((st) => st.id === 'collect'), done: false }
  s.log = []
  return s
}

// A brand-new game: the opening money, empty turf, the first recruits waiting.
export function blank(playerId = 'test-player', c: Config = config, t = T0): PlayerState {
  return newGame(c, playerId, t)
}

export function act(state: PlayerState, actions: Action[], t: number, c: Config = config): PlayerState {
  let s = state
  for (const a of actions) {
    const r = apply(s, a, t, c)
    if (r.error) throw new Error(`${a.type} rejected: ${r.error}`)
    s = r.state
  }
  return s
}

export function crewNamed(state: PlayerState, name: string) {
  const m = state.crew.find((x) => x.name === name)
  if (!m) throw new Error(`no crew named ${name}`)
  return m
}

// Deep equality with a relative tolerance on numbers (closed forms compose up to float error).
export function expectClose(actual: unknown, expected: unknown, path = '$'): void {
  if (typeof expected === 'number' && typeof actual === 'number') {
    const tol = 1e-7 * Math.max(1, Math.abs(expected), Math.abs(actual))
    if (Math.abs(actual - expected) > tol) {
      expect.fail(`${path}: ${actual} != ${expected}`)
    }
    return
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      expect.fail(`${path}: array length ${Array.isArray(actual) ? actual.length : 'n/a'} != ${expected.length}`)
    }
    expected.forEach((v, i) => expectClose((actual as unknown[])[i], v, `${path}[${i}]`))
    return
  }
  if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null) expect.fail(`${path}: expected object`)
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual as object)])
    for (const k of keys) {
      expectClose((actual as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k], `${path}.${k}`)
    }
    return
  }
  if (actual !== expected) expect.fail(`${path}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`)
}
