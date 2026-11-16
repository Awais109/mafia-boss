# 0070. The icon and splash are the game's own mark, generated from the palette and wordmark font

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #43

## Context
`assets/icon.png`, the Android adaptive layers, the splash image and the favicon were still Expo's template: a blue logo on a pale ground. A store listing would show them, and so does a tester's home screen. There was no splash configured, and the adaptive icon's background colour was the template's `#E6F4FE`. The design brief has no icon. The owner chose to make one from the game's own art rather than wait for an artist.

## Decision
- **The mark is a brass seal.** A double ring, as the stamps in the game leave. Inside, the wordmark's S in Fira Sans Extra Condensed ExtraBold, with the Dirty glyph's diamond above and below it, so the whole reads a little like a dollar sign. Brass `#c9a86a` (the accent) on the shell's warm-dark ground `#16130f`, a little lighter at the centre.
- **Generated, not drawn by hand:** `scripts/gen-icons.ts` (`npm run icons`) writes each image as SVG and renders it to PNG with headless Chrome, with the font embedded. Chrome is already what the design checks use, so nothing new is installed. The PNGs are committed.
- **Every size the platforms ask for:**
  - a 1024 opaque icon (iOS forbids transparency);
  - Android's foreground, background and monochrome layers at 1024, with the seal inside the safe circle;
  - a transparent 1024 splash image of the seal over the wordmark;
  - a 48 favicon with one bolder ring, since the hairline ring blurs at that size.
- **The splash** comes from `expo-splash-screen`'s config plugin, the SDK 57 way: `imageWidth` 200, `contain`, on `#16130f`, the colour the app opens on. The adaptive icon's `backgroundColor` is `#16130f` too.
- **Easy to replace:** an artist's icon replaces the PNGs under the same names. The script is only how these stand-ins were made.

## Consequences
- **Prebuild checked in a scratch copy:**
  - Android gets `splashscreen_logo` and `splashscreen_background` `#16130f`;
  - iOS gets the splash storyboard on the same colour and the 1024 icon.
- **Native builds only:** the icon and splash are baked in at prebuild, so testers need a fresh build to see them. Expo Go shows its own.
- **Still to do:**
  - check on a phone's home screen, round and squircle masks included;
  - the playtest's eyes on whether a seal says "crime game" enough.
- **`expo-splash-screen`** is added at the SDK's version (`npx expo install`).

## Related
`scripts/gen-icons.ts`, `assets/icon.png`, `assets/android-icon-*.png`, `assets/splash-icon.png`, `assets/favicon.png`, `app.json`, `package.json`, [native-builds.md](../native-builds.md#the-icon-and-the-splash).
