# Sevgorod

Fun-test prototype of Sevgorod, Acts I–II: a post-Soviet crime idle game about laundering Dirty money into Clean faster than the heat catches up. No art or sound, just lists and numbers. It runs fully offline on a phone.

Design and plan live in [docs/](docs/): the [implementation plan](docs/sevgorod-implementation-plan.md) and the [dev manual](docs/sevgorod-dev-manual.md) for tuning. Why the numbers are what they are is in [TUNING.md](TUNING.md).

## Quick start

```sh
npm install
npx expo start        # scan the QR code with Expo Go
```

The **Debug** tab holds the time skip, a config editor with presets (`fast` runs 1 game hour per real minute), save and log export, save import, and a Bot that plays the current save.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Engine tests, the reconcile property test over 1,000 random splits, log replay, sim pacing guard |
| `npm run typecheck` | TypeScript, whole project |
| `npm run lint` | ESLint, including the engine boundary rule |
| `npm run check` | All three |
| `npm run sim -- --days 8 --seed 42` | One bot game, summary against the dev manual §3 targets, hourly CSV in `sim/out/` |
| `npm run sim -- --days 8 --runs 10` | Mean of each target over 10 seeds |
| `npm run sim -- --set heat.baseControl=6` | Try a config change before a human plays it |
| `npm run sim -- --replay tester-log.json` | Same report over a tester's exported log |

`sim/baseline.csv` is the seed-42, 8-day run on the current defaults. Diff new runs against it.

## Layout

```
engine/   pure TypeScript: config, model, reconcile/apply/derive, systems
sim/      engaged-casual bot, driver, report, log replay (no fs outside run.ts)
app/      React Native UI: store, storage, screens
tests/    Vitest, engine and sim only
docs/     plan and dev manual
```

**The one rule:** `engine/` never imports React, Expo, `app/`, or `sim/`, and never calls `Date.now()` or `Math.random()`. Time and randomness are injected, which is what makes the time skip, the sim, replay, and the property test possible. ESLint enforces it.

## Design decisions beyond the plan

The plan and manual leave some mechanics open. These are the choices made here; each is a config value or a small rule you can change:

- **Districts host one of each business they allow**: Zarechye and Kiosk Row (Kiosk, Market Stall), Sovietsky Blocks (Auto Shop, Café, Bathhouse), Port Quarter (Petrol Station, Cargo Bay). Free-slot rules let the cheapest racket fill the map.
- **You start with a Kiosk and a Market Stall** (16 Dirty/hr, which fills the 40 floor cap in the 2.5 h Act I vault target), 60 Clean, and Vitya and Dima. Dima is your nephew and can't be fired.
- **Heat target** = 100 × exposure ÷ (exposure + control). Control ÷ exposure of 1.9 puts heat at ~34.
- **Ops** score the best stat on the team per weight, +5 per extra member, ±15 noise. Partial success pays 60% of the reward with half the heat spike; a failure pays nothing and spikes 150%.
- **Front suspicion** uses utilization averaged over ~6 hours.
- **Act II ends at 480 Rep.** Act III is a stub.
- **Tolya** harasses all game: condition hits, tribute demands (refused if unpaid by his next visit), and more frequent visits once hostile.

## Status

- Engine, sim, and screens cover the systems in plan milestones M0–M5 (rackets, fronts, heat, crew and ops, districts, Tolya, officials, tutorial, debug tools, logging and export), playable through Act II. The original spec v1.1 wasn't available, so where the plan left mechanics open, the choices above fill them.
- Verified: typecheck, lint, the test suite, and a Metro bundle for Android (`npx expo export --platform android`). The app has **not** been launched on a device or simulator yet.
- Sim meets 8 of 10 dev manual targets on the mean over 10 seeds. Front utilization (~45%) and Dirty left unconverted (~55%) are open; see [TUNING.md](TUNING.md).
