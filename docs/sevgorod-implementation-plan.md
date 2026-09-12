# Sevgorod — Prototype Implementation Plan

**Scope:** Acts I–II fun-test prototype per spec v1.1 §13
**Constraint:** Fully local. No server, no assets, no external services at runtime. Lists and numbers only.
**Goal:** Put a build on partners' phones, play for ~4 real days (or 1 hour with time-skip), and answer: is the loop fun?

Companion doc: `sevgorod-dev-manual.md` — how to tune pacing.

---

## 1. Goals and non-goals

**Goals**
- Every system in spec §13 "Build" list, playable end-to-end through Act II
- Every number from the spec lives in one config object, editable in-app without a rebuild
- Debug time-skip from day one
- A headless simulator that plays the game as an "engaged casual" bot, so a config change can be previewed in seconds before a human plays it
- Local event logging exportable via share sheet, so playtest data reaches you without a server

**Non-goals**
- Art, sound, animation, polish of any kind
- Accounts, sync, leaderboards, IAP, push notifications
- Supply chain, grudges, Informant, Acts III–V, prestige, seasons (all stubbed per §13)
- Anti-tamper. Testers changing their device clock is equivalent to using the debug skip; irrelevant for a fun test

---

## 2. Architecture

### 2.1 The one rule

```
engine/  →  pure TypeScript. No React, no Expo, no Date.now(), no Math.random().
ui/      →  React Native. Renders state, dispatches actions. Owns nothing.
```

The engine is a reducer:

```ts
reconcile(state, nowMs, config, rng)        → { state, events }   // catch up to "now"
apply(state, action, nowMs, config, rng)    → { state, events }   // reconcile, then apply
derive(state, config)                        → Derived              // yield, exposure, control, caps, costs
```

Time and randomness are injected. This is what makes the rest of the plan cheap:

| Because time is injected | Because RNG is seeded |
|---|---|
| Debug time-skip = `now + offset` | Same reconcile window always produces same raids; no refresh-to-dodge |
| Headless sim = call `reconcile` in a loop with fake time | Sim runs are reproducible; a bug report includes a seed |
| Unit tests never sleep | Op outcomes can be replayed |

### 2.2 Game time

```ts
gameNow() = Date.now() + state.debugOffsetMs
```

Time-skip adds to `debugOffsetMs` and persists it. Everything else uses `gameNow()`. Real-clock playtests run with offset 0.

### 2.3 Persistence

One JSON document per player in local storage. Written after every `apply` and on app background. Read once on launch. `schemaVersion` field with a migration stub (`migrate(doc) → doc`) so a config or model change mid-playtest doesn't brick saves.

Config is **not** in the save. It's loaded from defaults + a persisted override map, so changing a constant applies to existing saves.

### 2.4 Foreground behaviour

- On foreground / launch: `reconcile(state, gameNow())`, persist, render
- While open: a 1 s UI timer computes *display* values (vault filling, op countdowns, heat drift) from state + elapsed, without writing. Actual state advances only on `apply`
- On background: persist

---

## 3. Stack

**React Native + Expo (TypeScript).** Reasons: you already work in TS; the engine shares a language with the sim harness and tests; Expo Go gives partners a build by QR code in minutes; the UI is disposable lists so the framework barely matters.

Flutter would work equally well for the UI. What matters is the engine/UI split, which is framework-independent. If you'd rather write the UI in Kotlin, the engine still ships as TS via a JS runtime or gets ported — but that's wasted effort at prototype stage.

