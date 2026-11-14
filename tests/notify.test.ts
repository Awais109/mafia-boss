import { describe, expect, it } from 'vitest'
import { dayMs, derive, type PlayerState } from '../engine'
import { itemTitle } from '../app/inboxTitle'
import { morningIfQuiet, NOTIFY, planNotifications, settle, type Planned } from '../app/notify/plan'
import { act, crewNamed, fresh, H, quiet, T0 } from './helpers'

// Local notifications (ADR 0058): the save played forward with nobody touching it gives the moments to come.
// T0 is 07:23 UTC; at UTC+5 (getTimezoneOffset −300) that's 12:23, clear of the quiet hours.

const DAYTIME = { offsetMs: 0, tzOffsetMin: -300 }
const MIN = 60_000
const kinds = (p: Planned[]) => p.map((x) => x.kind)

describe('notifications', () => {
  it('says who is back from what, when the job comes back', () => {
    const s = act(fresh('n-back', quiet), [{ type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(fresh('n-back', quiet), 'Vitya').id] }], T0, quiet)
    const op = s.ops[0]
    const back = planNotifications(s, quiet, T0, DAYTIME).find((p) => p.kind === 'back')
    expect(back).toMatchObject({ at: op.completesAt, title: 'Vitya is back' })
    expect(back!.body).toMatch(new RegExp(`^${quiet.ops.list.shakeDown.name}: (clean|partly done|it went wrong)\\.( Their report is waiting\\.)?$`))
    // Its report is filed at the same moment, and rides along rather than sending a second notification.
    expect(kinds(planNotifications(s, quiet, T0, DAYTIME))).not.toContain('decision')
  })

  it('warns when the vault will be full', () => {
    const s = fresh('n-vault', quiet)
    const d = derive(s, quiet)
    const vault = planNotifications(s, quiet, T0, DAYTIME).find((p) => p.kind === 'vault')
    expect(vault?.title).toBe('The vault’s full')
    const expected = T0 + ((d.vaultCap - s.vault) / d.yieldPerHr) * H
    expect(Math.abs(vault!.at - expected)).toBeLessThan(MIN)
  })

  it('warns of a payday that will come up short, at the day start', () => {
    const s: PlayerState = { ...fresh('n-pay', quiet), clean: 0, dirty: 0 }
    s.fronts = s.fronts.map((f) => ({ ...f, buffer: 0 }))
    const payday = planNotifications(s, quiet, T0, DAYTIME).find((p) => p.kind === 'payday')
    expect(payday?.title).toBe('Payday came up short')
    // The day starts at midnight game time, 05:00 local here: inside the quiet hours, so it waits for 08:00.
    expect(payday!.at).toBe(morningIfQuiet(Math.ceil(T0 / dayMs(quiet)) * dayMs(quiet), DAYTIME.tzOffsetMin))
  })

  it('warns an hour before a waiting decision takes its default', () => {
    const s = act(fresh('n-inbox', quiet), [{ type: 'DEBUG_FORCE_INCIDENT' }], T0, quiet)
    const item = s.inbox[0]
    const soon = planNotifications(s, quiet, T0, DAYTIME).find((p) => p.kind === 'expiring')
    expect(soon).toMatchObject({ at: item.expiresAt - NOTIFY.expiringLeadMinutes * MIN, title: 'A decision expires within the hour' })
    expect(soon!.body.startsWith(itemTitle(item, quiet))).toBe(true)
  })

  it('schedules in real time, sends at most a few, and leaves the save alone', () => {
    const s = act(fresh('n-real', quiet), [{ type: 'START_OP', opType: 'shakeDown', crewIds: [crewNamed(fresh('n-real', quiet), 'Vitya').id] }], T0, quiet)
    const before = JSON.stringify(s)
    const skipped = planNotifications(s, quiet, T0, { ...DAYTIME, offsetMs: 2 * H }).find((p) => p.kind === 'back')
    expect(skipped!.at).toBe(s.ops[0].completesAt - 2 * H) // two hours of skip already bought: it comes due two real hours sooner
    const plan = planNotifications(s, quiet, T0, DAYTIME)
    expect(plan.length).toBeLessThanOrEqual(NOTIFY.maxTotal)
    expect(new Set(kinds(plan)).size).toBe(plan.length) // one of each kind at most
    expect(JSON.stringify(s)).toBe(before)
  })

  it('keeps the night quiet: a moment between 22:00 and 08:00 waits for 08:00', () => {
    const at = (h: number, m = 0) => Date.UTC(2026, 0, 5, h, m)
    expect(morningIfQuiet(at(14), 0)).toBe(at(14))
    expect(morningIfQuiet(at(23, 30), 0)).toBe(Date.UTC(2026, 0, 6, 8))
    expect(morningIfQuiet(at(3), 0)).toBe(at(8))
    expect(morningIfQuiet(at(7, 59), 0)).toBe(at(8))
    expect(morningIfQuiet(at(22), 0)).toBe(Date.UTC(2026, 0, 6, 8))
    // At UTC+5, 18:00 UTC is 23:00 local: it waits for 08:00 local, which is 03:00 UTC.
    expect(morningIfQuiet(at(18), -300)).toBe(Date.UTC(2026, 0, 6, 3))
  })

  it('keeps only the most urgent of any that land together, at the earlier time', () => {
    const p = (kind: Planned['kind'], at: number): Planned => ({ kind, at, title: kind, body: '' })
    const noon = Date.UTC(2026, 0, 5, 12)
    // The vault and a payday ten minutes apart: the payday, at the vault's time.
    expect(settle([p('vault', noon), p('payday', noon + 10 * MIN)], 0)).toEqual([p('payday', noon)])
    // Three things overnight all wait for 08:00, and only the most urgent goes.
    const night = [p('back', Date.UTC(2026, 0, 5, 23)), p('tolya', Date.UTC(2026, 0, 6, 2)), p('vault', Date.UTC(2026, 0, 6, 5))]
    expect(settle(night, 0)).toEqual([p('tolya', Date.UTC(2026, 0, 6, 8))])
    // Spread out, the soonest few.
    const day = (['vault', 'back', 'decision', 'expiring', 'tolya', 'payday'] as const).map((k, i) => p(k, noon + i * H))
    expect(kinds(settle(day, 0))).toEqual(['vault', 'back', 'decision', 'expiring'])
  })
})
