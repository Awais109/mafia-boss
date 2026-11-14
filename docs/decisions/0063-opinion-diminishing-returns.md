# 0063. Public opinion has diminishing returns

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #8
- **Amends:** [0044](0044-act-v-kombinat.md), where opinion's target added the media's bonuses without limit.

## Context
Opinion's target was its base plus every media business's per-tier bonus, clamped at 100. Two media businesses at tier 6 already passed 100. In the 60-day sim, opinion went from 40 to 95–100 within 8–12 days of Act V and stayed pinned there to the end. Opinion stopped being a choice, and the city's decisions ([ADR 0054](0054-the-city-story.md)) could no longer move it. Lowering the per-tier bonuses would only delay this, since tiers keep rising past the book after the story.

## Decision
- **The press becomes opinion through a curve:** `base + (100 − base) × (1 − e^(−press ÷ opinion.saturation))`. The press (`mediaBonus`) is what the media businesses and the Fund used to add straight to the target. The first points count almost fully, and each counts less as opinion nears 100, which it never reaches. The inspection and raid penalties still come off after the curve.
- **`opinion.saturation` = 70.**
- **Elections are rebalanced with it:** `elections.baseShare` 0.25 → 0.34. The elections were tuned for an opinion near 100. At saturation 70 without the change, Act V ran 16–19 days and some games never made mayor.
- **The bot values a media business** by its press × `mediaSlope`, the curve's slope now. **The Business screen** says "press +N … worth less as it nears 100" instead of "public opinion +N".

## Consequences
- **Opinion stays live** (10 seeds, 60 days). It climbs to about 64–68 in Act V and 73–77 in Act VI instead of pinning at 100. Legalize's 60 is still reached in Act VI, and a front page or a strike still moves the number.
- **Pacing:**
  - Act V: 13.08 → 11.73 days, with 8 of 10 in band (was 4);
  - Act VI: 11.94 → 12.99 days, 9 of 10 in band (was 8);
  - Acts I–IV unchanged.
- **Heat over Acts I–V stays in its band.** Lower opinion means slightly less control, and the pacing test passes.
- **A new config key** (`opinion.saturation`). No save change.

## Related
`engine/systems/politics.ts` (`mediaBonus`, `opinionFromMedia`, `mediaSlope`, `opinionTarget`), `engine/config/defaults.ts` (`opinion.saturation`, `elections.baseShare`), `sim/persona.ts`, `app/screens/RacketsScreen.tsx`, `tests/kombinat.test.ts`, [politics.md](../systems/politics.md), [TUNING.md](../../TUNING.md).
