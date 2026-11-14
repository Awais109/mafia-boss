# 0056. Generated stand-in sounds, until found ones replace them

- **Status:** Accepted
- **Date:** 2026-11-14
- **Supersedes in part:** [0055](0055-sound.md): "No placeholder files". The game now ships a generated file for every sound until a found one replaces it.

## Context
ADR 0055 left the sound files to arrive one by one, and the game silent until they did. Finding 36 sounds and tracks takes time, and some of them (a 1993 rotary phone, a banknote counter, a theme) are hard to find well or need a composer. Meanwhile the sound system can't be judged on a phone, and testers hear nothing.

## Decision
- **`npm run gen-sounds`** (`scripts/gen-sounds/`) makes every sound and track from scratch in TypeScript, with no dependencies:
  - the effects from struck modes, filtered noise and a small room (`sfx.ts`);
  - the music from a felt piano, a bayan, a string pad, a plucked bass, brushes and a clock, written out note by note around one D minor motif (`music.ts`);
  - the shared kit in `dsp.ts`: filters, a reverb, and loops folded so they're seamless.

  Each file is seeded by its name, so a run is repeatable.
- **They're stand-ins.** The generator writes to `assets/sounds/generated/` (ignored by git), and `npm run sounds` prepares them like any other source, with two limits:
  - only where `raw/` has no file of that name;
  - only over an mp3 that was itself generated. The mp3's comment tag (`sevgorod-generated`) says so.

  A sound you add always wins and is never overwritten. The script lists the stand-ins left to replace.
- **The prepared stand-ins are committed,** like any sound: all 36 files, about 6 MB.

## Consequences
- **The game has a full, consistent set of sounds today,** and testers hear the system working.
- **The stand-ins are synthesized foley and music, not recordings.** They'll sound like that, and are meant to be replaced, the theme first.
- **The app is about 6 MB bigger.** Five of the six are music, at 160 kbps.
- **Changing a recipe is a code change** in `scripts/gen-sounds/`. Run `npm run gen-sounds` and commit the mp3s that change. Mp3s you've replaced are left alone.

## Related
`scripts/gen-sounds/dsp.ts`, `scripts/gen-sounds/sfx.ts`, `scripts/gen-sounds/music.ts`, `scripts/gen-sounds/index.ts`, `scripts/sounds.ts`, `assets/sounds/`, [sound.md](../sound.md).
