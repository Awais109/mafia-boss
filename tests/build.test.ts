import { describe, expect, it } from 'vitest'
import { apply } from '../engine'
import { forBuild } from '../app/build'
import { config, fresh, T0 } from './helpers'

// Debug belongs to the build (ADR 0057): a release build runs with it off, whatever the preset or overrides say,
// so the engine refuses every DEBUG_* action.

describe('debug by build', () => {
  it('turns Debug off in a release build and leaves a debug build alone', () => {
    const on = { ...config, debug: { ...config.debug, enabled: true } }
    expect(forBuild(on, false).debug.enabled).toBe(false)
    expect(forBuild(on, true)).toBe(on)
    expect(forBuild(on, false).rackets).toBe(on.rackets) // nothing else changes
  })

  it('refuses debug actions once Debug is off', () => {
    const release = forBuild({ ...config, debug: { ...config.debug, enabled: true } }, false)
    const s = fresh('release')
    const r = apply(s, { type: 'DEBUG_GRANT', gold: 10 }, T0, release)
    expect(r.error).toBeTruthy()
    expect(r.state.gold).toBe(s.gold)
  })
})
