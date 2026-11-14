# 0060. Scene 14, "The last hearing", plays at the first ending

- **Status:** Accepted
- **Date:** 2026-11-14
- **Issue:** #13

## Context
The design brief scripts Scene 14 · Rematch VI · *The last hearing*: the old merchant court, the prosecutor's file grown into a box, Dima's answer, and "Then there's nothing left to hear." In the brief, this rematch comes just before the endings. [ADR 0050](0050-boss-missions.md) made no mission of it, though: Act VI ends on the reckoning and the two endings ([ADR 0045](0045-act-vi-nagornaya.md)), so there's no rematch to win before them.

## Decision
- **The last hearing plays when the story's first ending is reached,** just before that ending's scene. It's due from the save like every scene: an `ARC` entry for Act VI that's happened once either ending is in `stats.endings`. In the order it comes after the keys and before the Holding and the Empire. It plays once, so reaching the other ending later plays only that ending's scene.
- **The beats:**
  - a slug, "The old merchant court. High windows, dust in the light.";
  - the prosecutor's face, "The prosecutor, with the file. It's a box now.";
  - a new `defence` beat: Dima's face, "in a suit that fits for once", with the answer for the road taken;
  - the prosecutor, "Then there's nothing left to hear.", and "The box closes."
- **Dima's answer** follows the first ending reached (`firstEndingOf`, `LAST_HEARING` in `app/story.ts`):
  - for the Holding, "Every rouble on this list has a receipt.";
  - for the Empire, "The witnesses are no longer available."
- **The brief's stare** between the prosecutor and Dima folds into the two prosecutor beats. There's no drawn art of them facing off, and no court panel, so the court is a slug and the faces are the cast's portraits.
- **Tension music.** The scene is listed in the prosecutor's and Dima's dossiers, to replay.

## Consequences
- **All eighteen of the brief's scenes are now in the game,** Scene 16 since [ADR 0059](0059-the-keys-scene.md).
- **A save that had already reached an ending plays the last hearing once,** before its ending, as old saves did with the endings themselves.
- **Drawn art for the court and the stare** would replace the slug and the portraits without changing the beats.

## Related
`app/scenes.ts` (`hearing`, `defence`), `app/components/Scene.tsx`, `app/story.ts` (`LAST_HEARING`, `firstEndingOf`), `app/components/People.tsx` (`PERSON_SCENES`), `app/sound/cues.ts` (`SCENE_MUSIC`), `tests/scenes.test.ts`, [story.md](../story.md).
