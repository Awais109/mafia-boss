# Sevgorod — Dev Manual: Tuning Pace

For anyone touching `engine/config/`. Assumes the implementation plan's architecture: every number in one config object, a headless sim that plays the game, and an in-app editor that writes overrides.

---

## 1. The tuning loop

Never change a number and hand it to a tester. The loop is:

```
1. Name the symptom            (from playtest log or your own play)
2. Find the knob               (§4 below)
3. Change ONE knob
4. npm run sim -- --preset <p> --days 5 --seed 42
5. Read the summary against spec targets (§3)
6. If good: commit with the symptom in the message. Record in TUNING.md
7. If not: revert, try the next knob down the list
```

One knob at a time. The economy is a web of ratios — two changes at once and you won't know which one did it.

**Ratios over absolutes.** Almost every number is a ratio to something else. If Kiosk yield feels low, the question is "low relative to what?" — the front cap, the Market Stall, the wage bill. Raising one absolute usually means you wanted to move a ratio; find the ratio.

---

## 2. Config mechanics

**Where it lives.** `engine/config/defaults.ts` is the source of truth and mirrors spec v1.1 section by section. Presets in `engine/config/presets/*.json` are partial overrides of defaults.

**Layering.** `effective = defaults ← preset ← userOverrides`. The in-app editor only ever writes `userOverrides`, so nothing you do on a device changes the repo.

**Hot reload.** Config is read on every `apply`. Change a value in the debug editor, take any action, it's live. No restart, no re-save of the player state.

**Saves don't contain config.** A save made under `fast` loads fine under `default` — the numbers change, the state doesn't. This is deliberate: it lets you take a tester's exported save, load it under your local overrides, and see what *their* game would look like with your fix.

**Validation.** `schema.ts` rejects a config that's structurally wrong (rate > 1, thresholds out of order, negative durations). It does *not* reject one that's badly tuned. That's what the sim is for.

**Presets shipped:**

| Preset | Purpose | Key overrides |
|---|---|---|
| `default` | Spec v1.1 as written | — |
| `fast` | Compressed playtest, 4 days in ~100 min | `time.hourMs: 60000`, `officials.cooldownDays: 0.05`, `crew.poolRefreshHours: 0.4`, `time.maxOfflineHours: 9999` |
| `stress` | Find breakage | `heat.baseControl: 2`, `rivals.tolya.tickHours: 2`, `costs.paybackHoursByAct: {1: 6, 2: 9}` |
| `lenient` | If default turns out too harsh | `heat.baseControl: 14`, `heat.bribe.controlPct: 0.8`, `crew.loyalty.perMissedWageDay: -8` |

`fast` scales *time*, not economy. Every ratio is identical to `default`; only the clock runs 60× faster. That's why it's valid for testing legibility but not cadence.

---

## 3. Targets — what "on pace" means

From spec v1.1, for the engaged-casual persona at `default`:

| Metric | Target | Where in sim summary |
|---|---|---|
| Act I clear | 1–2 days | `actClear[1]` |
| Act II clear | 3–5 days after Act I | `actClear[2]` |
| Vault fill time, Act I | ~2.5 h | `vaultFillHrs` mean, day 1 |
| Vault fill time, Act II | ~5.5 h | `vaultFillHrs` mean, day 4+ |
| Heat, on schedule | 25–35 | `heatMean` |
| Raids, Acts I–II | 0–1 total | `raids` |
| Front utilization | 70–90% | `frontUtil` |
| Dirty unconverted at session end | 20–50% of session income | `dirtyIdlePct` |
| Partial op outcomes | 40–60% of resolutions | `opOutcomes.partial` |
| Missed wage days | 0 | `missedWages` |

A sim run that hits all of these is the baseline. Save its CSV as `sim/baseline.csv` and diff future runs against it.

The persona is a *policy*, not a person. Humans will do worse on some metrics and better on others. When a human diverges from the bot, ask whether the divergence is confusion (fix the UI or the teach) or preference (the design has more room than the bot uses — good).

---

## 4. Symptom → knob

Ordered by likelihood. Try the first; if the sim doesn't move enough, try the next.

### Pace

**Act I takes too long**
1. `costs.paybackHoursByAct[1]` — lower from 12 toward 9. Directly cuts every Act I price
2. `fronts.types.currencyKiosk.throughput` — raise from 25 toward 35. More Clean/hr
3. `vault.startingDirty` — raise from 30. Only affects the first hour; use for tutorial feel, not pace
4. `fronts.types.currencyKiosk.rate` — raise from 0.55. Last resort: the 0.55 *is* the teach

