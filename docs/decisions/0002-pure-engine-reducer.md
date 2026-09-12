# 0002. The engine is a pure reducer with injected time and RNG

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
Plan §2.1 wants the game logic to be a reducer that React only renders. The plan's debug time skip, headless sim, log replay and fast tests all depend on game logic that never reads the clock or rolls unseeded dice.

## Decision
- `engine/` exports `reconcile(state, now, config, rng)`, `apply(state, action, now, config, rng)` and `derive(state, config)`. Each clones its input and returns new state plus events.
- `engine/` imports nothing from React, React Native, Expo, `app/` or `sim/`, and never calls `Date.now()`, `new Date()` or `Math.random()`.
- ESLint enforces this for `engine/**/*.ts` in `eslint.config.js`. The rule is not to be disabled.
- The app supplies `now` (`Date.now() + debugOffsetMs`); randomness comes from `makeRng` ([0005](0005-seeded-rng-streams.md)).

## Consequences
- The time skip is an offset, the sim calls the same functions with fake time, and tests never sleep.
- Every call deep-clones state via JSON. Cheap at this state size, and it keeps callers' snapshots immutable.
- State must stay JSON-serialisable: no class instances, Maps or functions.

## Related
`engine/index.ts`, `engine/core/`, `eslint.config.js`, [architecture.md](../architecture.md).
