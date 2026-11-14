# 0055. Sound: cues from events, music by screen, files listed by a script

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deviates from:** the plan's non-goals (§1, "art, sound, animation, polish"), as [ADR 0047](0047-warm-ledger-design.md) did for art.

## Context
The game had no sound. The owner is sourcing sound effects and music: a first pass of 18 sounds and 5 tracks, more later. The design brief (Part 2, "Motion, sound, accessibility") asks for restraint: a page turn, ink, a stamp, counters. Two things shaped the build:
- The files will arrive a few at a time. The game must work, and stay testable, with any subset of them, including none.
- An idle game is opened many times a day, often in public, and over other audio. Sound must never be loud or overlapping, and must respect the phone's silent switch.

## Decision
- **The rules are data, in one pure file** (`app/sound/cues.ts`): the names, a volume and priority per sound, fallbacks, which event makes which sound (`eventCue`), and which music plays where (`musicFor`). Vitest covers it.
- **A sound is a file name.** `assets/sounds/sfx/<name>.mp3` and `music/<name>.mp3`, listed in a generated manifest (`app/sound/files.ts`). Metro needs a static `require` per file, so the manifest lists only the files that exist. A missing sound plays its fallback, or nothing. No placeholder files.
- **`npm run sounds`** (`scripts/sounds.ts`, with ffmpeg) turns raw files named after a sound into the right format and loudness, and rewrites the manifest. A test fails if the manifest and the folders disagree.
- **Sounds come from the store, not the screens:**
  - a dispatch plays one sound for its events (or `refuse`, or `skip`);
  - a live tick plays one sound for its events;
  - a catch-up long enough for the away summary plays nothing until the summary's `away`.

  One sound per batch, the highest priority. Within 150 ms of a sound, a lower one is dropped. A press's tap waits 40 ms, and gives way to whatever the press caused.
- **Music follows the screen:** the cover, the scene (by `SCENE_MUSIC`), or the game (Acts I–III, then IV on). Tracks fade between each other, and stings play once over the loop.
- **Audio mode:** follows the silent switch, mixes with other apps' audio, and is quiet in the background. The `expo-audio` plugin is set to no background playback and no microphone, so no permission or background service is added.
- **Settings** (a new screen under More): Sound effects and Music, each On or Off, default on. They're kept in the settings file, not the save, and they aren't config: no log line, no `CONFIG_CHANGED`.
- **Volumes and timings live in `cues.ts`, not `engine/config/defaults.ts`.** They're presentation, like the palette in `app/theme.ts`, and they never change a rule.

## Consequences
- **Two new direct dependencies:**
  - `expo-audio`, a native module. Expo Go has it; a standalone install has to be rebuilt.
  - `expo-asset`, pinned to the SDK's version. Without it, `expo-audio`'s open peer dependency installs a newer major that breaks the bundle.
- **The settings file gains `audio`.** Old files read with the defaults. The save is unchanged.
- **Mixing with other audio means music can play over a podcast.** The Music switch is the answer; ducking isn't built.
- **The away summary is one sound, not dozens,** and a skip ahead sounds like a skip.
- **The sound pass and the motion pass are separate.** The brief's page turn, ink and counters are sounds now; their animation isn't built.

## Related
`app/sound/cues.ts`, `app/sound/player.ts`, `app/sound/files.ts`, `scripts/sounds.ts`, `assets/sounds/`, `app/store.ts`, `App.tsx`, `app/components/ui.tsx`, `app/components/Scene.tsx`, `app/components/AwayModal.tsx`, `app/components/EventNoticeModal.tsx`, `app/screens/SettingsScreen.tsx`, `app/screens/DebugScreen.tsx`, `app.json`, [sound.md](../sound.md), [app.md](../app.md), [native-builds.md](../native-builds.md).
