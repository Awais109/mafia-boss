---
name: setup-project
description: Install dependencies, diagnose this machine with npm run doctor, fix what's safe, and report what can run here (Expo Go, emulator, simulator, device installs).
disable-model-invocation: true
allowed-tools: Bash(npm install) Bash(npm run doctor*) Bash(npm run check) Bash(npm run sim *) Bash(git status *)
---

# Set up the Sevgorod project

## Machine state

```!
echo "node $(node -v 2>/dev/null || echo missing) · npm $(npm -v 2>/dev/null || echo missing)"
test -d node_modules && echo "node_modules: present" || echo "node_modules: missing"
git status --short | head -10 || true
```

## Steps

1. **Dependencies.** Run `npm install`.
2. **Diagnose.** Run `npm run doctor`. It checks Node, the app IDs, JDK 17, the Android SDK parts React Native needs, adb and emulators, Xcode against Expo's minimum, CocoaPods, simulators, and connected phones. It exits 1 when something blocks; read the output either way. Details are in `docs/native-builds.md`.
3. **Fix what it reports**, by kind:
   - **Already handled:** Java other than 17 in the shell, `ANDROID_HOME` unset, a non-UTF-8 terminal. The npm scripts run through `scripts/with-native-env.sh`, which sets these per command. Don't edit the user's shell profile.
   - **Ask first, then run:** installing Node (`brew install node@22`), CocoaPods (`brew install cocoapods`) or a JDK 17 (`brew install --cask zulu@17`).
   - **Tell the user exactly what to click:** missing Android SDK parts go through Android Studio → Settings → Languages & Frameworks → Android SDK, and the doctor prints the item names. The first Android build may download them instead; say so, and that the NDK is about 1 GB.
   - **Missing app IDs:** ask which reverse-DNS ID to use, then add it as `expo.ios.bundleIdentifier` and `expo.android.package` in `app.json`.
   - **The user's job:** macOS and Xcode upgrades (the doctor prints the path), and signing in to Xcode with an Apple ID. Explain, don't attempt.

   Run `npm run doctor` again after fixing things.
4. **Verify.** Run `npm run check`. Report the test count, or the failure output. Don't change tests to make setup pass.
5. **Sim smoke test.** Run `npm run sim -- --days 2 --no-csv` and confirm it prints a summary.
6. **Report:** what you fixed, what's left for the user, and the doctor's READY TO list. Next steps: `/start-android` and `/start-ios` run the app in Expo Go; `/install-android` and `/install-ios` install a standalone build on a device.

If you changed any project file (for example the app IDs), follow the documentation rule in AGENTS.md.
