import { describe, expect, it } from 'vitest'
import { buildConfig, ConfigError, defaults, PRESET_NAMES, tryBuildConfig, validateConfig } from '../engine'

describe('config', () => {
  it('defaults pass validation', () => {
    expect(validateConfig(defaults)).toEqual([])
  })

  it.each(PRESET_NAMES)('preset %s builds', (name) => {
    const { errors, config } = tryBuildConfig(name)
    expect(errors).toEqual([])
    expect(config.meta.name).toBe(name)
  })

  it('fast scales time only', () => {
    const fast = buildConfig('fast')
    expect(fast.time.hourMs).toBe(60_000)
    expect(fast.rackets).toEqual(defaults.rackets)
    expect(fast.costs).toEqual(defaults.costs)
  })

  it('a typo in a preset is a loud error, not a silent default', () => {
    const { errors } = tryBuildConfig({ heat: { baseControll: 5 } } as never)
    expect(errors).toContain('preset: heat.baseControll: unknown config key')
  })

  it('rejects structurally wrong values', () => {
    const { errors } = tryBuildConfig({
      fronts: { types: { restaurant: { rate: 1.2 } } },
      heat: { raidThreshold: 30 },
      ops: { list: { shakeDown: { minutes: -5 } } },
    } as never)
    expect(errors.some((e) => e.startsWith('fronts.types.restaurant.rate'))).toBe(true)
    expect(errors.some((e) => e.startsWith('heat.inspectThreshold'))).toBe(true)
    expect(errors.some((e) => e.startsWith('ops.list.shakeDown.minutes'))).toBe(true)
  })

  it('applies user overrides on top of the preset', () => {
    const c = buildConfig('lenient', { 'heat.baseControl': 3, 'vault.targetHoursByAct.1': 2 })
    expect(c.heat.baseControl).toBe(3)
    expect(c.heat.bribe.controlPct).toBe(0.8)
    expect(c.vault.targetHoursByAct[1]).toBe(2)
  })

  it('rejects overrides of the wrong type or unknown paths', () => {
    expect(() => buildConfig('default', { 'heat.nope': 1 })).toThrow(ConfigError)
    expect(() => buildConfig('default', { 'debug.enabled': 1 })).toThrow(ConfigError)
  })

  it('keeps the pillar-1 guardrail in defaults: heat compounds faster than yield', () => {
    expect(defaults.rackets.tierHeatMult).toBeGreaterThan(defaults.rackets.tierYieldMult)
  })
})
