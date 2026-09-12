---
name: start-android
description: Run Sevgorod in Expo Go on an Android emulator or a connected Android phone (no native build).
disable-model-invocation: true
allowed-tools: Bash(npm run doctor*) Bash(npm run android) Bash(sh scripts/with-native-env.sh *)
---

# Start Sevgorod on Android (Expo Go)

## Devices

```!
sh scripts/with-native-env.sh adb devices 2>/dev/null || echo "adb not found"
sh scripts/with-native-env.sh emulator -list-avds 2>/dev/null | grep -v '^INFO' || true
```

## Steps

1. **Check.** Run `npm run doctor -- android`. Expo Go needs adb plus a connected phone or an emulator; it doesn't need JDK 17 or the SDK build parts. Fix blockers as the doctor says.
2. **Pick a target.**
   - A phone or emulator is listed as `device` above: use it.
   - Otherwise, boot the first emulator **in the background** (it never exits): `sh scripts/with-native-env.sh emulator -avd <name>`. Then wait with `sh scripts/with-native-env.sh adb wait-for-device`, and poll `sh scripts/with-native-env.sh adb shell getprop sys.boot_completed` until it prints `1`.
   - No phone and no emulator: stop. Tell the user to create one in Android Studio → Device Manager, or to run `npx expo start` and scan the QR code with Expo Go on their phone.
3. **Start in the background:** `npm run android`. It installs Expo Go on the target if needed and opens the app. Metro keeps running.
4. **Confirm.** Watch the output for `Android Bundled` or an error, then report which device it opened on.
5. **Tips to pass on:** press `r` in Metro to reload. Debug has the time skip and presets; `fast` runs 1 game hour per real minute. For a build that runs without Metro, use `/install-android`.

This command changes no code. If you edit anything to get it running, follow the documentation rule in AGENTS.md.
