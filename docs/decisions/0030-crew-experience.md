# 0030. Crew grow with work: XP, ceilings, ranks, perks and training

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
Crew stats never changed after hiring: jobs moved only loyalty, and `stats.opsByCrew` affected nothing. The owner asked for Muscle, Brains and Nerve to grow with experience. The expansion plan's item (q) wants who goes on a job to also be who you're growing, a raw recruit with a high ceiling to compete with a ready-made one, and training to compete with earning. Wages already scale with stats, which makes a veteran's cost the natural brake.

## Decision
- **XP per stat.** A finished job pays `xpByBand[band] × outcomeMult[outcome]`, split across stats by the job's weights. A member outranked by a teammate earns `mentorBonus` more; a teammate with the Mentor perk adds its bonus. XP for the whole team is computed before anyone levels. Enforcers accrue `enforcerXpPerHr` Muscle continuously.
- **Stat points.** A stat rises by one when its XP reaches `pointCost.base + pointCost.perAbove30 × max(0, stat − 30)`; leftover XP carries. Nothing rises above `potential`, and XP banked at the ceiling is discarded. Starting crew have fixed ceilings in config, recruits roll `stat + U(potentialRoll)`, and migrated saves get `stat + 10`.
- **When points land.** Job and training XP is spent the moment it's granted. Enforcer XP is spent at whole hours, so reconcile splits agree.
- **Ranks.** Points gained set the rank: Associate, Soldier, Made, Capo. Reaching Soldier and Made files a `perk` inbox item: two perks the member doesn't hold, drawn on `rng.derive('perk', crewId, rank)`, the first as the no-cost default.
- **Perks.** Earner (job Dirty), Ghost (job heat spike), Fixer (job time), Mentor (partners' XP), Bargainer (haggling, [ADR 0029](0029-tolya-negotiation.md)), Steady (no loyalty drift). A job perk applies when anyone on the team has it.
- **Training jobs.** Boxing Gym, Night School, Card Table: one member, `costDirty × act` up front, `xp` of one stat after 4 game hours. No roll, heat, reward, loyalty change or report; they don't count in `stats.opOutcomes` and are never offers.
- **The bot** adds expected stat points × `xpValue` to a job's value, trains idle crew when Dirty stays above its reserve, and picks perks by a fixed preference.

## Consequences
- Rising stats erode partial outcomes over a week. With the M2 defaults, the bot's partial share fell from 0.55 on days 1–2 to 0.47 on days 7–8 (10 seeds), above the plan's 0.40 floor. The knobs if it drops further are `pointCost.perAbove30`, recruits' ceilings, and offer difficulty.
- The bot's crew gain about 1.1 stat points per member per day.
- Better crew win harder offers more often, which pushed the offers' share of job Dirty to 0.25; offer rewards were trimmed ([TUNING.md](../../TUNING.md), M2).
- Training is a Dirty sink with a purpose, and recruit ceilings make hiring a comparison.

## Related
`engine/systems/experience.ts`, `engine/systems/ops.ts` (`resolveOp`, `opDirtyRewardFor`, `opMinutesFor`), `engine/systems/crew.ts` (`generateCandidates`, `crewDayBoundary`), `engine/systems/inbox.ts` (perk effects), `engine/core/reconcile.ts`, `engine/model/migrate.ts` (`v2to3`), `sim/persona.ts`, `app/screens/CrewScreen.tsx`, `app/screens/OpsScreen.tsx`, [systems/crew.md](../systems/crew.md#experience).
