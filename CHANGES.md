# Changes

One entry per notable commit: what changed, why, and where to look. Day-to-day mechanics live in
[docs/](docs/); this is a running log of what landed and when, for anyone picking the branch back up.

## 2026-09-30 — After the story: past the book, the empire value, contracts (D8)

Branch: `feature/design-v2`. Reasoning: [ADR 0052](docs/decisions/0052-after-the-story.md); the rules: [systems/after.md](docs/systems/after.md).

### What changed, for a player

- **The city carries on after an ending.**
  - **Past the book:** joints and rackets go past tier 6, up to tier 20, each tier dearer than the last. A business there is tagged "past the book". A legal business's upgrade now shows the Clean it adds rather than Dirty and heat.
  - **The empire value:** everything you own at what it cost, plus a day of income. It shows in the header in place of the vault, with its change since yesterday and your best. Home's Next becomes *After the story*: the value, a week's chart with the ending marked, and what it's made of.
  - **Contracts:** each week the council posts three big jobs (the tram depot, the boiler house, the port channel…). Each takes Clean up front and crew for one to four days, and always pays back more Clean, plus gold. Take them on Ops; Home shows the board. They can't be finished early with gold.
- **Stats** has an *After the story* section.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Engine | `engine/systems/after.ts` (new); `engine/core/formulas.ts` (`storyOver`, `bookMaxTier`, `racketMaxTier` past the book, the dearer upgrade); `engine/config/schema.ts` and `defaults.ts` (`after`); `engine/core/derive.ts`, `apply.ts` (`START_CONTRACT`, no rushing a contract), `reconcile.ts` (postings, the day-start empire value); `engine/systems/ops.ts`, `acts.ts`, `legal.ts` (the first board when the story ends); `engine/model/state.ts`, `actions.ts`, `events.ts`, `migrate.ts` (`v16to17`); `engine/core/time.ts` (`shiftTimes` now shifts `stats.endings` too) |
| Bot | `sim/persona.ts`: takes every contract it can cover, never rushes one |
| App | `app/components/AfterStory.tsx` (new), `app/components/Header.tsx`, `app/components/NextCard.tsx`, `app/screens/OpsScreen.tsx`, `app/screens/RacketsScreen.tsx`, `app/screens/StatsScreen.tsx`, `app/screens/HowItWorksScreen.tsx`, `app/story.ts` (`ENDING_NAME`, `CONTRACT_TEXT`), `app/eventText.ts` |
| Tests | `tests/after.test.ts` (new); `tests/sim.test.ts` (after the story, every seed grows) |
| Docs | [ADR 0052](docs/decisions/0052-after-the-story.md) (0022 superseded in part), [systems/after.md](docs/systems/after.md) (new), [endgame.md](docs/systems/endgame.md), [economy.md](docs/systems/economy.md), [progression.md](docs/systems/progression.md), [ops.md](docs/systems/ops.md), [gold.md](docs/systems/gold.md), [architecture.md](docs/architecture.md), [app.md](docs/app.md), [story.md](docs/story.md), [sim.md](docs/sim.md), [testing.md](docs/testing.md), [TUNING.md](TUNING.md) |

**Save change:** schema 17. A save whose story was already over gets its first contracts on load.

### Verified

- `npm run check`: 236 tests.
- 5 seeds, 60 days: pacing to the ending unchanged. After it: 3–7 contracts per seed, 56–67 tiers past the book, top tier 12–13, heat about 5, no raids.
- The web build, on a day-58 save after the Holding: the header's empire cell, Home's After the story with its chart and contracts, and Ops' Contracts with Send.

## 2026-09-30 — Rock bottom, no game over (D7)

