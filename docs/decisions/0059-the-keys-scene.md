# 0059. Scene 16, "The keys", plays at the first repossession

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #14
- **Supersedes in part:** [0051](0051-rock-bottom.md): the repossession "shows the design's repossession panel" as a notice. It still does, but only from the second repossession on.

## Context
The design brief scripts the lender's repossession as Scene 16, *The keys*. [ADR 0051](0051-rock-bottom.md) built it as a pop-up with the design's panel. Scenes are story moments, played once and due from the save ([ADR 0049](0049-scenes.md)). A repossession, though, can happen more than once a game.

## Decision
- **The first repossession plays Scene 16.** It's due from the save like the other scenes: once `stats.loans.repossessed` is above zero, and until `keys` is in `story.seen`. So one that happens while the app is shut still plays on return, after the away summary. In the order, it comes after the last chapter and before the endings.
- **The beats:**
  - "One of your businesses, at closing time.";
  - "Two polite men with a clipboard.";
  - the repossession panel, cropped to the men, with "Two payments missed. We'll take the keys. The debt is closed.";
  - a new `keys` beat: the whole panel, and which business they took, read from the latest `LOAN_REPOSSESSED` in the save's log, then "It wasn't the worst thing you owned. They're not stupid."
- **Its pop-up gives way to it.** `buildNotices` skips a `LOAN_REPOSSESSED` while the scene is due.
- **Later repossessions are the pop-up,** as before.
- **Music and sound:** `tension` under it, and the `keys` sound on its last beat.
- **A save from before the scene existed** that has already been repossessed plays it once, as an old save did with the endings ([ADR 0053](0053-endings-and-credits.md)).

## Consequences
- **The lender's first visit is a story moment;** after that, it's bookkeeping.
- **The panel is drawn as the Card Club,** whatever was taken. The caption names the real business. If that event has fallen out of the log's ring buffer, it says "one of your businesses".

## Related
`app/scenes.ts` (`keys`, `MEN`), `app/components/Scene.tsx` (`KeysPanel`), `app/notices.ts`, `app/sound/cues.ts` (`SCENE_MUSIC`), `tests/scenes.test.ts`, [story.md](../story.md), [app.md](../app.md).
