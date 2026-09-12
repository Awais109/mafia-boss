# Tuning log

One line per change (dev manual §8): the knob, the symptom that prompted it, what the sim said, and whether it stayed.
Sim runs are `npm run sim -- --days 8 --runs 10` (casual persona, seeds 42–51) unless noted.

## 2026-09-12 — first calibration pass

Structural changes, made because no number could fix them:

```
2026-09-12  districts: one of each allowed business per district (was N free slots)
            Symptom: bot filled every slot with the cheapest racket (9× Kiosk, then 3× Auto Shop); no way to replace one, so growth stalled.
            Result: portfolio is exactly K K M M A C B P CB, matching the manual's reference.  Kept.
2026-09-12  rackets.starting: Kiosk → Kiosk + Market Stall
            Symptom: day-1 yield 6/hr; front use 23%.  16/hr fills the 40 floor cap in exactly the 2.5 h Act I vault target.  Kept.
2026-09-12  fronts.utilSmoothingHours: new, 6 (suspicion read one hour's utilization)
            Symptom: exposure jumped 6 → 26 for the hour after every Restaurant deposit.  Result: suspicion follows sustained laundering.  Kept.
```

Number changes:

```
2026-09-12  reputation.perOpSuccess 5→2            Symptom: Act I cleared at 1.3 d almost entirely from op Rep; economy never built up.  Sim: Act I 1.7–2.1 d.  Kept.
2026-09-12  officials.cooldownDays 3→2             Symptom: Precinct Captain landed most of the way through Act II.  Sim: Captain ~40% into Act II.  Kept.
2026-09-12  ops.noise 10→15, ops.fullMargin 15→15  Symptom: tried fullMargin 10 first → full 49% / partial 40%.  Sim with ±15: full 28–32%, partial 46–49%, fail 19–26%.  Kept.
2026-09-12  reputation.actThresholds[3] 1000→480   Symptom: Act II never cleared in 7 d. Measured Rep after Act I: +3 d 309, +4 d 459, +5 d 659.  Sim: Act II 4.15 d after Act I, 10/10 seeds.  Kept.
2026-09-12  rackets unlockRep 150/250/400/600/850 → 110/170/250/330/420   Reason: ladder must sit under the new Act II threshold or Petrol and Cargo Bay never open.  Kept (with the line above).
2026-09-12  costs.paybackHoursByAct[1] 12→10       Symptom: Act I 2.12 d, 0/10 seeds in 1–2 d.  Sim: Act I 1.92 d (4/10 in range), Act II 3.84 d, heat/raids/wages unchanged.  Kept — borderline.
```

Tried and rejected (7 d × 5 seeds each):

```
2026-09-12  costs.paybackHoursByAct[2] 18→12; costs.upgradeBaseFactor 0.5→0.25–0.35; costs.upgradeTierMult 1.4→1.2–1.25
            Hypothesis: Act II too expensive.  Sim: day-7 Rep 575 → 315–621; cheaper purchases earn less Rep per buy; hours at heat ≥40 rose 7 → 32–54.  Reverted.
2026-09-12  unlock ladder compressed alone (Auto Shop at 80)
            Hypothesis: early Act II has nothing to buy.  Sim: day-7 Rep 575 → 589–606.  Not the bottleneck on its own.  Reverted (superseded above).
2026-09-12  fronts.types.restaurant.throughput 185→120/140
            Hypothesis: front use too low.  Sim: util 36% → 42–45%, Rep unchanged.  Reverted.
```

Finding behind the threshold change: across every cost, ladder, and Restaurant variant, day-7 Rep stayed at 575–671. Rep follows Clean spent, and Clean spent follows Clean earned (~830/day in early Act II). Cost knobs change what Clean buys, not how much there is.

## 2026-09-13 — expansion M1: session texture

New config, starting values from the expansion plan (ADRs 0024–0026):

```
2026-09-13  inbox {reportHours 12, incidentHours 8, perkHours 24, maxPending 4}; incidents {chancePerHr 0.06, startAfterHours 6};
            ops.reports (pocket/boast/treat, pocket/pushHarder/backOff, layLow/payOff/blame); offers {count 3, refreshHours 6,
            4 templates, diffAdd 0–10, rewardMult 1.2–1.6, spikeMult 1–1.5, minutesMult 0.75–1.25}; fronts.reserveHours 12
            Reason: decisions per visit.  Sim (10 seeds): Act I 1.92→1.89 d (5/10 in range), Act II 3.84→3.61 d (10/10), heat 28.8→32.2,
            raids 0, partial 0.49→0.48, front util 0.47, Dirty idle 0.53, missed wages 0.
            Seed 42: decisions/session 2.9, auto-resolved 1%, offer share 11%, wage share 7% (below the manual's 10–25%; reported).  Kept.
```

