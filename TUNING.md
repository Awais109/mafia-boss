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

## 2026-09-13 — expansion M5: the guided opening and Act I goals

```
2026-09-13  New config (ADR 0035): vault.startingClean 60→440, vault.startingDirtyOnHand 90 (new), fronts.types.currencyKiosk.cost 0→40;
            crew.openingPool Vitya / Dima / Sasha "Cold" (M34 B36 N50, ceilings 42/44/62, loyalty 50); opening.quickStart (Kiosk, Market Stall,
            Tobacco Factory, Currency Kiosk, two hires: ●380); tutorial.tolyaAfterMinutes 2; goals {8 goals, ▰1 each}.
            Rep shift +38 on every non-zero threshold: Beer Tent 15→53, Video Salon 30→68, Taxi Rank 45→83, Slot Hall 60→98, Warehouse 20→58,
            Restaurant 80→118, Auto Shop 110→148, Café 170→208, Bathhouse 250→288, Petrol 330→368, Cargo Bay 420→458, Act II 90→128, clear 540→578.
            Sim (10 seeds): casual Act I 1.86→1.55 d (the plan's M5 gate is within 0.1 d of M4), Act II 3.12→3.06 d, heat 34.5, missed wages 0.
            goldRush Act I 0.70 d, 23 bars, five goals on day 1.  Act I too fast: tuned below.
2026-09-13  vault.startingDirtyOnHand 90→30 (experiment)
            Sim: casual Act I 1.70 d: the ◆90 explains about half the speed-up.  Reverted: the opening needs it for wages and Tolya's first demand.
2026-09-13  crew.openingPool Sasha M34 B36 N50 → M30 B30 N38 (experiment)
            Sim: casual Act I 1.90 d, Act II 3.25 d, missed wages 0.3 per run.  Reverted.
2026-09-13  reputation.actThresholds 128/578 → 143/610; fronts.types.restaurant.unlockRep 118→133 (still just before Act II)
            Sim: casual Act I 1.89 d (4/10 in 1–2), Act II 3.09 d (8/10), heat 33.8, raids 0, partial 0.49, missed wages 0, front util 0.57,
            Dirty idle 0.63, wage share 0.05.  goldRush: Act I 1.03 d (8/10 ≥ 1 d), Act II 3.03 d, 22 bars.  Kept.
2026-09-13  tests/sim.test.ts goldRush guard: seeds 42–46 → 42–51 (threshold unchanged at 1 d)
            Symptom: seeds 42–46 average 0.94 d while the ten tuning seeds average 1.03 d. The gate is at its limit with the owner's
            gold numbers (10 to start, one per goal), so the guard now measures the same ten seeds as the tuning runs.
```

## 2026-09-13 — expansion M6: Act II premises and Zhanna

```
2026-09-13  New config (ADR 0037): rackets.types.stashHouse {act 2, purchase 200, unlock ★178, upkeep 1/h ×1.2 a tier, heat 1.0,
            leashHoursPerTier 1.5, shieldPerTier 0.16}; rackets.types.unionOffice {act 2, one per city, purchase 250, unlock ★238,
            upkeep 1.5/h ×1.2, heat 0.5, influencePerHrPerTier 1/60}; rackets.premises.maxShield 0.8; synergies stashWarehouse
            (Warehouse upkeep ×0) and unionSovietsky (Influence ×1.5).
2026-09-13  New config (ADR 0036): rivals.zhanna {a lot of 25 packs for ◆40, price −0.3 per 100 disposition within ×0.5–1.5, 6 h cooldown,
            ×1.5 while hostile; surplus ◆2 a pack, 30 packs a day, +1 disposition per 10; +5 per lot, −5 per smuggling run, −10 for a
            buy-out, −25 for a flip, hostile below −30; smuggling +10 difficulty while she holds the Port}.
            Sim (10 seeds): casual Act I 1.89 d (4/10), Act II 3.09→3.07 d (7/10), vault fill Act II 5.50 h on the base cap, heat 34.0 (8/10),
            raids 0, partial 0.48, missed wages 0, front util 0.59, Dirty idle 0.68, wage share 0.04.
            Stash House in 10/10 runs (around day 4.5, tier 4, +5.4 vault hours, 12% raid shield); Union Office in 0/10; Zhanna's lots
            0.3 a run, surplus ◆52 a run, her disposition ends near −17.  Influence guardrail: the Precinct Captain's cost ÷ Influence
            a day while saving for him 1.77 d (target 1.5–2.5).
            goldRush: Act I 1.03 d (8/10 ≥ 1 d), Act II 2.99 d (7/10).  Kept: no number moved to pass a gate.
```

