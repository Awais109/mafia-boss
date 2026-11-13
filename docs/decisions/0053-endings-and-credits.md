# 0053. The endings as scenes, the credits, and the cover after the story

- **Status:** Accepted
- **Date:** 2026-09-30

## Context
An ending was a notice and a line in the log ([ADR 0045](0045-act-vi-nagornaya.md)), and the cover stayed the prologue's table for good. The design has four surfaces for the end of the story:
- the ending page (Ending · the Holding): the city from the hills, the rule's last line, Vitya's "Where to?", the ending's name, Back to the city;
- the credits: the cast with their epithets, your numbers, "The story is complete. The game carries on.", Keep going;
- Scenes 17 and 18 in the brief;
- the cover after an ending (Cover · after the Holding): the city at dawn, the ending and its day, and the empire value.

The design draws only the Holding. The brief puts the Empire at night, with the notebook map as its insert.

## Decision
- **Two scenes, due from the save** like every other ([ADR 0049](0049-scenes.md)). `holding` (17) plays once `stats.endings.holding` is set, and `empire` (18) once `stats.endings.empire` is. They come after Chapter 6 in the order, and each plays once.
  - **The Holding:** two slugs (Nagornaya at dawn; the tax receipts), the ending page, the credits.
  - **The Empire:** a slug (Nagornaya at night), the notebook map as it stands on squared paper (a new `map` beat), the ending page, the credits.
- **The ending page and the credits are full pages,** like the chapter (`EndingPage`, `CreditsPage`; beats `ending` and `credits`). Back to the city turns to the credits, and Keep going ends the scene.
- **The credits' numbers:**
  - the day the ending was reached;
  - Rep;
  - businesses legal of all that earn;
  - districts held, naming any that aren't;
  - the empire value ([ADR 0052](0052-after-the-story.md)).
- **The Empire is the Holding's view by night:** the same art under a wash of ink. It's a stand-in until there's drawn night art.
- **The cover after the story** shows the city from the hills (by night for the Empire), SEVGOROD with the first ending and its day, the empire value, and Continue as "After the story · Day N".
- **The text** is in `app/story.ts`: `ENDING_LINE` (each ending's caption) and `LYOSHA_DATES` (his line in the credits).

## Consequences
- **An ending reached while the app was shut plays on return,** after the away summary. A save migrated from before scenes existed ([ADR 0049](0049-scenes.md)) that had already reached an ending plays it once too: it never had one.
- **Reaching both endings plays both,** each with its credits.
- **No engine or save change.**

## Related
`app/scenes.ts`, `app/components/EndingPage.tsx`, `app/components/Scene.tsx`, `app/components/Cover.tsx`, `app/story.ts`, `app/components/Glyph.tsx` (`arrowRight`), `tests/scenes.test.ts`, [story.md](../story.md#scenes), [app.md](../app.md).
