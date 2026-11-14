# 0062. The Empire by night: the dawn art recoloured

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #15 (still open for drawn art)
- **Supersedes in part:** [0053](0053-endings-and-credits.md): "the same art under a wash of ink".

## Context
The design draws the Holding at dawn but no night. The Empire's ending page, its credits strip and the cover after it used the dawn panels under a dark wash. That reads as a dim photo of dawn, not night: the sun is still there, the river still gold, the windows still blank. Drawn night art (#15) needs an artist.

## Decision
- **Night is made from the dawn panels by their palette** (`byNight` in `app/art/night.ts`). The design's art uses four colours (paper, ink, a warm sun, a highlight), so the drawing stays the same and only the colours change:
  - the sky and the ground go to night blue, and the ink goes a cooler black;
  - the sun becomes the moon, and the water it lit turns silver;
  - windows are lit warm: a group drawn in paper, or a paper path made of three or more small boxes;
  - forty stars go in behind the skyline, the same every time (`makeRng`, seeded by the panel).
- **It applies to all three panels:** the ending page (`holdingDawn`), the credits strip (`creditsStrip`), and the cover after the story (`coverHolding`). Each is made once and cached. The wash is gone.

## Consequences
- **The Empire looks like night.** It's still the Holding's composition, so the two endings share a view, as the brief says.
- **It's a stand-in.** If an artist draws Nagornaya at night, its panel replaces `byNight` for those three, and #15 closes.
- **The window rule is a heuristic over the design's SVG.** On the cover it also lights the bridge's arches, which read as lamps. New art in the same palette would recolour the same way, but should be checked by eye.

## Related
`app/art/night.ts`, `app/components/EndingPage.tsx` (`CityArt`), `app/components/Cover.tsx`, `tests/night.test.ts`, [app.md](../app.md).