## 2026-09-13 — expansion M2: decisions

```
2026-09-13  heat.convergePerHr 0.10→0.20; job spikes ×1.5 (shakeDown 2→3, collectDebt 1→1.5, leanOnWard 3→4.5, pressure 4→6, moveShipment 2→3, dinner 1→1.5)
            Hypothesis (expansion note): sharp, short danger windows at the same equilibrium; hours ≥40 was ~7 a week.
            Sim alone (10 seeds): Act I 1.90 d, Act II 3.60 d, heat 28.5, raids 0, partial 0.49.  Seed 42 with all of M2: hours ≥40 47.  Kept.
2026-09-13  fronts.types.restaurant.throughput 185→120, with fronts.upgrade.capacity {step 0.25, levels 3, costPctOfUnlock 0.5}: 210 at level 3
            Reason: Act II laundering grows through a decision (ADR 0028) instead of the one-line cut rejected on 2026-09-12.  Kept (sim in the next line).
2026-09-13  New config, starting values from the expansion plan (ADRs 0027–0030):
            rackets.specialization {atTier 3, greed 1.25/1.6, stealth 1.0/0.8}; fronts.modes {push ×1.5 from util 0.5, layLow ×0.5, no suspicion};
            rivals.tolya.haggle {diff 45, noise 15, pricePct 0.5, win +5, insult −10}; crew.experience {xpByBand 2/5/8, outcomeMult 1/0.75/0.5,
            pointCost 4 + 0.3 per point above 30, potentialRoll 5–20, mentorBonus 0.5, enforcerXpPerHr 0.15, ranks 8/20/36, perkChoices 2, six perks};
            training jobs {240 min, 1 crew, costDirty 15 × act, xp 8}; crew.starting potentials Vitya M60 B38 N55, Dima M38 B72 N48.
            Sim with all of M2 (10 seeds): Act I 1.89→1.80 d (8/10 in range), Act II 3.61→3.33 d (8/10), heat 32.2→34.4 (6/10), raids 0,
            partial 0.48→0.51, front util 0.47→0.49, Dirty idle 0.54, missed wages 0, wage share 0.06.
            Partial d1–2 0.55, d7–8 0.47 (plan gate ≥ 0.40); 1.1 stat points per crew member per day; offer share 0.25 (seed 42: 0.11→0.21).  Kept.
2026-09-13  offers.templates.*.rewardMult [1.2, 1.6]→[1.1, 1.5]
            Symptom: offer share 0.25 across seeds, at the plan's ceiling, once growing crew could win the harder offers.
            Sim (10 seeds): offer share 0.25→0.18; Act I 1.80 d, Act II 3.29 d, heat 34.4, partial 0.50, d7–8 partial 0.47.  Kept.
```

## 2026-09-13 — expansion M3: the Act I economy and the tobacco chain

New config, starting values from the expansion plan (ADRs 0031–0033):

```
2026-09-13  kind on every business; rackets.premises {maxTier 5, missedUpkeepConditionHit 20}; tobaccoFactory {purchase 80, upkeep 0.5 ×1.3/tier,
            makes 2/h ×1.5/tier, heat 0.6}; warehouse {purchase 120, ★20, upkeep 1 ×1.2/tier, cap +100/tier, heat 0.3};
            sellsPerHr / cigaretteShare Kiosk 0.5/0.7, Stall 0.8/0.5, Beer Tent 0.6/0.4, Slot Hall 0.4/0.2, Café 1.2/0.3, Bathhouse 1.6/0.3;
            Beer Tent 8/h heat 1.0 ★15, Video Salon 12/1.6 ★30, Taxi Rank 14/2.0 ★45, Slot Hall 18/2.6 ★60;
            Station Square {buy-out 200, 2 lots, Taxi Rank and Slot Hall ×1.1}; lots Zarechye 2, Kiosk Row 1, Sovietsky 2, Port 2;
            synergies factoryJoints ×1.15 and served first, warehouseFactory upkeep ×0.5; smuggleCigarettes {90 min, 2 crew, diff 35 + 0.2/heat,
            spike 4, ●30, 40 packs} and a board template; badBatch incident; supply {baseCap 50, startingStock 40}; a Tobacco Factory in the start;
            crew.slotsByAct[1] 2→3; rivals.tolya.escalateAtRackets 3→5 (joints and rackets only); bot stockReserveHours 12, maxWageShare 0.25.
            Sim (10 seeds): Act I 1.80→1.68 d (8/10), Act II 3.29→3.08 d (7/10), heat 34.4→38.1 (1/10), raids 0, partial 0.51→0.50,
            front util 0.49→0.54, Dirty idle 0.54→0.61, wage share 0.05; shortage 0 h on 9/10 seeds.  Heat out of range: tuned below.
2026-09-13  heat.baseControl 8→10
            Symptom: heat 38.1.  Sim: heat 38.1 (Act I 33.8, Act II 39.6): the bot spends extra control on more businesses.  Reverted.
2026-09-13  officials.list.precinctCaptain.control 140→200 / 240 / 280
            Symptom: Act II heat 38.6 once Act I's ten spots tier to 5 there.  Sim: heat 35.3 / 33.8 / 32.7, clears unchanged.  240 kept.
2026-09-13  supply.baseCap 50→30, supply.startingStock 40→30 (with the Captain at 240)
            Symptom: no shortages; the cap rarely mattered.  Sim: shortage hours 1→2 per run, stock at cap 13%→32%, Act II 3.08→3.14 d.  Kept.
2026-09-13  sim bot supplyHorizonHours ∞→24: more factory output is worth buying only when stock would run out within a day
            Symptom: the bot added output days ahead of any shortage.  Sim with both lines above: shortage 3 h per run (none in Act I),
            stock at cap 14%, heat 33.5.  Kept.
            Final (npm run sim, 10 seeds): Act I 1.67 d (8/10), Act II 3.11 d (9/10), heat 33.5 (8/10), raids 0, partial 0.51,
            front util 0.55, Dirty idle 0.64, missed wages 0, wage share 0.05.
```

