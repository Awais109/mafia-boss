# 0046. The map is Lyosha's notebook, and the story reveals it

- **Status:** Accepted
- **Date:** 2026-09-29

## Context
The owner asked for a map UI on which every act reveals a new district, and for a story around the game. The story bible (approved alongside the economy note) sets the canon: a notebook map, districts revealed when a person from that place enters the story, one district per act except Act II's two, a turn line that opens each act, and a voice for the game's text. The Turf tab listed every district as a card, including ones not yet open, and act transitions were one line of text.

## Decision
- **The Turf tab becomes the Map** (the tab id stays `turf`). A schematic drawing of the city, from the story bible's map, drawn with plain positioned Views rather than a new native drawing library: the river, the bridge, the railway, and each district as a box. Tapping a district shows its card below the map (who holds it, what it hosts, tribute, perks, the buy-out or auction), then the line that revealed it and who showed it. The rivals' and politics cards follow as before.
- **Reveals are story events, not numbers** (`revealed` in `app/story.ts`): Zarechye from the start; Kiosk Row when Tolya's boys first call (the opening's Tolya step, or his first visit); Station Square when the opening ends; every later district when its act opens. The engine is unchanged: Station Square is open from the first minute, as before; the map just doesn't name it until the opening ends. An unrevealed district is a dashed outline with a fragment of Lyosha's note, and tapping it says you don't know it yet.
- **Your businesses are marks** in their district, coloured by kind (joint, racket, premises, legal), so the map doubles as the empire overview.
- **The act transition is a page:** the live notice for `ACT_UNLOCKED` shows the act's title, the turn line that opened it, each district it inks in with its reveal line, and what the act opens. The map's title is "Lyosha's notebook" until every page is revealed, then "Sevgorod".
- **The story lives in `app/story.ts`**, as data (`ACT_TITLE`, `ACT_TURN`, `DISTRICT_STORY`, `LAST_LINE`), with the canon in [docs/story.md](../story.md). Event lines take the story's voice where one is wanted (the act turns, the endings, a missed payday, a walkout); business, front, district and official descriptions stay mechanical, as the bible asks.

## Consequences
- No engine, config or save change: the map reads state the engine already has, and the story is text.
- The drawing is fixed to the nine districts; a new district needs a box in `CityMap.tsx`'s `BOX` table and a `DISTRICT_STORY` entry (the compiler checks both are complete).
- The names in the story are placeholders for a pass by a native speaker, as the bible says.

## Related
`app/story.ts`, `app/components/CityMap.tsx`, `app/screens/TurfScreen.tsx`, `app/components/EventNoticeModal.tsx`, `app/eventText.ts`, [docs/story.md](../story.md), [app.md](../app.md).
