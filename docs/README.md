# Sevgorod docs

What is built, how it works, and why. Written so a person or an LLM new to the repo can find the right place to change without reading all the code.

**Reading order:** the root [README](../README.md) for setup and commands → [architecture.md](architecture.md) → the system doc for the area you're changing → [decisions/](decisions/README.md) for why it's that way.

## Index

| Doc | Covers |
|---|---|
| [architecture.md](architecture.md) | Layers and the one rule, reconcile/apply/derive, game time, RNG, config layering, persistence |
| [systems/economy.md](systems/economy.md) | Businesses: the vault; joints, rackets and premises; spots, lots, upkeep and synergies; tiers and the tier-3 and tier-6 specializations; shut businesses; costs, condition, enforcers; the daily ledger and Money flow |
| [systems/supply-chain.md](systems/supply-chain.md) | Cigarettes and, from Act IV, premium: factories, joints and warehouses, stock and shortages, smuggling runs, Zhanna's lots |
| [systems/convoys.md](systems/convoys.md) | Act IV: convoys over the border, the road and customs, passage, the bonded warehouse and convoy depot |
| [systems/gold.md](systems/gold.md) | Gold bars: skipping ahead, finishing jobs now, where bars come from |
| [systems/fronts.md](systems/fronts.md) | Laundering Dirty into Clean, buffers, rates, the push / lay low dial, capacity, suspicion |
| [systems/heat.md](systems/heat.md) | Exposure, control, heat target, inspections, raids, arrests, bribes, officials, Influence |
| [systems/crew.md](systems/crew.md) | Crew stats and traits, experience, ranks and perks, wages and rock bottom (the family's envelope), loyalty, recruiting, slots, jail, injuries and the Clinic |
| [systems/ops.md](systems/ops.md) | Jobs, training, resolution formula, rewards, district pressure, the opportunities board |
| [systems/inbox.md](systems/inbox.md) | Pending decisions: crew reports, incidents (rolled and filed), contests, perk choices, defaults and expiry |
| [systems/districts-and-rivals.md](systems/districts-and-rivals.md) | Districts, tribute, buy-outs and flips, the Kombinat's auction, Tolya and answering his demands, Zhanna's lots and surplus trade, the Colonel and passage |
| [systems/progression.md](systems/progression.md) | Reputation, the six acts and their gates, the unlock ladder, the guided opening, Act I goals |
| [systems/prosperity.md](systems/prosperity.md) | Act III: each district's prosperity, what raises and lowers it, what it pays and unlocks |
| [systems/credit.md](systems/credit.md) | Act III: borrowing Clean and paying it back, the collectors and repossession, lending Dirty through a loan desk |
| [systems/politics.md](systems/politics.md) | Act V: public opinion, the Ministry's attention and frozen fronts, elections, campaigning, the mayor |
| [systems/endgame.md](systems/endgame.md) | Act VI: Legalize, the Holding, the case file and hearings, the two endings |
| [systems/after.md](systems/after.md) | After the story: tiers past the book, the empire value, the contracts board |
| [app.md](app.md) | The React Native app: shell, look and feel, store, storage, screens, the map, Debug tab, export, checking screens against the design |
| [story.md](story.md) | The story's canon: the world, the cast, the acts and their turns, the notebook map, how the game talks |
| [sim.md](sim.md) | The headless bot, report metrics, CLI, log replay, baseline |
| [testing.md](testing.md) | What each test file guards |
| [native-builds.md](native-builds.md) | Running on devices: requirements, native modules, the doctor, Expo Go vs standalone installs, signing |
| [decisions/](decisions/README.md) | One record per design decision, including deviations from the plan |
| [../TUNING.md](../TUNING.md) | Every number change, kept or rejected, with sim results |
| [../design/](../design/) | The design brief given to Claude Design and the screens it returned (input; don't edit; [ADR 0047](decisions/0047-warm-ledger-design.md)) |
| [sevgorod-implementation-plan.md](sevgorod-implementation-plan.md) | Original plan (input; don't edit) |
| [sevgorod-dev-manual.md](sevgorod-dev-manual.md) | Original tuning manual (input; don't edit) |

## Code → doc map

When you change a path on the left, update the doc on the right in the same commit (the documentation rule in [AGENTS.md](../AGENTS.md)).

| Code | Doc |
|---|---|
| `engine/index.ts`, `engine/core/reconcile.ts`, `engine/core/apply.ts`, `engine/core/derive.ts`, `engine/core/ctx.ts` | [architecture.md](architecture.md), plus the system doc for any action or event touched |
| `engine/core/time.ts`, `engine/core/rng.ts` | [architecture.md](architecture.md) |
| `engine/core/formulas.ts` | the system doc that owns the formula |
| `engine/config/schema.ts`, `engine/config/index.ts`, `engine/config/presets/` | [architecture.md](architecture.md) |
| `engine/config/defaults.ts` | the system doc for the section changed, and [../TUNING.md](../TUNING.md) |
| `engine/model/state.ts`, `engine/model/migrate.ts` | [architecture.md](architecture.md) (bump `SCHEMA_VERSION` for shape changes) |
| `engine/model/actions.ts`, `engine/model/events.ts` | the system doc that owns the action or event |
| `engine/newGame.ts` | [systems/progression.md](systems/progression.md) |
| `engine/systems/rackets.ts`, `engine/systems/ledger.ts` | [systems/economy.md](systems/economy.md) |
| `engine/systems/supply.ts` | [systems/supply-chain.md](systems/supply-chain.md) |
| `engine/systems/gold.ts` | [systems/gold.md](systems/gold.md) |
| `engine/systems/inbox.ts` | [systems/inbox.md](systems/inbox.md) |
| `engine/systems/offers.ts` | [systems/ops.md](systems/ops.md) |
| `engine/systems/fronts.ts` | [systems/fronts.md](systems/fronts.md) |
| `engine/systems/heat.ts` | [systems/heat.md](systems/heat.md) |
| `engine/systems/crew.ts`, `engine/systems/experience.ts` | [systems/crew.md](systems/crew.md) |
| `engine/systems/ops.ts` | [systems/ops.md](systems/ops.md) |
| `engine/systems/districts.ts`, `engine/systems/rivals.ts` | [systems/districts-and-rivals.md](systems/districts-and-rivals.md) |
| `engine/systems/reputation.ts`, `engine/systems/acts.ts`, `engine/systems/tutorial.ts`, `engine/systems/goals.ts` | [systems/progression.md](systems/progression.md) |
| `engine/systems/prosperity.ts` | [systems/prosperity.md](systems/prosperity.md) |
| `engine/systems/credit.ts` | [systems/credit.md](systems/credit.md) |
| `engine/systems/politics.ts` | [systems/politics.md](systems/politics.md) |
| `engine/systems/legal.ts` | [systems/endgame.md](systems/endgame.md) |
| `engine/systems/after.ts` | [systems/after.md](systems/after.md) |
| `engine/systems/convoys.ts` | [systems/convoys.md](systems/convoys.md) (the Colonel's disposition and passage also in [systems/districts-and-rivals.md](systems/districts-and-rivals.md)) |
| `engine/systems/injuries.ts` | [systems/crew.md](systems/crew.md) |
| `App.tsx`, `app/` | [app.md](app.md) |
| `app/theme.ts`, `app/fonts.ts`, `app/components/Glyph.tsx`, `app/components/ui.tsx` | [app.md](app.md#look-and-feel), and [ADR 0047](decisions/0047-warm-ledger-design.md) for a change to the design system itself |
| `app/story.ts` | [story.md](story.md) and [app.md](app.md) |
| `app/art/` | [app.md](app.md#look-and-feel) (art extracted from `design/`) |
| `app/scenes.ts`, `app/components/Scene.tsx`, `app/components/Cover.tsx`, `app/components/ChapterPage.tsx` | [app.md](app.md), [story.md](story.md#scenes) and [ADR 0049](decisions/0049-scenes.md) |
| `app/components/AfterStory.tsx` | [app.md](app.md) and [systems/after.md](systems/after.md) |
| `app/previews.ts`, `app/webParams.ts` | [app.md](app.md#checking-screens-against-the-design) |
| `app/people.ts`, `app/components/People.tsx`, `app/components/CityMap.tsx` | [app.md](app.md), [story.md](story.md) and [ADR 0048](decisions/0048-notebook-map-and-people.md) |
| `sim/` | [sim.md](sim.md) |
| `tests/`, `vitest.config.mts` | [testing.md](testing.md) |
| `eslint.config.js`, `package.json` scripts | [architecture.md](architecture.md) and the root [README](../README.md) |
| `scripts/`, `app.json`, `.claude/skills/` | [native-builds.md](native-builds.md), [architecture.md](architecture.md) and the root [README](../README.md) |
| `package.json` dependencies (native modules, fonts) | [native-builds.md](native-builds.md#three-ways-to-run) |

## Writing docs here

- Describe mechanics, formulas, config keys, actions, events and file paths. For the numbers themselves, point at `engine/config/defaults.ts`; copied numbers go stale. Quote a number only when it is the point, and date it or link [TUNING.md](../TUNING.md).
- Name config keys exactly as in code (`heat.bribe.controlPct`), so they can be searched.
- Say what isn't built when it matters (for example, a mechanic a design proposed and the build dropped), so no one assumes it exists.
