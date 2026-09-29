# The app

The React Native layer: `App.tsx` and `app/`. It renders state and dispatches actions; all game rules live in the engine ([architecture.md](architecture.md)). Built with Expo SDK 57, no navigation library, no custom fonts or assets ([ADR 0008](decisions/0008-app-shell-and-ui.md)).

**Status:** typechecks, lints, and bundles for Android (`npx expo export --platform android`). It has not been launched on a device or simulator in development so far. `/start-android` and `/start-ios` run it in Expo Go; `/install-android` and `/install-ios` install a standalone build ([native-builds.md](native-builds.md)).

## Entry and shell

- `index.ts` registers `App`.
- `App.tsx` wraps everything in `SafeAreaProvider`, calls `store.start()` once, and renders a loading spinner until the first snapshot exists. Then: `Header`, a scrollable tab bar, `TutorialBanner`, `NoticeBar`, the active screen, `AwayModal` while a "while you were away" summary is pending, `EventNoticeModal` otherwise while a live notice is queued ([ADR 0038](decisions/0038-live-event-notices.md)), and `SkipSheet` when the header's gold chip is tapped.
- Tabs: Home, Business (tab id `rackets`), Fronts, Ops, Crew, Heat, Map (tab id `turf`), Stats, How it works (tab id `help`), Log, and Debug (only when `debug.enabled`).
- A dot on a tab means it wants attention: Home when a decision is waiting, Tolya has a demand, or an alert is up (vault full, running costs Dirty can't cover, cigarettes running out or out, an offer about to expire; `homeNeedsAttention` in `app/inbox.ts`), Fronts when there's Dirty and buffer room, Ops when crew are idle, Heat at or above `heat.inspectThreshold`.
- Screens receive `{ game, go }` (`app/screens/types.ts`): the current snapshot, and a function to switch tabs.

## The store

`app/store.ts` exports the `store` singleton and a `useGame()` hook (`useSyncExternalStore`).

**Lifecycle**
- `start()`: loads settings and the save, begins a session, starts a 1 s tick, and listens to `AppState`. Coming to the foreground begins a session; going to the background ends it.
- A save that fails `migrate` is copied to `sevgorod-save-unreadable-<timestamp>.json` and a new game starts, with an error notice.
- Game time is `Date.now() + state.debugOffsetMs + state.skippedMs` (hours bought with gold).

**Actions and ticks**
- `dispatch(action)`: tick first (so a gap becomes an away summary and `apply` only sees the action), then `apply` at game time, append an `action` line to the log, write the save, append any events. A rejected action shows its error in the notice bar. After a time-offset action it ticks immediately. A successful `SKIP_TIME` builds its own away summary from the states before and after, titled "Skipped N hours"; any other action with events queues live notices instead (`buildNotices`, `app/notices.ts`).
- The 1 s `tick`: reconciles to now. A gap long enough to count as being away builds/merges an away summary; otherwise any events queue live notices the same way. If anything happened (events), or the gap counted as being away, it commits and persists. Otherwise it only refreshes the displayed snapshot, so nothing is written while idle.
- `Snapshot` = `{ state, derived, config, settings, configErrors, now, realNow, notice, away, notices }`.

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
| Home | Tolya's demand, if any (`TributeCard`); Act I goals once the opening is over, with a `done/total` count — Act II opens once every one is ([ADR 0039](decisions/0039-goals-gate-act-two.md)); Waiting for you (an `InboxCard` per pending decision, soonest expiry first); alerts from `homeAlerts` (running costs Dirty can't cover, stock or premium running out, the Ministry within 10 of freezing a front, an election within a day that you'd lose, offers about to expire); vault bar with fill time and Collect; Money flow (`MoneyFlow`); Cigarettes (`SupplyCard`), and from Act IV Premium (`SupplyCard product="premium"`); crew idle, jobs, wages owed with the rate and time to payday; heat and inspections; This week (`app/ledger.ts`: Dirty in, costs, Clean in and spent per game day); the act card (`app/acts.ts`: what the next act opens, each condition of its gate with a tick when met, a bar toward it, the act milestones from `stats.actClearedAt`, and once the last built act is cleared, what's built plus Export log; [ADR 0040](decisions/0040-six-acts.md)); the latest events |
| Business | Yield, upkeep and exposure; the Cigarettes card, and the Premium card from Act IV; per district, spots and lots used, prosperity now and where it's heading (from Act III), and active synergies; each joint or racket with its kind, yield (with the prosperity and, for the Construction Trust, opinion multipliers), packs sold and cigarette share (joints that sell cigarettes), premium sold and premium share (premium joints, from Act IV), the share supplied when short, exposure, condition, a `shut` tag and when it reopens, a `legal` tag and what it earns in Clean, or from Act VI a Legalize button with its cost and legal Clean (or why not: opinion), Upgrade (two buttons, greed and stealth, on the upgrades to `rackets.specialization.atTier` and `specialization6.atTier`) and Repair; each premises with what it does (packs made, stock held, vault hours added, share of a raid hidden, Influence a day, prosperity added, injury time, loyalty a day, what it lends, premium held, customs and road losses cut, convoy bonus, premium made, public opinion added), upkeep, exposure, condition, Upgrade and Repair; open spots with their kind and cost, or why they can't open (`racketBlocked`: the act, the Rep, the street's prosperity, an auction not yet won); free lots with the premises that fit there (only the Kombinat's own on the Kombinat's lots, and those nowhere else) |
| Fronts | Yield against laundering capacity, and one button that launders all but running costs (keeps `wagesOwed` + `upkeepOwed` plus `fronts.reserveHours` of wages and upkeep in Dirty, deposits the rest best rate first); each front's Push / Normal / Lay low dial, rate, throughput (with the normal figure while dialled), buffer, recent utilization, suspicion; Deposit half or max; rate and capacity upgrades; the importer's cover (what it washes per premium pack, and premium sold now); a frozen front says so and for how long, and takes no deposits (the launder-all button skips it); locked fronts, with the act or Rep they open at and, for the Bank, the city prosperity it needs (`frontBlocked`); from Act III, Borrowing and Lending (`CreditCard`) |
| Ops | Jobs in progress (under an offer's own name), each with Finish now for gold; a crew picker with effective stats; On the board: each offer's terms, what it's based on, its countdown, odds for the picked team, and Take it; Training: each lesson's Dirty cost and XP; each fixed job's weights, difficulty, heat, rewards, odds, and the XP each picked member earns on a clean job; durations include a Fixer on the picked team; smuggling and convoys show their Clean cost, and smuggling its difficulty with heat; a convoy shows its load (with a depot's bonus) and the chances it's taken on the road or seized at customs; district picker for Pressure; Influence earned today against the cap |
| Crew | Roster (a prompt to hire while it's empty) with rank, traits and perks, status (including hurt, and for how long), each stat against its ceiling with an XP bar toward the next point, loyalty bar, wage; Raise, enforcer assignment, two-tap Fire; the recruit pool (with each candidate's ceilings) and its refresh time; buying an extra slot |
| Heat | Heat bar with the three thresholds (the raid line says how much stash houses hide); target formula with live numbers; exposure and control breakdowns (with the mayor's office and opinion's multiplier from Act V); Bribe; officials, what each does (control, customs, the Ministry), "mayor only" for the Governor, and the cooldown |
| Map (tab id `turf`) | Lyosha's notebook ([ADR 0046](decisions/0046-map-and-story.md)): the city drawn from the story bible (`CityMap`), each district a dashed outline with his fragment until someone shows it to you (`revealed` in `app/story.ts`), then inked in with its name, who holds it and a mark per business (joint, racket, premises, legal); the title is "Sevgorod" once every page is revealed. Tapping a district shows its card: controller, prosperity and its target from Act III, allowed businesses and premises lots, tribute, perks, Buy out, Pressure, and the line that revealed it. Below: Tolya's demand (`TributeCard`), mood and next visit; Zhanna (`ZhannaCard`); from Act VI, the reckoning (`ReckoningCard`); from Act V, Politics (`PoliticsCard`); from Act IV the Colonel (`ColonelCard`). An auctioned district (the Kombinat) says so, offers "Buy at auction" and no Pressure |
| Stats | Everything in `state.stats` since the game started: playtime and progress, money (earned/lost/paid/missed by category, gold), crew and jobs (outcomes, stat points, specializations, haggles, walkouts), heat and the law (raids, arrests, decisions filed/answered), territory and supply (districts held, packs made/sold/wasted, shortages, Zhanna trade), and from the first convoy, convoys run, landed, taken and seized, and passage paid; from the first election, elections won and held with what campaigns cost, and fronts the Ministry froze. Crew count, ranks, districts held and current heat read live state; everything else is a lifetime total |
| How it works | A player-facing explainer (not the engineering docs): the core loop, Vault/Dirty/Clean, and one line per business, front, district and official from its `description` — plus short plain-language sections on crew ranks and perks, ops, heat, the acts built so far and what each needs (including what clears the last one), prosperity, premium and the road, and politics. Every number reads live from config |
| Log | The in-save event log with filters (All, Decisions, Crew & jobs, Heat, Turf, Money) and a bookkeeping toggle |
| Debug | Panels: **Time** (skip +15m to +1d or custom hours, reset offset), **State** (grant currencies, packs, premium and gold, set heat and Rep, force raid/arrest/Tolya/incident, finish jobs, complete every Act I goal (`DEBUG_COMPLETE_GOALS`, the fast path to Act II since it's goal-gated — [ADR 0039](decisions/0039-goals-gate-act-two.md)), set Rep to the next act's gate, hold the coming election now (`DEBUG_HOLD_ELECTION`), refresh recruits or the offers board), **Config** (preset switch, grouped editor with preset values beside overrides, reset group/all, config errors), **Inspect** (live `Derived` with stock, upkeep, the vault cap with and without stash hours, and the raid shield, inbox and board counts, per business and front, stats), **Save & log** (export, import, new game), **Bot** (play 1/3/5 days, then show the sim report) |

## Components and helpers

- `app/components/ui.tsx`: the palette and primitives (`Screen`, `Section`, `Card`, `Row`, `T`, `Btn`, `BtnRow`, `Bar` with threshold marks, `Tag`, `Money`). Each resource has one colour and glyph everywhere: Dirty ◆ amber, Clean ● green, Influence ✦ blue, Rep ★ purple, Heat ▲ red, Packs ▮ tobacco brown, Premium ▣ rose, Gold ▰ yellow.
- `Modal.tsx`: the shared backdrop + centered panel every pop-up (`AwayModal`, `SkipSheet`, `EventNoticeModal`) renders through, so the backdrop/panel styling lives in one place.
- `Header.tsx`: game clock, act in numerals (`Act III cleared` once the last built act is), hours skipped, preset name when not default, a gold chip that opens Skip ahead, the vault, Dirty, Clean, Influence, Packs (with premium ▣ beside them from Act IV) and Heat, and the Rep line, which always names its target (`actProgress` in `app/acts.ts`): `x · y/z goals to Act II` in Act I (goal-gated, [ADR 0039](decisions/0039-goals-gate-act-two.md)), `x/y to Act N` after that, `(+n more)` when the gate also asks for districts, fronts or the mayor's office, in Act VI `x · n/m legal · w/6 hearings won` toward the endings, or `x · Act N cleared` ([ADR 0022](decisions/0022-end-of-prototype-state.md)).
- `NoticeBar.tsx`: the latest notice for 4 s; tap to dismiss.
- `InboxCard.tsx`: one pending decision: title, what happened, time left, and a button per option showing its effects (`effectsText`); the default is marked and unaffordable options are disabled.
- `TributeCard.tsx`: Tolya's demand, on Home and the Map: Pay; Haggle, naming who talks, the odds (`haggleOdds`) and the haggled price, disabled once he's refused an offer on this demand; Refuse.
- `ZhannaCard.tsx`: Zhanna on the Map from Act II ([systems/districts-and-rivals.md](systems/districts-and-rivals.md#zhanna)): her mood, her next lot with its price and countdown, Buy (and from Act IV, Buy her premium lot), and the surplus she'll still take today with Sell 10 and Sell all.
- `ReckoningCard.tsx`: from Act VI on the Map ([systems/endgame.md](systems/endgame.md)): the illegal share, the chance of a hearing at the next day start, the case file, and how far each ending is (or when it was reached).
- `PoliticsCard.tsx`: from Act V on the Map ([systems/politics.md](systems/politics.md)): opinion and where it's heading; the Ministry's attention against the freeze line; the next election with your share, the chance of winning and campaign buttons (+5 points for Dirty or Influence); or, once mayor, what the office gives.
- `ColonelCard.tsx`: the Colonel on the Map from Act IV ([systems/districts-and-rivals.md](systems/districts-and-rivals.md#the-colonel)): his mood; while he holds Zastava, passage (paid and for how long, or its price) with Pay or Extend; the chances a convoy is taken on the road or seized at customs right now.
- `CreditCard.tsx` ([systems/credit.md](systems/credit.md)): from Act III, the loan (what they'll lend, borrow a quarter, half or all of it; or what's owed, the next payment, missed payments, pay it all or what Clean covers) and the loan desk (what's out, when it's back and as what, the chance the borrower skips town; or lend everything the desk can take).
- `MoneyFlow.tsx`: businesses into the vault, running costs, what the fronts are washing, Clean from legal businesses (Act VI), Dirty and Clean on hand, and a warning when Dirty on hand won't cover what's owed plus `fronts.reserveHours` of costs.
- `SkipSheet.tsx`: Skip ahead ([systems/gold.md](systems/gold.md)): the skip choices with their costs, estimates at today's rates, warnings, and the skip itself.
- `SupplyCard.tsx`: a stock against its cap, made against sold per hour, and when it runs out or fills ([systems/supply-chain.md](systems/supply-chain.md)); on Home and Business. `product="premium"` shows the premium line from Act IV, which has no factories: its advice points at convoys and Zhanna.
- `AwayModal.tsx`: the "while you were away" popup (titled "Skipped N hours" after a skip): jobs finished and what each earned, the money breakdown (businesses into the vault and what a full vault lost, per-front laundering into Clean, wages, upkeep, tribute, seizures, Influence, cigarettes made and sold, heat), and any other notable events. Got it dismisses it.
- `EventNoticeModal.tsx`: pops up live while actively playing ([ADR 0038](decisions/0038-live-event-notices.md)), one at a time, whenever `AwayModal` isn't already showing: a freshly filed decision (rendered like `InboxCard`, with a "Decide later" button that leaves it on Home), a one-line notable event (raid, arrest, walkout, missed wages/upkeep, a district flip, a goal done, an act cleared, Tolya's tick, a frozen front, an election, an ending) via `describeEvent`; an act opening as a page (its title, the turn line, each district it inks in with its reveal line, what it opens); or a racket/front/district/official just unlocking (its name, `description`, and key numbers; several at once collapse into one combined notice). Backed by `app/notices.ts`: `buildNotices` diffs `state.inbox` before/after a tick or dispatch to catch every newly filed decision, and `diffUnlocked` compares `derive().unlocked` across refreshes to catch every newly unlocked thing.
- `TutorialBanner.tsx`: the guided opening's 13 steps ([systems/progression.md](systems/progression.md#the-guided-opening)), with numbers read from config, a button to the right tab, and Skip, which buys the setup.
- `CityMap.tsx`: the map drawing, with plain positioned Views scaled to the screen's width: the river, the bridge, the railway, and each district's box (`BOX`), its reveal state and its business marks. `onSelect` picks the district the Map screen shows.
- `app/story.ts` ([story.md](story.md)): the story as data: `ACT_TITLE`, `ACT_TURN` (the line that opens each act), `DISTRICT_STORY` (fragment, reveal line, who shows it), `LAST_LINE`; `revealed(state, config, id)`, `mapTitle`, `revealedBy`.
- `app/eventText.ts`: `describeEvent(event, state, config)` → `{ text, color, quiet }`. The act turns, the endings, a missed payday and a walkout speak in the story's voice ([story.md](story.md#how-the-game-talks)). `quiet` marks bookkeeping lines that Home hides and Log shows on request. `WAGES_PAID` is deliberately not quiet: it's the only sign a payday happened.
- `app/inbox.ts`: `itemTitle`, `itemBody`, `effectsText(effects, config?, game?)` (a perk option reads as the perk's text; a contest names the stat, the difficulty, the odds for the crew member who'd go, and what winning and losing do; shutting a business and injuries have their own phrases), `sortedInbox`, `homeAlerts`, `homeNeedsAttention` (the Home tab dot).
- `app/ledger.ts`: `ledgerView(state, config, now)`, the "This week" rows built from `ledgerDays`.
- `app/goals.ts`: `GOAL_TEXT` and `goalsView(state, config)`, the Act I goals on Home.
- `app/acts.ts` ([ADR 0040](decisions/0040-six-acts.md)): `ACT_NAME` numerals, `ACT_OPENS` (what each act opens, in a line), `actProgress(state, config)` (the next gate's conditions, the header's label and bar) and `actMilestones(state, config)` ("Act II reached", …, "Act III cleared"), shared by the header, Home, Stats, the event text and the Debug Bot's summary.
- `app/format.ts`: `fmt`, `fmtRate`, `pct`, `fmtDuration` (in game time, so `fast` still reads "2h"), `fmtClock` (device clock for real-time presets, game clock otherwise).