## 2026-09-14 — vault starts empty

```
2026-09-14  vault.startingDirty 30→0; vault.startingDirtyOnHand 90→120
            Symptom: the vault held 30 Dirty before any racket existed to have earned it — a visible inconsistency, not a balance
            complaint. Tried startingDirty→0 alone first: Act I 1.89→1.72 d (8/10, better), but missed wages 0.00→0.20 (2/10 seeds
            missed a payday) — the 30 was quietly cushioning the first payday. Moved it into startingDirtyOnHand instead (120 keeps
            the combined starting Dirty pool at 120, same as 30+90 before): sim (10 seeds) came back byte-identical to baseline
            (Act I 1.89 d, Act II 3.07 d, heat 34.01, missed wages 0.00) — same total Dirty, just relocated out of an empty vault
            into cash on hand. Kept.
```

## 2026-09-15 — Act II gated by Act I goals, not Reputation (ADR 0039)

Structural change, not a number: Act I → Act II now requires every Act I goal done instead of
`reputation >= actThresholds[2]`. `actII` (circular: it checked `state.act >= 2`) is removed from
`goals.list`, leaving 7 goals; `secondDistrict` now needs two districts *fully built* (every allows-slot
and premises lot, not just controlled), `workFront` needs both fronts at rate level 2 (not one dial
change), `smuggleRun` needs 3 runs (not 1). Full reasoning and consequences in ADR 0039.

```
2026-09-15  goals.list: drop actII (7 goals, all required); secondDistrict/workFront/smuggleRun redefined harder
            Symptom (expected, not a bug): the bot's normal economic logic doesn't trigger factoryTier2, smuggleRun or the new
            workFront reliably — they only fire on a predicted shortage or high front utilization, both rare under the tuned
            economy (this doc's own "Open" notes: shortages "none in Act I"; front util never logged above ~0.68). First sim
            after the goal changes alone, before touching the bot: Act I never clears within 8 days for any of 10 seeds.
2026-09-15  sim/persona.ts: goal-directed pursuit for factoryTier2, workFront, smuggleRun, secondDistrict
            Added a block that bypasses each goal's normal economic trigger once its condition isn't met yet — a real player
            would just do these deliberately once goals gate Act II, so the bot does too, ahead of its usual priority. First
            placement (after crew upkeep, before dispatch): Act I 4.75 d mean (10 seeds) — huge improvement over "never," but
            missed wages 0.00→0.30 (3/10 seeds), a real regression.
2026-09-15  sim/persona.ts: capped new-premises upkeep at maxWageShare of yield in the district-completion logic (no effect)
            Hypothesis: force-buying premises to complete a district was running upkeep away. Sim: byte-identical to the line
            above (4.69/4.75 d, missed wages still 0.30) — wrong hypothesis, guard never actually bound.
2026-09-15  sim/persona.ts: moved goal-pursuit block before the front-deposit step instead of after it (fixed)
            Diagnosed the actual cause: deposits reserve based on wagesPerHr/upkeepPerHr computed *before* goal-pursuit's new
            purchases that same session, so a session's deposit could drain Dirty past what a purchase later in the same
            session was about to obligate it to. Moving goal-pursuit to run right after COLLECT, before deposits, means the
            reserve always sees this session's new upkeep. Sim (10 seeds): missed wages 0.30→0.00, Act I 4.64 d, Act II 1.68 d
            after Act I — otherwise unchanged. Kept.
            Final (5 seeds 42–46, 8 d, matching tests/sim.test.ts): Act I 4.55 d, Act II 1.73 d after Act I, heat 34.05,
            raids 0, missed wages 0, partial 0.47. goldRush (10 seeds, 6 d): Act I 3.25–5.04 d, still every seed ≥ 1 d — gold
            barely accelerates Act I any more, since it speeds up jobs and the new gate is mostly building-driven.
```

