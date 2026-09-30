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
| [0008](0008-app-shell-and-ui.md) | Custom tab shell, no navigation library, one colour per resource | Superseded in part by [0047](0047-warm-ledger-design.md) |
| [0009](0009-districts-one-of-each-business.md) | Districts host one of each business they allow | Accepted |
| [0010](0010-starting-position.md) | Start with a Kiosk and a Market Stall, 60 Clean, Vitya and nephew Dima | Superseded by 0035 |
| [0011](0011-heat-target-formula.md) | Heat target = 100 × exposure ÷ (exposure + control) | Accepted |
| [0012](0012-op-resolution.md) | Jobs score the team's best stats plus a team bonus, with uniform noise | Accepted |
| [0013](0013-front-suspicion-smoothing.md) | Front suspicion reads smoothed utilization | Accepted |
| [0014](0014-sim-persona-policy.md) | The casual bot's policy, and where it deviates from the plan | Accepted |
| [0015](0015-act-ii-pacing.md) | Act II ends at 480 Rep with a compressed unlock ladder | Superseded by 0040: Act II leads to Act III |
| [0016](0016-vault-and-dirty.md) | The vault and Dirty are separate buckets | Accepted |
| [0017](0017-tolya-and-zhanna.md) | Tolya's visits and disposition; Zhanna is tribute only | Accepted; Zhanna superseded by 0036 |
| [0018](0018-crew-rules.md) | Crew rules: wages, loyalty, walkouts, the nephew, traits, slots | Accepted |
| [0019](0019-reputation-sources.md) | Rep comes from all Clean spending, jobs and districts | Accepted |
| [0020](0020-sim-report-metrics.md) | How the sim report measures the dev manual's targets | Accepted; act clear rows superseded by 0022; vault fill amended by 0037 |
| [0021](0021-environment-doctor-and-native-env.md) | Environment doctor, per-command toolchain wrapper, default app IDs | Accepted |
| [0022](0022-end-of-prototype-state.md) | The end of the prototype is a cleared Act II, said in words; reports measure from game start | Accepted; the end state is now the last built act cleared (0040) |
| [0023](0023-away-summary.md) | "While you were away" is built in the app from the catch-up reconcile | Accepted |
| [0024](0024-inbox.md) | Pending decisions: crew reports and incidents with baked options and a default | Accepted; the default-option rule amended by 0032 |
| [0025](0025-opportunities-board.md) | An opportunities board of generated, expiring job variants | Accepted |
| [0026](0026-ledger-and-money-flow.md) | The daily ledger is stat snapshots; the Money flow card reads derive | Accepted |
| [0027](0027-tier-3-specialization.md) | The upgrade to tier 3 is a choice between greed and stealth | Accepted |
| [0028](0028-front-modes-and-capacity.md) | Fronts have a push / lay low dial and a capacity upgrade track | Accepted |
| [0029](0029-tolya-negotiation.md) | Tolya's demands can be paid, haggled once, or refused | Accepted |
| [0030](0030-crew-experience.md) | Crew grow with work: XP, ceilings, ranks, perks and training | Accepted |
| [0031](0031-business-kinds.md) | Joints, rackets and premises: four questions, spots and lots, upkeep | Accepted |
| [0032](0032-supply-chain.md) | One city-wide cigarette stock: factories make, joints sell, warehouses keep | Accepted |
| [0033](0033-bigger-act-i.md) | A bigger Act I: four new businesses, Station Square, a third crew slot | Accepted |
| [0034](0034-gold-bars.md) | Gold bars buy time and nothing else: skip ahead, finish now | Accepted |
| [0035](0035-guided-opening.md) | A guided opening: buy the starting setup yourself, then Act I goals | Accepted; the `actII` goal and "goals are optional" superseded by 0039 |
| [0036](0036-zhanna-and-the-port.md) | Zhanna sells lots of cigarettes, buys the surplus, and makes smuggling past her Port harder | Accepted |
| [0037](0037-act-ii-premises.md) | Act II premises: the Stash House and the Union Office, and their synergies | Accepted |
| [0038](0038-live-event-notices.md) | Live event and unlock notices, queued one at a time; a `description` field on every business/front/district/official | Superseded in part by [0049](0049-scenes.md) (the act opening) |
| [0039](0039-goals-gate-act-two.md) | Act II is gated by Act I goals, not Reputation; three goals redefined, `actII` removed | Accepted |
| [0040](0040-six-acts.md) | Six acts, each opened by a gate; the last built act is cleared, not left | Accepted |
| [0041](0041-act-iii-the-centre.md) | Act III, the Centre: prosperity, the Card Club, Print Shop, hotels, the Bank, City Hall, tier 6 | Accepted |
| [0042](0042-act-iii-credit-and-consequences.md) | Act III's consequences: contests in the inbox, injuries and the Clinic, Tolya's attacks, loans and the loan desk | Accepted |
| [0043](0043-act-iv-zastava.md) | Act IV, Zastava: premium cigarettes as a second stock, convoys past the Colonel and customs, passage, the importer that washes only what its trade explains | Accepted |
| [0044](0044-act-v-kombinat.md) | Act V, the Kombinat: an auctioned district, public opinion, the Ministry that freezes a front, elections and the mayor | Accepted |
| [0045](0045-act-vi-nagornaya.md) | Act VI, Nagornaya: Legalize, the Holding, the reckoning's hearings, and two recorded endings | Accepted |
| [0046](0046-map-and-story.md) | The map is Lyosha's notebook: districts revealed by the story, the act transition as a page, the story's text in one place | Superseded in part by [0048](0048-notebook-map-and-people.md) and [0049](0049-scenes.md) |
| [0047](0047-warm-ledger-design.md) | The warm-ledger design: bundled fonts, SVG glyphs, a bottom bar with More | Accepted |
| [0048](0048-notebook-map-and-people.md) | The notebook map drawn from the design, and People | Accepted |
| [0049](0049-scenes.md) | Scenes: the story played as manga, due from the save; chapters, the cover, a seen-list in the save | Accepted |

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
