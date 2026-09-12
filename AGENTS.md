# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project rules

- `engine/` is pure TypeScript: no React, Expo, `app/` or `sim/` imports, no `Date.now()` or `Math.random()`. Time and RNG are injected. ESLint enforces this; don't disable the rule.
- Every game number lives in `engine/config/defaults.ts`. Don't inline numbers in systems or UI; read them from config.
- Tuning follows the dev manual's loop (docs/sevgorod-dev-manual.md §1): change one knob, run `npm run sim -- --days 8 --runs 10`, and log the change in TUNING.md whether kept or reverted.
- `npm run check` (typecheck, lint, tests) passes before every commit. `tests/sim.test.ts` guards pacing; if a change breaks it, read TUNING.md before loosening the test.
- Saves never contain config. A change to the state shape bumps `SCHEMA_VERSION` and adds a step in `engine/model/migrate.ts`.
