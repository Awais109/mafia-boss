# Sevgorod docs

What is built, how it works, and why. Written so a person or an LLM new to the repo can find the right place to change without reading all the code.

**Reading order:** the root [README](../README.md) for setup and commands → [architecture.md](architecture.md) → the system doc for the area you're changing → [decisions/](decisions/README.md) for why it's that way.

## Index

| Doc | Covers |
|---|---|
| [architecture.md](architecture.md) | Layers and the one rule, reconcile/apply/derive, game time, RNG, config layering, persistence |
| [systems/economy.md](systems/economy.md) | Businesses: the vault; joints, rackets and premises; spots, lots, upkeep and synergies; tiers and tier-3 specialization; costs, condition, enforcers; the daily ledger and Money flow |
| [systems/supply-chain.md](systems/supply-chain.md) | Cigarettes: factories, joints and warehouses, stock and shortages, smuggling runs |
| [systems/gold.md](systems/gold.md) | Gold bars: skipping ahead, finishing jobs now, where bars come from |
| [systems/fronts.md](systems/fronts.md) | Laundering Dirty into Clean, buffers, rates, the push / lay low dial, capacity, suspicion |
| [systems/heat.md](systems/heat.md) | Exposure, control, heat target, inspections, raids, arrests, bribes, officials, Influence |
| [systems/crew.md](systems/crew.md) | Crew stats and traits, experience, ranks and perks, wages, loyalty, recruiting, slots, jail |
| [systems/ops.md](systems/ops.md) | Jobs, training, resolution formula, rewards, district pressure, the opportunities board |
| [systems/inbox.md](systems/inbox.md) | Pending decisions: crew reports, incidents, perk choices, defaults and expiry |
| [systems/districts-and-rivals.md](systems/districts-and-rivals.md) | Districts, tribute, buy-outs and flips, Tolya and answering his demands, Zhanna |
| [systems/progression.md](systems/progression.md) | Reputation, acts, the unlock ladder, the guided opening, Act I goals |
| [app.md](app.md) | The React Native app: store, storage, screens, Debug tab, export |
| [sim.md](sim.md) | The headless bot, report metrics, CLI, log replay, baseline |
| [testing.md](testing.md) | What each test file guards |
| [native-builds.md](native-builds.md) | Running on devices: requirements, the doctor, Expo Go vs standalone installs, signing |
| [decisions/](decisions/README.md) | One record per design decision, including deviations from the plan |
| [../TUNING.md](../TUNING.md) | Every number change, kept or rejected, with sim results |
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
| `engine/systems/reputation.ts`, `engine/systems/tutorial.ts`, `engine/systems/goals.ts` | [systems/progression.md](systems/progression.md) |
| `App.tsx`, `app/` | [app.md](app.md) |
| `sim/` | [sim.md](sim.md) |
| `tests/`, `vitest.config.mts` | [testing.md](testing.md) |
| `eslint.config.js`, `package.json` scripts | [architecture.md](architecture.md) and the root [README](../README.md) |
| `scripts/`, `app.json`, `.claude/skills/` | [native-builds.md](native-builds.md), [architecture.md](architecture.md) and the root [README](../README.md) |

## Writing docs here

- Describe mechanics, formulas, config keys, actions, events and file paths. For the numbers themselves, point at `engine/config/defaults.ts`; copied numbers go stale. Quote a number only when it is the point, and date it or link [TUNING.md](../TUNING.md).
- Name config keys exactly as in code (`heat.bribe.controlPct`), so they can be searched.
- Say what isn't built when it matters (for example, Zhanna's shipments), so no one assumes it exists.
