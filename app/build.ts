import type { Config } from '../engine'

// Debug belongs to the build (ADR 0057). Development builds and Expo Go have it. A release build has it only
// when bundled with EXPO_PUBLIC_DEBUG=1, for a playtest that needs to skip time (plan §12, Pass 1). Expo
// inlines the variable at bundle time, so it's read statically, with dot notation.
export const DEBUG_BUILD: boolean = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_DEBUG === '1'

// The config this build runs: as built, but with Debug off where the build doesn't allow it. A preset or an
// override can't turn it back on, and with it off the engine refuses every DEBUG_* action.
export function forBuild(config: Config, debugBuild: boolean): Config {
  return debugBuild || !config.debug.enabled ? config : { ...config, debug: { ...config.debug, enabled: false } }
}
