# 0033. A bigger Act I: four new businesses, Station Square, a third crew slot

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
Act I had two business types in two districts: four spots, then nothing to buy but tiers. The owner asked for an Act I with a good number of businesses and manufacturing, everything upgradable.

## Decision
- **Four new Act I businesses:** Beer Tent (joint), Video Salon (racket), Taxi Rank (racket) and Slot Hall (joint), priced by the payback formula and unlocking along the Act I Rep ladder below the Act II threshold ([ADR 0015](0015-act-ii-pacing.md)'s principle). The Tobacco Factory (unlock 0) and the Warehouse are Act I premises ([ADR 0031](0031-business-kinds.md)).
- **Station Square,** a new Act I district: nobody's, no tribute, a 200 Clean buy-out or three pressure jobs, and a Taxi Rank and Slot Hall bonus once taken. Zarechye gains the Beer Tent and Kiosk Row the Video Salon. Act I goes from 4 spots to 10, plus 5 premises lots.
- **The start adds a Tobacco Factory** in Zarechye beside the Kiosk and the Market Stall, so the chain runs from the first minute. This deviates from [ADR 0010](0010-starting-position.md); the guided opening in M5 replaces the whole starting position.
- `crew.slotsByAct[1]` 2 → 3. The bot hires past two only while wages stay under a quarter of yield.
- **Tolya's escalation** counts joints and rackets, not premises, and `escalateAtRackets` 3 → 5, so a bigger Act I doesn't bring his faster visits on the first day.
- **The Precinct Captain's control** 140 → 240. Act I's extra businesses keep tiering in Act II, and without more control heat averaged 38.

## Consequences
- 10 seeds over 8 days: Act I clears in 1.67 d, Act II 3.11 d after it, heat averages 33.5, partial outcomes 0.51, with no raids or missed wages. Front use rose to 0.55 and Dirty left idle to 0.64.
- Act II clears near the bottom of its 3–5 day band. M5's Rep shift moves the thresholds again; watch it there.
- Act I heat sits around 36 while the bot fills its heat budget with the extra spots.

## Related
`engine/config/defaults.ts` (`rackets.types`, `districts.list`, `crew.slotsByAct`, `rivals.tolya`, `officials.list`), `engine/systems/rivals.ts` (`tolyaIntervalHours`), `engine/model/migrate.ts` (`v3to4`), `sim/persona.ts`, [systems/economy.md](../systems/economy.md), [systems/districts-and-rivals.md](../systems/districts-and-rivals.md), [TUNING.md](../../TUNING.md).