**Test guards updated** (`tests/sim.test.ts`), not loosened past what the bot actually does: Act I clear
2.1 d ceiling → 4–5.5 d band; Act II-after-Act-I 3–5 d → 1–2.2 d; the goldRush floor test's window
3 d → 6 d (every seed now needs that long to reach the milestone at all). `sim/baseline.csv` regenerated
(seed 42, 8 days) to match.

## 2026-09-29 — M8: six acts and Act III's first half (ADRs 0040, 0041)

New config, starting values from the six-act design; the sim now runs 22 days so Act III can clear.

```
2026-09-29  New config (ADR 0040): Act 1–6; vault.targetHoursByAct 3–6 = 8, 12, 18, 24; rackets.maxTierByAct 3–6 = 6;
            costs.paybackHoursByAct 3–6 = 24, 30, 36, 36; crew.slotsByAct 3–6 = 6, 8, 10, 12; crew.statBandByAct 3–6 = [45,70],
            [50,75], [55,80], [55,80]; gold.perActUnlocked 4–6 = 10 each; progression.finalAct 3, acts {2 goals, 3 ★610 (was
            reputation.actThresholds[3]), 4 ★4,000, 5 ★10,000, 6 ★20,000}. reputation.actThresholds removed.
2026-09-29  New config (ADR 0041): prosperity {fromAct 3, base 45, step 0.1/h, joints ×0.7–1.3, penalties inspected 10, raid 15 for
            24 h, shortage 10}; business prosperity: kiosk 2, stall 3, beer tent 3, slot hall 4, café 6, bathhouse 8, video salon −2,
            taxi rank −1, auto shop −2, petrol −3, cargo bay −4, tobacco factory −2; the Centre {buyout 900, lots 2}; Nightclub
            {50/h, heat 6, ★620, sells 2.5, share .25, +6}; Card Club {70/h, heat 9, ★660, sells 3, share .3, +12, needs 60};
            Print Shop {90/h, heat 14, ★900, −6}; Hotel {●500, upkeep 3/h ×1.2, heat 1.5, ★640, +8 a tier}; synergy hotelJoints
            ×1.15; Cooperative Bank {75%, 500/h, ●1,500, ★700, needs city 55}; City Hall {+400 control, ✦24}; Big Score {8 h, 3
            crew, diff 60, ◆200, spike 8}; specialization6 greed ×1.4 yield ×1.8 heat, stealth ×1 / ×0.8; investigation incident.
            Sim (10 seeds, 22 d): Act I 4.64 d, Act II 1.9 d (0/10 in 3–5), Act III 4.2 d (0/10 in 6–8), Act III heat 45.
2026-09-29  rackets.types.cardClub.minProsperity 60→55
            A tier-1 hotel (+8) and a nightclub (+6) take the Centre from 45 to 59: at 60 the first hotel never unlocked the club,
            so the bot had no reason to build it there. Kept.
2026-09-29  officials.list.cityHall.control 400→900→1100→1300
            Act III heat 45 at 400: a tier-6 portfolio's exposure (~835) swamps control (~785). 900: Act III heat 39; 1100: 36, run
            heat 35.2 (2/5 in 25–35); 1300: run heat 33.6 (10/10), Act III length unchanged. Kept 1300.
2026-09-29  progression.acts.4.rep 4000→7000→8500→9000
            Rep flattens near ★7,900 by day 13 once the bot owns the whole Centre at tier 6, so Act IV's gate has to sit just under
            what Act III's content can earn. 7000: Act III 5.6 d. Kept 9000 with the price change below.
2026-09-29  costs.paybackHoursByAct.3 24→28→32→40
            28: Act III 5.7 d; 32: 5.9 d; 40 with the gate at ★8,500: 6.4 d (9/10), content now earns ~★10,200. Kept 40.
2026-09-29  progression.acts.3.rep 610→1000→1200
            With ★610 as a door rather than the end, Act II ran 1.9 d. 1000: 2.9 d (7/10); 1200: 3.3 d (10/10). Kept 1200.
2026-09-29  Act III unlock ladder spread above the new gate: Nightclub ★620→1220, Hotel 640→1300, Bank 700→1500, Card Club 660→1700,
            Print Shop 900→2400 (all sat below ★1,200, so everything opened at once).
            Final (10 seeds, 22 d): Act I 4.64 d, Act II 3.28 d (10/10), Act III 6.47 d (8/10), heat 33.6 (10/10; Act I ~38, II ~24,
            III ~37), raids 0, partial 0.50, missed wages 0, front util 0.65, Dirty idle 0.86, wage share 0.02.
            goldRush: Act I 4.19 d, Act II 3.16 d, Act III 6.36 d, heat 33.4, missed wages 0.
2026-09-29  tests/sim.test.ts: 8 → 22 days; Act II band 1–2.2 → 3–5 (the manual's own); Act III 6–8 added.
```

