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
3. Loop until `now`. Each segment ends at the earliest of: `now`, the next whole game hour, an op's `completesAt`, `bribeUntil` (while a bribe is active), `recruitPool.refreshAt`, `offers.refreshAt`, `rival.tolya.nextTickAt`, a jailed or hurt crew member's `jailedUntil` or `injuredUntil`, an inbox item's `expiresAt`, a shut business's `closedUntil`, money lent out coming due (`lending.dueAt`), a frozen front's `frozenUntil`, or the next election (`politics.nextElectionAt`, while one is scheduled). Zhanna's lot cooldown and daily surplus count aren't boundaries: they're read when the player acts ([ADR 0036](decisions/0036-zhanna-and-the-port.md)).
4. **Accrue over the segment**, using `derive` at the segment's start: vault accrual up to the cap, tribute stats, front conversion, cigarette and premium stock with exact clamps ([systems/supply-chain.md](systems/supply-chain.md)), heat convergence (closed form), wages and premises upkeep owed, Influence from officials and a Union Office, Clean from legal businesses (Act VI), enforcers' Muscle XP. Events emitted mid-segment (the vault filling, stock running out or filling) are put in time order.
5. **At a whole hour:** update front utilization and racket condition, then spend banked crew XP on stat points ([systems/crew.md](systems/crew.md#experience)), then the inspection flag and the raid and arrest rolls, then the shortage flag, then each district's prosperity step from Act III ([systems/prosperity.md](systems/prosperity.md)), then from Act V public opinion's and the Ministry's steps and any front the Ministry freezes ([systems/politics.md](systems/politics.md)), then the incident roll ([systems/inbox.md](systems/inbox.md)). At a day start, also settle wages, drift loyalty (and add a Clinic's), roll walkouts, settle premises upkeep, take the day's loan payment from Clean ([systems/credit.md](systems/credit.md)), roll the reckoning's hearing from Act VI ([systems/endgame.md](systems/endgame.md)), and take the ledger snapshot.
6. **Then events due at the boundary**, in fixed order: ops completing (by time, then id; each files its report), expired inbox items taking their default, bribe expiry, jail releases, hurt crew coming back, shut businesses reopening, money lent out coming due, frozen fronts thawing, the election count, recruit pool refresh, offers refresh, Tolya's visit, then the Act I goals check and the act gates ([systems/progression.md](systems/progression.md#acts)).

Whole-hour rolls run before events at the same instant, so an op's heat spike feeds the *next* hour's raid roll.

**Split invariance.** `reconcile(s, t2)` equals `reconcile(reconcile(s, t1), t2)` for any `t1 < t2` (within the offline cap). It holds because every rate is constant within a segment: condition, prosperity, the inspection and shortage flags, front utilization and enforcers' stats only change at whole hours, front modes only change on an action, stock reaches zero or its cap at exact instants, and heat convergence composes exactly (`(1−k)^a · (1−k)^b = (1−k)^(a+b)`). `tests/reconcile.test.ts` checks it on 1,000 random splits.

Events are appended to `state.log`, a ring buffer of the latest `LOG_CAP` (200) events.

## apply

`engine/core/apply.ts`: clone → reconcile to `now` → act at `t = max(now, updatedAt)`. Every handler validates before it mutates and returns an error string or `null`, so a rejected action leaves only the reconciled state. On success, `stats.actions` increments (except `SESSION_START`, `SESSION_END`, `TUTORIAL_ADVANCE`, `TUTORIAL_SKIP`, `SEE_SCENE`), the tutorial checks whether the action advances it, and the Act I goals are checked. `DEBUG_*` actions are refused unless `debug.enabled`. `DEBUG_RESET_OFFSET` shifts every stored timestamp back by the offset (`shiftTimes` in `engine/core/time.ts`), so resetting never freezes the game. `skippedMs` is a duration and is never shifted.

Actions are listed in `engine/model/actions.ts`, events in `engine/model/events.ts`; each system doc lists its own.

## Game time

([ADR 0004](decisions/0004-game-time.md))

- The app computes game time as `Date.now() + state.debugOffsetMs + state.skippedMs`, the last being hours bought with gold ([systems/gold.md](systems/gold.md)). The engine only ever receives `now`.
- Every duration in config is in **game hours** (op minutes are converted too). `time.hourMs` maps a game hour to milliseconds: 3,600,000 by default, 60,000 in the `fast` preset.
- Hours and days are aligned to the epoch: `hourIndex = floor(t / hourMs)`, and a day starts where `t % (24 · hourMs) === 0`. Every split of a reconcile sees the same boundaries. The UI's "Day N" counts from `createdAt`.

## Randomness

`engine/core/rng.ts`. `makeRng(seed).derive(...parts)` hashes `seed|part|part…` (xmur3) into a seeded sfc32 generator ([ADR 0005](decisions/0005-seeded-rng-streams.md)). The seed is the player id. Streams in use: `raid`/`arrest` + hour index, `op` + op id, `pool` + refresh count, `offers` + refresh count, `incident` + hour index, `tolya` + visit count, `haggle` + visit count, `refuse` + visit count, `perk` + crew id + rank, `walkout` + day + crew id, `contest` + inbox item id, `injury` + op id, `collectors` + day, `lend` + lending id, `convoy` + op id, `election` + election index, `hearing` + day index, `debug-arrest`, `debug-incident`. The same state and times always roll the same outcomes, so reloading can't dodge a raid, and a log replays exactly.

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

`engine/model/state.ts` defines `PlayerState`: currencies (`vault`, `dirty`, `clean`, `influence`, `reputation`, `gold`), the bought time `skippedMs`, `act` (1–6), `heat`, `inspected` and `raidPenaltyUntil`, `loan` and `lending`, the `inventory` of cigarettes and premium with `stockEmpty` and `premiumEmpty`, `rackets` (with the tier-3 and tier-6 specializations, `closedUntil` and `legal`), `fronts` (with `mode`, `capacityLevel` and `frozenUntil`), `crew` (with experience: `xp`, `potential`, `gained`, `rank`, `perks`), `recruitPool`, `ops`, `districts` (with `prosperity`), `officials`, bribe fields, `wagesOwed`, `upkeepOwed`, `influenceToday`, `rival.tolya` (with `haggledTick`), `rival.zhanna` and `rival.colonel`, `politics` (opinion, the Ministry's attention, elections, the mayor), `tutorial`, `story` (the scenes seen, and where the list began: [ADR 0049](decisions/0049-scenes.md)), `goals`, the `inbox` of pending decisions, the `offers` board, the daily `ledger`, the event `log`, and playtest `stats`.

`SCHEMA_VERSION` is 14. `engine/model/migrate.ts` holds one step per version (`STEPS[1]` = `v1to2` … `STEPS[13]` = `v13to14`); `migrate()` runs them in order and refuses a save from a newer build. A step only fills what's missing: new stat counters default to 0, and anything timed is seeded from `updatedAt`, so it catches up on the next reconcile. v2 adds an empty inbox, an empty board that refreshes immediately, and one ledger snapshot. v3 gives crew and candidates no XP, a ceiling 10 above each stat (at most 100), rank 0 and no perks; sets every front to `normal` at capacity 0; and clears haggle state. v4 adds the starting stock, nothing owed in upkeep, and the Station Square district row, reading those from `defaults` because `migrate` has no config. v5 adds the starting gold and no bought time. v6 adds an empty goals list and marks a save still in the old tutorial as done. v7 adds Zhanna's trade, with her first lot ready at `updatedAt`. v8 drops the retired `actII` goal ([ADR 0039](decisions/0039-goals-gate-act-two.md)). v9 gives every district a prosperity at `prosperity.base`, adds the Centre's row and `raidPenaltyUntil`, and drops an Act II save's old "cleared" date, since Act II now leads to Act III ([ADR 0040](decisions/0040-six-acts.md)). v10 adds no loan and nothing lent, and zeroed counters for loans, lending, injuries, attacks and contests ([ADR 0042](decisions/0042-act-iii-credit-and-consequences.md)). v11 adds an empty premium stock and its flag, the Colonel with no passage paid, Zastava's row under him, and zeroed premium and convoy counters ([ADR 0043](decisions/0043-act-iv-zastava.md)). v12 adds `politics` (opinion at its base, no attention, no election scheduled, not mayor), the Kombinat's row under the state, and zeroed election, campaign and freeze counters ([ADR 0044](decisions/0044-act-v-kombinat.md)). v13 adds Nagornaya's row (nobody's until Act VI opens), and zeroed legal, hearing and ending stats ([ADR 0045](decisions/0045-act-vi-nagornaya.md)). v14 adds `story` with nothing seen and `since` set to the save's current act and opening step, so the scenes it already passed count as seen ([ADR 0049](decisions/0049-scenes.md)). `sim/replay.ts` migrates a log's starting snapshot, so logs from older builds still replay. Every new timestamp must also be shifted in `shiftTimes` (`engine/core/time.ts`).

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
