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
| [0020](0020-sim-report-metrics.md) | How the sim report measures the dev manual's targets | Accepted |
| [0021](0021-environment-doctor-and-native-env.md) | Environment doctor, per-command toolchain wrapper, default app IDs | Accepted |

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
