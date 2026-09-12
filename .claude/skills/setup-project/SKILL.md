---
name: setup-project
description: Install dependencies, verify the Sevgorod project builds and tests green, and report which of iOS/Android can run on this machine.
disable-model-invocation: true
allowed-tools: Bash(npm install) Bash(npm run check) Bash(npm run sim *) Bash(node -v) Bash(npm -v) Bash(xcrun simctl list *) Bash(xcode-select -p) Bash(adb devices) Bash(git status *)
---

# Set up the Sevgorod project

## Machine state

```!
echo "node $(node -v 2>/dev/null || echo missing) · npm $(npm -v 2>/dev/null || echo missing)"
test -d node_modules && echo "node_modules: present" || echo "node_modules: missing"
git status --short | head -20 || true
```

## Steps

1. **Dependencies.** Run `npm install`. It honours `package-lock.json`. If Node is missing or older than 20, stop and tell the user to install a current Node LTS.
2. **Verify.** Run `npm run check` (typecheck, lint with the engine boundary rule, Vitest). Report the test count. If anything fails, show the failing output and stop. Don't "fix" tests to make setup pass.
3. **Sim smoke test.** Run `npm run sim -- --days 2 --no-csv` and confirm it prints a summary. This proves the engine and bot run under Node.
4. **Platforms.** Check what can run the app, without installing anything:
   - iOS: `xcode-select -p` and `xcrun simctl list devices available`. Xcode with at least one simulator device means `/start-ios` will work.
   - Android: `adb devices`, then list emulators with `"${ANDROID_HOME:-$HOME/Library/Android/sdk}/emulator/emulator" -list-avds`. A connected device or at least one AVD means `/start-android` will work.
   - Either way, `npx expo start` plus Expo Go on a phone (scan the QR code) always works without a simulator.
5. **Report.** A short summary: install result, check result (tests passed), sim smoke result, and for each platform "ready" or exactly what's missing (for example "Xcode installed but no simulator runtimes: Xcode → Settings → Components").

Setup changes no code, so it needs no doc update. If you had to change anything to get the project running (a script, a dependency), follow the documentation rule in AGENTS.md.
