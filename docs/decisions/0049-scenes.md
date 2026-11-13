# 0049. Scenes: the story played as manga, due from the save

- **Status:** Accepted
- **Date:** 2026-09-30
- **Supersedes in part:**
  - [0046](0046-map-and-story.md): the act page as a live notice;
  - [0038](0038-live-event-notices.md): `ACT_UNLOCKED` as a notice.

## Context
The design (ADR 0047) gives the story a manga register: a cover, full-screen scenes played panel by panel, and chapter pages. The design brief (Part 5) scripts eighteen scenes.

The act page had a gap. It was a live notice, raised by the `ACT_UNLOCKED` event while the app was open. If an act opened while the app was shut (the usual case for an idle game), the player got a line in the away summary and never saw the page.

## Decision
- **Scenes are data** in `app/scenes.ts`: a scene is a list of beats. The beat kinds:
  - a panel of art with a caption box or speech bubble, cropped if asked;
  - a portrait on paper;
  - an intro splash with the person's card;
  - hiring, and Tolya's demand, which wait for an answer;
  - a volume title;
  - a whole chapter page.

  The art is extracted from the design into `app/art/scenes.ts`.
- **What's due is worked out from the save, not from events.** A scene is due when:
  - its trigger has happened (a tutorial step, Tolya's demand at his step, an act open);
  - it isn't in `story.seen`;
  - it didn't pass before the seen-list began.

  A scene missed while the app was shut plays on return, after the away summary. That closes the act-page gap. Two acts opened while away play both chapters, in order.
- **The save keeps `story: { seen, since }`** (schema 14).
  - The engine stores the ids and never interprets them.
  - The passive action `SEE_SCENE { sceneId }` records one; the app sends it when a scene ends or is skipped.
  - `since` is where the save stood when its list began. New games start at the beginning. The v13→v14 migration copies a save's current act and opening step, so an old save doesn't replay its past.
- **One thing on screen at a time,** in this order: the away summary, then a scene, then live notices. The store latches a scene when it falls due and keeps it until it ends, so a scene whose trigger moves on inside it still finishes. Paying Tolya inside his scene advances the opening, and the scene still reaches its last line.
- **Chapters are scenes** (`chapter-2` … `chapter-6`), played as the chapter page. `ACT_UNLOCKED` is no longer a live notice.
- **The cover** shows when the app opens, with Continue (where you are) and New game (confirmed, because it overwrites). A save that hasn't started offers only Begin.
- **Replays** go through the same viewer: `store.playScene` (Debug's Preview now; dossiers later).
- **Built now:** the prologue (Scene 1), hiring the crew (Scene 2), Tolya's first visit (Scene 3), and the five chapters. The missions' scenes, rock bottom and the endings come with those systems.

## Consequences
- **A save change:** schema 14, and `SEE_SCENE` in the log. It's passive, so it doesn't count toward a session's actions. Replay applies it harmlessly.
- The bot never watches scenes. Nothing a scene does changes a rule; hiring and Tolya's answer go through the ordinary actions.
- **Scene 2 as drawn shows Vitya already hired.** The engine still asks for two of the three, so the scene shows three Hire buttons. Vitya staying for good is rock bottom's decision, not this one's.
- **Opening moments:** the cover adds a tap at every launch (continue, and the away summary follows). The prologue adds seven taps to a new game, and Skip is always there.

## Related
`app/scenes.ts`, `app/components/Scene.tsx`, `app/components/Cover.tsx`, `app/components/ChapterPage.tsx`, `app/art/scenes.ts`, `app/store.ts`, `App.tsx`, `engine/model/state.ts`, `engine/model/migrate.ts`, `engine/core/apply.ts`, [app.md](../app.md), [story.md](../story.md), [architecture.md](../architecture.md).
