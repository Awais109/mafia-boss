# 0061. Motion: four moves, and none with reduced motion

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #18
- **Deviates from:** the plan's non-goals (§1, "animation"), as ADRs 0047 and 0055 did for art and sound.

## Context
The design brief (Part 2, "Motion, sound, accessibility") asks for restraint: a page turn for chapter pages, ink spreading when a district is revealed, a stamp for mission results, and counters that tick up. The sound pass ([ADR 0055](0055-sound.md)) gave each of these a sound, but nothing moved.

## Decision
- **Four moves,** in `app/motion.tsx`, with React Native's `Animated` and no new dependency:
  - `PageTurn`: a chapter page swings in from its left edge, over the app's dark ground.
  - `InkIn`: on the chapter page that reveals a district, its mini-map fades from the pencil drawing (`MapDrawing` with `pencil`) to the inked one. That page is the moment a district is revealed, so no record of what's been seen is needed.
  - `Stamped`: a mission's FAILED or WON stamp lands from above, fast, with no bounce.
  - `useTicker`: the header's Dirty, Clean and Influence count to a new figure after a jump of more than 1%. The second-by-second accrual just follows, so the header isn't always moving.
- **Transforms and opacity use the native driver.** The counter is a short `requestAnimationFrame` tween of the figure shown. SVG geometry is never animated, so it's cheap on a phone.
- **Reduced motion** (`AccessibilityInfo`) skips all of them.
- **Durations live in `MOTION`.** They're presentation, like the sound mix and the palette, not game numbers.

## Consequences
- **Nothing changes in the engine or the save.**
- **The brief's "ink spreading" is a cross-fade,** not a drawn stroke. Animating SVG path geometry would run on the JS thread on every frame.
- **A district revealed outside a chapter page** (Act I's, shown by the opening) has no ink moment, as before.
- **A static screenshot shows only where each move ends.** The moves themselves need a phone (#17).

## Related
`app/motion.tsx`, `app/components/ChapterPage.tsx`, `app/components/CityMap.tsx` (`pencil`), `app/components/Scene.tsx` (`ResultPanel`), `app/components/Header.tsx`, [app.md](../app.md#motion).
