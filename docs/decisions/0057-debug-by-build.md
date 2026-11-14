# 0057. Debug belongs to the build, and the play log moves to Settings

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #11

## Context
`debug.enabled` is `true` in `engine/config/defaults.ts`, so every build showed Debug under More: anyone could grant gold, skip time, force raids or edit the config. That suited the fun test. Two things change it:
- the plan's real-time playtest (§12, Pass 2) asks for Debug hidden;
- any build players get must not let them grant themselves gold.

But Debug was also the only way to export the play log, which the playtest depends on.

## Decision
- **Debug is a property of the build** (`DEBUG_BUILD` in `app/build.ts`):
  - development builds and Expo Go have it (`__DEV__`);
  - a release build has it only when bundled with `EXPO_PUBLIC_DEBUG=1`, for a playtest that needs to skip time (Pass 1).

  Expo inlines the variable at bundle time, so it's read statically.
- **In a release build the store turns `debug.enabled` off** (`forBuild`, applied on every config rebuild, including the fallback to defaults). A preset or an override in the settings file can't turn it back on, and the engine refuses every `DEBUG_*` action without it. The engine and its config are unchanged: tests and the sim still run with Debug on.
- **More hides Debug** without it, and `?tab=debug` opens Home.
- **Settings gets "Share my play log"** (`store.exportLog`), so a tester can send their log without Debug.
- **The release install scripts clear Metro's cache first** (`npm run ios:install`, `npm run android:install`). Metro caches the inlined value, so a build after one made with the flag could otherwise keep Debug.

## Consequences
- **A tester build is safe by default.** A Pass 1 build needs the flag on purpose: `EXPO_PUBLIC_DEBUG=1 npm run ios:install -- --device "<name>"`.
- **Release builds bundle from a cold cache,** so they take a little longer.
- **The web export** (the screenshot rig) is a production bundle, so it has no Debug unless exported with the flag and `--clear`.
- **A save keeps whatever `debugOffsetMs` it had.** A release build can't reset it, but it's only ever added by Debug.

## Related
`app/build.ts`, `app/store.ts` (`rebuildConfig`), `App.tsx` (`shown`), `app/screens/SettingsScreen.tsx`, `package.json` (install scripts), `tests/build.test.ts`, [app.md](../app.md), [native-builds.md](../native-builds.md), [architecture.md](../architecture.md).
