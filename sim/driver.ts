import { apply, dayMs, derive, newGame, reconcile, type Config, type PlayerState } from '../engine'
import { CASUAL, nextSessionAfter, playSession, type ActionRecord, type PersonaOptions } from './persona'

// Headless driver: walks game time hour by hour with reconcile, runs the persona at its
// session times, and records an hourly trace. Pure (no fs), so the app's Bot uses it too.

export type HourRow = {
  t: number
  hour: number
  day: number
  act: number
  dirty: number
  clean: number
  vault: number
  vaultCap: number
  heat: number
  heatTarget: number
  exposure: number
  control: number
  yield: number
  rep: number
  influence: number
  frontUtil: number
  cleanEarned: number
  dirtyEarned: number
}

export type SessionRow = {
  t: number
  day: number
  act: number
  actions: number
  income: number // Dirty earned since the previous session ended
  dirtyAfter: number // Dirty left unconverted when the session ends
  vaultFillHrs: number // vault cap ÷ yield at session end
}

export type TraceLabel = { preset: string; persona: string; seed: string; days: number; source: 'bot' | 'replay' }

export type Trace = {
  config: Config
  label: TraceLabel
  start: number
  end: number
  final: PlayerState
  hours: HourRow[]
  sessions: SessionRow[]
  actions: ActionRecord[]
}

// Sim clocks start at 07:00 game time, an hour before the first session.
const SIM_EPOCH_DAY = 20454

export class Recorder {
  hours: HourRow[] = []
  sessions: SessionRow[] = []
  actions: ActionRecord[] = []
  private earnedAtLastSessionEnd = 0

  constructor(
    private readonly c: Config,
    private readonly start: number,
  ) {}

  hour(state: PlayerState, t: number): void {
    const d = derive(state, this.c)
    const throughput = d.perFront.reduce((s, f) => s + f.throughput, 0)
    this.hours.push({
      t,
      hour: Math.round((t - this.start) / this.c.time.hourMs),
      day: this.dayOf(t),
      act: state.act,
      dirty: state.dirty,
      clean: state.clean,
      vault: state.vault,
      vaultCap: d.vaultCap,
      heat: state.heat,
      heatTarget: d.heatTarget,
      exposure: d.exposure,
      control: d.control,
      yield: d.yieldPerHr,
      rep: state.reputation,
      influence: state.influence,
      frontUtil: throughput > 0 ? d.perFront.reduce((s, f) => s + f.util * f.throughput, 0) / throughput : 0,
      cleanEarned: state.stats.cleanEarned,
      dirtyEarned: state.stats.dirtyEarned,
    })
  }

  session(before: PlayerState, after: PlayerState, t: number, actions: ActionRecord[]): void {
    const d = derive(after, this.c)
    this.actions.push(...actions)
    this.sessions.push({
      t,
      day: this.dayOf(t),
      act: before.act,
      actions: actions.filter((a) => !a.error && a.action.type !== 'SESSION_START' && a.action.type !== 'SESSION_END').length,
      income: before.stats.dirtyEarned - this.earnedAtLastSessionEnd,
      dirtyAfter: after.dirty,
      vaultFillHrs: d.yieldPerHr > 0 ? d.vaultCap / d.yieldPerHr : Infinity,
    })
    this.earnedAtLastSessionEnd = after.stats.dirtyEarned
  }

  private dayOf(t: number): number {
    return Math.floor((t - this.start) / dayMs(this.c)) + 1
  }
}

export type SimOptions = {
  config: Config
  preset: string
  days: number
  seed: string
  persona?: PersonaOptions
}

export function simulate(opts: SimOptions): Trace {
  const c = opts.config
  const persona = opts.persona ?? CASUAL
  const start = SIM_EPOCH_DAY * dayMs(c) + 7 * c.time.hourMs
  const state = newGame(c, `sim-${opts.seed}`, start)
  const label: TraceLabel = { preset: opts.preset, persona: persona.name, seed: opts.seed, days: opts.days, source: 'bot' }
  return runPersona(state, c, persona, start, opts.days, label)
}

// Play the persona on top of an existing state from `from` (the in-app Bot).
export function botPlay(state: PlayerState, c: Config, from: number, days: number, persona: PersonaOptions = CASUAL): Trace {
  const label: TraceLabel = { preset: c.meta.name, persona: persona.name, seed: state.playerId, days, source: 'bot' }
  return runPersona(reconcile(state, from, c).state, c, persona, from, days, label)
}

function runPersona(initial: PlayerState, c: Config, persona: PersonaOptions, from: number, days: number, label: TraceLabel): Trace {
  const H = c.time.hourMs
  const to = from + days * dayMs(c)
  const rec = new Recorder(c, from)
  let state = initial
  let t = from
  if (t % H === 0) rec.hour(state, t)
  let nextSession = nextSessionAfter(state, c, persona, t)

  while (t < to) {
    const target = Math.min(to, nextSession, (Math.floor(t / H) + 1) * H)
    state = reconcile(state, target, c).state
    t = target
    if (t === nextSession) {
      const r = playSession(state, t, c, persona, nextSessionAfter(state, c, persona, t))
      const ended = apply(r.state, { type: 'SESSION_END', durationMs: 0, actions: r.actions.length }, t, c).state
      rec.session(state, ended, t, r.actions)
      state = ended
      nextSession = nextSessionAfter(state, c, persona, t)
    }
    if (t % H === 0) rec.hour(state, t)
  }

  return { config: c, label, start: from, end: to, final: state, hours: rec.hours, sessions: rec.sessions, actions: rec.actions }
}
