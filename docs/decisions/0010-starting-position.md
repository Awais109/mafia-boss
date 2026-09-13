# 0010. Start with a Kiosk and a Market Stall, 60 Clean, Vitya and nephew Dima

- **Status:** Superseded by [0035](0035-guided-opening.md) (after [0033](0033-bigger-act-i.md) added a starting Tobacco Factory)
- **Date:** 2026-09-12

## Context
The plan's config names `vault.startingDirty` (30), `vault.floorCap` (40) and an Act I vault target of 2.5 h, and requires an instant first conversion so the first session isn't a 72-minute wait. It doesn't say what else you start with. With a single Kiosk (6 Dirty/hr) the sim's front use was 23%, and the tutorial's first purchase wasn't affordable. The plan's action table refers to a "Nephew" who can't be fired, without saying who that is.

## Decision
- **Rackets:** a Kiosk and a Market Stall in Zarechye. That's 16 Dirty/hr, which fills the 40 floor cap in exactly the 2.5 h Act I target.
- **Money:** 30 Dirty in the vault, 60 Clean and 1 Influence. After the instant first conversion the tutorial's spend step is affordable.
- **Fronts:** the Currency Kiosk.
- **Crew:** Vitya (muscle) and Dima (brains), who is the nephew. The nephew can't be fired and never walks out.
- **Heat:** starts at `heat.startHeat`.

All of it is config (`rackets.starting`, `vault.starting*`, `crew.starting`) except the nephew rules.

## Consequences
- The tutorial's collect → launder → spend → job path completes in the first session.
- Home turf is full from the start, so the next rackets go into Kiosk Row and pay Tolya's tribute.
- With only two crew in Act I, a two-person job takes the whole crew.

## Related
`engine/newGame.ts`, `engine/config/defaults.ts`, `engine/core/apply.ts` (`FIRE`), `engine/systems/crew.ts` (walkouts), [systems/progression.md](../systems/progression.md#new-game).
