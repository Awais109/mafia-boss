import type { CrashLine } from '../sim/replay'

// A caught error as a play-log line (ADR 0071). Pure, so it's tested; app/crash.ts records it. Stacks are
// trimmed so one bad loop can't fill the log.
export const CRASH_LIMITS = { stack: 4000, componentStack: 2000, message: 500 }

export function crashLine(
  error: unknown,
  o: { where: CrashLine['where']; fatal: boolean; at: number; t?: number; screen?: string; componentStack?: string },
): CrashLine {
  const e = error instanceof Error ? error : null
  const message = (e ? `${e.name}: ${e.message}` : typeof error === 'string' ? error : safeString(error)).slice(0, CRASH_LIMITS.message)
  return {
    kind: 'crash',
    at: o.at,
    ...(o.t !== undefined ? { t: o.t } : {}),
    where: o.where,
    fatal: o.fatal,
    message,
    ...(e?.stack ? { stack: e.stack.slice(0, CRASH_LIMITS.stack) } : {}),
    ...(o.componentStack ? { componentStack: o.componentStack.slice(0, CRASH_LIMITS.componentStack) } : {}),
    ...(o.screen ? { screen: o.screen } : {}),
  }
}

function safeString(x: unknown): string {
  try {
    return JSON.stringify(x) ?? String(x)
  } catch {
    return String(x)
  }
}
