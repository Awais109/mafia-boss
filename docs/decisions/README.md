# Decisions

One record per design or technical decision: what was decided, why, and what it costs. Many fill gaps the [implementation plan](../sevgorod-implementation-plan.md) left open, or deviate from it; the original spec v1.1 wasn't available.

## Rules

- **Add a record** when you make a decision someone could reasonably have made differently, including any deviation from the plan or the dev manual.
- **Don't rewrite an accepted record's decision.** If it changes, write a new record, set the old one's status to `Superseded by NNNN`, and link both ways. Fixing a broken link or typo is fine.
- Pure number tuning goes in [TUNING.md](../../TUNING.md). A record is for the rule or the reasoning, not for every tweak.
- Numbers quoted in a record are as of its date. `engine/config/defaults.ts` is the source of truth.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](0001-expo-blank-typescript.md) | Expo blank TypeScript template, no router, plan's folder layout | Accepted |
| [0002](0002-pure-engine-reducer.md) | The engine is a pure reducer with injected time and RNG | Accepted |
| [0003](0003-split-invariant-reconcile.md) | Reconcile walks hour-bounded segments so any split gives the same result | Accepted |
| [0004](0004-game-time.md) | Durations in game hours; hours and days aligned to the epoch | Accepted |
| [0005](0005-seeded-rng-streams.md) | Seeded RNG streams derived from player id, tag and index | Accepted |
| [0006](0006-config-layering.md) | Config: defaults ← preset ← flat user overrides; unknown keys are errors | Accepted |
| [0007](0007-local-file-persistence.md) | Save, settings and a JSON-lines log on the local file system | Accepted |
| [0008](0008-app-shell-and-ui.md) | Custom tab shell, no navigation library, one colour per resource | Accepted |
| [0009](0009-districts-one-of-each-business.md) | Districts host one of each business they allow | Accepted |
| [0010](0010-starting-position.md) | Start with a Kiosk and a Market Stall, 60 Clean, Vitya and nephew Dima | Accepted |
| [0011](0011-heat-target-formula.md) | Heat target = 100 × exposure ÷ (exposure + control) | Accepted |
| [0012](0012-op-resolution.md) | Jobs score the team's best stats plus a team bonus, with uniform noise | Accepted |
| [0013](0013-front-suspicion-smoothing.md) | Front suspicion reads smoothed utilization | Accepted |
| [0014](0014-sim-persona-policy.md) | The casual bot's policy, and where it deviates from the plan | Accepted |
| [0015](0015-act-ii-pacing.md) | Act II ends at 480 Rep with a compressed unlock ladder | Accepted |
| [0016](0016-vault-and-dirty.md) | The vault and Dirty are separate buckets | Accepted |
| [0017](0017-tolya-and-zhanna.md) | Tolya's visits and disposition; Zhanna is tribute only | Accepted |
| [0018](0018-crew-rules.md) | Crew rules: wages, loyalty, walkouts, the nephew, traits, slots | Accepted |
| [0019](0019-reputation-sources.md) | Rep comes from all Clean spending, jobs and districts | Accepted |
| [0020](0020-sim-report-metrics.md) | How the sim report measures the dev manual's targets | Accepted; act clear rows superseded by 0022 |
| [0021](0021-environment-doctor-and-native-env.md) | Environment doctor, per-command toolchain wrapper, default app IDs | Accepted |
| [0022](0022-end-of-prototype-state.md) | The end of the prototype is a cleared Act II, said in words; reports measure from game start | Accepted |
| [0023](0023-away-summary.md) | "While you were away" is built in the app from the catch-up reconcile | Accepted |
| [0024](0024-inbox.md) | Pending decisions: crew reports and incidents with baked options and a default | Accepted |
| [0025](0025-opportunities-board.md) | An opportunities board of generated, expiring job variants | Accepted |
| [0026](0026-ledger-and-money-flow.md) | The daily ledger is stat snapshots; the Money flow card reads derive | Accepted |

## Template

```markdown
# NNNN. Title

- **Status:** Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD

## Context
What forced a choice. Link the plan, manual, TUNING.md or code.

## Decision
What was decided, precisely enough to implement.

## Consequences
What it costs, what it enables, what to watch.

## Related
Code paths and docs.
```
