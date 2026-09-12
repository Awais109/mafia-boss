---
name: start-ios
description: Run Sevgorod in Expo Go on an iOS simulator (macOS with Xcode; no native build).
disable-model-invocation: true
allowed-tools: Bash(npm run doctor*) Bash(npm run ios) Bash(xcrun simctl *) Bash(open -a Simulator)
---

# Start Sevgorod on iOS (Expo Go in a simulator)

## Simulators

```!
xcode-select -p 2>/dev/null || echo "Xcode command line tools not selected"
xcrun simctl list devices available 2>/dev/null || echo "simctl unavailable"
```

## Steps

1. **Check.** Run `npm run doctor -- ios`. This needs Xcode and an iOS simulator runtime at iOS 16.4 or later. Expo Go compiles nothing, so the Xcode minimum for native builds doesn't apply. If Expo's CLI still rejects this Xcode, report its message; that's the real limit.
2. **Pick a simulator.**
   - One is already `(Booted)`: use it.
   - Otherwise boot the newest available iPhone: `xcrun simctl boot <UDID>`, then `open -a Simulator`.
   - No devices listed: stop. The simulator runtime comes from Xcode → Settings → Components. It's a multi-GB download, so ask before starting it. Or skip the simulator: `npx expo start`, then scan the QR code with Expo Go on an iPhone.
3. **Start in the background:** `npm run ios`. It installs Expo Go in the simulator if needed and opens the app. Metro keeps running.
4. **Confirm.** Watch the output for `iOS Bundled` or an error, then report which simulator it opened on.
5. **Tips to pass on:** press `r` in Metro to reload. Debug has the time skip and presets. To install on an iPhone, use `/install-ios`.

This command changes no code. If you edit anything to get it running, follow the documentation rule in AGENTS.md.
