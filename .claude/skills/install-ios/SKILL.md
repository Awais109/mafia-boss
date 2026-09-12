---
name: install-ios
description: Build a standalone release of Sevgorod and install it on a connected iPhone (needs Xcode 26.4+, so macOS Tahoe 26.2+). It runs without Metro.
disable-model-invocation: true
allowed-tools: Bash(npm run doctor*) Bash(npm run ios:install*) Bash(npm run ios:xcode) Bash(xcrun devicectl *) Bash(security find-identity *)
---

# Install Sevgorod on an iPhone

## Xcode, phones and signing certificates

```!
xcodebuild -version 2>/dev/null | head -1 || echo "Xcode not found"
xcrun devicectl list devices 2>/dev/null || echo "devicectl unavailable"
security find-identity -v -p codesigning 2>/dev/null | tail -4 || true
```

## Steps

1. **Check.** Run `npm run doctor -- general ios`.
   - **Blocking:** Xcode older than 26.4, missing CocoaPods, or no `expo.ios.bundleIdentifier` in `app.json`.
   - **Old Xcode:** the doctor prints the upgrade path (macOS Tahoe 26.2+, then the latest Xcode). Stop and explain; that's the user's job. Expo Go on the phone (`npx expo start`, scan the QR code) works meanwhile.
2. **Phone.**
   - Connect it by cable, unlock it, and tap **Trust This Computer**.
   - Developer Mode must be on: Settings → Privacy & Security → Developer Mode, which restarts the phone.
   - It must show as connected in the device list above.
3. **Signing.** Count the valid identities listed above:
   - **None:** the build will stop with "No code signing certificates are available to use." The user adds their Apple ID in Xcode → Settings → Accounts, then Manage Certificates → + → Apple Development. Wait for them, then continue.
   - **One:** Expo signs with it automatically.
   - **Several:** Expo takes the first one when run from here, which may be the wrong team. Ask the user which team, then either:
     - have them run `npm run ios:install -- --device "<name>"` once in their own terminal to pick it (Expo saves it as `ios.appleTeamId` in `app.json`), or
     - run `npm run ios:xcode` and have them choose the Team under Signing & Capabilities.
4. **Build and install in the background:** `npm run ios:install -- --device "<device name or UDID>"`. This generates the git-ignored `ios/` folder, installs pods (the script sets UTF-8), builds the Release configuration with the JavaScript bundled in, and installs the app. The first build is long.
5. **Watch the output** until it installs or errors.
   - Signing errors: go back to step 3, or use `npm run ios:xcode` and press ⌘R in Xcode.
   - After changing `app.json`: `sh scripts/with-native-env.sh npx expo prebuild --platform ios --clean`, then build again.
6. **First launch.** The phone reports an untrusted developer. Settings → General → VPN & Device Management → the developer app → **Trust**. With a free Apple ID the install expires after 7 days; run this again to renew it.
7. **Report** which phone it's on. If Expo wrote `ios.appleTeamId` into `app.json`, say so: that's a personal team ID, so don't commit it unless everyone signs with that team.

The install changes no tracked files, except that `ios.appleTeamId` note. If you edit anything to get it working, follow the documentation rule in AGENTS.md.
