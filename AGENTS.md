# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Sevgorod

A fun-test prototype of an idle crime game (Acts I–II), built with Expo SDK 57 and TypeScript. **Start at [docs/README.md](docs/README.md)**: it maps every part of the code to the doc that explains what's built and why.

Slash commands: `/setup-project`, `/start-android`, `/start-ios`, `/check`.

## Documentation rule

**Every change or feature updates or adds its documentation in the same commit.** Docs describe what is built, so a stale doc is a bug.

- Find the doc for each file you touch in the code → doc map in [docs/README.md](docs/README.md), and update it to match: mechanics, config keys, actions, events, file references.
- New files, folders or systems get a row in that map, and a new doc if nothing covers them.
- A new design decision, or a reversal of one, gets an ADR in [docs/decisions/](docs/decisions/) and a row in its index. Don't edit an accepted ADR's decision; supersede it with a new one.
- Number changes in `engine/config/defaults.ts` get a line in [TUNING.md](TUNING.md), kept or reverted.
- Run `/check` (or `npm run check` plus the doc review) before committing.

The two original design docs, `docs/sevgorod-implementation-plan.md` and `docs/sevgorod-dev-manual.md`, are inputs. Don't edit them; record deviations as ADRs.

## Project rules

- `engine/` is pure TypeScript: no React, Expo, `app/` or `sim/` imports, no `Date.now()` or `Math.random()`. Time and RNG are injected. ESLint enforces this; don't disable the rule.
- Every game number lives in `engine/config/defaults.ts`. Don't inline numbers in systems or UI; read them from config.
- Tuning follows the dev manual's loop (docs/sevgorod-dev-manual.md §1): change one knob, run `npm run sim -- --days 8 --runs 10`, and log the change in TUNING.md whether kept or reverted.
- `npm run check` (typecheck, lint, tests) passes before every commit. `tests/sim.test.ts` guards pacing; if a change breaks it, read TUNING.md before loosening the test.
- Saves never contain config. A change to the state shape bumps `SCHEMA_VERSION` and adds a step in `engine/model/migrate.ts`.
