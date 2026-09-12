# 0009. Districts host one of each business they allow

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
The plan gives racket types and districts but no rule for where rackets go or how many fit. The first implementation gave each district free slots for any unlocked type. In the sim, the bot filled every slot in every district with Kiosks, the best yield per Clean. There's no way to sell or replace a racket, so Act II rackets never got a slot and growth stalled. After restricting types per district, it did the same one level up: three Auto Shops, the first Act II business to unlock, blocked the Café and Bathhouse. The manual's reference end state is `K5 K5 M5 M4 A4 C4 B3 P3 CB2`: two Kiosks, two Market Stalls and one of each Act II business.

## Decision
- Each district lists the businesses it `allows` and runs **at most one of each**. The old `slots` field is gone; `openSpots(state, config, id)` returns what's still buildable.

| District | Allows |
|---|---|
| Zarechye (home) | Kiosk, Market Stall |
| Kiosk Row (Tolya) | Kiosk, Market Stall |
| Sovietsky Blocks (nobody) | Auto Shop, Café, Bathhouse |
| Port Quarter (Zhanna) | Petrol Station, Cargo Bay |

- `BUY_RACKET` rejects a type the district doesn't allow ("That kind of business doesn't fit there") and a second one of the same type ("You already run a … there").

## Consequences
- Exactly nine racket spots, matching the reference portfolio. Every Rep unlock opens a new spot instead of a dead end.
- Half of Act I's rackets sit in Kiosk Row under Tolya's tribute, so buying or pressuring it is a real choice. The same goes for Zhanna and the big Port Quarter rackets.
- No selling or replacing is needed.
- Adding a racket type means adding it to some district's `allows`; otherwise it can never be built.

## Related
`engine/config/defaults.ts` (`districts.list.*.allows`), `engine/systems/districts.ts`, `engine/core/apply.ts` (`BUY_RACKET`), [systems/economy.md](../systems/economy.md), [TUNING.md](../../TUNING.md).
