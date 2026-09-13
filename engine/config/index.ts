import { defaults } from './defaults'
import defaultPreset from './presets/default.json'
import fastPreset from './presets/fast.json'
import lenientPreset from './presets/lenient.json'
import stressPreset from './presets/stress.json'
import { isObject, unknownKeys, validateConfig, type Config } from './schema'

export * from './schema'
export { defaults }

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

export type PresetName = 'default' | 'fast' | 'stress' | 'lenient'
export const PRESET_NAMES: readonly PresetName[] = ['default', 'fast', 'stress', 'lenient']

export const PRESETS: Record<PresetName, DeepPartial<Config>> = {
  default: defaultPreset as DeepPartial<Config>,
  fast: fastPreset as DeepPartial<Config>,
  stress: stressPreset as unknown as DeepPartial<Config>,
  lenient: lenientPreset as DeepPartial<Config>,
}

// User overrides are a flat path → value map ("heat.baseControl": 5), so the editor
// can show and reset one field at a time. Only the editor writes these.
export type Overrides = Record<string, number | boolean>

export class ConfigError extends Error {
  constructor(readonly errors: string[]) {
    super(`Invalid config:\n  ${errors.join('\n  ')}`)
  }
}

export function deepMerge<T>(base: T, overlay: unknown): T {
  if (!isObject(overlay)) return base
  if (!isObject(base)) return overlay as T
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(overlay)) {
    out[k] = isObject(v) && isObject(out[k]) ? deepMerge(out[k], v) : v
  }
  return out as T
}

// Paths index into arrays too ("offers.templates.stubbornVendor.diffAdd.1").
export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const key of path.split('.')) {
    if (!isObject(cur) && !Array.isArray(cur)) return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const root = structuredCloneJson(obj) as Record<string, unknown>
  let cur = root
  for (const key of keys.slice(0, -1)) {
    if (!isObject(cur[key]) && !Array.isArray(cur[key])) cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[keys[keys.length - 1]] = value
  return root as T
}

export function structuredCloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

// effective = defaults ← preset ← userOverrides (manual §2)
export function tryBuildConfig(
  preset: PresetName | DeepPartial<Config>,
  overrides: Overrides = {},
): { config: Config; errors: string[] } {
  const presetObj = typeof preset === 'string' ? PRESETS[preset] : preset
  const errors: string[] = []
  if (!presetObj) {
    return { config: defaults, errors: [`unknown preset ${JSON.stringify(preset)}`] }
  }
  errors.push(...unknownKeys(defaults, presetObj).map((e) => `preset: ${e}`))
  let config = deepMerge(defaults, presetObj)
  for (const [path, value] of Object.entries(overrides)) {
    const current = getPath(config, path)
    if (typeof current !== typeof value) {
      errors.push(`override ${path}: expected ${typeof current}, got ${typeof value}`)
      continue
    }
    config = setPath(config, path, value)
  }
  errors.push(...validateConfig(config))
  return { config, errors }
}

export function buildConfig(preset: PresetName | DeepPartial<Config> = 'default', overrides: Overrides = {}): Config {
  const { config, errors } = tryBuildConfig(preset, overrides)
  if (errors.length) throw new ConfigError(errors)
  return config
}

// Flat list of every editable leaf (numbers and booleans), for the debug editor.
export function configLeaves(config: Config): { path: string; value: number | boolean }[] {
  const out: { path: string; value: number | boolean }[] = []
  const walk = (node: unknown, prefix: string) => {
    if (typeof node === 'number' || typeof node === 'boolean') out.push({ path: prefix, value: node })
    else if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${prefix}.${i}`))
    else if (isObject(node)) for (const [k, v] of Object.entries(node)) walk(v, prefix ? `${prefix}.${k}` : k)
  }
  walk(config, '')
  return out.filter((l) => !l.path.startsWith('meta.') && !l.path.startsWith('crew.openingPool.') && !l.path.startsWith('opening.'))
}