## 2026-09-13 — expansion M4: gold bars

```
2026-09-13  New config (ADR 0034): gold {starting 10, perActUnlocked {2: 5, 3: 10}, hoursPerBar 1, maxSkipHours 8, skipChoices 1/2/4/8};
            sim persona goldRush (rushes every job it sends out, then dispatches again).
            Sim (10 seeds): casual unchanged (Act I 1.67 d, Act II 3.11 d, heat 33.5).  goldRush: 15 bars spent, Act I 0.99 d (5/10 ≥ 1 d),
            Act II 2.89 d, heat 35.6.  The plan's gate (goldRush Act I ≥ 1 d) fails: tuned below.
2026-09-13  reputation.actThresholds[2] 80→90
            Symptom: goldRush Act I 0.99 d.  Sim: goldRush 1.18 d; casual Act I 1.67→1.86 d but Act II 3.11→2.94 d (3/10 in range).  Kept only with a later clear.
2026-09-13  reputation.actThresholds[3] 480→500 / 510 (with [2] 85) / 540 (with [2] 90)
            Symptom: casual Act II under 3 d.  Sim: 500: Act II 2.98 d.  85/510: casual Act I 1.80 d, Act II 3.08 d (5/10), goldRush Act I 1.06 d.
            90/540: casual Act I 1.86 d (6/10), Act II 3.12 d (8/10), goldRush Act I 1.18 d (9/10).  90/540 kept.
2026-09-13  fronts.types.restaurant.unlockRep 80→90 (to open with Act II)
            Sim: seed 46 missed a wage day (10 seeds: missed wages 0.1).  Reverted: the Restaurant opens at 80, just before Act II.
            Final (npm run sim, 10 seeds): casual Act I 1.86 d (6/10), Act II 3.12 d (8/10), heat 33.7 (8/10), raids 0, partial 0.50,
            front util 0.55, Dirty idle 0.65, missed wages 0, wage share 0.05.  goldRush: Act I 1.18 d, Act II 3.05 d, heat 35.5, 15 bars.
```

## Open

- **Front utilization ~55% (target 70–90%) and Dirty idle ~65% (target 20–50%).** The bot keeps a large Dirty reserve and the fronts can wash more than it deposits. Dirty idle rose with M3's bigger Act I.
- **Wage share ~5%** (manual 10–25%). Wages are about a quarter of day-1 income but a few percent of late Act II income, and upkeep doesn't change that. No number fixes both ends: raising wages or upkeep enough for Act II breaks the first day. Running costs that scale with the act would be a new rule, which the expansion plan doesn't have.
- **Shortages are rare** (about 3 h per 8-day run, none in Act I). The plan's M3 gate asks for some shortage in Act I, under 10% of its hours.
- **Act I clears at 1.86 d** (6/10 seeds inside 1–2) since M4 raised the Act II threshold for gold. **Act II clears at 3.12 d**, near the bottom of 3–5. M5's Rep shift will move both.
- **Gold is a strong early accelerator:** spending every bar on jobs takes Act I from 1.86 to 1.18 days. M5's goal rewards add bars; recheck the goldRush gate there.
- **Heat mean 33.5**, with Act I around 36 while the bot fills its heat budget.
