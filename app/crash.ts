import { crashLine } from './crashLine'
import { store } from './store'
import type { CrashLine } from '../sim/replay'

// Crash capture, local first (ADR 0071). Every uncaught JavaScript error, and every render error the boundary
// catches (components/CrashBoundary.tsx), is written to the play log with its stack and the screen it was on,
// so a tester's shared log says what went wrong. A hosted service can come with the backend (#19, #20).
// Native crashes are out of reach from here.

let screen: string | undefined
export const setCrashScreen = (name: string): void => {
  screen = name
}

// Global errors in a release build: the boundary shows them rather than the app closing.
const listeners = new Set<(line: CrashLine) => void>()
export function onGlobalCrash(listener: (line: CrashLine) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The crash screen with a sample error, written nowhere: Debug's Preview panel and the web rig's ?preview=crash.
export function previewCrash(): void {
  const line = crashLine(new Error('A preview of the crash screen'), { where: 'render', fatal: true, at: Date.now(), screen })
  for (const l of listeners) l(line)
}

export function recordCrash(error: unknown, where: CrashLine['where'], fatal: boolean, componentStack?: string): CrashLine {
  const line = crashLine(error, { where, fatal, at: Date.now(), t: safeGameNow(), screen, componentStack })
  store.recordCrash(line)
  return line
}

function safeGameNow(): number | undefined {
  try {
    return store.gameNow()
  } catch {
    return undefined
  }
}

type ErrorUtilsLike = {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void
}

// React Native's global handler (not on web). In development the red box still follows; in a release build a
// fatal error shows the "Something went wrong" screen instead of closing the app.
export function installCrashHandler(): () => void {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils
  if (!utils?.setGlobalHandler) return () => {}
  const previous = utils.getGlobalHandler()
  utils.setGlobalHandler((error, isFatal) => {
    const line = recordCrash(error, 'global', !!isFatal)
    if (__DEV__ || !isFatal || listeners.size === 0) previous(error, isFatal)
    else for (const l of listeners) l(line)
  })
  return () => utils.setGlobalHandler(previous)
}
