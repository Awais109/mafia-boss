import {
  apply,
  migrate,
  reconcile,
  tryBuildConfig,
  type Action,
  type Config,
  type GameEvent,
  type Overrides,
  type PlayerState,
  type PresetName,
} from '../engine'
import { Recorder, type Trace } from './driver'
import type { ActionRecord } from './persona'

// The playtest log the app writes (one JSON line per entry) and exports via the share
// sheet. Replaying its actions from the game-start snapshot reproduces the tester's game
// exactly, because the engine is deterministic given (state, time, config, playerId).

export type LogLine =
  | { kind: 'meta'; t: number; playerId: string; preset: PresetName; overrides: Overrides; initialState: PlayerState }
  | { kind: 'action'; t: number; action: Action }
  | { kind: 'config'; t: number; preset: PresetName; overrides: Overrides }
  | { kind: 'event'; event: GameEvent }

export type LogExport = { format: 'sevgorod-log'; version: 1; exportedAt: number; lines: LogLine[] }

export function isLogExport(doc: unknown): doc is LogExport {
  return typeof doc === 'object' && doc !== null && (doc as LogExport).format === 'sevgorod-log'
}

function configFor(preset: PresetName, overrides: Overrides): Config {
  const { config, errors } = tryBuildConfig(preset, overrides)
  if (errors.length) throw new Error(`log config is invalid: ${errors.join('; ')}`)
  return config
}

export function replayLog(doc: LogExport): Trace {
  const lines = doc.lines
  let metaIndex = -1
  lines.forEach((l, i) => {
    if (l.kind === 'meta') metaIndex = i
  })
  if (metaIndex < 0) throw new Error('log has no game start (meta line)')
  const meta = lines[metaIndex] as Extract<LogLine, { kind: 'meta' }>

  let config = configFor(meta.preset, meta.overrides)
  // Logs from older builds carry an older save shape.
  let state = migrate(meta.initialState)
  const startStats = state.stats
  const start = state.updatedAt
  const H = () => config.time.hourMs
  const rec = new Recorder(config, start)
  let t = start
  let session: { t: number; before: PlayerState; actions: ActionRecord[] } | null = null

  const advanceTo = (target: number) => {
    while (t < target) {
      const next = Math.min(target, (Math.floor(t / H()) + 1) * H())
      state = reconcile(state, next, config).state
      t = next
      if (t % H() === 0) rec.hour(state, t)
    }
  }

  for (const line of lines.slice(metaIndex + 1)) {
    if (line.kind === 'config') {
      advanceTo(line.t)
      config = configFor(line.preset, line.overrides)
      continue
    }
    if (line.kind !== 'action') continue
    advanceTo(line.t)
    if (line.action.type === 'SESSION_START') session = { t: line.t, before: state, actions: [] }
    const r = apply(state, line.action, line.t, config)
    const record: ActionRecord = r.error ? { t: line.t, action: line.action, error: r.error } : { t: line.t, action: line.action }
    rec.actions.push(record)
    session?.actions.push(record)
    state = r.state
    t = state.updatedAt
    if (line.action.type === 'SESSION_END' && session) {
      rec.session(session.before, state, session.t, session.actions)
      session = null
    }
  }

  const days = Math.max(1, Math.ceil((t - start) / (24 * H())))
  return {
    config,
    label: { preset: meta.preset, persona: 'human', seed: meta.playerId.slice(0, 8), days, source: 'replay' },
    start,
    end: t,
    startStats,
    final: state,
    hours: rec.hours,
    sessions: rec.sessions,
    actions: rec.actions,
  }
}
