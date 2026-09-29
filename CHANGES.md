# Changes

One entry per notable commit: what changed, why, and where to look. Day-to-day mechanics live in
[docs/](docs/); this is a running log of what landed and when, for anyone picking the branch back up.

## 2026-09-29 — The warm-ledger design, part 1: the foundation (D1)

Branch: `feature/design-v2`. Reasoning: [ADR 0047](docs/decisions/0047-warm-ledger-design.md). The design itself: `design/Sevgorod Screens.html`, from the brief in `design/sevgorod-design-brief.md`.

### What changed, for a player

- **A new look.** Warm dark cards, brass accents, condensed type, and drawn glyphs for every resource.
- **The header.**
  - Figures are shortened to three significant figures (22.7K, 1.00M); tap a cell for the full figure.
  - The Heat cell opens Heat and names the line you're over.
  - The Rep line says what it's heading for: the opening's step, Act I's goals, the next act's Rep, or in Act VI the two endings.
- **Navigation.**
  - A bottom bar with Home, Business, Fronts, Ops and Map.
  - Crew, Heat, Stats, How it works and Log are under More, each with a one-line status.
- **The opening's banner** is full width, with the step count, a dash per step, and one wide button.
- **Notices** are toasts with an icon.

The screens themselves keep their old layout inside the new styles. Redesigning each one is the next step.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Palette, fonts, glyphs | `app/theme.ts`, `app/fonts.ts`, `app/components/Glyph.tsx` (new) |
| Primitives, same API | `app/components/ui.tsx` (adds `rich`, `Title`, `Totals`, `Divider`, card tones, button second lines) |
| The shell | `App.tsx` (font loading, bottom bar, More sheet, `?tab=` on web), `app/components/Header.tsx`, `TutorialBanner.tsx`, `NoticeBar.tsx` |
| Helpers | `app/format.ts` (`fmtShort`), `app/acts.ts` (`note`, `segments`, `split`) |
| Dependencies | `expo-font`, `react-native-svg`, five `@expo-google-fonts/*`; `react-native-web`, `react-dom`, `@expo/metro-runtime` for the web screenshot build; `app.json` adds the `expo-font` plugin |
| Docs | [ADR 0047](docs/decisions/0047-warm-ledger-design.md) (supersedes part of 0008), [app.md](docs/app.md) (shell, look and feel, checking screens against the design), [native-builds.md](docs/native-builds.md), the doc map, the root README |

No engine, config or save change.

### Verified

- `npm run check`.
- The web build at 390 px wide: a new game, and Acts III and VI from sim saves.

## 2026-09-29 — The map and the story (M13)

Branch: `feature/acts-iii-vi`. Reasoning: [ADR 0046](docs/decisions/0046-map-and-story.md); canon: [docs/story.md](docs/story.md).

### What changed, for a player

