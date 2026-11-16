import { describe, expect, it } from 'vitest'
import { newGame } from '../engine'
import { CRASH_LIMITS, crashLine } from '../app/crashLine'
import { simulate } from '../sim/driver'
import { crashesIn, formatCrashes, replayLog, type LogExport } from '../sim/replay'
import { config } from './helpers'

// Crash capture (ADR 0071): a caught error becomes a play-log line; replays skip it and the report lists it.

describe('crash lines', () => {
  it('carry the error, where and when, the screen, and trimmed stacks', () => {
    const e = new TypeError('cannot read x of undefined')
    e.stack = `TypeError: cannot read x of undefined\n    at Home (App.js:1:2)\n${'    at deep\n'.repeat(1000)}`
    const line = crashLine(e, { where: 'render', fatal: true, at: 1000, t: 2000, screen: 'home', componentStack: 'in Home'.repeat(1000) })
    expect(line).toMatchObject({ kind: 'crash', at: 1000, t: 2000, where: 'render', fatal: true, message: 'TypeError: cannot read x of undefined', screen: 'home' })
    expect(line.stack!.length).toBe(CRASH_LIMITS.stack)
    expect(line.componentStack!.length).toBe(CRASH_LIMITS.componentStack)
  })

  it('takes whatever was thrown, not only Errors', () => {
    expect(crashLine('boom', { where: 'global', fatal: false, at: 1 }).message).toBe('boom')
    expect(crashLine({ code: 7 }, { where: 'global', fatal: false, at: 1 }).message).toBe('{"code":7}')
    expect(crashLine(undefined, { where: 'global', fatal: false, at: 1 }).message).toBe('undefined')
    expect(crashLine('x'.repeat(2000), { where: 'global', fatal: false, at: 1 }).message).toHaveLength(CRASH_LIMITS.message)
    expect(crashLine('boom', { where: 'global', fatal: false, at: 1 })).not.toHaveProperty('stack')
  })

  it('ride in the play log: the replay skips them, the report lists them', () => {
    const trace = simulate({ config, preset: 'default', days: 1, seed: 'crash' })
    const initial = newGame(config, 'sim-crash', trace.start)
    const crash = crashLine(new Error('a test'), { where: 'global', fatal: true, at: Date.UTC(2026, 10, 16, 9, 30), screen: 'ops' })
    const doc: LogExport = {
      format: 'sevgorod-log',
      version: 1,
      exportedAt: 0,
      lines: [
        { kind: 'meta', t: trace.start, playerId: initial.playerId, preset: 'default', overrides: { 'missions.enabled': false }, initialState: initial },
        ...trace.actions.slice(0, 5).map((a) => ({ kind: 'action' as const, t: a.t, action: a.action })),
        crash,
        ...trace.actions.slice(5).map((a) => ({ kind: 'action' as const, t: a.t, action: a.action })),
      ],
    }
    const without: LogExport = { ...doc, lines: doc.lines.filter((l) => l.kind !== 'crash') }
    expect(replayLog(doc).final).toEqual(replayLog(without).final)
    expect(crashesIn(doc)).toEqual([crash])
    const report = formatCrashes(crashesIn(doc))
    expect(report).toContain('Crashes: 1')
    expect(report).toContain('2026-11-16 09:30  global (fatal) · ops · Error: a test')
    expect(formatCrashes([])).toBe('Crashes: none')
  })
})