**Act I too fast (players don't feel the throttle before Act II)**
1. `costs.paybackHoursByAct[1]` — raise toward 15
2. `fronts.types.currencyKiosk.throughput` — lower toward 20

**Act II takes too long**
1. `costs.paybackHoursByAct[2]` — lower from 18
2. `fronts.types.restaurant.throughput` — raise from 185 (watch the gap, §5)
3. `reputation.actThresholds` — if you add Act III, its threshold. For Act II itself: the racket `unlockRep` stagger — compress the 150/250/400/600/850 ladder
4. `costs.upgradeTierMult` — lower from 1.4. Makes T4–T5 cheaper; most of Act II's spend is tiering

**Act II too fast**
Reverse the above. Also consider `rackets.maxTierByAct[2]` from 5 to 4 if the issue is that tiering is trivially affordable.

### Cadence (the vault leash)

**Players don't come back often enough**
1. `vault.targetHoursByAct` — lower. 2.5 → 2 in Act I, 5.5 → 4 in Act II. Vault fills faster, income lost sooner
2. Add a Quick op with a 10-minute timer — the "just checking" hook

**Players feel nagged / sessions too frequent**
1. `vault.targetHoursByAct` — raise
2. `ops.list.*.minutes` for Quick ops — lengthen 15 → 25

**Sessions run too long (> 5 min)**
1. Too many decisions per session. Count actions in the log. If ops dominate: `crew.slotsByAct[2]` 4 → 3. If spending dominates: widen `unlockRep` stagger so fewer purchases are available at once

### The throttle

**Dirty piles up and it feels like punishment, not tension**
The gap (yield ÷ front throughput) is too wide.
1. `fronts.types.restaurant.throughput` — raise. Target gap 1.5–2.0× per spec §5
2. `fronts.bufferHours` — raise from 10. Doesn't change throughput but lets a player deposit more per session, which *feels* like progress

**Throttle is invisible — Clean never feels scarce**
Gap too narrow, or players aren't tiering (check `tierDistribution` in sim).
1. `fronts.types.restaurant.throughput` — lower. Gap toward 2.5×
2. If tiers are low: `costs.upgradeTierMult` down so players tier up and hit the cap

**Suspicion is either never seen or constantly triggered**
1. `fronts.suspicionStartUtil` — 0.7 is where it starts. Move it
2. `fronts.suspicionFactor` — 0.3 is how hard it bites. At Act II full util it adds ~17 exposure to ~80. If that's invisible, 0.5; if it dominates, 0.15

### Heat

**Heat never matters — sits at 20 all game**
Control is too cheap relative to exposure.
1. `heat.baseControl` — lower from 8 to 5. The single strongest early-game heat knob
2. `rackets.tierHeatMult` — raise from 1.35 to 1.45. Makes tiering more expensive in heat, which is pillar 1
3. `officials.list.precinctCaptain.control` — lower from 140 toward 100
4. `officials.list.*.cost` — raise. Delays the purchase, widens the danger window

**Heat is always in the red / raids every day**
1. `officials.list.precinctCaptain.control` — raise toward 180
2. `heat.bribe.controlPct` — raise from 0.5 toward 0.8. Makes the emergency lever work
3. `heat.baseControl` — raise toward 12
4. `rackets.tierHeatMult` — lower toward 1.25
5. Check `officials.list.precinctCaptain.cost` against Influence income. If a player can't afford him until day 4 of Act II, that's the bug — lower cost or raise `ops.influenceDailyCap`

**Heat reacts too slowly / too fast to purchases**
`heat.convergePerHr`. 0.10 means 10% of the gap per hour, ~90% converged in a day. For punchier feedback, 0.2. For "your reputation takes time to change," 0.05. This is pure feel; it doesn't change equilibrium.

**Raids feel random / unfair**
1. `heat.raidChancePerHr` — 0.10/hr above 65 means a raid within ~7 hours on average. Halve it
2. `heat.raidSeizePct` — 0.30 of vault. If vault is small it barely registers; if large it's brutal. Consider 0.2
3. Check the log: was heat *displayed* above 65 for a while before the raid? If it jumped because of an op spike, the issue is `ops.list.*.spike`, not raids

**The "danger window" (rising heat before an official is affordable) is too short or too long**
This is the intended tension. Window length = time to afford the official. Tune via `officials.list.*.cost` vs. Influence income (`ops.influenceDailyCap`, `officials.influencePerHrEach`). Target: affordable ~40–50% through the act.

### Crew and ops

**Ops feel samey — players always send the same crew on the same op**
1. Spread `ops.list.*.w` weights. Right now most are 0.5/0.5 or 0.6/0.4. Make one op 0.9 Muscle, another 0.9 Brains
2. Widen `crew.statBandByAct` so recruits differ more
3. Raise `ops.list.*.diff` variance — a 35 and a 60 in the same act means "who can even do this?" becomes a question

**Ops always succeed / always fail**
`ops.noise` (±10) and `ops.fullMargin` (15). Partial should be modal. If full success dominates, raise `diff` across the board by 5. If fails dominate, lower it or narrow `noise`.

**Crew never matter — nobody cares about loyalty**
1. `crew.loyalty.perMissedWageDay` — make it hurt: −25
2. `crew.wageDivisor` — lower from 60 to 45; wages become a real fraction of income
3. `crew.loyalty.lowEventChancePerDay` — raise from 0.10 so low-loyalty consequences actually fire

**Wages are crushing**
1. `crew.wageDivisor` — raise toward 80
2. `districts.list.sovietsky.mod.wageMult` — if players aren't taking Sovietsky Blocks, its −10% wages should be more attractive: 0.8

**Enforcers are always/never worth it**
`rackets.enforcer.yieldMult` and `.heatMult`. At 1.3 / 0.7 the spec says "strictly worth it below tier 4." If nobody assigns enforcers, they're competing with ops; raise yieldMult to 1.4. If everyone does and ops go idle, lower it.

### Rivals

**Tolya is annoying, not threatening**
1. `rivals.tolya.conditionHit` — 15 → 25
2. `rivals.tolya.tributePctOfVault` — 0.10 → 0.20

**Tolya is a chore**
1. `rivals.tolya.tickHours` — 8 → 12
2. `rivals.tolya.pConditionHit` / `pTribute` — lower both; raise the "nothing" share

**Nobody takes Kiosk Row**
Tribute 15% isn't biting, or buy-out 150 is too dear against a ~400 Act I budget.
1. `districts.list.kioskRow.tribute` — 0.15 → 0.25
2. `districts.pressureOpsToFlip` — 3 → 2, so the pressure path is clearly cheaper than buying

---

## 5. Guardrails — ratios to keep intact

If you break one of these, the sim will show it, but you'll save time knowing in advance.

| Ratio | Keep it | Why |
|---|---|---|
| Portfolio yield ÷ front throughput | 1.5–2.5× (Act II+) | Below 1.5 the throttle vanishes; above 2.5 hoarding feels punitive. Spec §5 |
| `tierHeatMult` > `tierYieldMult` | Always | Pillar 1. If heat grows slower than yield, tiering is free and heat is decorative |
| Control at act-end ÷ exposure at act-end | ~1.8–2.0 | Puts on-schedule heat at 33–36. Spec §7.3 validation table |
| Wages ÷ income | 10–25% | Below 10% crew are free; above 25% recruiting is a trap |
| Bribe cost ÷ hourly income | 0.3–1.0 h of income | It's the *cheap* lever. If it costs 3 h of income nobody uses it |
| Official cost ÷ daily Influence | 1.5–2.5 days | Affordable mid-act, not on day one, not on the last day |
| Quick op reward ÷ hourly yield | ~0.5–1.0 h | Ops supplement idle income, they don't replace it |

---

## 6. Reading the sim output

```
$ npm run sim -- --preset default --days 5 --seed 42

Sevgorod sim · preset=default · persona=casual · seed=42 · 5 days

Act I clear:      1.6 d   (target 1–2)     ✓
Act II clear:     4.4 d   (target 3–5)     ✓
Raids:            0       Arrests: 0       Missed wages: 0
Heat mean:        31      min 18  max 44   hours ≥40: 6
Front util:       82%     Dirty idle @ session end: 34%
Vault fill (h):   d1 2.4  d2 2.9  d3 5.1  d4 5.6  d5 5.8
Op outcomes:      full 31%  partial 52%  fail 17%
Tiers @ end:      K5 K5 M5 M4 A4 C4 B3 P3 CB2

CSV → sim/out/2026-09-12-default-42.csv
```

Check marks are against §3 targets. Anything without a check mark gets a §4 lookup.

`hours ≥40: 6` — six hours of inspections over five days is the danger window working. Zero would mean heat never matters; 40+ would mean it's oppressive.

`Tiers @ end` — if the persona is leaving Cargo Bay at T2, tiering costs are too steep at the top end; that's `costs.upgradeTierMult`.

Open the CSV in a sheet and plot `heat` and `control` on one axis, `vault` and `vaultCap` on another. You want heat to sawtooth (rises with tiering, drops with purchases) and vault to hit its cap just before each session — never long before.

---

## 7. Comparing human logs to the sim

`npm run sim -- --replay path/to/tester-log.json` runs the same report over a real tester's exported log instead of the bot. Same summary table.

Where humans diverge:

| Human vs. bot | Read as |
|---|---|
| Human converts less Dirty than bot | Throttle isn't legible — they don't know to deposit, or don't know why. Tutorial or UI, not config |
| Human buys officials later than bot | Either Influence income is confusing or the heat number isn't alarming enough at 40. Check whether the inspection penalty is visible in the UI |
| Human runs more ops than bot | Ops are more fun than the bot assumes. Good. Don't touch |
| Human runs fewer ops | Ops feel like chores. Check dispatch time in the log (too many taps?) before touching numbers |
| Human sessions are longer than 5 min | Count actions. If it's *reading*, the UI is too dense. If it's *deciding*, that's fun |
| Human stops on day 2 | The single most important number. Look at what happened in their last session — a raid? a wage miss? nothing? "Nothing" is the worst answer: it means the loop didn't give them a reason |

---

## 8. Tuning log

Keep `TUNING.md` in the repo. One line per change:

```
2026-09-14  heat.baseControl 8→6   Symptom: heat flat at 22 through Act I.  Sim: heatMean 31, hours≥40 6.  Kept.
2026-09-14  costs.paybackHoursByAct[1] 12→10   Symptom: Act I 2.3d.  Sim: 1.7d, but Act II 2.6d (too fast).  Reverted.
```

Cheap to write, and in three weeks it's the only record of why the numbers are what they are.
