---
name: start-ios
description: Start Metro and open Sevgorod in Expo Go on an iOS simulator (macOS with Xcode).
disable-model-invocation: true
allowed-tools: Bash(xcrun simctl *) Bash(xcode-select -p) Bash(open -a Simulator) Bash(npx expo start *)
---

# Start Sevgorod on iOS

## Simulators

```!
xcode-select -p 2>/dev/null || echo "Xcode command line tools not selected"
xcrun simctl list devices available 2>/dev/null || echo "simctl unavailable"
```

## Steps

1. **Pick a simulator.**
   - One is already `(Booted)`: use it.
   - Otherwise boot the newest available iPhone: `xcrun simctl boot <UDID>`, then `open -a Simulator`.
   - If no devices are listed, stop. Xcode needs an iOS simulator runtime: Xcode → Settings → Components, or `xcodebuild -downloadPlatform iOS`. That's a multi-GB download, so ask before starting it. The alternative is `npx expo start` and scanning the QR code with Expo Go on an iPhone.
2. **Start Metro in the background:** `npx expo start --ios`. It installs Expo Go on the simulator if needed and opens the app. Metro keeps running, so never run it in the foreground.
3. **Confirm.** Watch the Metro output until you see the iOS bundle build (`iOS Bundled …`) or an error. Report which simulator it opened on, or the error.
4. **Tips to pass on:** press `r` in Metro to reload. The Debug tab has the time skip and presets; `fast` runs 1 game hour per real minute.

This command changes no code. If you edit anything to get it running, follow the documentation rule in AGENTS.md.