## 2026-09-29 — M9: Act III's consequences (ADR 0042)

```
2026-09-29  New config: injuries {fromAct 3, 30% on a failed job ≥ half Muscle, 12 h}; Clinic {●600, upkeep 2/h ×1.2, heat 0.5,
            ★1,400, one per city, injuries ×0.5, +1 loyalty a day}; Loan Desk {●800, upkeep 2/h ×1.2, heat 1, ★1,600, one per city,
            lends 2 h of yield a tier}; credit {fromAct 3, 2 days of Clean, min ●2,000, 5% a day, 25% of the principal a day,
            second miss takes 30% of the vault; lending 48 h at 25%, default 25% − 0.3% × the desk's prosperity, min 2%};
            rivals.tolya.attack {fromAct 3, 15%, 30% once his district is taken, 45% hostile}; incidents attack, collectors,
            lendingDefault.
            Sim (10 seeds, 22 d): Act III 6.4 d, heat 34 in the act, but 11–50 attacks a run (the bot takes Kiosk Row), and the
            bot never built a loan desk (it valued a desk at the risk of an unbuilt one, worst case).
2026-09-29  rivals.tolya.attack 15/30/45% → 8/15/30% → 5/10/20%; the attack's fight win disposition −10 → −5
            8/15/30: 6–35 a run; winning fights soured him into the hostile rate. 5/10/20 with a softer win: 3–26 a run, about
            one a day, more for a hostile Tolya. Kept.
2026-09-29  Bot fix (not a number): a hotel gets credit for opening a business its street reaches over the hotel's tiers, not only
            its first. Without it, three seeds never opened the Card Club and stalled at ★8,500, short of Act IV's gate.
2026-09-29  rackets.types.loanDesk.lendHoursPerTier 2→4; credit.lending.returnPct 0.25→0.3
            At 2 h and 25% no seed found a premises lot worth giving it once hotels were valued properly. At 4 h and 30% every
            seed builds one and lends ~180k over a run; Act III length and heat unchanged. Kept.
            Final (10 seeds, 22 d): Act I 4.64 d, Act II 3.28 d (10/10), Act III 6.39 d (8/10), heat 33.3 (10/10), raids 0,
            missed wages 0, partial 0.50, front util 0.65, Dirty idle 0.86, wage share 0.02. goldRush: Act III 6.41 d, heat 33.0.
```

## 2026-09-29 — M10: Act IV, Zastava (ADR 0043)

The sim now runs 34 days so Act IV can clear.

