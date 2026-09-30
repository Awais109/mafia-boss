# 0048. The notebook map drawn from the design, and People

- **Status:** Accepted
- **Date:** 2026-09-30
- **Supersedes in part:** [0046](0046-map-and-story.md): the plain-View drawing, and marks coloured by kind. Its reveal rules, the act page and the story as data all stand.

## Context
[ADR 0047](0047-warm-ledger-design.md) brought in the design from Claude Design. Its Map frames draw the city as a page of Lyosha's notebook: pencil for what you don't know, ink for what you do, red pencil for what's yours. The frames show three states: the start, Act III, and the complete city. The design also adds People, a gallery of everyone met, with a dossier per person.

ADR 0046 drew the map with positioned Views and coloured squares. That was enough to prove the reveal rules, but it can't carry a drawing.

## Decision
- **The drawing is the design's own,** in SVG (`react-native-svg`) on a 390 × 440 box, in `CityMap.tsx`.
  - **Features:** the river, the bridge, the railway and the tram line are shared; each district has its sketch (`SKETCH`).
  - **Pencil:** an unrevealed district is faint pencil (the dashed outline where the design has one) with Lyosha's fragment.
  - **Ink:** a revealed district is inked with its name and who holds it.
  - **Shared features** ink in once you know anything beyond home.
- **Your businesses are red-pencil marks by shape:** ● joint, × racket, ■ premises, ○ legal.
  - **Deviation from the design:** it also marks fronts with ◇. Fronts have no district in the game, so there's nowhere true to put one; the legend leaves them out.
- **The picked district** is ringed in red pencil. Its card below the map follows the design: who holds it, the district summary shared with Business (`DistrictSummary.tsx`), what taking it gives, Buy out and Pressure, and the line that revealed it on a strip of paper.
- **The newest page's reveal line** is written on the map, in a slot north of the river (Zastava, the Kombinat, the Centre, Nagornaya) or south by the tram (the rest). The reveal order follows `REVEAL_ORDER`.
- **People** is the Map's second view.
  - **The cast is data** in `app/people.ts`, taken from the design brief's cast: epithet, line, a few sentences, role, what they hold (read live), mood for the rivals, and when you met them.
  - **When you meet someone:** the crew in the opening's hire step, Tolya with his boys, each act's boss when the act opens, officials once on the payroll, the lender's men at a first missed payment. Lyosha is known from the start.
  - **The page:** a card per person met, and a silhouette with Lyosha's fragment for everyone else.
  - **A dossier** shows the design's panel where it drew one (Zhanna); otherwise the portrait, large. Then who they are, their role, what they hold and their mood.
- **The art is extracted as drawn** into `app/art/people.ts` and `app/art/heads.ts`. Where there's text in it, the font is renamed to the family the app loads.
- **On web only**, `?view=people&person=<id>` opens People or a dossier, beside `?tab=` (`app/webParams.ts`), for the screenshot rig.

## Consequences
- The drawing is fixed to the nine districts, as before. A new district needs a `SKETCH` entry, and the compiler checks the table is complete.
- **Positions are hand-set:** labels, marks, rings and note slots. Many businesses in one district run marks to the right. Long reveal lines take up to five lines in their slot and can cross the tram line.
- The dossier's arc (missions) and scenes wait for the story engine and missions (D5, D6).
- Nothing in the engine, config or save changes.

## Related
`app/components/CityMap.tsx`, `app/components/People.tsx`, `app/components/DistrictSummary.tsx`, `app/components/ZhannaCard.tsx`, `app/people.ts`, `app/art/people.ts`, `app/screens/TurfScreen.tsx`, `app/webParams.ts`, [app.md](../app.md), [story.md](../story.md).
