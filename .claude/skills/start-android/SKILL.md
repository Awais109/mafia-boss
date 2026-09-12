---
name: start-android
description: Start Metro and open Sevgorod in Expo Go on an Android emulator or connected Android device.
disable-model-invocation: true
allowed-tools: Bash(adb *) Bash(npx expo start *)
---

# Start Sevgorod on Android

## Devices

```!
adb devices 2>/dev/null || echo "adb not found"
"${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator" -list-avds 2>/dev/null || echo "emulator binary not found"
```

## Steps

1. **Pick a target.**
   - A device or running emulator is listed under `adb devices` (state `device`): use it.
   - Otherwise, if an AVD is listed, boot the first one **in the background** (it never exits on its own): `"${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator" -avd <name>`. Then run `adb wait-for-device` and poll `adb shell getprop sys.boot_completed` until it prints `1`.
   - If there's no device and no AVD, stop. Tell the user to create an emulator in Android Studio → Device Manager, or to run `npx expo start` and scan the QR code with Expo Go on an Android phone.
2. **Start Metro in the background:** `npx expo start --android`. It installs Expo Go on the target if needed and opens the app. Metro keeps running, so never run it in the foreground.
3. **Confirm.** Watch the Metro output until you see the Android bundle build (`Android Bundled …`) or an error. Report which device it opened on, or the error.
4. **Tips to pass on:** press `r` in Metro to reload. The Debug tab has the time skip and presets; `fast` runs 1 game hour per real minute.

This command changes no code. If you edit anything to get it running, follow the documentation rule in AGENTS.md.