```
2026-09-29  New config (ADR 0043): premium {fromAct 4, baseCap 30, startingStock 0}; convoys {customs 8% + 0.4% per heat, road 40%,
            ×1.5 while the Colonel is hostile}; Truck Stop {120/h, heat 12, ★9,200, sells 5, share .3}; Motel {150/h, heat 14,
            ★9,600, premium 1.5/h, share .5}; Foreign Goods Shop {180/h, heat 15, ★11,000, premium 2/h, share .6}; Freight Yard
            {280/h, heat 36, ★13,000}; Fuel Depot {360/h, heat 45, ★16,000}; Bonded Warehouse {●5,000, upkeep 20/h ×1.2, heat 3,
            ★9,400, +60 premium a tier, customs ×0.5 in Zastava}; Convoy Depot {●6,000, upkeep 25/h ×1.2, heat 4, ★10,000, one per
            city, +15% load a tier, road ×0.5}; Import–Export {80%, 1,500/h, ●20,000, ★9,800, 100 per premium pack}; Customs Chief
            {+2,000 control, ✦40, customs ×0.5}; Run a Convoy {6 h, 3 crew, diff 60, spike 5, ●800, 60 packs}; Grease the Post
            {4 h, 2 crew, diff 60, spike 2, ✦3}; Zastava {Colonel, tribute .2, buyout ●15,000, 3 lots}; Zhanna premium lots {20
            packs, ×4 price}; the Colonel {passage 2 h of yield for 24 h, +5 a passage, −5 pressure, −10 buyout, −25 flip,
            hostile below −30}; progression.finalAct 3→4.
2026-09-29  costs.paybackHoursByAct 4–6 = 30, 36, 36 → 40, 40, 40
            The same payback as Act III (M8), so an Act IV purchase is as long a wait as an Act III one and the act's
            content can't outrun its gate. Kept.
2026-09-29  progression.acts.5 {★10,000} → {★30,000, hold Zastava, own the Import–Export Company}
            Act IV opens at ★9,000, so ★10,000 would have cleared it almost at once. The gate now asks for the act's two
            decisions as well as Rep. Kept.
2026-09-29  Bot fixes (not numbers): Zhanna's premium price was multiplied by packs instead of priceMult; convoys were keyed to
            cigarette stock, so the bot never ran one; the importer waited days for savings, so the bot now borrows to open an
            unaffordable front. Before them: Act IV 9.8 d (target 8–10), convoys 21–47 a run.
2026-09-29  premium.baseCap 30→60
            A convoy lands 60, so at 30 half of every early convoy was wasted before a Bonded Warehouse. 30: Act IV 9.64 d (9/10),
            heat 31.7. 60: 9.43 d (10/10), heat 32.0. Kept 60.
            Final (10 seeds, 34 d): Act I 4.64 d, Act II 3.28 d (10/10), Act III 6.44 d (8/10), Act IV 9.43 d (10/10), heat 32.0
            (10/10), raids 0, partial 0.47, missed wages 0, front util 0.58, Dirty idle 0.87, wage share 0.02.
            goldRush (at cap 30): Act IV 9.53 d, heat 32.1, missed wages 0.
2026-09-29  tests/sim.test.ts: 22 → 34 days; Act IV 8–10 added.
```

## Open

- **Front utilization ~58% (target 70–90%) and Dirty idle ~87% (target 20–50%)** over 34 days. The importer (Act IV) is capped by premium sales, so a premium shortage leaves it idle; `coverPerPremiumPack` is the knob to watch. The bot keeps a large Dirty reserve and the fronts can wash more than it deposits early on; by late Act III yield (~1,800/h) outruns laundering (~1,100 Clean/h with the Bank at full capacity), so Dirty piles up. The loan desk (M9) takes one loan at a time, so it doesn't move the metric, which is measured at session end.
- **Wage share ~2%** over 22 days (manual 10–25%). Wages are about a quarter of day-1 income but a few percent of late Act II income, and upkeep doesn't change that. No number fixes both ends: raising wages or upkeep enough for Act II breaks the first day. Running costs that scale with the act would be a new rule, which the expansion plan doesn't have.
- **Shortages are rare** (about 3 h per 8-day run, none in Act I). The plan's M3 gate asks for some shortage in Act I, under 10% of its hours.
- **Act I clears at 4.64 d** against the manual's 1–2, since it's gated on seven build-out goals (ADR 0039). An owner decision: relax the goals or move the target. **Act II clears at 3.28 d** and **Act III at 6.47 d**, both in range.
- **Gold barely accelerates Act I any more** (goldRush 4.19 d against 4.64): it speeds up jobs, and Act I is gated on building.
- **Heat mean 33.6** over three acts: Act I around 38 while the bot fills its heat budget, Act II around 24 once the Captain arrives, Act III around 37 until City Hall does.
- **The Union Office is built in Act III**, not before: City Hall is the first official after the Captain that Influence has to save for.
- **Zhanna's lots are rare for the bot** (0.3 a run), because stock seldom gets within 12 hours of running out; surplus sales come to about ◆50 a run.
- **No raids in the sim**, so only the tests exercise the Stash House's raid shield.
