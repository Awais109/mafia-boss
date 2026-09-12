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

## Open

- **Front utilization ~49% (target 70–90%) and Dirty idle ~54% (target 20–50%).** The Restaurant now starts at 120 Dirty/hr and grows through its capacity track, but the casual economy's Dirty supply still sits below what fronts can wash. M3's upkeep and supply chain change the Dirty side; measure again there.
- **Heat mean 34.4 is close to the 35 ceiling** (6/10 seeds in range) after M2. The bot pushes fronts and specializes within its heat budget; watch the mean when M3 adds businesses.
- **Wage share ~6%** (manual 10–25%). Premises upkeep in M3 is expected to raise it.
- **Act I clear** is 1.80 d mean, 8/10 seeds inside 1–2 d.
