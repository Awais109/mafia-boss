# The app

The React Native layer: `App.tsx` and `app/`. It renders state and dispatches actions; all game rules live in the engine ([architecture.md](architecture.md)). Built with Expo SDK 57, no navigation library, no custom fonts or assets ([ADR 0008](decisions/0008-app-shell-and-ui.md)).

**Status:** typechecks, lints, and bundles for Android (`npx expo export --platform android`). It has not been launched on a device or simulator in development so far. `/start-android` and `/start-ios` run it in Expo Go; `/install-android` and `/install-ios` install a standalone build ([native-builds.md](native-builds.md)).

## Entry and shell

- `index.ts` registers `App`.
- `App.tsx` wraps everything in `SafeAreaProvider`, calls `store.start()` once, and renders a loading spinner until the first snapshot exists. Then: `Header`, a scrollable tab bar, `TutorialBanner`, `NoticeBar`, and the active screen.
- Tabs: Home, Rackets, Fronts, Ops, Crew, Heat, Turf, Log, and Debug (only when `debug.enabled`).
- A dot on a tab means it wants attention: Home when the vault is full or Tolya has a demand, Fronts when there's Dirty and buffer room, Ops when crew are idle, Heat at or above `heat.inspectThreshold`.
- Screens receive `{ game, go }` (`app/screens/types.ts`): the current snapshot, and a function to switch tabs.

## The store

`app/store.ts` exports the `store` singleton and a `useGame()` hook (`useSyncExternalStore`).

**Lifecycle**
- `start()`: loads settings and the save, begins a session, starts a 1 s tick, and listens to `AppState`. Coming to the foreground begins a session; going to the background ends it.
- A save that fails `migrate` is copied to `sevgorod-save-unreadable-<timestamp>.json` and a new game starts, with an error notice.
- Game time is `Date.now() + state.debugOffsetMs`.

**Actions and ticks**
- `dispatch(action)`: `apply` at game time, append an `action` line to the log, write the save, append any events. A rejected action shows its error in the notice bar. After a time-offset action it ticks immediately.
- The 1 s `tick`: reconciles to now. If anything happened (events), it commits and persists. Otherwise it only refreshes the displayed snapshot, so nothing is written while idle.
- `Snapshot` = `{ state, derived, config, settings, configErrors, now, realNow, notice }`.

**Sessions:** `SESSION_START` and `SESSION_END` (with real duration and action count) are dispatched as actions, so they're in both the save stats and the log.

**Config:** `setPreset`, `setOverride(path, value | null)`, `resetOverrides(prefix?)`, `presetConfig()`. Each change writes settings, appends a `config` log line, and puts a `CONFIG_CHANGED` event in the game log. An invalid config never bricks the game: the store falls back to plain defaults and Debug shows the errors.

**Data:**
- `resetGame()` starts over with a fresh log.
- `importSave(json)` validates with `migrate` and writes a new `meta` line.
- `exportSave()` and `exportLog()` share a JSON file via `expo-sharing`. Sharing isn't available on web.
- `runBot(days)` plays the save with the sim's casual bot (`sim/driver.ts`), appends the bot's actions to the log, and moves `debugOffsetMs` forward by the days played. The notice names any act reached or cleared during the run.

## Storage

`app/storage.ts`: `read`, `write`, `append`, `remove`, `uri`, using the `File`/`Paths` API from `expo-file-system` in the app's document directory. Web falls back to `localStorage`.

| File | Contents |
|---|---|
| `sevgorod-save.json` | The `PlayerState` |
| `sevgorod-settings.json` | `{ preset, overrides }` |
| `sevgorod-log.jsonl` | One JSON line per entry: `meta` (game start snapshot and config), `action`, `config`, `event`. Format in `sim/replay.ts` |
| `sevgorod-export-save.json`, `sevgorod-export-log.json` | Written just before sharing |

## Screens

`app/screens/`:

| Screen | Shows and does |
|---|---|
| Home | Tolya's demand, if any; vault bar with fill time and Collect; Dirty and Clean; crew idle, jobs, wages due; heat and inspections; the act card (Rep against the next threshold, the act milestones from `stats.actClearedAt`, and once Act II is cleared, what's built plus Export log); the latest events |
| Rackets | Per district: owned rackets with yield, tribute, exposure, condition, Upgrade and Repair; open spots for the district's allowed businesses, with cost or unlock Rep |
| Fronts | Yield against laundering capacity; each front's rate, throughput, buffer, recent utilization, suspicion; Deposit half or max; rate upgrade; locked fronts |
| Ops | Jobs in progress; a crew picker with effective stats; each job's weights, difficulty, heat, rewards, and odds for the picked team; district picker for Pressure; Influence earned today against the cap |
| Crew | Roster with status, traits, loyalty bar, wage; Raise, enforcer assignment, two-tap Fire; the recruit pool and its refresh time; buying an extra slot |
| Heat | Heat bar with the three thresholds; target formula with live numbers; exposure and control breakdowns; Bribe; officials and the cooldown |
| Turf | Districts (controller, allowed businesses, tribute, perks, Buy out, Pressure); Tolya's mood, next visit, demand; a note on Zhanna in Act II |
| Log | The in-save event log with filters (All, Crew & jobs, Heat, Turf, Money) and a bookkeeping toggle |
| Debug | Panels: **Time** (skip +15m to +1d or custom hours, reset offset), **State** (grant currencies, set heat and Rep, force raid/arrest/Tolya, finish jobs, refresh recruits), **Config** (preset switch, grouped editor with preset values beside overrides, reset group/all, config errors), **Inspect** (live `Derived`, per racket and front, stats), **Save & log** (export, import, new game), **Bot** (play 1/3/5 days, then show the sim report) |

## Components and helpers

- `app/components/ui.tsx`: the palette and primitives (`Screen`, `Section`, `Card`, `Row`, `T`, `Btn`, `BtnRow`, `Bar` with threshold marks, `Tag`, `Money`). Each resource has one colour and glyph everywhere: Dirty ◆ amber, Clean ● green, Influence ✦ blue, Rep ★ purple, Heat ▲ red.
- `Header.tsx`: game clock, act (`Act II cleared` once it is), preset name when not default, the five resources, and the Rep line, which always names its target: `x/80 to Act II`, `x/480 to clear Act II`, or `x · Act II cleared on Day N` ([ADR 0022](decisions/0022-end-of-prototype-state.md)).
- `NoticeBar.tsx`: the latest notice for 4 s; tap to dismiss.
- `TutorialBanner.tsx`: copy for each tutorial step ([systems/progression.md](systems/progression.md#tutorial)), a button to the right tab, and Skip.
- `app/eventText.ts`: `describeEvent(event, state, config)` → `{ text, color, quiet }`. `quiet` marks bookkeeping lines that Home hides and Log shows on request.
- `app/format.ts`: `fmt`, `fmtRate`, `pct`, `fmtDuration` (in game time, so `fast` still reads "2h"), `fmtClock` (device clock for real-time presets, game clock otherwise).
