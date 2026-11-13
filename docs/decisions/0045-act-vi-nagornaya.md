# 0045. Act VI, Nagornaya: Legalize, the Holding, the reckoning and two endings

- **Status:** Accepted
- **Date:** 2026-09-29

## Context
The six-act proposal ends the game by inverting its one rule: a business can be made legal, and then its money needs no laundering. The final pressure is the past, a case file built from lifetime stats that brings hearings. Two endings come from the same systems and are recorded, not enforced: the Holding (everything legal) and the Empire (everything held). The story bible's last page is Nagornaya, the hills, a district nobody shows you and nobody sells: you drive up yourself.

## Decision
- **Nagornaya** has no spots and one lot, for the Holding (`lotsFor`), and is yours when Act VI opens (`grantedOnOpen`). Config validation now allows a district with no spots when it has lots.
- **Legalize** (`LEGALIZE`), from Act VI, needs opinion at `minOpinion`. It costs `hoursOfYield` of the business's tier yield in Clean, and earns Rep like any purchase. A legal business puts nothing into the vault and earns `cleanShare` of its gross yield as Clean, accrued continuously (the rest is tax). It has no exposure and pays no tribute. Its gross still counts toward the Ministry's attention: Moscow watches what you own, legal or not.
- **The Holding** (premises, one per city, only on Nagornaya's lot): legal businesses × `1 + legalBonusPerTier × tier`.
- **The reckoning.** The case file is `raids × perRaid + arrests × perArrest + frozen fronts × perFreeze + missed loan payments × perMissedPayment`, capped. At each day start a hearing is filed with chance `base + perIllegalShare × the illegal share of gross yield`, on `rng.derive('hearing', day)`, one at a time. A hearing waits 23 hours (`incidents.types.hearing.hours`), not the usual 8: it's filed at midnight, and Act VI's players visit once a day. Its options: let it run (the default: the busiest front freezes for a day, the Ministry's `freezeBusiestFront`), settle in Clean (hours of gross yield), or fight (a Brains contest whose difficulty rises with the case file; a win counts toward the Empire). The proposal had hearings "at thresholds" of the case file. Tying the chance to the illegal share instead makes legalizing the way to quiet the courts, and the case file sets how hard a fight is.
- **The endings.** The Holding: every joint and racket legal. The Empire: every district yours, and `empireWins` hearings won in court. "Every district held at full control" became hearings won, because by Act VI the bot, and most players, already hold every district. A second path needs its own work, and beating the courts is the criminal's answer to legalizing. Each ending is recorded once (`stats.endings`). The first clears Act VI, the last act (`finalAct` 6), and the game carries on.
- **Heat** in the sim report is scored over the acts before Act VI: legal businesses draw none by design.

## Consequences
- At `hoursOfYield` 48, the proposal's two days, the bot legalized everything in 2–4 days. At 170 it reaches an ending in 10–15 days (mean 13.1, 10/10 in 10–18). A legal Fuel Depot then costs a day or two of late-game Clean, which makes each one a choice (TUNING.md, M12).
- The bot fights most hearings and wins a little over half against difficulty 70. It usually reaches the Holding first; in one seed of ten the Empire came first, at six wins.
- Legal Clean dwarfs laundering at the end, so Dirty idle and front utilization, already off target, mean little in Act VI.
- Save schema v13: `Racket.legal`, the endings, hearing and legal counters, and Nagornaya's row.

## Related
`engine/systems/legal.ts`, `engine/systems/politics.ts` (`freezeBusiestFront`), `engine/systems/inbox.ts`, `engine/systems/acts.ts` (`checkEndings`, `grantedOnOpen`), `engine/core/derive.ts`, `engine/core/reconcile.ts`, `app/components/ReckoningCard.tsx`, `app/screens/RacketsScreen.tsx`, `sim/persona.ts`, `sim/report.ts`, [endgame.md](../systems/endgame.md), [ADR 0044](0044-act-v-kombinat.md), [ADR 0040](0040-six-acts.md).
