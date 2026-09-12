import * as Sharing from 'expo-sharing'
import { useSyncExternalStore } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import {
  apply,
  dayMs,
  derive,
  gameDay,
  migrate,
  newGame,
  reconcile,
  tryBuildConfig,
  type Action,
  type Config,
  type Derived,
  type GameEvent,
  type Overrides,
  type PlayerState,
  type PresetName,
} from '../engine'
import { botPlay, type Trace } from '../sim/driver'
import type { LogExport, LogLine } from '../sim/replay'
import { buildAway, mergeAway, type AwaySummary } from './away'
import { FILES, storage } from './storage'

// A gap of this many game minutes since the save was last caught up counts as being away, and
// gets a "while you were away" summary. It's the shortest job, so a job that finished while
// the player was gone always gets the popup (ADR 0023).
const AWAY_MIN_GAME_MINUTES = 15

// Thin wrapper around the engine (plan §2.3–2.4): load once, apply + persist on every
// action, reconcile on foreground, and a 1 s display tick that never writes unless
// something actually happened.

export type Settings = { preset: PresetName; overrides: Overrides }

export type Notice = { text: string; kind: 'error' | 'info'; at: number }

export type Snapshot = {
  state: PlayerState // reconciled to `now` for display; may be ahead of the saved state
  derived: Derived
  config: Config
  settings: Settings
  configErrors: string[]
  now: number // game time
  realNow: number
  notice: Notice | null
  away: AwaySummary | null // pending "while you were away" popup
}

const DEFAULT_SETTINGS: Settings = { preset: 'default', overrides: {} }