| Concern | Choice |
|---|---|
| Runtime | Expo SDK (managed), TypeScript strict |
| Storage | `expo-file-system` for the save document (AsyncStorage's size limits bite at ~6 MB on Android; the event log will grow) |
| Tests | Vitest, engine only |
| Sim | Node script, `npm run sim` |
| Export | `expo-sharing` — save/log JSON via share sheet |
| Distribution | Expo Go for daily iteration; EAS internal build (APK / TestFlight) for the real-time playtest |

Zero runtime dependencies beyond Expo's own modules. No analytics SDK, no crash reporter, no fonts.

---

## 4. Repository layout

```
sevgorod/
  engine/
    config/
      defaults.ts        # every number from spec v1.1
      schema.ts          # types + validation
      presets/           # default.json, fast.json, stress.json
    model/
      state.ts           # PlayerState and children
      actions.ts         # action union
      events.ts          # event union (what happened during reconcile/apply)
    core/
      reconcile.ts       # the catch-up walk (§6)
      apply.ts           # action handlers
      derive.ts          # yield, exposure, control, caps, costs
      formulas.ts        # tier curves, cost curves, heat equilibrium
      rng.ts             # seeded PRNG + seed derivation
    systems/
      rackets.ts  fronts.ts  heat.ts  crew.ts  ops.ts
      districts.ts  rivals.ts  reputation.ts  tutorial.ts
    index.ts
  sim/
    persona.ts           # "engaged casual" policy
    run.ts               # CLI: --days --preset --seed --sessions
    report.ts            # summary + CSV
  app/                   # Expo
    screens/
    components/
    store.ts             # thin wrapper: load, apply, persist
    debug/
  tests/
```

`engine/` has no imports from `app/` or `sim/`. Enforce with an ESLint `no-restricted-imports` rule; it will save you from yourself in week two.

---

## 5. Data model

Illustrative; final shapes live in `engine/model/state.ts`.

```ts
type PlayerState = {
  schemaVersion: number
  playerId: string                // random UUID at first launch; seeds RNG
  createdAt: number
  updatedAt: number               // last reconcile/apply, game-time ms
  debugOffsetMs: number

  dirty: number
  clean: number
  influence: number
  reputation: number
  act: 1 | 2

  heat: number                    // displayed value, converges toward target
  baseControl: number

  rackets: Racket[]
  fronts: Front[]
  crew: CrewMember[]
  recruitPool: { candidates: CrewMember[]; refreshAt: number }
  ops: OpInstance[]               // in progress
  districts: District[]
  officials: Official[]           // owned
  officialCooldownUntil: number
  bribeUntil: number
  bribeControl: number

  rival: { tolya: RivalState }
  wagesPaidThrough: number        // game-time ms
  influenceOpsToday: { day: number; count: number }
  tutorial: { step: number; done: boolean }

  log: LogEntry[]                 // capped ring buffer; full log in separate file
  stats: PlaytestStats            // session count, durations, milestones
}

type Racket = {
  id: string; type: RacketType; districtId: string
  tier: number; condition: number; enforcerId: string | null
}

type Front = {
  id: string; type: FrontType; level: number
  buffer: number                  // dirty deposited, not yet converted
}

type CrewMember = {
  id: string; name: string
  muscle: number; brains: number; nerve: number; loyalty: number
  traits: Trait[]
  status: 'idle' | 'on_op' | 'enforcer' | 'jailed'
  jailedUntil?: number; assignedTo?: string
}

type OpInstance = {
  id: string; type: OpType; crewIds: string[]
  startedAt: number; completesAt: number
}

type District = {
  id: string; controller: 'player' | 'tolya' | 'zhanna' | 'none'
  pressureCount: number           // successful pressure ops toward flip
}
```

`Derived` (never persisted, recomputed on demand):

```ts
type Derived = {
  yieldPerHr: number              // after condition, enforcers, tribute, inspection, district mods
  exposure: number
  control: number
  heatTarget: number
  vaultCap: number
  wagesPerHr: number
  costs: { racket: Record<RacketType, number>; upgrade: (r: Racket) => number; ... }
  affordable: { ... }             // for UI badges
  perRacket: Array<{ id; yield; exposure; ... }>
}
```

---

## 6. The reconcile walk

This is the heart. Everything offline is computed here; nothing ticks.

```
reconcile(state, now, config, rng):
  t = state.updatedAt
  if now <= t: return

  // Offline cap: an idle game shouldn't reward a 3-week absence
  t = max(t, now − config.time.maxOfflineHours × 3600000)

  while t < now:
    // next boundary is the earliest of: an event, the next whole hour, now
    boundary = min(
      nextOpCompletion(state, t),
      state.bribeUntil if > t,
      state.recruitPool.refreshAt if > t,
      nextRivalTick(state, t),
      nextWholeHour(t),
      now
    )
    hours = (boundary − t) / 3600000

    d = derive(state)                    // yield, exposure, control at segment start

    // continuous quantities over the segment
    accrueDirty(state, d, hours)         // clamp to vaultCap
    convertFronts(state, hours)          // min(buffer, throughput×h) × rate → clean
    convergeHeat(state, d.heatTarget, hours)   // closed form, config.heat.convergePerHr
    accrueWages(state, d, hours)         // owed += wagesPerHr × h; settle at day boundaries
    decayCondition(state, hours)
    driftLoyalty(state, hours)
    accrueOfficialInfluence(state, hours)

    // discrete rolls, only at whole-hour boundaries
    if boundary is whole hour:
      hourIndex = floor(boundary / 3600000)
      r = rng.derive(state.playerId, 'raid', hourIndex)
      if state.heat >= config.heat.raidThreshold: maybeRaid(state, r)
      if state.heat >= config.heat.arrestThreshold: maybeArrest(state, r)
      settleWagesIfDayBoundary(state, boundary)

    // discrete events landing exactly at boundary
    for op in opsCompletingAt(boundary):  resolveOp(state, op, rng.derive(op.id))
    if boundary == state.bribeUntil:      expireBribe(state)
    if boundary == recruitPool.refreshAt: refreshPool(state, rng.derive(playerId, 'pool', dayIndex))
    if boundary == nextRivalTick:         rivalTick(state, rng.derive(playerId, 'tolya', tickIndex))

    t = boundary

  state.updatedAt = now
```

Notes:
- **Segment granularity is at most one hour**, so inspection penalties (heat ≥ 40 → yield ×0.85) are applied with at most an hour of lag. Good enough; the spec's closed-form heat is used *within* each segment.
- **Ops resolve at their exact completion time**, in order, before the next segment accrues — their heat spikes feed the next hour's raid roll, per spec §10.
- **Max iterations** ≈ `maxOfflineHours` + number of events. Bounded and fast.
- The whole function is deterministic given `(state, now, config, playerId)`. Test it by asserting that `reconcile(s, t2)` equals `reconcile(reconcile(s, t1), t2)` for random `t1 < t2` — this property test catches most walk bugs.

---

## 7. Actions

Each handler: validate → mutate → emit events → recompute derived where needed. All costs come from `derive`, never inline.

| Action | Validates | Effect |
|---|---|---|
| `COLLECT` | — | vault → dirty (vault is a separate bucket from spendable dirty; see note) |
| `DEPOSIT {frontId, amount}` | amount ≤ dirty, buffer + amount ≤ bufferCap | dirty −, buffer + |
| `BUY_RACKET {type, districtId}` | unlocked, clean ≥ cost, slot free | clean −, push racket, rep += cost/10 |
| `UPGRADE_RACKET {id}` | tier < max, clean ≥ cost | clean −, tier +, rep += cost/10 |
| `REPAIR_RACKET {id}` | dirty ≥ cost | condition = 100 |
| `ASSIGN_ENFORCER {crewId, racketId?}` | crew idle, racket has none | status = enforcer |
| `START_OP {type, crewIds}` | crew idle, count matches, op unlocked | push OpInstance, crew → on_op |
| `RECRUIT {candidateId}` | slot free, clean ≥ cost | move to crew, rep += cost/10 |
| `FIRE {crewId}` | not Nephew, not on_op | remove |
| `RAISE {crewId}` | clean ≥ cost | loyalty +10 |
| `BUY_OFFICIAL {id}` | influence ≥ cost, cooldown passed | push, cooldown = now + 3d |
| `BRIBE` | dirty ≥ 3 × exposure | bribeControl = 0.5 × control, bribeUntil = now + 6h |
| `BUY_DISTRICT {id}` | clean ≥ cost | controller = player, rep += 20 |
| `BUY_FRONT {type}` / `UPGRADE_FRONT {id}` | unlocked, clean ≥ cost | push / level + |
| `PAY_TRIBUTE` | dirty ≥ demand | dirty −, tolya.disposition +10 |
| `TUTORIAL_ADVANCE` | — | step + |
| `DEBUG_*` | debug flag | see §10 |

**Vault vs. dirty.** Keep them separate: `vault` accrues and is capped; `COLLECT` moves it to `dirty`, which is spendable and uncapped. Raids seize `vault` only. Simpler than the spec's wording and matches the loop's "Collect" step literally. Wages draw from `dirty` first, then `vault`.

---

## 8. Config

Single object, fully typed, every field with a comment naming the spec section. Skeleton (abbreviated — the real file has all of §5–§8 of the spec):

```ts
export const defaults: Config = {
  meta: { name: 'default', version: 1 },

  time: {
    maxOfflineHours: 72,
    hourMs: 3_600_000,           // set to 60_000 in 'fast' preset: 1 game hour = 1 real minute
  },

  vault: {
    floorCap: 40,
    targetHoursByAct: { 1: 2.5, 2: 5.5 },
    startingDirty: 30,
  },

  rackets: {
    tierYieldMult: 1.2,          // spec §7.1
    tierHeatMult: 1.35,
    maxTierByAct: { 1: 5, 2: 5 },
    conditionDecayPerDay: 2,
    conditionRepairPct: 0.10,    // of purchase price, in dirty
    enforcer: { yieldMult: 1.3, heatMult: 0.7 },
    types: {
      kiosk:        { act: 1, baseYield: 6,  baseHeat: 0.8 },
      marketStall:  { act: 1, baseYield: 10, baseHeat: 1.3 },
      autoShop:     { act: 2, baseYield: 18, baseHeat: 2.5, unlockRep: 150 },
      cafe:         { act: 2, baseYield: 14, baseHeat: 1.8, unlockRep: 250 },
      bathhouse:    { act: 2, baseYield: 24, baseHeat: 3.2, unlockRep: 400 },
      petrol:       { act: 2, baseYield: 34, baseHeat: 4.5, unlockRep: 600 },
      cargoBay:     { act: 2, baseYield: 55, baseHeat: 8.0, unlockRep: 850 },
    },
  },

  costs: {                       // spec §6.2
    paybackHoursByAct: { 1: 12, 2: 18 },
    upgradeBaseFactor: 0.5,
    upgradeTierMult: 1.4,
    overrides: {},               // { kiosk: { purchase: 40 } } — wins over formula
  },

  fronts: {
    suspicionStartUtil: 0.7,
    suspicionFactor: 0.3,
    bufferHours: 10,
    upgrade: { rateStep: 0.03, levels: 3, costPctOfUnlock: 0.4 },
    types: {
      currencyKiosk: { rate: 0.55, throughput: 25,  unlockRep: 0,  cost: 0 },
      restaurant:    { rate: 0.65, throughput: 185, unlockRep: 80, cost: 60 },
    },
  },

  heat: {
    baseControl: 8,
    convergePerHr: 0.10,
    startHeat: 20,
    inspectThreshold: 40, inspectYieldMult: 0.85,
    raidThreshold: 65,    raidChancePerHr: 0.10, raidSeizePct: 0.30,
    arrestThreshold: 85,  arrestChancePerHr: 0.15, arrestHours: 12,
    bribe: { controlPct: 0.5, hours: 6, costPerExposure: 3 },
    districtControlPct: 0.05,
  },

  officials: {
    cooldownDays: 3,
    influencePerHrEach: 1 / 8,
    list: {
      wardCop:          { control: 6,   cost: 4,  act: 1 },
      precinctCaptain:  { control: 140, cost: 12, act: 2 },
    },
  },

  crew: {
    slotsByAct: { 1: 2, 2: 4 },
    extraSlotCostPctOfBudget: 0.05,
    recruitCostPerAct: 50,
    poolSize: 3, poolRefreshHours: 24,
    statBandByAct: { 1: [25, 50], 2: [35, 60] },
    wageDivisor: 60,             // (M+B+N)/60 per hr
    loyalty: { driftPerDay: -2, perOpSuccess: 5, perRaise: 10, perMissedWageDay: -15,
               lowThreshold: 25, lowEventChancePerDay: 0.10 },
    raiseCostPerAct: 20,
    traits: { exArmy: { muscleBonus: 15 }, gambler: { nerveBonus: 10, wageMult: 1.5 },
              alcoholic: { randomPenalty: 20 } },
    starting: [
      { name: 'Vitya', muscle: 48, brains: 30, nerve: 42, loyalty: 70 },
      { name: 'Dima',  muscle: 30, brains: 50, nerve: 38, loyalty: 70 },
    ],
  },

  ops: {
    fullMargin: 15, partialRewardPct: 0.6, partialSpikePct: 0.5, failSpikePct: 1.5,
    failLoyalty: -5, noise: 10,
    influenceDailyCap: 3,
    rewardActScaling: 2,         // reward × act^2
    list: {
      shakeDown:   { band: 'quick',    minutes: 15,  crew: 1, w: { muscle: .7, nerve: .3 }, diff: 35, spike: 2,  dirty: 15 },
      collectDebt: { band: 'quick',    minutes: 20,  crew: 1, w: { nerve: .6, brains: .4 }, diff: 40, spike: 1,  dirty: 20 },
      leanOnWard:  { band: 'standard', minutes: 120, crew: 2, w: { brains: .5, nerve: .5 }, diff: 45, spike: 3,  influence: 1 },
      pressure:    { band: 'standard', minutes: 60,  crew: 2, w: { muscle: .6, nerve: .4 }, diff: 45, spike: 4,  dirty: 10, districtPressure: true },
      moveShipment:{ band: 'standard', minutes: 180, crew: 2, w: { nerve: .5, brains: .5 }, diff: 50, spike: 2,  dirty: 30, act: 2 },
      dinner:      { band: 'long',     minutes: 360, crew: 2, w: { brains: .7, nerve: .3 }, diff: 55, spike: 1,  influence: 2 },
    },
  },

  districts: {
    pressureOpsToFlip: 3,
    list: {
      kioskRow:   { act: 1, startsAs: 'tolya',  buyout: 150, tribute: 0.15, mod: { yieldMult: { kiosk: 1.1, marketStall: 1.1 } } },
      portQuarter:{ act: 2, startsAs: 'zhanna', buyout: 300, tribute: 0.15, mod: {} },
      sovietsky:  { act: 2, startsAs: 'none',   buyout: 300, tribute: 0,    mod: { wageMult: 0.9 } },
    },
  },

  rivals: {
    tolya: {
      tickHours: 8, tickHoursEscalated: 6, escalateAtRackets: 3,
      pConditionHit: 0.4, conditionHit: 15,
      pTribute: 0.3, tributePctOfVault: 0.10, refuseConditionHit: 10,
      dispositionPerTribute: 10, hostileBelow: -30, hostileTickMult: 0.5,
    },
  },

  reputation: {
    perCleanSpent: 0.1, perOpSuccess: 5, perDistrict: 20,
    actThresholds: { 2: 80 },
  },

  tutorial: { enabled: true, firstConversionInstant: true },

  debug: { enabled: true },
}
```

**Validation on load:** `schema.ts` checks ranges (rates in (0,1], thresholds ascending, etc.) and refuses a preset that fails. A typo in a preset should be a loud error at launch, not a silent zero.

**Override layering:** `effective = deepMerge(defaults, preset, userOverrides)`. The debug config editor writes `userOverrides` only, so "reset to preset" is one tap.

---

## 9. Milestones

Effort assumes one senior engineer, focused. A partner on UI roughly halves M4–M5.

### M0 — Skeleton (1 day)
Repo, Expo app boots, engine package with `reconcile`/`apply`/`derive` stubs, config loads and validates, seeded RNG, save/load round-trip, Vitest running, ESLint boundary rule.
**Done when:** `npm test` passes a trivial test; app shows "Vault: 30" from a loaded save.

### M1 — Act I economy (2 days)
Rackets (Kiosk, Market Stall), vault accrual with live cap, `COLLECT`, Currency Kiosk with `DEPOSIT` and conversion, `BUY_RACKET`, `UPGRADE_RACKET`, cost formulas, Reputation from spend. Screens: Home, Rackets, Fronts. Debug time-skip buttons.
**Done when:** headless sim reaches a Market Stall in a plausible number of hours; property test `reconcile(s,t2) == reconcile(reconcile(s,t1),t2)` passes on 1,000 random splits.

### M2 — Heat (2 days)
Exposure, control, equilibrium, convergence, Ward Cop, bribe, district control term, inspections, raids with seeded rolls. Arrests wired but no-op until M3. Screens: Heat/Control.
**Done when:** sim shows heat rising past 40 when tiering without buying Ward Cop and staying ~27 when buying on schedule.

### M3 — Crew & ops (3 days)
Crew model, starting crew, recruit pool with 24 h refresh, wages with day-boundary settlement and missed-wage loyalty, loyalty drift, three traits, enforcer assignment, `START_OP`, resolution formula, all six ops, Influence daily cap, arrests. Screens: Crew, Ops.
**Done when:** sim dispatches ops every session; partial success is the modal outcome (assert ~40–60% partial over 500 resolutions at default stats).

### M4 — Act II (3 days)
All eight rackets with staggered Rep unlocks, Restaurant, districts with tribute/buy-out/pressure, Tolya's tick behaviour, Zhanna as static seizure modifier (no-op without supply chain — log only), Precinct Captain, official cooldown, Act II threshold with content unlock, crew slots 2 → 4. Screens: Districts, Officials.
**Done when:** sim clears Act I in 1–2 sim-days and Act II in 3–5 at `default` preset, engaged-casual persona. If not, this is where tuning begins — see dev manual.

### M5 — Tutorial, debug, logging (2 days)
Scripted tutorial path with instant first conversion. Full debug screen (§10). Event log to file, session stats, share-sheet export. Save import (paste JSON) so you can reproduce a tester's state.
**Done when:** a fresh install reaches the end of the tutorial in under 90 s of interaction; exporting the log produces a JSON you can load into the sim.

### M6 — Sim harness & builds (2 days)
`npm run sim` with persona, presets, seed, CSV output. Tuning pass against spec targets. EAS internal build for Android; TestFlight if you have the Apple account, otherwise Expo Go.
**Done when:** you can run `npm run sim -- --preset default --days 5` and read Act I/II clear times, raids, heat trace, clean/hr in a summary table.

**Buffer: 2 days.** Total ≈ 17 focused days. Call it 3–4 weeks part-time.

---

## 10. Debug tools

All behind `config.debug.enabled`. One screen, sections:

**Time.** Skip +15 m / +1 h / +6 h / +1 d / custom. Shows real time, game time, offset. "Reset offset."

**State.** Grant Dirty / Clean / Influence. Set heat. Set Rep. Force raid / arrest / Tolya tick. Complete all ops now. Refresh recruit pool.

**Config.** Grouped editor over the effective config: numeric fields with the preset value shown greyed beside the override. "Reset group" / "Reset all" / "Switch preset." Changes apply on next `apply` — no restart. Persisted as overrides.

**Inspect.** Live `Derived` readout: yield/hr, exposure, control, heat target, vault cap, wages/hr, per-racket breakdown. This is the screen you'll stare at while tuning.

**Log.** Filterable event list. Export save / export log / import save.

**Bot.** "Play as engaged casual for N days" — runs the sim persona against the live state on-device. Lets a partner see what an on-pace game looks like without playing it.

---

## 11. Headless simulator

`sim/persona.ts` implements the engaged-casual policy. Sessions at 08:00, 13:00, 18:00, 22:00 (configurable). Each session, in order:

1. `COLLECT`
2. Deposit into fronts up to buffer cap, keeping a reserve of `wages × 12 h + 1 bribe`
3. If heat > 55 and can afford: `BRIBE`
4. If an official is affordable and heat > 30: buy it
5. Dispatch every idle crew to the highest-value unlocked op they qualify for (value = expected reward × P(success) − spike cost)
6. Spend Clean: buy the racket or upgrade with the best `yield gain ÷ cost`, respecting a heat budget (skip if resulting heat target > 45 and no control purchase is affordable)
7. If a district is affordable and its tribute > its buy-out ÷ 48 h of income: buy it

`sim/run.ts` steps game time hour by hour, calling `reconcile`, and invokes the persona at session times. Outputs:

- Summary: Act I clear, Act II clear, raids, arrests, missed wages, mean heat, Clean/hr by day
- CSV: hourly `dirty, clean, vault, heat, exposure, control, yield, rep` — drop it into a sheet and plot

Run with `--seed` for reproducibility, `--sessions 3` to model a lighter player, `--persona lapsed` (skips days 2–3) once you add that policy.

This *is* the "economy spreadsheet" from spec §12, just executable. Every tuning change gets a sim run before a human sees it.

---

## 12. Playtest protocol

**Two passes, different questions.**

**Pass 1 — compressed (week 1 of testing).** `fast` preset: 1 game hour = 1 real minute, 4 days of content in ~100 minutes. Testers play in one or two sittings. Question: *is the loop legible and are the decisions interesting?* Time-skip visible so testers can jump waits.

**Pass 2 — real-time (week 2–3).** `default` preset, offset 0, debug hidden. 3–5 testers, 5 real days. Question: *does the cadence hold — do people come back, and does the vault leash feel right?*

**What the log captures** (per spec §13 "What to measure"):
- Session start/end, actions per session
- Dirty balance sitting unconverted at session end (throttle felt?)
- Time of first raid vs. time Precinct Captain bought (heat legible?)
- Op dispatch distribution per crew member (ops feel like choices?)
- Rep timeline → Act I / II clear times
- Last session timestamp → drop-off point

**After each pass:** testers export the log via share sheet, you load it into the sim's report tool for the same summary table the bot produces. Compare human vs. bot: where humans diverge from the policy is where the design is either more interesting or more confusing than the sim assumed.

**Exit criteria for "proceed":** testers voluntarily return on day 3+ of the real-time pass without prompting, and can explain the Dirty/Clean rule unprompted. If neither, the loop isn't fun enough to justify assets — and you'll know that for the cost of three weeks, not three months.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Reconcile bugs produce silent drift | The idempotence property test in M1; run it in CI on every commit |
| Config edits mid-playtest confound results | Config editor logs every change with timestamp to the event log |
| Testers hit a 72-min wait in the tutorial | Instant first conversion (spec §3.2) + time-skip is visible in Pass 1 |
| Act II load is too much at once | Rep-staggered unlocks are in config; widen the gaps if testers stall |
| "Fun" is unmeasurable | It isn't — the exit criteria above are behavioural, not survey-based |
| Engine gets coupled to UI under deadline pressure | ESLint boundary rule from M0; it's cheaper than the refactor |
