import { describe, expect, it } from 'vitest'
import { apply, reconcile, type GameEvent, type PlayerState } from '../engine'
import { replayLog, type LogExport } from '../sim/replay'
import { act, config, crewNamed, expectClose, fresh, H, T0 } from './helpers'

// Gold bars buy time and nothing else (ADR 0034): a skip is waiting, a rush is the roll the job
// was always going to get, and both replay exactly.

const find = <K extends GameEvent['type']>(events: GameEvent[], type: K) =>
  events.find((e): e is Extract<GameEvent, { type: K }> => e.type === type)

// Everything a skip is allowed to change beyond what waiting would: the bars, the bought time,
// the action count, and its own log line.
function asIfWaited(skipped: PlayerState, waited: PlayerState): PlayerState {
  return {
    ...skipped,
    gold: waited.gold,
    skippedMs: waited.skippedMs,
    stats: { ...skipped.stats, actions: waited.stats.actions, gold: waited.stats.gold },
    log: skipped.log.filter((e) => e.type !== 'TIME_SKIPPED'),
  }
}

describe('gold bars', () => {
  it('a new game starts with the starting bars', () => {
    const s = fresh()
    expect(s.gold).toBe(config.gold.starting)
    expect(s.stats.gold.granted).toBe(config.gold.starting)
  })

  it('skipping ahead is exactly waiting, paid for in bars', () => {
    const s = act(fresh(), [{ type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(fresh(), 'Vitya').id] }], T0)
    const hours = 3
    const skipped = act(s, [{ type: 'SKIP_TIME', hours }], T0)
    const waited = reconcile(s, T0 + hours * H, config).state
    expect(skipped.gold).toBe(config.gold.starting - hours / config.gold.hoursPerBar)
    expect(skipped.skippedMs).toBe(hours * H)
    expect(skipped.updatedAt).toBe(T0 + hours * H)
    expect(skipped.stats.gold.hoursSkipped).toBe(hours)
    expectClose(asIfWaited(skipped, waited), waited)
  })

  it('refuses a skip it can’t pay for, one that’s too long, or part of an hour', () => {
    const s = fresh()
    s.gold = 2
    expect(apply(s, { type: 'SKIP_TIME', hours: 3 }, T0, config).error).toMatch(/gold/)
    expect(apply(fresh(), { type: 'SKIP_TIME', hours: config.gold.maxSkipHours + 1 }, T0, config).error).toMatch(/At most/)
    expect(apply(fresh(), { type: 'SKIP_TIME', hours: 1.5 }, T0, config).error).toMatch(/whole/)
  })

  it('finishing a job now gives the outcome waiting would, for a bar per hour left', () => {
    const s = act(fresh(), [{ type: 'DEBUG_GRANT', dirty: 100 }, { type: 'START_OP', opType: 'trainMuscle', crewIds: [crewNamed(fresh(), 'Vitya').id] }], T0)
    const job = act(fresh(), [{ type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(fresh(), 'Dima').id] }], T0)
    const op = job.ops[0]
    const rushed = apply(job, { type: 'RUSH_OP', opId: op.id }, T0 + 60_000, config)
    const waited = reconcile(job, op.completesAt, config)
    const a = find(rushed.events, 'OP_RESOLVED')!
    const b = find(waited.events, 'OP_RESOLVED')!
    expect([a.outcome, a.score, a.dirty]).toEqual([b.outcome, b.score, b.dirty])
    expect(rushed.state.gold).toBe(config.gold.starting - 1)
    expect(rushed.state.ops).toHaveLength(0)
    // Four hours of training left: four bars.
    const training = apply(s, { type: 'RUSH_OP', opId: s.ops[0].id }, T0, config)
    expect(find(training.events, 'OP_RUSHED')!.bars).toBe(Math.ceil(config.ops.list.trainMuscle.minutes / 60 / config.gold.hoursPerBar))
    expect(find(training.events, 'TRAINING_DONE')).toBeDefined()
  })

  it('opening Act II and Debug grant bars', () => {
    const s = act(fresh(), [{ type: 'DEBUG_SET_REP', reputation: config.reputation.actThresholds[2] }], T0)
    expect(s.gold).toBe(config.gold.starting + config.gold.perActUnlocked[2])
    expect(s.log.find((e) => e.type === 'GOLD_GRANTED')).toMatchObject({ source: 'act', amount: config.gold.perActUnlocked[2] })
    const debug = act(s, [{ type: 'DEBUG_GRANT', gold: 10 }], T0)
    expect(debug.gold).toBe(s.gold + 10)
    expect(debug.stats.gold.granted).toBe(config.gold.starting + config.gold.perActUnlocked[2] + 10)
  })

  it('a log with skips and rushes replays to the same game', () => {
    const initial = fresh('gold-replay')
    const vitya = crewNamed(initial, 'Vitya').id
    const dima = crewNamed(initial, 'Dima').id
    const lines: { t: number; action: Parameters<typeof apply>[1] }[] = []
    let direct = initial
    const play = (t: number, action: Parameters<typeof apply>[1]) => {
      const r = apply(direct, action, t, config)
      expect(r.error).toBeUndefined()
      direct = r.state
      lines.push({ t, action })
    }
    play(T0, { type: 'START_OP', opType: 'shakeDown', crewIds: [vitya] })
    play(T0 + 60_000, { type: 'RUSH_OP', opId: direct.ops[0].id })
    play(T0 + 120_000, { type: 'SKIP_TIME', hours: 2 })
    // After a skip the clock includes the bought hours, as the app's does.
    play(T0 + 2 * H + 180_000, { type: 'START_OP', opType: 'collectDebt', crewIds: [dima] })
    play(T0 + 2 * H + 240_000, { type: 'COLLECT' })
    const doc: LogExport = {
      format: 'sevgorod-log',
      version: 1,
      exportedAt: 0,
      lines: [
        { kind: 'meta', t: T0, playerId: initial.playerId, preset: 'default', overrides: {}, initialState: initial },
        ...lines.map(({ t, action }) => ({ kind: 'action' as const, t, action })),
      ],
    }
    expectClose(replayLog(doc).final, direct)
  })
})
