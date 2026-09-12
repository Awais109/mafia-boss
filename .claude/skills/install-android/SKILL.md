---
name: install-android
description: Build a standalone release of Sevgorod and install it on a connected Android phone or emulator. It runs without Metro.
disable-model-invocation: true
allowed-tools: Bash(npm run doctor*) Bash(npm run android:install*) Bash(sh scripts/with-native-env.sh *)
---

# Install Sevgorod on an Android device

## Devices

```!
sh scripts/with-native-env.sh adb devices -l 2>/dev/null || echo "adb not found"
```

## Steps

1. **Check.** Run `npm run doctor -- general android`.
   - **Blocking:** no JDK 17, no Android SDK, or no `expo.android.package` in `app.json`. Fix these first; `/setup-project` covers how.
   - **Warnings** for SDK Platform, Build tools or NDK: the first build may download them. The NDK alone is about 1 GB, so ask before continuing, or have the user install them in Android Studio first.
2. **Target.** You need a phone or emulator in state `device` above.
   - **Phone:** Settings → About phone → tap Build number 7 times → Developer options → USB debugging. Plug it in and accept "Allow USB debugging". If it shows `unauthorized`, ask the user to unlock the phone and accept.
   - **No phone:** boot an emulator as in `/start-android`.
3. **Build and install in the background.** The first build takes 10–20 minutes.
   - With exactly one target connected: `npm run android:install`.
   - With several: add `-- --device "<name>"`, or disconnect the others. Expo can't answer a device picker non-interactively.

   This generates the git-ignored `android/` folder, builds the release variant (the game's JavaScript is bundled in), installs it, and opens it.
4. **Watch the output** until it installs or errors.
   - Missing SDK parts: install them in Android Studio and retry.
   - Java version errors: `npm run doctor -- android`.
   - After changing `app.json`, run `sh scripts/with-native-env.sh npx expo prebuild --platform android --clean` and build again.
5. **Report.** Say which device it's on. The APK is at `android/app/build/outputs/apk/release/app-release.apk` for sharing with testers. Expo's template signs release builds with its debug keystore: fine for testing, not for the Play Store.

This changes no tracked files (`android/` is git-ignored). If you edit anything to get it working, follow the documentation rule in AGENTS.md.
