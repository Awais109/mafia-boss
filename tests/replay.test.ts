import { describe, expect, it } from 'vitest'
import { newGame, reconcile } from '../engine'
import { simulate } from '../sim/driver'
import { replayLog, type LogExport } from '../sim/replay'
import { config } from './helpers'

// Plan M5: an exported log must load into the sim. Build the log the app would write for a bot
// game (game-start snapshot + every action with its time), replay it, and land on the same game.

describe('log replay', () => {
  it('reproduces a game from its start snapshot and action log', () => {
    const trace = simulate({ config, preset: 'default', days: 3, seed: 'replay' })
    const initial = newGame(config, 'sim-replay', trace.start)
    const doc: LogExport = {
      format: 'sevgorod-log',
      version: 1,
      exportedAt: 0,
      lines: [
        { kind: 'meta', t: trace.start, playerId: initial.playerId, preset: 'default', overrides: {}, initialState: initial },
        ...trace.actions.map((a) => ({ kind: 'action' as const, t: a.t, action: a.action })),
      ],
    }

    // The replay stops at the last action; the bot ran on to the end of its last day.
    const replay = replayLog(doc)
    const replayed = reconcile(replay.final, trace.end, config).state
    const bot = trace.final

    // Sessions drive vault fill and Dirty idle in the report, so they must survive the round trip.
    expect(replay.sessions.length).toBe(trace.sessions.length)
    expect(replay.sessions.map((s) => s.actions)).toEqual(trace.sessions.map((s) => s.actions))

    expect(replayed.reputation).toBeCloseTo(bot.reputation, 6)
    expect(replayed.clean).toBeCloseTo(bot.clean, 6)
    expect(replayed.dirty).toBeCloseTo(bot.dirty, 6)
    expect(replayed.heat).toBeCloseTo(bot.heat, 6)
    expect(replayed.act).toBe(bot.act)
    expect(replayed.rackets.map((r) => `${r.type}:${r.tier}`)).toEqual(bot.rackets.map((r) => `${r.type}:${r.tier}`))
    expect(replayed.stats.opOutcomes).toEqual(bot.stats.opOutcomes)
    expect(trace.actions.length).toBeGreaterThan(50)
  })

  it('rejects a log without a game start', () => {
    expect(() => replayLog({ format: 'sevgorod-log', version: 1, exportedAt: 0, lines: [] })).toThrow(/game start/)
  })
})
