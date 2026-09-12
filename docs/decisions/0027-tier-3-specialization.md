# 0027. The upgrade to tier 3 is a choice between greed and stealth

- **Status:** Accepted
- **Date:** 2026-09-13

## Context
Every tier upgrade was the same move: pay Clean, get more yield and more heat. The expansion note proposed a specialization at tier 3. Its stealth branch at ×0.7 exposure would make tier 3 cooler than tier 2 (0.7 × 1.35² < 1.35), which is a free lunch that breaks the rule that tiering always costs heat ([ADR 0011](0011-heat-target-formula.md), manual §5).

## Decision
- The upgrade to `rackets.specialization.atTier` (3) requires `specialization: 'greed' | 'stealth'` on `UPGRADE_RACKET`; every other upgrade rejects one. The choice is permanent and stored as `Racket.specialization`.
- `derive` multiplies the business's gross yield and exposure by the branch's `yieldMult` and `exposureMult` from that tier on: greed 1.25 / 1.6, stealth 1.0 / 0.8 as starting values.
- `validateConfig` enforces `greed.exposureMult ≥ greed.yieldMult` and `stealth.exposureMult ≥ 1 / tierHeatMult`, so exposure never falls with a tier.
- Businesses already past tier 3 when this shipped stay neutral. `RACKET_UPGRADED` carries the choice; `stats.specializations` counts them.
- The bot sees both branches as separate spend options; its heat-budget filter falls back to stealth when greed would push the heat target over budget.

## Consequences
- Each business gets one real choice between money and heat, sized by the player's control and officials.
- Greed is how a player with spare control converts it into income; stealth is how a player near the raid line keeps growing.
- Act III can add a second choice at tier 6 on the same field pattern.

## Related
`engine/core/apply.ts` (`UPGRADE_RACKET`), `engine/core/derive.ts` (`perRacket`), `engine/config/schema.ts`, `sim/persona.ts` (`spendOptions`), `app/screens/RacketsScreen.tsx`, [systems/economy.md](../systems/economy.md#tier-3-specialization).