function newPlayerId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  return `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

class GameStore {
  private committed: PlayerState | null = null
  private snapshot: Snapshot | null = null
  private settings: Settings = DEFAULT_SETTINGS
  private config: Config = tryBuildConfig('default').config
  private configErrors: string[] = []
  private listeners = new Set<() => void>()
  private notice: Notice | null = null
  private away: AwaySummary | null = null
  private session = { open: false, startedAt: 0, actions: 0 }
  private started = false

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): Snapshot | null => this.snapshot

  start(): () => void {
    if (!this.started) {
      this.started = true
      this.loadSettings()
      this.loadSave()
    }
    this.beginSession()
    const timer = setInterval(() => this.tick(), 1000)
    const sub = AppState.addEventListener('change', (s) => this.onAppState(s))
    return () => {
      clearInterval(timer)
      sub.remove()
      this.endSession()
    }
  }

  gameNow(): number {
    // The real clock, the debug offset, and the hours bought with gold (ADR 0034).
    return Date.now() + (this.committed?.debugOffsetMs ?? 0) + (this.committed?.skippedMs ?? 0)
  }

  dispatch = (action: Action): string | null => {
    if (!this.committed) return 'Still loading'
    // Catch up first, so a gap becomes an away summary and `apply` only sees the action.
    this.tick()
    const t = this.gameNow()
    const before = this.committed
    const r = apply(this.committed, action, t, this.config)
    this.appendLog([{ kind: 'action', t, action }])
    // A skip leaves no gap for the tick to find, so it gets its summary here.
    if (!r.error && action.type === 'SKIP_TIME') {
      const summary = buildAway(before, r.state, r.events, this.config, r.state.updatedAt)
      this.away = mergeAway(this.away, { ...summary, skippedHours: action.hours })
    }
    if (!r.error && action.type !== 'SESSION_START' && action.type !== 'SESSION_END') this.session.actions++
    if (r.error) this.notice = { text: r.error, kind: 'error', at: Date.now() }
    this.commit(r.state, r.events)
    if (action.type === 'DEBUG_ADD_OFFSET' || action.type === 'DEBUG_RESET_OFFSET') this.tick()
    return r.error ?? null
  }

  flash(text: string, kind: Notice['kind'] = 'info'): void {
    this.notice = { text, kind, at: Date.now() }
    this.refresh()
  }

  clearNotice = (): void => {
    this.notice = null
    this.refresh()
  }

  dismissAway = (): void => {
    this.away = null
    this.refresh()
  }

  // ---- config (debug editor)

  setPreset(preset: PresetName): void {
    this.settings = { ...this.settings, preset }
    this.saveSettings({ path: 'preset', value: null })
  }

  setOverride(path: string, value: number | boolean | null): void {
    const overrides = { ...this.settings.overrides }
    if (value === null) delete overrides[path]
    else overrides[path] = value
    this.settings = { ...this.settings, overrides }
    this.saveSettings({ path, value })
  }

  resetOverrides(prefix = ''): void {
    const overrides = Object.fromEntries(
      Object.entries(this.settings.overrides).filter(([path]) => prefix && !path.startsWith(prefix)),
    )
    this.settings = { ...this.settings, overrides }
    this.saveSettings({ path: prefix ? `${prefix}*` : '*', value: null })
  }

  presetConfig(): Config {
    return tryBuildConfig(this.settings.preset).config
  }

  // ---- game management

  resetGame(): void {
    this.endSession()
    this.startNewGame()
    this.beginSession()
  }

  importSave(json: string): string | null {
    try {
      const state = migrate(JSON.parse(json))
      this.appendLog([this.metaLine(state)])
      this.commit(state, [])
      this.flash('Save imported')
      return null
    } catch (e) {
      return (e as Error).message
    }
  }

  runBot(days: number): Trace | null {
    if (!this.committed) return null
    const from = this.gameNow()
    const trace = botPlay(this.committed, this.config, from, days)
    this.appendLog(trace.actions.map((a) => ({ kind: 'action' as const, t: a.t, action: a.action })))
    // The bot played `days` into the future: move the clock with it.
    const final = { ...trace.final, debugOffsetMs: trace.final.debugOffsetMs + days * dayMs(this.config) }
    this.commit(final, [])
    // Name the act milestones the run passed: the events themselves scroll out of the log.
    const at = final.stats.actClearedAt
    const milestones = [
      at[1] !== undefined && at[1] >= from ? `reached Act II on Day ${gameDay(this.config, final, at[1])}` : null,
      at[2] !== undefined && at[2] >= from ? `cleared Act II on Day ${gameDay(this.config, final, at[2])}` : null,
    ].filter((m): m is string => m !== null)
    this.flash(
      `Bot played ${days} day${days === 1 ? '' : 's'}: ${trace.sessions.length} sessions, ${trace.actions.length} actions${milestones.map((m) => ` · ${m}`).join('')}`,
    )
    return trace
  }

  async exportSave(): Promise<void> {
    if (!this.committed) return
    storage.write(FILES.exportSave, JSON.stringify(this.committed, null, 2))
    await this.share(FILES.exportSave)
  }

  async exportLog(): Promise<void> {
    const doc: LogExport = { format: 'sevgorod-log', version: 1, exportedAt: Date.now(), lines: this.readLog() }
    storage.write(FILES.exportLog, JSON.stringify(doc))
    await this.share(FILES.exportLog)
  }

  readLog(): LogLine[] {
    const raw = storage.read(FILES.log) ?? ''
    return raw
      .split('\n')
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as LogLine]
        } catch {
          return []
        }
      })
  }

  // ---- internals

  private loadSettings(): void {
    try {
      const raw = storage.read(FILES.settings)
      this.settings = raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS
    } catch {
      this.settings = DEFAULT_SETTINGS
    }
    this.rebuildConfig()
  }

  private rebuildConfig(): void {
    const { config, errors } = tryBuildConfig(this.settings.preset, this.settings.overrides)
    this.configErrors = errors
    // A broken config is loud (shown in Debug) but never bricks the game: fall back to defaults.
    this.config = errors.length ? tryBuildConfig('default').config : config
  }

  private saveSettings(change: { path: string; value: number | boolean | null }): void {
    storage.write(FILES.settings, JSON.stringify(this.settings))
    this.rebuildConfig()
    const t = this.gameNow()
    this.appendLog([{ kind: 'config', t, preset: this.settings.preset, overrides: this.settings.overrides }])
    if (this.committed) {
      // Every config change goes into the event log with its timestamp (plan §13).
      const event: GameEvent = { type: 'CONFIG_CHANGED', t, path: change.path, value: change.value, preset: this.settings.preset }
      const state = { ...this.committed, log: [...this.committed.log, event] }
      this.commit(state, [event])
    }
  }

  private loadSave(): void {
    const raw = storage.read(FILES.save)
    if (raw) {
      try {
        this.committed = migrate(JSON.parse(raw))
        this.tick()
        return
      } catch (e) {
        storage.write(`sevgorod-save-unreadable-${Date.now()}.json`, raw)
        this.notice = { text: `Save could not be loaded (${(e as Error).message}). Kept a copy and started fresh.`, kind: 'error', at: Date.now() }
      }
    }
    this.startNewGame()
  }

  private startNewGame(): void {
    const state = newGame(this.config, newPlayerId(), Date.now())
    storage.write(FILES.log, '')
    this.appendLog([this.metaLine(state)])
    this.commit(state, [])
  }

  private metaLine(state: PlayerState): LogLine {
    return {
      kind: 'meta',
      t: state.updatedAt,
      playerId: state.playerId,
      preset: this.settings.preset,
      overrides: this.settings.overrides,
      initialState: state,
    }
  }

  private tick(): void {
    if (!this.committed) return
    const now = this.gameNow()
    const r = reconcile(this.committed, now, this.config)
    const away = now - this.committed.updatedAt >= AWAY_MIN_GAME_MINUTES * (this.config.time.hourMs / 60)
    if (away) this.away = mergeAway(this.away, buildAway(this.committed, r.state, r.events, this.config, now))
    // A gap is committed even without events, or the next tick would summarise it again.
    if (r.events.length || away) this.commit(r.state, r.events)
    else this.refresh(r.state)
  }

  private commit(state: PlayerState, events: GameEvent[]): void {
    this.committed = state
    storage.write(FILES.save, JSON.stringify(state))
    if (events.length) this.appendLog(events.map((event) => ({ kind: 'event' as const, event })))
    this.refresh(state)
  }

  private refresh(state: PlayerState | null = this.snapshot?.state ?? this.committed): void {
    if (!state) return
    this.snapshot = {
      state,
      derived: derive(state, this.config),
      config: this.config,
      settings: this.settings,
      configErrors: this.configErrors,
      now: this.gameNow(),
      realNow: Date.now(),
      notice: this.notice,
      away: this.away,
    }
    for (const listener of this.listeners) listener()
  }

  private appendLog(lines: LogLine[]): void {
    if (lines.length) storage.append(FILES.log, lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
  }

  private beginSession(): void {
    if (this.session.open || !this.committed) return
    this.session = { open: true, startedAt: Date.now(), actions: 0 }
    this.dispatch({ type: 'SESSION_START' })
  }

  private endSession(): void {
    if (!this.session.open) return
    this.dispatch({ type: 'SESSION_END', durationMs: Date.now() - this.session.startedAt, actions: this.session.actions })
    this.session.open = false
  }

  private onAppState(status: AppStateStatus): void {
    if (status === 'active') this.beginSession()
    else if (status === 'background') this.endSession()
  }

  private async share(name: string): Promise<void> {
    const uri = storage.uri(name)
    if (!uri || !(await Sharing.isAvailableAsync())) {
      this.flash('Sharing is not available on this device', 'error')
      return
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export Sevgorod data' })
  }
}

export const store = new GameStore()

export function useGame(): Snapshot | null {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
