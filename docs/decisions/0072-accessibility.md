# 0072. Accessibility: amounts in words, a role on everything tappable, text that grows with the phone

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #45

## Context
The game review counted about 78 accessibility labels over about 150 tappable things, and no handling of the phone's text size. Resource amounts are written with glyphs ("−◆20", "★53") and drawn as small SVGs, so a screen reader said "minus 20" with no resource. Both stores ask about accessibility, and the brief's rules say colour is never the only signal.

## Decision
- **One function for amounts:** `spoken(text)` (`app/a11y.ts`) says glyph amounts in words: signs, "an hour", thousands and millions. It's applied where text is built: the UI kit's `Btn`, `Item`, `Row`, `Tile` and `AlertRow`, and every one-line `<Text>{rich(…)}</Text>` in the screens. Doing it where the text is built, rather than call by call, keeps new screens covered.
- **A role on everything tappable,** and a label where the text isn't enough:
  - the header's cells (the full figure, not "1.21M");
  - the bottom bar (tabs, with the selected one marked and "wants attention" when a dot is up);
  - More's rows, and the scrims ("Close").
  - A static test fails on any `Pressable` without `accessibilityRole`, so it stays that way.
- **Text follows the phone's text size.** It's capped (`maxFontSizeMultiplier`) only where the room is fixed: the header, the bottom bar and tags at 1.2, and small buttons and the header's detail line at 1.4. Everything else grows without a cap, and rows wrap.
- **Tap targets** are at least 44 pt, as buttons already were.
- **Colour is never the only signal:** heat, a full vault, goals and alerts each say it in words too.

## Consequences
- With VoiceOver or TalkBack, every button and row can be reached and says what it is, with amounts in words.
- **Still to check on a phone:** every screen at the largest text size. Web doesn't scale text, so this couldn't be checked in the screenshot rig. It goes on the phone test (#17).
- The scene panels' art has its own descriptions already (`app/art/scenes.ts`).

## Related
`app/a11y.ts`, `app/components/ui.tsx`, `app/components/Header.tsx`, `App.tsx`, `app/components/Modal.tsx`, the screens' `rich` texts, `tests/a11y.test.ts`, [app.md](../app.md#accessibility).