Branch: `feature/design-v2`. Reasoning: [ADR 0051](docs/decisions/0051-rock-bottom.md); the rules: [crew.md](docs/systems/crew.md#wages) and [credit.md](docs/systems/credit.md#borrowing).

### What changed, for a player

- **There's no game over.**
  - **The envelope:** a payday you can't meet, with no Clean to fall back on, leaves Lyosha's second envelope waiting, once per act. It shows as a red banner at the top of Home. Opening it plays Scene 15, *The second envelope*, with his note for the act, and puts about a day and a half of running costs into Dirty.
  - **The keys:** two missed loan payments in a row and the lender's men take a business (the middle earner, not your best) and close the loan. The debt stops there. The notice shows the design's repossession panel.
- **Vitya never walks out**, like Dima. Both show "never leaves" on Crew.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Engine | `engine/config/schema.ts` and `defaults.ts` (`rockBottom`, `credit.missesToRepossess` replacing `secondMissVaultPct`, the seed's `stays`); `engine/systems/crew.ts` (rock bottom at a missed payday, `stays` skips walkouts); `engine/systems/credit.ts` (`repossess`); `engine/core/apply.ts` (`OPEN_ENVELOPE`); `engine/model/state.ts`, `actions.ts`, `events.ts` (`ROCK_BOTTOM`, `ENVELOPE_OPENED`, `LOAN_REPOSSESSED`); `engine/model/migrate.ts` (`v15to16`) |
| Bot | `sim/persona.ts`: opens the envelope when it's there |
| App | `app/screens/HomeScreen.tsx` (the banner), `app/scenes.ts` and `app/components/Scene.tsx` (Scene 15), `app/story.ts` (`ENVELOPE_NOTES`), `app/components/EventNoticeModal.tsx` (the keys), `app/components/CreditCard.tsx`, `app/inbox.ts`, `app/notices.ts`, `app/eventText.ts`, `app/previews.ts` (`keys`), `app/screens/CrewScreen.tsx`, `app/screens/HowItWorksScreen.tsx` |
| Tests | `tests/rockbottom.test.ts` (new); `tests/credit.test.ts` (a second miss repossesses); `tests/migrate.test.ts` |
| Docs | [ADR 0051](docs/decisions/0051-rock-bottom.md) (0042 superseded in part), [crew.md](docs/systems/crew.md), [credit.md](docs/systems/credit.md), [architecture.md](docs/architecture.md), [story.md](docs/story.md), [app.md](docs/app.md), [sim.md](docs/sim.md), [testing.md](docs/testing.md), [TUNING.md](TUNING.md) |

**Save change:** schema 16. An old save gets no envelope waiting, and a Vitya already hired is marked as staying.

### Verified

- `npm run check`: 226 tests.
- 5 seeds, 60 days: unchanged, since the bot never goes broke (Act I 4.64 d, II 3.73, III 6.49, IV 9.76, V 12.03, VI 12.63; heat 28.8; no raids; no missed wages).

## 2026-09-30 — Boss missions: lose, build, come back (D6)

Branch: `feature/design-v2`. Reasoning: [ADR 0050](docs/decisions/0050-boss-missions.md); the missions: [ops.md](docs/systems/ops.md#boss-missions); the scenes: [story.md](docs/story.md#scenes).

### What changed, for a player

- **Every act ends with an overreach:** a mission against someone bigger that fails, by design. It costs a little (a stake of Dirty, and sometimes someone hurt or some heat), never Clean, a business or anyone for good. Failing it introduces the next boss and opens the next act:
  - *A crate through the Port* brings Zhanna;
  - *Across the bridge*, Ignatov;
  - *The first truck*, the Colonel;
  - *The first auction round*, Golovin;
  - *Over the Governor's head*, the prosecutor.
- **Acts II and III have a rematch you can win**, with real odds: *Her terms* with Zhanna (her lots get cheaper) and *The second lunch* with Ignatov. Lost, it can be tried again after 12 hours. Won, it's part of what opens the next act.
- **Ops** opens with *Unfinished business*:
  - a rematch shows the odds for the team that would go;
  - an overreach shows only what it can cost;
  - one not open yet says what comes first.
- **Home's Next** lists the missions among what the next act needs.
- **Scenes 4–13 play** as the arcs happen, each mission ending on a FAILED or WON stamp: the Row, the crate, her terms, the bridge, the lunch, the truck, the road, the auction, the count, the Governor.
- **A boss's dossier** shows their arc with its stamps, and every scene of theirs can be replayed.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Engine | `engine/systems/missions.ts` (new); `engine/config/schema.ts` and `defaults.ts` (`missions`, gates' `missions`); `engine/systems/acts.ts` (`gateMet`), `ops.ts` (a mission's job resolves as a mission; `opName`); `engine/model/state.ts`, `actions.ts`, `events.ts` (`START_MISSION`, `DEBUG_COMPLETE_MISSIONS`, `MISSION_STARTED`, `MISSION_RESOLVED`); `engine/model/migrate.ts` (`v14to15`); `engine/core/time.ts` |
| Bot | `sim/persona.ts`: sends every mission as it opens |
| App | `app/components/MissionCard.tsx` (new), `app/screens/OpsScreen.tsx`, `app/acts.ts` (missions in the gate), `app/scenes.ts` and `app/components/Scene.tsx` (the arcs' scenes; face, slug and result beats), `app/components/People.tsx` (arcs and replays), `app/story.ts` (`MISSION_LINES`, `MISSION_CARD`), `app/eventText.ts`, `app/screens/StatsScreen.tsx`, `app/screens/DebugScreen.tsx` |
| Tests | `tests/missions.test.ts` (new); `tests/helpers.ts` (`config` leaves missions out of gates; `withMissions`); the pacing test plays with missions |
| Docs | [ADR 0050](docs/decisions/0050-boss-missions.md), [ops.md](docs/systems/ops.md), [progression.md](docs/systems/progression.md), [architecture.md](docs/architecture.md), [story.md](docs/story.md), [app.md](docs/app.md), [sim.md](docs/sim.md), [testing.md](docs/testing.md), [TUNING.md](TUNING.md) |

**Save change:** schema 15. An old save counts its past acts' missions as done.

### Verified

- `npm run check`: 221 tests, including the pacing test with missions on.
- 5 seeds, 60 days: Act I 4.64 d, II 3.73, III 6.49, IV 9.76, V 12.03, VI 12.63; heat 28.8; no raids.
- The web build: Ops' Unfinished business in Act II, and Scene 5 from its opening panel to the stamp.

## 2026-09-30 — Scenes, the cover and the chapters (D5)

Branch: `feature/design-v2`. Reasoning: [ADR 0049](docs/decisions/0049-scenes.md); the scenes: [story.md](docs/story.md#scenes).

### What changed, for a player

- **The cover:** the tram window over Lyosha's table, with Continue (where you are) or New game (it asks first).
- **The story plays as manga,** full screen, panel by panel, with Skip:
  - **Scene 1, the prologue:** Zarechye in February, Lyosha's photograph, the envelope, and Vitya at the door;
  - **Scene 2:** hire the crew from their cards;
  - **Scene 3:** Tolya's first visit, with his demand to pay, haggle or refuse inside the scene.
- **Each act opens as a chapter page,** now even if it opened while you were away: it plays after the away summary. Two acts opened while away play both chapters, in order.
- **Debug → Preview** plays any scene.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Scenes | `app/scenes.ts`, `app/components/Scene.tsx`, `app/components/Cover.tsx` (new); `app/components/ChapterPage.tsx` (played as a scene) |
| Art | `app/art/scenes.ts` (new: the cover, the crew, Tolya, and panels for later scenes) |
| The store and shell | `app/store.ts` (`scene`, `playScene`, `endScene`), `App.tsx` (the cover; the away summary, then a scene, then notices) |
| Notices | `app/notices.ts` (`ACT_UNLOCKED` is no longer a notice), `app/components/EventNoticeModal.tsx`, `app/previews.ts` (scenes) |
| Engine | `engine/model/state.ts` (`story`, schema 14), `engine/model/migrate.ts` (`v13to14`), `engine/model/actions.ts` and `engine/core/apply.ts` (`SEE_SCENE`, passive), `engine/newGame.ts` |
| Tests | `tests/scenes.test.ts` (new), `tests/migrate.test.ts` |
| Docs | [ADR 0049](docs/decisions/0049-scenes.md) (supersedes part of 0038 and 0046), [architecture.md](docs/architecture.md), [story.md](docs/story.md), [app.md](docs/app.md), [progression.md](docs/systems/progression.md), [testing.md](docs/testing.md), the doc map |

**Save change:** schema 14. An old save counts the scenes it has passed as seen.

### Verified

- `npm run check`.
- The web build: the cover, the prologue, the crew and Tolya scenes, and the chapter pages for Acts II–V.

## 2026-09-30 — The warm-ledger design, part 6: the pop-ups (D4)

Branch: `feature/design-v2`. The design: While you were away, the three notices, Skip ahead, and the Act IV chapter page.

### What changed, for a player

- **While you were away** reads as a ledger:
  - how long, and from when to when;
  - a link to the decisions waiting;
  - each job back with its outcome;
  - the money with a net total, and tiles for Influence, heat, gold and packs;
  - everything else that happened, with its time.
- **Notices** each have a head with their kind and their place in the queue:
  - a decision shows its options as rows with their effects;
  - just unlocked lists each new thing with its figures;
  - an event has an icon and, where it helps, what happens next.
- **An act opens as a chapter page:** the volume's title over its panel (drawn for Act IV; the boss's panel or portrait for the others), the line that brought you there, the boss and what they hold, each new district as a corner of the map with its line, and what the act opens.
- **Skip ahead** rises from the bottom, with the lengths as tiles and warnings in strips.
- **Debug → Preview** shows any pop-up now.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Pop-ups | `app/components/Modal.tsx` (`ModalPanel`, `Sheet`, `NoticeHead`), `AwayModal.tsx`, `EventNoticeModal.tsx`, `SkipSheet.tsx`; `ChapterPage.tsx` (new) |
| Art and the map | `app/art/chapters.ts` (new: Act IV's panel), `app/components/CityMap.tsx` (`MapDrawing`, with `crop`) |
| Notices | `app/notices.ts` (`unlockInfo` takes `derive` for today's prices, and returns a kind and a line of figures), `app/store.ts` (`previewNotice`), `app/previews.ts` (new), `app/screens/DebugScreen.tsx` (Preview) |
| The rig | `App.tsx` (`?sheet=`, `?preview=`) |
| Docs | [app.md](docs/app.md), the doc map |

No engine, config or save change.

### Verified

- `npm run check`.
- The web build against the frames: the away summary (Act III, 8 hours), a decision (Act V), just unlocked (Act II), a raid, the chapter pages for Acts II, III and IV, Skip ahead, and More.

## 2026-09-30 — The warm-ledger design, part 5: the Map and People (D3)

Branch: `feature/design-v2`. Reasoning: [ADR 0048](docs/decisions/0048-notebook-map-and-people.md). The design: the Map frames (start, Act III, complete), People and the dossier.

### What changed, for a player

- **The Map is Lyosha's notebook, drawn:**
  - the river, the bridge, the railway and the tram, and a sketch of every district;
  - a district is faint pencil with his note until someone shows it to you, then inked with its name and who holds it;
  - your businesses are red-pencil marks;
  - the district you tap is ringed, and the newest page's line is written beside it.
- **The district card** says who holds it, what it hosts, its prosperity, tribute and pairings, and what taking it gives. It has Buy out and Pressure, and the line that revealed it, on paper.
- **People,** the Map's second view:
  - everyone you've met as a card on the notebook's page, and everyone not yet as a shape with Lyosha's note;
  - a card opens a dossier: the person's panel or portrait, their line, who they are, their role, what they hold and their mood.
- **Zhanna and Tolya** have their faces on the Map. Zhanna's next lot is a box with Buy, and the surplus sells in one tap.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| The map | `app/components/CityMap.tsx` (rewritten in SVG) |
| People | `app/people.ts`, `app/components/People.tsx`, `app/art/people.ts` (new) |
| The Map screen | `app/screens/TurfScreen.tsx`; `app/components/DistrictSummary.tsx` (new, shared with Business), `app/components/ZhannaCard.tsx` |
| Kit | `app/components/Notebook.tsx` (`Paper` gets `tight`), `app/components/Glyph.tsx` (`chevronLeft`), `app/webParams.ts` (new: `?view=` and `?person=` for the rig) |
| Docs | [ADR 0048](docs/decisions/0048-notebook-map-and-people.md) (supersedes part of 0046), [app.md](docs/app.md), [story.md](docs/story.md), the doc map |

No engine, config or save change.

### Verified

- `npm run check`.
- The web build against the frames: the Map at the start, in Act III and after the story; People in Act III; Zhanna's and Tolya's dossiers.

## 2026-09-30 — The warm-ledger design, part 4: Ops, Crew, Heat, Stats, Log, How it works (D2)

Branch: `feature/design-v2`. The design: the Ops, Crew, Heat, Stats, Log and How it works frames.

### What changed, for a player

- **Ops:**
  - Who's out, with a gold Finish now.
  - Crew picked as chips.
  - The board as a compact list with odds.
  - Training as rows.
  - Each job with what it pays, the XP, and the odds as a bar.
- **Crew:** a card per member. The opening's three have portraits and who they are to you. Each card shows stats against their ceilings with XP under them, loyalty with the walkout line, and Raise, enforcer and Fire. The recruits are cards too, with a warning when there's no slot.
- **Heat:**
  - The scale, with its three lines and where heat is heading.
  - Exposure and control as ledgers.
  - The bribe.
  - The officials as people with faces: Sergeant Pasha, Major Kravets, Ignatov, the stamp, the telephone to the capital.
- **Stats:** ledgers with a line of context under each figure, a costs total, and a bar for job outcomes.
- **Log:** grouped by day, with filters, a bookkeeping switch, and an icon for each kind of event.
- **How it works:** Lyosha's notebook, with contents, fourteen foldable sections, and a diagram of the loop. Your own numbers are filled in. What's still ahead is in pencil, and what you run is marked in red pencil.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Screens | `app/screens/OpsScreen.tsx`, `CrewScreen.tsx`, `HeatScreen.tsx`, `StatsScreen.tsx`, `LogScreen.tsx`, `HowItWorksScreen.tsx` |
| The notebook | `app/components/Notebook.tsx` (new): `Paper`, `PaperTitle`, `Ink`, `PaperCaps`, `PaperSection`, `PaperRows` |
| Art and story | `app/art/heads.ts` (the opening crew's portraits), `app/components/Portrait.tsx` (`CrewHead`), `app/story.ts` (`OPENING_CREW`, `openingCrew`, `OFFICIAL_PERSON`) |
| Kit | `app/components/ui.tsx` (`PageHead`, `SubHead`, `rich`'s `ink`; `BigFigure` keeps its glyph's colour), `app/components/Glyph.tsx` (clock, flag, fork and cash icons), `app/theme.ts` (`paperInk`) |
| Docs | [app.md](docs/app.md), [story.md](docs/story.md) |

No engine, config or save change.

### Verified

- `npm run check`.
- Every screen in the web build against its frame: Ops and Crew (Act II), Heat (Act IV), Stats, Log and How it works (Act III), and an empty log.

## 2026-09-30 — The warm-ledger design, part 3: Business and Fronts (D2)

Branch: `feature/design-v2`. The design: the Business (Act III) and Fronts (Act V) frames.

### What changed, for a player

- **Business:**
  - Opens on everything you own: income, upkeep, and exposure by kind.
  - Each district folds. A folded district shows how full it is and what it earns, and one that needs you opens by itself.
  - Inside each district:
    - what it hosts, and its prosperity with a mark at the next business that waits on it;
    - its pairings, or one within reach;
    - a card per business, with the upgrade and what it adds, or the tier-3 and tier-6 choice as two tinted buttons;
    - the spots and lots still open, as rows with their price.
  - Districts not open yet are one locked line each.
- **Fronts:**
  - What you can launder against what comes in, and what's left unwashed.
  - Each front has a dial, three tiles (rate, throughput, running), its buffer, and deposit and upgrade buttons.
  - A frozen front says so in red. The fronts you don't own yet are rows with their price.
  - Credit is one card, for borrowing and the loan desk.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Screens | `app/screens/RacketsScreen.tsx`, `app/screens/FrontsScreen.tsx`, `app/components/CreditCard.tsx` |
| Kit | `app/components/ui.tsx`: `BuyRow`, `Segmented`; `Tag` restyled (plain, or tinted in its colour) |
| Docs | [app.md](docs/app.md) (Business, Fronts, CreditCard, the kit) |

No engine, config or save change.

### Verified

- `npm run check`.
- Business in Acts I, III and VI, and Fronts in Act V, in the web build against the frames.

## 2026-09-30 — The warm-ledger design, part 2: Home (D2)

Branch: `feature/design-v2`. The design: Home and its opening and Act V frames in `design/Sevgorod Screens.html`.

### What changed, for a player

- **Tolya's demand** shows his face and his mood, and he asks in his own words: watchful, cold, friendly or hostile.
- **Decisions** list each option as a row: its effects on the right, and DEFAULT on the one that happens if you don't answer.
- **Alerts** say what's wrong, why, and where to fix it. There are two new ones: crew who might walk out, and inspections cutting income.
- **Act I goals** are a checklist that says how far along each goal is: "1 of 2 · Zarechye has 1 free spot", "needs ✦4 · you have ✦3".
- **The vault** is a big figure over a meter. Collect, when empty, says when you last collected. The vault goes once every business is legal. The old "Full in Infinityd" is fixed.
- **Money flow** reads as a ledger, with totals under a brass rule. From Act VI it shows legal income and the tax.
- **Cigarettes and premium** show the stock, the net rate, and what makes and sells them.
- **This week** is a grid by day in the first week, then a row per day.
- **Next:**
  - names the act (Act II · The tram east), what it opens, and each condition with its figure;
  - during the opening, lists the thirteen steps;
  - once the story is done, holds a placeholder for After the story.
- **Lately** shows each line's time.

### What changed, for whoever reads the code next

| Area | Files |
|---|---|
| Home | `app/screens/HomeScreen.tsx`; new `app/components/WeekCard.tsx`, `NextCard.tsx` |
| Cards | `TributeCard.tsx`, `InboxCard.tsx` (exports `Choice`), `MoneyFlow.tsx`, `SupplyCard.tsx` (and `supplyNote`) |
| Kit | `app/components/ui.tsx`: `List`, `Item`, `Check`, `Meter`, `BigFigure`, `Tile`, `Pill`, `AlertRow`, `Strip`, `Empty`, `SectionLink`, `Note`; `Btn` gains `outline` and `chevron`; `rich` gains `mono` and `plain` |
| Portraits | `app/art/heads.ts` (new: eleven headshots from the design), `app/components/Portrait.tsx` (new) |
| Helpers | `app/inbox.ts` (`HomeAlert` with title, reason and icon), `app/goals.ts` (hints), `app/acts.ts` (`Requirement` with label, value and hint), `app/ledger.ts` (`day`), `app/format.ts` (`fmtStamp`), `app/story.ts` (`tolyaMood`, `TOLYA_ASKS`), `app/components/TutorialBanner.tsx` (exports `openingCopy`) |
| Engine | `engine/systems/goals.ts`: `goalProgress` reports the counted goals' progress, and their checks read it. Behaviour is unchanged |
| Tests | `tests/goals.test.ts`: the counted goals' progress agrees with their check |
| Docs | [app.md](docs/app.md) (Home, the components), [progression.md](docs/systems/progression.md), [story.md](docs/story.md), [testing.md](docs/testing.md), the doc map |

No config or save change.

### Verified

- `npm run check`.
- Home in the web build: a new game, Act I, Act V and after the story, each against the frames.

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