- **The Turf tab is now the Map**: Lyosha's notebook. The city is drawn from the story, and each district is a pencil outline with a note in his hand until someone shows it to you. Tolya's boys show you Kiosk Row, Vitya the station, Zhanna the tram east, and so on to the hills, where you drive up yourself. Your businesses are marks on it. Tap a district for who holds it and what it's worth.
- **Each act opens as a page**: its title, the line that brought you there, the district that's just been inked in with its line, and what the act opens.
- The last line, either ending, is Vitya's.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| The story as data, the reveal rules | `app/story.ts` (new) |
| The map drawing | `app/components/CityMap.tsx` (new), `app/screens/TurfScreen.tsx` (the Map), `App.tsx` (the tab's title) |
| The act page, the story's voice | `app/components/EventNoticeModal.tsx`, `app/eventText.ts` |
| Tests | `tests/story.test.ts` (new) |
| Docs | [story.md](docs/story.md) (new), [ADR 0046](docs/decisions/0046-map-and-story.md), app, testing, the Turf-to-Map renames |

No engine, config or save change.

### Verified

- `npm run check`: typecheck, lint, 203 tests.
- Not yet tried on a device: the map's layout needs a look on a phone.

## 2026-09-29 — Act VI, Nagornaya (M12)

Branch: `feature/acts-iii-vi`. Reasoning: [ADR 0045](docs/decisions/0045-act-vi-nagornaya.md).

### What changed, for a player

- **Act VI opens the hills**, Nagornaya. Nobody sells them to you: you drive up, and they're yours. There's one lot, for the Holding.
- **Legalize** any joint or racket, once the city thinks well enough of you. It costs days of its takings in Clean. From then on it earns Clean directly (after tax), draws no heat, pays no tribute and needs no front.
- **The Holding** makes every legal business earn more for each tier.
- **The reckoning.** Raids, arrests, frozen fronts and missed payments build a case file. While any of your business is illegal, a hearing can come at the start of a day. Settle it in Clean, fight it in court (Brains, harder the fatter the file), or let it run and lose your busiest front for a day.
- **Two endings**, both recorded, neither final. The Holding: every business legal. The Empire: every district yours and six hearings beaten in court. Either one clears Act VI, and the game carries on.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Legalize, the case file, hearings, endings | `engine/systems/legal.ts` (new), `engine/core/derive.ts`, `engine/core/reconcile.ts` |
| Hearing effects, per-incident expiry | `engine/systems/inbox.ts`, `engine/config/schema.ts` (`IncidentConfig.hours`, `freezeHours`, `cleanHoursOfYield`, `hearingWon`, `perCase`) |
| Freezing a front, shared by the Ministry and hearings | `engine/systems/politics.ts` (`freezeBusiestFront`) |
| Nagornaya, the endings clearing the last act | `engine/systems/acts.ts` (`grantedOnOpen`, `checkEndings`), `engine/config/defaults.ts` (`finalAct` 6) |
| Save schema v13 | `engine/model/migrate.ts` (`v12to13`) |
| The app | `app/components/ReckoningCard.tsx` (new); Legalize on Business; the header's ending progress; legal Clean in the money flow; Stats, How It Works, pop-ups and log filters |
| The bot and report | `sim/persona.ts` (legalizing, the Holding, hearings, every district), `sim/report.ts` (heat over Acts I–V) |
| Tests | `tests/nagornaya.test.ts` (new); the split test adds an Act VI game; migration covers v13; the pacing guard runs 60 days and adds Act VI |
| Docs | [endgame.md](docs/systems/endgame.md) (new); economy, districts and rivals, progression, inbox, fronts, heat, politics, architecture, app, sim, testing |

### Verified

- `npm run check`: typecheck, lint, 199 tests.
- `npm run sim -- --days 60 --runs 10`: every act from II to VI in range on 10/10 seeds (Act VI 13.08 d), heat over Acts I–V 29.4, no raids, no missed wages; tuning in [TUNING.md](TUNING.md).
- Not yet tried on a device.

## 2026-09-29 — Act V, the Kombinat (M11)

Branch: `feature/acts-iii-vi`. Reasoning: [ADR 0044](docs/decisions/0044-act-v-kombinat.md).

### What changed, for a player

- **Act V opens the Kombinat**, the tobacco Combine upriver and its town. The state is selling it: buy it at auction (a loan helps), and only then can you build there. Its lots are for the Combine line, the Newspaper and the TV Station.
- **The Combine** makes both kinds of cigarettes, by the thousand.
- **Public opinion** (0–100): the media, the Palace of Culture and the Development Fund raise it; inspections and raids knock it back. It multiplies your control and pays the Construction Trust.
- **The Ministry** in the capital watches how big you've grown. Bribes don't work on it. When its attention peaks it freezes your busiest front for a day. Opinion brings it down, and so does the Governor, who only takes the mayor's calls.
- **Elections** every week against Golovin. Campaign with Dirty or Influence, or have your crew deliver the vote. Win once and you're mayor for good: no tribute anywhere, bigger district perks, more control, and the Governor.
- To clear Act V: the mayor's office and the Reputation to hold it. The Politics card on Turf shows it all.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Opinion, the Ministry, elections, campaigns | `engine/systems/politics.ts` (new), `engine/core/derive.ts`, `engine/core/reconcile.ts` |
| The auction, reserved lots, `onlyIn` | `engine/systems/districts.ts` (`racketBlocked`, `premisesBlocked`, `canPressure`) |
| Frozen fronts, CAMPAIGN, the Governor, DEBUG_HOLD_ELECTION | `engine/core/apply.ts` |
| Deliver the Vote | `engine/systems/ops.ts` (`addVotes`) |
| Act V content and the mayor's gate | `engine/config/defaults.ts`, `engine/config/schema.ts`, `engine/systems/acts.ts` (`finalAct` 5) |
| Save schema v12 | `engine/model/migrate.ts` (`v11to12`), `engine/core/time.ts` |
| The app | `app/components/PoliticsCard.tsx` (new); Turf, Fronts, Heat, Business, Ops, Stats, How It Works, Debug; Home alerts |
| The bot | `sim/persona.ts` (the auction, campaigning, media and Combine value, the Governor, Deliver the Vote) |
| Tests | `tests/kombinat.test.ts` (new); the split test adds an Act V game; migration covers v12; the pacing guard runs 45 days and adds Act V |
| Docs | [politics.md](docs/systems/politics.md) (new); districts and rivals, economy, fronts, heat, ops, supply chain, progression, architecture, app, sim, testing |

### Verified

- `npm run check`: typecheck, lint, 188 tests.
- `npm run sim -- --days 50 --runs 10`: Act V 12.86 d (10/10 in 10–14), heat 28.2, no raids, no missed wages; tuning in [TUNING.md](TUNING.md).
- Not yet tried on a device.

## 2026-09-29 — Act IV, Zastava (M10)

Branch: `feature/acts-iii-vi`. Reasoning: [ADR 0043](docs/decisions/0043-act-iv-zastava.md).

### What changed, for a player

- **Act IV opens the road to the border.** Zastava, sixty kilometres west, belongs to the Colonel, a retired border-guard officer who takes a fifth of what runs there.
- **Premium cigarettes**, a second stock (▣) next to the ordinary packs. The Motel and the Foreign Goods Shop live on them; nobody makes them in the city.
- **Convoys** bring them over the border: Clean up front, three crew, six hours. The Colonel's men may take a convoy on the highway unless you've **paid for passage**, and customs may seize one at the crossing, more often the hotter you run. The Ops card shows both chances.
- **Take Zastava** and the road is yours. A **Customs Chief** and a **Bonded Warehouse** in Zastava cut seizures; a **Convoy Depot** makes loads bigger and harder to stop.
- The **Import–Export Company** launders at the best rate in the city, but only as much as your premium sales explain.
- Zhanna sells premium lots too, dearer, between convoys.
- To clear Act IV: Reputation, Zastava held, and the importer running.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| The premium line | `engine/systems/supply.ts` (generic `accrueLine`, both lines in `accrueStock` and `supplyHourBoundary`), `engine/core/derive.ts` (`Derived.premium`, per-joint premium) |
| Convoys, the Colonel, passage, customs | `engine/systems/convoys.ts` (new), `engine/systems/ops.ts` (`landConvoy` in `resolveOp`), `engine/systems/districts.ts` |
| The importer | `engine/core/derive.ts` (cover-capped throughput), `engine/systems/fronts.ts` (reads the derived throughput) |
| Act IV content and gates | `engine/config/defaults.ts`, `engine/config/schema.ts` (`finalAct` 4) |
| Save schema v11 | `engine/model/migrate.ts` (`v10to11`), `engine/core/time.ts` (`passageUntil`) |
| The app | `app/components/ColonelCard.tsx` (new), `SupplyCard.tsx` (`product`), `Header.tsx`, `ZhannaCard.tsx`; Ops, Fronts, Business, Home, Stats, How It Works, Debug (`DEBUG_GRANT { premium }`) |
| The bot | `sim/persona.ts` (convoys, passage, premium lots, premium joints and premises, borrowing for a front) |
| Tests | `tests/zastava.test.ts` (new); the split test adds an Act IV game; migration covers v11; the pacing guard runs 34 days and adds Act IV |
| Docs | [convoys.md](docs/systems/convoys.md) (new); supply chain, economy, fronts, heat, ops, districts and rivals, progression, architecture, app, sim, testing |

### Verified

- `npm run check`: typecheck, lint, 171 tests.
- `npm run sim -- --days 34 --runs 10`: Act IV 9.43 d (10/10 in 8–10), heat 32.0, no raids, no missed wages; tuning in [TUNING.md](TUNING.md).
- Not yet tried on a device.

## 2026-09-29 — Act III's consequences (M9)

Branch: `feature/acts-iii-vi`. Reasoning: [ADR 0042](docs/decisions/0042-act-iii-credit-and-consequences.md).

### What changed, for a player

- **Some decisions are fights now.** "Send someone out" rolls your best crew member's Muscle (or Nerve) against the odds shown on the card; win and lose each do something different.
- **Crew get hurt**: a failed rough job, or a lost fight, can put someone out for half a day. A **Clinic** halves that and keeps everyone a little more loyal.
- **Tolya's boys** come for a business from Act III: board it up, pay them off, or send someone out. More often once you've taken his street, more still when he's hostile.
- **Borrowing**: take a loan in Clean against what you've been laundering; a share comes out of Clean each morning. Miss a payment and the collectors come; miss two and the lender takes from the vault.
- **Lending**: a **Loan Desk** puts idle Dirty out for two days at interest. A prosperous street means fewer borrowers who skip town.
- Credit lives on the Fronts screen.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Contests, filed incidents, materialization context | `engine/systems/inbox.ts` (`materializeChoice`, `contestFighter`, `contestOdds`), `engine/config/schema.ts` (`ChoiceEffectsConfig`) |
| Injuries and the Clinic | `engine/systems/injuries.ts` (new), `engine/systems/ops.ts`, `engine/systems/crew.ts` |
| Loans and lending | `engine/systems/credit.ts` (new), `app/components/CreditCard.tsx` (new) |
| Tolya's attacks | `engine/systems/rivals.ts` (`tolyaTick`) |
| Save schema v10 | `engine/model/migrate.ts` (`v9to10`) |
| The bot | `sim/persona.ts` (contest value, lending, borrowing, desk and Clinic value) |
| Tests | `tests/credit.test.ts`, `tests/consequences.test.ts` (new); the split test adds a loan, lending and an injury |

### Verified

- `npm run check`: typecheck, lint, 158 tests.
- `npm run sim -- --days 22 --runs 10`: Act III 6.39 d, heat 33.3, no missed wages; tuning in [TUNING.md](TUNING.md).
- Not yet tried on a device.

## 2026-09-29 — Six acts, and Act III's Centre (M8)

Branch: `feature/acts-iii-vi` (off `main` after `feature/expansion` merged). Reasoning: [ADR 0040](docs/decisions/0040-six-acts.md), [ADR 0041](docs/decisions/0041-act-iii-the-centre.md).

### What changed, for a player

- **The game has six acts now**, and the next one is always on screen: the header and Home show what it opens and every condition of its gate. Acts I–III are built; the rest follow.
- **Act II is a full act again.** It leads to Act III at ★1,200 instead of ending the game at ★610, so it lasts about three days on the bot instead of two.
- **Act III crosses the bridge to the Centre**: a Nightclub, a Card Club and a Print Shop; hotels; the Cooperative Bank, the best front yet; City Hall; the Big Score, a three-crew night's work.
- **Prosperity**: from Act III every district has a prosperity from 0 to 100, and joints earn with it. Joints and hotels lift a street, rackets sour it, and running hot, getting raided or running out of cigarettes drags the whole city down. The Card Club needs a prosperous street; the Bank a prosperous city.
- **Tier 6**, with a second greed-or-stealth choice on the way; Capo is a third perk choice.
- **An investigator** comes for the Print Shop: shut it for a day or pay three hours of the city's takings.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Six acts and their gates | `engine/systems/acts.ts` (new; replaces `checkActII` and the old Act II clear), `engine/config/schema.ts` (`Act` 1–6, `ActGate`, `progression`), `app/acts.ts` (new) |
| Prosperity | `engine/systems/prosperity.ts` (new), `engine/core/derive.ts`, `engine/core/reconcile.ts` (hourly step) |
| One check for "can I buy this?" | `racketBlocked` (`engine/systems/districts.ts`), `frontBlocked` (`engine/systems/fronts.ts`), shared by the engine and the bot |
| Shut businesses | `Racket.closedUntil`, `reopenBusinesses` (`engine/systems/rackets.ts`), `closeHours` / `dirtyHoursOfYield` choices (`engine/systems/inbox.ts`) |
| Save schema v9 | `engine/model/migrate.ts` (`v8to9`) |
| The bot | `sim/persona.ts` (sessions by act, `prosperityValues`, tier 6), `sim/report.ts` (a clear check for every built act) |
| Tests | `tests/acts.test.ts`, `tests/prosperity.test.ts`, `tests/centre.test.ts` (new); an Act III fixture in the split test; the pacing guard runs 22 days |

### Verified

- `npm run check`: typecheck, lint, 145 tests.
- `npm run sim -- --days 22 --runs 10`: Act II 3.28 d (10/10 in 3–5), Act III 6.47 d (8/10 in 6–8), heat 33.6, no raids, no missed wages. Every tuning move is in [TUNING.md](TUNING.md).
- Not yet tried on a device.

## 2026-09-14 — Live event/unlock notices, a Stats page, a How It Works page, two economy fixes

Branch: `feature/live-events-and-help` (off `feature/expansion`). Full plan and reasoning: [ADR 0038](docs/decisions/0038-live-event-notices.md).

### What changed, for a player

- **Things now interrupt you when they happen.** A job resolving, an incident, a raid, an arrest, a crew promotion, a district flip, a goal completing, reaching or clearing an act — each pops up as a modal instead of only showing up quietly in the Log or stacked on Home. If it's a decision (a report, an incident, a perk choice), you can decide right there or tap "Decide later" and it stays exactly where it already lived, on Home's "Waiting for you" list. Several things happening at once queue one after another rather than colliding.
- **Unlocking something now tells you what it does.** Every racket, front, district, and official has real descriptive text now (there was none before — just names and numbers). Crossing a Reputation threshold or reaching Act II pops a modal naming what just opened and what it's for; if several things unlock at once (like at an act transition), they're bundled into one modal instead of a flood.
- **A new Stats tab** shows everything tracked since the game started: money earned/lost/paid/missed by category, job outcomes, crew growth, raids and arrests, territory and supply — all from data the game was already quietly recording.
- **A new How It Works tab** explains the whole game to a player in plain language — the Dirty/Clean/Vault loop, what every business and front does, how crew ranks and perks work, how jobs resolve, what heat thresholds mean, how turf and rivals work. Every number in it reads live from config, so it can't go stale.
- **The vault no longer starts with money in it before you own a single business.** That 30 Dirty moved into your starting cash on hand instead — same total money to start with, just no longer sitting in an empty vault implying yield nothing has earned yet.
- **Home's "you'll come up short" warning and the Fronts page's "keep this much back" button now agree.** Previously Fronts only reserved a fixed 12-hour buffer and ignored money you already owed; it now accounts for what's actually owed, so it can't quietly let you launder past what you need for payday.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| New notice queue (events, decisions, unlocks) | `app/notices.ts` (new), `app/store.ts` (`notices` field, `dismissNotice`, wired into `tick`/`dispatch`/`refresh`) |
| Shared modal wrapper | `app/components/Modal.tsx` (new); `AwayModal.tsx` and `SkipSheet.tsx` refactored onto it |
| Live notice UI | `app/components/EventNoticeModal.tsx` (new), wired into `App.tsx` |
| Unlock descriptions | `engine/config/schema.ts` (`description` field on 4 config types), `engine/config/defaults.ts` (24 sentences written) |
| Stats screen | `app/screens/StatsScreen.tsx` (new) |
| How It Works screen | `app/screens/HowItWorksScreen.tsx` (new) |
| Vault starting money | `engine/config/defaults.ts` (`vault.startingDirty` 30→0, `startingDirtyOnHand` 90→120), logged in [TUNING.md](TUNING.md) |
| Reserve/arrears fix | `app/components/MoneyFlow.tsx`, `app/screens/FrontsScreen.tsx` |
| New tabs | `app/screens/types.ts` (`TabId`), `App.tsx` (`TABS`) |

Docs touched in the same commit, per the project's documentation rule: [ADR 0038](docs/decisions/0038-live-event-notices.md) (new) and its index row, [docs/app.md](docs/app.md) (store/shell/screens/components sections), [docs/systems/economy.md](docs/systems/economy.md), [fronts.md](docs/systems/fronts.md), [heat.md](docs/systems/heat.md), [districts-and-rivals.md](docs/systems/districts-and-rivals.md).

### Verified

- `npm run check` (typecheck, lint, 120 tests) passes.
- `npm run sim -- --days 8 --runs 10` run before and after the vault change: identical results to baseline (Act I 1.89d, Act II +3.07d, 0 missed wages) — the relocation is balance-neutral by design.
- `npm run sim -- --days 2 --no-csv` smoke-tested end to end after every change.
- Not yet tested manually on-device inside the running app (multiple simultaneous live notices, the unlock-batch modal at an act transition, both new tabs against a real save) — worth a pass before calling this done.
