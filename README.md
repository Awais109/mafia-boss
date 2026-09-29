# Sevgorod

Fun-test prototype of Sevgorod, all six acts: a post-Soviet crime idle game about laundering Dirty money into Clean faster than the heat catches up. No art or sound, just lists and numbers. It runs fully offline on a phone.

Design and plan live in [docs/](docs/): the [implementation plan](docs/sevgorod-implementation-plan.md) and the [dev manual](docs/sevgorod-dev-manual.md) for tuning. Why the numbers are what they are is in [TUNING.md](TUNING.md).

## Quick start

```sh
npm install
npm run doctor        # what this machine can run, and how to fix the rest
npx expo start        # scan the QR code with Expo Go
```

In Claude Code, `/setup-project` does this for you; `/start-android` and `/start-ios` run the app in Expo Go, and `/install-android` and `/install-ios` install a standalone build on a device. Requirements and install steps: [docs/native-builds.md](docs/native-builds.md).

The **Debug** tab holds the time skip, a config editor with presets (`fast` runs 1 game hour per real minute), save and log export, save import, and a Bot that plays the current save.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Engine tests, the reconcile property test over 1,000 random splits, log replay, sim pacing guard |
| `npm run typecheck` | TypeScript, whole project |
| `npm run lint` | ESLint, including the engine boundary rule |
| `npm run check` | All three |
| `npm run doctor` | Checks this machine for running and installing the app, with a fix for each problem |
| `npm run android:install` | Builds a standalone release and installs it on a connected Android device |
| `npm run ios:install -- --device "<name>"` | Builds a standalone release and installs it on a connected iPhone (Xcode 26.4+) |
| `npm run ios:xcode` | Generates the iOS project and opens it in Xcode |
| `npm run sim -- --days 8 --seed 42` | One bot game, summary against the dev manual §3 targets, hourly CSV in `sim/out/` |
| `npm run sim -- --days 8 --runs 10` | Mean of each target over 10 seeds |
| `npm run sim -- --set heat.baseControl=6` | Try a config change before a human plays it |
| `npm run sim -- --replay tester-log.json` | Same report over a tester's exported log |

`sim/baseline.csv` is the seed-42, 60-day run on the current defaults: every act, through an ending. Diff new runs against it.

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

- **Districts host one of each joint or racket they allow, plus premises on a few lots**: Zarechye (Kiosk, Market Stall, Beer Tent), Kiosk Row (Kiosk, Market Stall, Video Salon), Station Square (Beer Tent, Video Salon, Taxi Rank, Slot Hall), Sovietsky Blocks (Auto Shop, Café, Bathhouse), Port Quarter (Petrol Station, Cargo Bay). Free-slot rules let the cheapest racket fill the map.
- **A guided opening**: a new game starts with ●440 Clean and empty turf, and the tutorial has you buy a Kiosk, a Market Stall, a Tobacco Factory, the Currency Kiosk and two of three crew. Dima is your nephew and can't be fired. Skip buys the same setup, and eight Act I goals follow, each paying a gold bar.
- **Heat target** = 100 × exposure ÷ (exposure + control). Control ÷ exposure of 1.9 puts heat at ~34.
- **Ops** score the best stat on the team per weight, +5 per extra member, ±15 noise. Partial success pays 60% of the reward with half the heat spike; a failure pays nothing and spikes 150%.
- **Front suspicion** uses utilization averaged over ~6 hours.
- **Six acts, each opened by a gate** (ADR 0040): Act II on the seven Act I goals, Act III at ★1,200, Act IV at ★9,000, Act V on Rep, the road and the importer, Act VI on Rep and the mayor's office. All six are built; an ending clears Act VI and play continues.
- **Act III, the Centre**: each district has a prosperity that its joints earn with (joints lift a street, rackets sour it, hotels lift it most); the Card Club needs a prosperous street and the Cooperative Bank a prosperous city; businesses go to tier 6 with a second greed-or-stealth choice; City Hall; the Big Score; an investigator who can shut the Print Shop; crew who get hurt and a Clinic; Tolya's boys, answered by paying, boarding up or fighting; loans against your laundering and a loan desk that lends your Dirty out.
- **Act IV, Zastava**: premium imported cigarettes, a second stock no factory makes, brought over the border by convoy; the Colonel's men take convoys unless you pay for passage or take his district, and customs seizes more the hotter you run; a Customs Chief, a Bonded Warehouse and a Convoy Depot; the Import–Export Company, which washes only what your premium sales explain.
- **Act V, the Kombinat**: the Combine at auction, making both products; public opinion from the Newspaper, the TV Station and the Development Fund; the Ministry, which ignores bribes and freezes your busiest front at its peak; weekly elections against Golovin, won with opinion and a campaign, that make you mayor for good.
- **The Map** is Lyosha's notebook: each district inks in when someone from the story shows it to you, and each act opens as a page of the story ([docs/story.md](docs/story.md)).
- **Act VI, Nagornaya**: Legalize a business and it earns Clean directly, with no heat and no front; the Holding; the reckoning, whose hearings come while anything is still illegal; two endings, the Holding (everything legal) and the Empire (every district and six hearings won), both recorded, neither final.
- **Tolya** harasses all game: condition hits, tribute demands you can pay, haggle once with your best talker, or refuse (unpaid by his next visit counts as refused), and more frequent visits once hostile.
- **Crew grow with work**: jobs, training and enforcing earn XP that raises stats up to a ceiling; promotions to Soldier and Made each offer a perk.
- **Cigarettes are the one product**: tobacco factories make them, joints need them for part of their income, warehouses store the surplus, smuggling runs bring in a batch for Clean, and from Act II Zhanna sells lots for Dirty and buys the surplus.
- **Act II premises**: a Stash House lengthens the vault leash and hides part of a raid, in proportion to the yield in its district; a Union Office makes Influence.
- **Gold bars buy time and nothing else**: 10 to start, 5 more when Act II opens and one for each Act I goal; a bar skips an hour ahead or finishes a job now. Rewarded ads and purchases aren't built.
- **Fronts have a dial** (push, normal, lay low) and a capacity upgrade beside the rate upgrade; the upgrade to tier 3 asks for greed or stealth.

## Status

- Engine, sim, and screens cover the systems in plan milestones M0–M5 (rackets, fronts, heat, crew and ops, districts, Tolya, officials, tutorial, debug tools, logging and export), playable through all six acts (the Centre, prosperity, tier 6; Zastava, premium, convoys; the Kombinat, opinion, the Ministry, elections; Nagornaya, Legalize, the reckoning, the endings), plus the expansion's session texture (inbox, opportunities board, ledger), its decisions (specialization, front modes, haggling, crew experience), and the tobacco chain with a bigger Act I (premises, cigarettes, smuggling, Station Square), gold bars, the guided opening with Act I goals, and the Act II additions (Stash House, Union Office, Zhanna's trade). The original spec v1.1 wasn't available, so where the plan left mechanics open, the choices above fill them.
- Verified: typecheck, lint, the test suite, and a Metro bundle for Android (`npx expo export --platform android`). The app has **not** been launched on a device or simulator yet.
- Sim (60 days, 10 seeds) meets 11 of 15 targets on the mean, Act II–VI clears included. Act I's length (4.6 days against 1–2, since it's goal-gated), front utilization (~52%), Dirty left unconverted (~90%) and the wage share (~9%) are open; see [TUNING.md](TUNING.md).
