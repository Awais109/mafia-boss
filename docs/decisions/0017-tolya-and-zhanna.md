# 0017. Tolya's visits and disposition; Zhanna is tribute only

- **Status:** Accepted; "Zhanna is tribute only" superseded by [0036](0036-zhanna-and-the-port.md)
- **Date:** 2026-09-12

## Context
The plan gives Tolya's numbers: visit interval and escalation, chances of a condition hit and of a tribute demand, their sizes, disposition per tribute, and a hostile threshold that speeds up visits. It says Zhanna is "a static seizure modifier (no-op without supply chain — log only)". It doesn't say:
- when a demand counts as refused, or what the demand is a share of;
- which rackets Tolya targets;
- how disposition moves apart from tribute;
- whether he stops once you take his district.

## Decision
- **Visits** happen every `tickHours`, or `tickHoursEscalated` once you own `escalateAtRackets` rackets, multiplied by `hostileTickMult` while disposition is below `hostileBelow`. He visits all game.
- **Each visit:**
  1. An unpaid demand from the previous visit is refused: disposition drops, and a random racket loses `refuseConditionHit`.
  2. Then a roll: a condition hit on a random racket anywhere, a demand for `max(1, round(vaultCap × tributePctOfVault))` Dirty, or nothing.
- **Disposition** runs from −100 to 100 and starts at 0.
  - Paying a demand raises it by `dispositionPerTribute`; refusing lowers it by the same.
  - Three moves against his turf use new keys: `dispositionPerPressure` for each Pressure success on his district, `dispositionOnBuyout` for buying it out, and `dispositionOnFlip` for taking it by pressure (the harshest).
- **Zhanna** controls the Port Quarter. Her only effect is that district's tribute, plus a note in the log when Act II opens. Her seizure modifier and supply chain are not built.

## Consequences
- Taking Kiosk Row by force costs no Clean but angers Tolya more than buying it, so he visits more often. It's a real trade-off.
- Tolya never goes away: a steady repair-and-tribute chore. If playtests find him tedious, the manual's "Tolya is a chore" knobs apply.
- Anything that should react to Zhanna (for example raids in the Port Quarter) has nothing to hook into yet.

## Related
`engine/systems/rivals.ts`, `engine/systems/districts.ts`, `engine/config/defaults.ts` (`rivals.tolya.*`), [systems/districts-and-rivals.md](../systems/districts-and-rivals.md).
