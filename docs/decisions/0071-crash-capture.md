# 0071. Crashes are captured into the play log, local first

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #44

## Context
A tester's crash was invisible. A render error left a white screen, and an uncaught error in a release build closed the app, with nothing written down. The play log (ADR 0057) already reaches us when a tester shares it from Settings. A hosted crash service (Sentry or similar) needs an account, a privacy policy line and network calls, which belong with the backend choice (#19, #20). The owner chose local first.

## Decision
- **Every caught JavaScript error becomes a `crash` line in the play log:** when, in real and game time; `render` or `global`; whether it was fatal; the message; the stack; the component stack; and the screen it was on. Lengths are capped, so a loop can't fill the log. Replays skip these lines.
- **Two catchers:**
  - an error boundary around the whole app (`CrashBoundary`, mounted in `index.ts`) for render errors;
  - React Native's global handler (`installCrashHandler`) for everything else.
- **"Something went wrong" instead of a white screen or a closed app:** what happened, the error's first line, **Share my play log** and **Carry on**. In a release build, a fatal global error shows the same screen instead of closing the app. In development the red box still follows, since that's where we fix things.
- **Where they're read:** the Log screen lists the last five ("Errors caught"), and `npm run sim -- --replay` prints them after its report.
- **Tools to try it:** Debug can break a screen or throw outside React, and Preview shows the screen.

## Consequences
- A tester who hits an error sees why and can send it in two taps. The log they send says what broke, where and when, next to the actions that led there.
- **Not covered:** native crashes (native code, or the OS killing the app), and unhandled promise rejections. Those wait for a hosted service with the backend, which can read the same lines.
- **Carry on after a global error** keeps running JavaScript that just failed. The save is untouched, because the engine applies actions to copies. If the same error comes back, the screen comes back.
- No new package, no permission, and nothing leaves the phone unless the player shares it. The privacy policy (#48) can say exactly that.

## Related
`index.ts`, `app/crash.ts`, `app/crashLine.ts`, `app/components/CrashBoundary.tsx`, `app/store.ts` (`recordCrash`, `crashes`), `app/screens/LogScreen.tsx`, `app/screens/DebugScreen.tsx`, `app/previews.ts`, `sim/replay.ts` (`CrashLine`, `crashesIn`, `formatCrashes`), `sim/run.ts`, `tests/crash.test.ts`, [app.md](../app.md#crashes), [sim.md](../sim.md), [ADR 0057](0057-debug-by-build.md).
