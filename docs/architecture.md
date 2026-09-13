# Architecture

How the code is organised and how a game advances. System mechanics live in [systems/](README.md#index); the why behind each choice lives in [decisions/](decisions/README.md).

## Layers

```
engine/   pure TypeScript game logic. Imports nothing from app/ or sim/.
sim/      headless bot, report, log replay. Pure except sim/run.ts (Node fs, CLI).
app/      React Native UI (Expo SDK 57). Renders state, dispatches actions, owns persistence.
tests/    Vitest over engine/ and sim/.
```

**The one rule** ([ADR 0002](decisions/0002-pure-engine-reducer.md)): `engine/` never imports React, React Native, Expo, `app/` or `sim/`, and never calls `Date.now()`, `new Date()` or `Math.random()`. ESLint enforces it in `eslint.config.js` (`no-restricted-imports`, `no-restricted-properties`, `no-restricted-syntax`, scoped to `engine/**/*.ts`). The app may import `sim/` (the Debug Bot uses `sim/driver.ts` and `sim/report.ts`).

## Engine API

Exported from `engine/index.ts`:

| Function | Does |
|---|---|
| `newGame(config, playerId, now)` | Initial `PlayerState` (`engine/newGame.ts`) |
| `reconcile(state, now, config, rng?)` | Catch the state up to `now`; returns `{ state, events }` |
| `apply(state, action, now, config, rng?)` | Reconcile to `now`, then apply one action; returns `{ state, events, error? }` |
| `derive(state, config)` | Everything computed from state: yield, caps, exposure, control, costs, unlocks. Never persisted |
| `buildConfig(preset, overrides)` / `tryBuildConfig` | Effective config, throwing / returning errors |
| `migrate(doc)` | Bring a loaded save up to the current `schemaVersion`, one step per version |

All three core functions clone their input; callers keep immutable snapshots. `rng` defaults to `makeRng(state.playerId)`.

## The reconcile walk

`engine/core/reconcile.ts`. Nothing ticks: time is walked in segments ([ADR 0003](decisions/0003-split-invariant-reconcile.md)).

1. If `now <= state.updatedAt`, return unchanged.
2. **Offline cap.** If the gap exceeds `time.maxOfflineHours`, skip to `now − maxOfflineHours`, emit `OFFLINE_CAPPED`, and resolve anything overdue at that point.
3. Loop until `now`. Each segment ends at the earliest of: `now`, the next whole game hour, an op's `completesAt`, `bribeUntil` (while a bribe is active), `recruitPool.refreshAt`, `offers.refreshAt`, `rival.tolya.nextTickAt`, a jailed crew member's `jailedUntil`, or an inbox item's `expiresAt`.
4. **Accrue over the segment**, using `derive` at the segment's start: vault accrual up to the cap, tribute stats, front conversion, cigarette stock with exact clamps ([systems/supply-chain.md](systems/supply-chain.md)), heat convergence (closed form), wages and premises upkeep owed, Influence from officials, enforcers' Muscle XP. Events emitted mid-segment (the vault filling, stock running out or filling) are put in time order.
5. **At a whole hour:** update front utilization and racket condition, then spend banked crew XP on stat points ([systems/crew.md](systems/crew.md#experience)), then the inspection flag and the raid and arrest rolls, then the shortage flag, then the incident roll ([systems/inbox.md](systems/inbox.md)). At a day start, also settle wages, drift loyalty, roll walkouts, settle premises upkeep, and take the ledger snapshot.
6. **Then events due at the boundary**, in fixed order: ops completing (by time, then id; each files its report), expired inbox items taking their default, bribe expiry, jail releases, recruit pool refresh, offers refresh, Tolya's visit, then the Act I goals check.

Whole-hour rolls run before events at the same instant, so an op's heat spike feeds the *next* hour's raid roll.

**Split invariance.** `reconcile(s, t2)` equals `reconcile(reconcile(s, t1), t2)` for any `t1 < t2` (within the offline cap). It holds because every rate is constant within a segment: condition, the inspection and shortage flags, front utilization and enforcers' stats only change at whole hours, front modes only change on an action, stock reaches zero or its cap at exact instants, and heat convergence composes exactly (`(1−k)^a · (1−k)^b = (1−k)^(a+b)`). `tests/reconcile.test.ts` checks it on 1,000 random splits.

Events are appended to `state.log`, a ring buffer of the latest `LOG_CAP` (200) events.

## apply

`engine/core/apply.ts`: clone → reconcile to `now` → act at `t = max(now, updatedAt)`. Every handler validates before it mutates and returns an error string or `null`, so a rejected action leaves only the reconciled state. On success, `stats.actions` increments (except `SESSION_START`, `SESSION_END`, `TUTORIAL_ADVANCE`, `TUTORIAL_SKIP`), the tutorial checks whether the action advances it, and the Act I goals are checked. `DEBUG_*` actions are refused unless `debug.enabled`. `DEBUG_RESET_OFFSET` shifts every stored timestamp back by the offset (`shiftTimes` in `engine/core/time.ts`), so resetting never freezes the game. `skippedMs` is a duration and is never shifted.

Actions are listed in `engine/model/actions.ts`, events in `engine/model/events.ts`; each system doc lists its own.

## Game time

([ADR 0004](decisions/0004-game-time.md))

- The app computes game time as `Date.now() + state.debugOffsetMs + state.skippedMs`, the last being hours bought with gold ([systems/gold.md](systems/gold.md)). The engine only ever receives `now`.
- Every duration in config is in **game hours** (op minutes are converted too). `time.hourMs` maps a game hour to milliseconds: 3,600,000 by default, 60,000 in the `fast` preset.
- Hours and days are aligned to the epoch: `hourIndex = floor(t / hourMs)`, and a day starts where `t % (24 · hourMs) === 0`. Every split of a reconcile sees the same boundaries. The UI's "Day N" counts from `createdAt`.

## Randomness

`engine/core/rng.ts`. `makeRng(seed).derive(...parts)` hashes `seed|part|part…` (xmur3) into a seeded sfc32 generator ([ADR 0005](decisions/0005-seeded-rng-streams.md)). The seed is the player id. Streams in use: `raid`/`arrest` + hour index, `op` + op id, `pool` + refresh count, `offers` + refresh count, `incident` + hour index, `tolya` + visit count, `haggle` + visit count, `refuse` + visit count, `perk` + crew id + rank, `walkout` + day + crew id, `debug-arrest`, `debug-incident`. The same state and times always roll the same outcomes, so reloading can't dodge a raid, and a log replays exactly.

Ids come from `state.nextId` with prefixes `r` (racket), `f` (front), `crew`, `op`; recruit candidates are `cand<refresh>-<n>`.

## Config

([ADR 0006](decisions/0006-config-layering.md))

```
effective = defaults.ts  ←  presets/<name>.json  ←  user overrides
```

- `engine/config/defaults.ts` holds every number. `engine/config/schema.ts` holds the `Config` type and `validateConfig` (structural checks: rates in range, thresholds ascending, positive durations, known stats and racket types).
- Presets (`default`, `fast`, `stress`, `lenient`) are partial nested JSON. A preset key that doesn't exist in defaults is an error (`unknownKeys`), except inside open maps: `costs.overrides`, `ops.list.*`, `ops.list.*.w`, `districts.list.*.mod`.
- User overrides are a flat path map (`{ "heat.baseControl": 5 }`) written only by the Debug config editor. An override must match the type of the value it replaces.
- Saves never contain config: the same save loads under any preset.

## State and saves

`engine/model/state.ts` defines `PlayerState`: currencies (`vault`, `dirty`, `clean`, `influence`, `reputation`, `gold`), the bought time `skippedMs`, `act`, `heat` and `inspected`, the cigarette `inventory` and `stockEmpty`, `rackets` (with tier-3 `specialization`), `fronts` (with `mode` and `capacityLevel`), `crew` (with experience: `xp`, `potential`, `gained`, `rank`, `perks`), `recruitPool`, `ops`, `districts`, `officials`, bribe fields, `wagesOwed`, `upkeepOwed`, `influenceToday`, `rival.tolya` (with `haggledTick`) and `rival.zhanna`, `tutorial`, `goals`, the `inbox` of pending decisions, the `offers` board, the daily `ledger`, the event `log`, and playtest `stats`.

`SCHEMA_VERSION` is 7. `engine/model/migrate.ts` holds one step per version (`STEPS[1]` = `v1to2`, `STEPS[2]` = `v2to3`, `STEPS[3]` = `v3to4`, `STEPS[4]` = `v4to5`, `STEPS[5]` = `v5to6`, `STEPS[6]` = `v6to7`); `migrate()` runs them in order and refuses a save from a newer build. A step only fills what's missing: new stat counters default to 0, and anything timed is seeded from `updatedAt`, so it catches up on the next reconcile. v2 adds an empty inbox, an empty board that refreshes immediately, and one ledger snapshot. v3 gives crew and candidates no XP, a ceiling 10 above each stat (at most 100), rank 0 and no perks; sets every front to `normal` at capacity 0; and clears haggle state. v4 adds the starting stock, nothing owed in upkeep, and the Station Square district row, reading those from `defaults` because `migrate` has no config. v5 adds the starting gold and no bought time. v6 adds an empty goals list and marks a save still in the old tutorial as done. v7 adds Zhanna's trade, with her first lot ready at `updatedAt`. `sim/replay.ts` migrates a log's starting snapshot, so logs from older builds still replay. Every new timestamp must also be shifted in `shiftTimes` (`engine/core/time.ts`).

Persistence lives in the app ([app.md](app.md)): the save, settings, and a JSON-lines event log in the app's document directory ([ADR 0007](decisions/0007-local-file-persistence.md)).

## Tooling

| File | Role |
|---|---|
| `package.json` scripts | `start`/`android`/`ios`/`web` (Expo Go), `doctor`, `android:install`/`ios:install`/`ios:xcode` (native builds), `test`, `typecheck`, `lint`, `check` (all three), `sim` |
| `scripts/doctor.ts` | Environment doctor ([native-builds.md](native-builds.md)) |
| `scripts/with-native-env.sh` | Runs a command with JDK 17, the Android SDK and a UTF-8 locale; used by the native npm scripts |
| `eslint.config.js` | `eslint-config-expo` plus the engine boundary rules |
| `vitest.config.mts` | Runs `tests/**/*.test.ts` in Node |
| `tsconfig.json` | Expo base, `strict` |
| `.claude/skills/` | Slash commands: `/setup-project`, `/start-android`, `/start-ios`, `/install-android`, `/install-ios`, `/check` |
