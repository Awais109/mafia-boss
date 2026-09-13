# The app

The React Native layer: `App.tsx` and `app/`. It renders state and dispatches actions; all game rules live in the engine ([architecture.md](architecture.md)). Built with Expo SDK 57, no navigation library, no custom fonts or assets ([ADR 0008](decisions/0008-app-shell-and-ui.md)).

**Status:** typechecks, lints, and bundles for Android (`npx expo export --platform android`). It has not been launched on a device or simulator in development so far. `/start-android` and `/start-ios` run it in Expo Go; `/install-android` and `/install-ios` install a standalone build ([native-builds.md](native-builds.md)).

## Entry and shell

- `index.ts` registers `App`.
- `App.tsx` wraps everything in `SafeAreaProvider`, calls `store.start()` once, and renders a loading spinner until the first snapshot exists. Then: `Header`, a scrollable tab bar, `TutorialBanner`, `NoticeBar`, the active screen, and `AwayModal` while a "while you were away" summary is pending, and `SkipSheet` when the header's gold chip is tapped.
- Tabs: Home, Business (tab id `rackets`), Fronts, Ops, Crew, Heat, Turf, Log, and Debug (only when `debug.enabled`).
- A dot on a tab means it wants attention: Home when a decision is waiting, Tolya has a demand, or an alert is up (vault full, running costs Dirty can't cover, cigarettes running out or out, an offer about to expire; `homeNeedsAttention` in `app/inbox.ts`), Fronts when there's Dirty and buffer room, Ops when crew are idle, Heat at or above `heat.inspectThreshold`.
- Screens receive `{ game, go }` (`app/screens/types.ts`): the current snapshot, and a function to switch tabs.

## The store

`app/store.ts` exports the `store` singleton and a `useGame()` hook (`useSyncExternalStore`).

**Lifecycle**
- `start()`: loads settings and the save, begins a session, starts a 1 s tick, and listens to `AppState`. Coming to the foreground begins a session; going to the background ends it.
- A save that fails `migrate` is copied to `sevgorod-save-unreadable-<timestamp>.json` and a new game starts, with an error notice.
- Game time is `Date.now() + state.debugOffsetMs + state.skippedMs` (hours bought with gold).

**Actions and ticks**
- `dispatch(action)`: tick first (so a gap becomes an away summary and `apply` only sees the action), then `apply` at game time, append an `action` line to the log, write the save, append any events. A rejected action shows its error in the notice bar. After a time-offset action it ticks immediately. A successful `SKIP_TIME` builds its own away summary from the states before and after, titled "Skipped N hours".
- The 1 s `tick`: reconciles to now. If anything happened (events), or the gap counted as being away, it commits and persists. Otherwise it only refreshes the displayed snapshot, so nothing is written while idle.
- `Snapshot` = `{ state, derived, config, settings, configErrors, now, realNow, notice, away }`.

**Sessions:** `SESSION_START` and `SESSION_END` (with real duration and action count) are dispatched as actions, so they're in both the save stats and the log.

**Config:** `setPreset`, `setOverride(path, value | null)`, `resetOverrides(prefix?)`, `presetConfig()`. Each change writes settings, appends a `config` log line, and puts a `CONFIG_CHANGED` event in the game log. An invalid config never bricks the game: the store falls back to plain defaults and Debug shows the errors.

**Data:**
- `resetGame()` starts over with a fresh log.
- `importSave(json)` validates with `migrate` and writes a new `meta` line.
- `exportSave()` and `exportLog()` share a JSON file via `expo-sharing`. Sharing isn't available on web.
- `runBot(days)` plays the save with the sim's casual bot (`sim/driver.ts`), appends the bot's actions to the log, and moves `debugOffsetMs` forward by the days played. The notice names any act reached or cleared during the run.

## While you were away

([ADR 0023](decisions/0023-away-summary.md)) When a tick finds the save 15 game minutes or more behind now (`AWAY_MIN_GAME_MINUTES` in `app/store.ts`, the shortest job), it builds an `AwaySummary` from the catch-up reconcile and `AwayModal` shows it until dismissed. That happens on launch, on returning from the background, after a Debug time skip, and after importing an old save; the Bot commits its own end state, so it doesn't trigger one. On the `fast` preset the threshold is 15 real seconds.

`app/away.ts` is pure: `buildAway(before, after, events, config, to)` and `mergeAway(pending, next)`, which extends a summary that hasn't been dismissed when another gap arrives. The summary holds:

| Field | From |
|---|---|
| `jobs` | `OP_RESOLVED` events: job name, crew (named from the state at the gap's start), outcome, Dirty, Influence, Rep |
| `racketsEarned`, `lostToCap`, `vaultFull` | `stats.dirtyEarned` delta minus job rewards; `stats.dirtyLostToCap` delta; the vault against its cap |
| `fronts` | Each front's buffer delta (nothing is deposited offline) and the Clean it made at the front's rate |
| `cleanEarned`, `tributeLost`, `seized`, `influenceEarned` | Stats and state deltas |
| `wagesPaid`, `wagesShort` | `WAGES_PAID` and `WAGES_MISSED` events |
| `upkeepPaid`, `upkeepShort` | `UPKEEP_PAID` and `UPKEEP_MISSED` events |
| `packsMade`, `packsSold`, `packsLost`, `stockFrom`, `stockTo` | Stats deltas and the stock before and after |
| `goldGranted`, `skippedHours` | `GOLD_GRANTED` events; set by the store for a skip |
| `heatFrom`, `heatTo` | Heat before and after |
| `pendingDecisions` | `after.inbox.length`; the popup points the player to Home |
| `events` | Everything else except bookkeeping; the modal runs them through `describeEvent` and drops quiet lines |

The summary is not saved: closing the app loses it, and the Log still has every event.

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
| Home | Tolya's demand, if any (`TributeCard`); Act I goals once the opening is over; Waiting for you (an `InboxCard` per pending decision, soonest expiry first); alerts from `homeAlerts` (running costs Dirty can't cover, offers about to expire); vault bar with fill time and Collect; Money flow (`MoneyFlow`); Cigarettes (`SupplyCard`); crew idle, jobs, wages owed with the rate and time to payday; heat and inspections; This week (`app/ledger.ts`: Dirty in, costs, Clean in and spent per game day); the act card (Rep against the next threshold, the act milestones from `stats.actClearedAt`, and once Act II is cleared, what's built plus Export log); the latest events |
| Business | Yield, upkeep and exposure; the Cigarettes card; per district, spots and lots used and active synergies; each joint or racket with its kind, yield, packs sold and cigarette share (joints), the share supplied when short, exposure, condition, Upgrade (two buttons, greed and stealth, on the upgrade to `rackets.specialization.atTier`) and Repair; each premises with what it does (packs made, stock held, vault hours added, share of a raid hidden, Influence a day), upkeep, exposure, condition, Upgrade and Repair; open spots with their kind, cost or unlock Rep; free lots with the premises that fit there |
| Fronts | Yield against laundering capacity, and one button that launders all but running costs (keeps `fronts.reserveHours` of wages and upkeep in Dirty, deposits the rest best rate first); each front's Push / Normal / Lay low dial, rate, throughput (with the normal figure while dialled), buffer, recent utilization, suspicion; Deposit half or max; rate and capacity upgrades; locked fronts |
| Ops | Jobs in progress (under an offer's own name), each with Finish now for gold; a crew picker with effective stats; On the board: each offer's terms, what it's based on, its countdown, odds for the picked team, and Take it; Training: each lesson's Dirty cost and XP; each fixed job's weights, difficulty, heat, rewards, odds, and the XP each picked member earns on a clean job; durations include a Fixer on the picked team; smuggling shows its Clean cost and its difficulty with heat; district picker for Pressure; Influence earned today against the cap |
| Crew | Roster (a prompt to hire while it's empty) with rank, traits and perks, status, each stat against its ceiling with an XP bar toward the next point, loyalty bar, wage; Raise, enforcer assignment, two-tap Fire; the recruit pool (with each candidate's ceilings) and its refresh time; buying an extra slot |
| Heat | Heat bar with the three thresholds (the raid line says how much stash houses hide); target formula with live numbers; exposure and control breakdowns; Bribe; officials and the cooldown |
| Turf | Districts (controller, allowed businesses and premises lots, tribute, perks, Buy out, Pressure); Tolya's demand (`TributeCard`), mood and next visit; Zhanna (`ZhannaCard`) |
| Log | The in-save event log with filters (All, Decisions, Crew & jobs, Heat, Turf, Money) and a bookkeeping toggle |
| Debug | Panels: **Time** (skip +15m to +1d or custom hours, reset offset), **State** (grant currencies, packs and gold, set heat and Rep, force raid/arrest/Tolya/incident, finish jobs, refresh recruits or the offers board), **Config** (preset switch, grouped editor with preset values beside overrides, reset group/all, config errors), **Inspect** (live `Derived` with stock, upkeep, the vault cap with and without stash hours, and the raid shield, inbox and board counts, per business and front, stats), **Save & log** (export, import, new game), **Bot** (play 1/3/5 days, then show the sim report) |

## Components and helpers

- `app/components/ui.tsx`: the palette and primitives (`Screen`, `Section`, `Card`, `Row`, `T`, `Btn`, `BtnRow`, `Bar` with threshold marks, `Tag`, `Money`). Each resource has one colour and glyph everywhere: Dirty ◆ amber, Clean ● green, Influence ✦ blue, Rep ★ purple, Heat ▲ red, Packs ▮ tobacco brown, Gold ▰ yellow.
- `Header.tsx`: game clock, act (`Act II cleared` once it is), hours skipped, preset name when not default, a gold chip that opens Skip ahead, the vault, Dirty, Clean, Influence, Packs and Heat, and the Rep line, which always names its target: `x/90 to Act II`, `x/540 to clear Act II`, or `x · Act II cleared on Day N` ([ADR 0022](decisions/0022-end-of-prototype-state.md)).
- `NoticeBar.tsx`: the latest notice for 4 s; tap to dismiss.
- `InboxCard.tsx`: one pending decision: title, what happened, time left, and a button per option showing its effects (`effectsText`); the default is marked and unaffordable options are disabled.
- `TributeCard.tsx`: Tolya's demand, on Home and Turf: Pay; Haggle, naming who talks, the odds (`haggleOdds`) and the haggled price, disabled once he's refused an offer on this demand; Refuse.
- `ZhannaCard.tsx`: Zhanna on Turf from Act II ([systems/districts-and-rivals.md](systems/districts-and-rivals.md#zhanna)): her mood, her next lot with its price and countdown, Buy, and the surplus she'll still take today with Sell 10 and Sell all.
- `MoneyFlow.tsx`: businesses into the vault, running costs, what the fronts are washing, Dirty and Clean on hand, and a warning when Dirty on hand won't cover `fronts.reserveHours` of costs.
- `SkipSheet.tsx`: Skip ahead ([systems/gold.md](systems/gold.md)): the skip choices with their costs, estimates at today's rates, warnings, and the skip itself.
- `SupplyCard.tsx`: cigarette stock against its cap, made against sold per hour, and when stock runs out or fills ([systems/supply-chain.md](systems/supply-chain.md)); on Home and Business.
- `AwayModal.tsx`: the "while you were away" popup (titled "Skipped N hours" after a skip): jobs finished and what each earned, the money breakdown (businesses into the vault and what a full vault lost, per-front laundering into Clean, wages, upkeep, tribute, seizures, Influence, cigarettes made and sold, heat), and any other notable events. Got it dismisses it.
- `TutorialBanner.tsx`: the guided opening's 13 steps ([systems/progression.md](systems/progression.md#the-guided-opening)), with numbers read from config, a button to the right tab, and Skip, which buys the setup.
- `app/eventText.ts`: `describeEvent(event, state, config)` → `{ text, color, quiet }`. `quiet` marks bookkeeping lines that Home hides and Log shows on request. `WAGES_PAID` is deliberately not quiet: it's the only sign a payday happened.
- `app/inbox.ts`: `itemTitle`, `itemBody`, `effectsText(effects, config?)` (a perk option reads as the perk's text), `sortedInbox`, `homeAlerts`, `homeNeedsAttention` (the Home tab dot).
- `app/ledger.ts`: `ledgerView(state, config, now)`, the "This week" rows built from `ledgerDays`.
- `app/goals.ts`: `GOAL_TEXT` and `goalsView(state, config)`, the Act I goals on Home.
- `app/format.ts`: `fmt`, `fmtRate`, `pct`, `fmtDuration` (in game time, so `fast` still reads "2h"), `fmtClock` (device clock for real-time presets, game clock otherwise).
