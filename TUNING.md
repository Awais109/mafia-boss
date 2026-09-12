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

## Open

- **Front utilization ~45% (target 70–90%) and Dirty idle ~55% (target 20–50%).** The Restaurant launders 185 Dirty/hr; the casual economy's Dirty supply stays well below that through Act II. A smaller Restaurant throttles Clean, which is what sets Act II pace, so this needs its own measured pass (e.g. Restaurant throughput that grows with front level) rather than a one-line cut.
- **Act I clear is borderline** (1.92 d mean, 4/10 seeds inside 1–2 d).
- **hours ≥40 is low** (~7 over 7 days): the danger window barely registers for the bot. Watch it in human playtests before touching heat.
