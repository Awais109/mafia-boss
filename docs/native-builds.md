# Running on devices

How to run Sevgorod on phones, emulators and simulators, what each way needs, and how the project's tooling checks and sets that up ([ADR 0021](decisions/0021-environment-doctor-and-native-env.md)).

## Three ways to run

| Way | Needs | Command |
|---|---|---|
| Expo Go on your phone | Dependencies; phone on the same Wi-Fi | `npx expo start`, then scan the QR code in Expo Go |
| Expo Go on an emulator or simulator | Android: adb and an emulator. iOS: Xcode (Expo's CLI accepts 14.1+) and an iOS 16.4+ simulator runtime | `/start-android` (`npm run android`), `/start-ios` (`npm run ios`) |
| Standalone install on a device | The native toolchain below | `/install-android` (`npm run android:install`), `/install-ios` (`npm run ios:install -- --device "<name>"`) |

Expo Go runs the game's JavaScript inside Expo's own app, so nothing is compiled and Metro must keep running. A standalone install compiles the app as a release build with the JavaScript bundled in, so it runs without the laptop.

## Requirements

For Expo SDK 57 and React Native 0.86. Checked on 2026-09-12; `npm run doctor` reads the first and third rows from installed packages, so they follow upgrades.

| Tool | Requirement | Source |
|---|---|---|
| Node | `^20.19.4 \|\| ^22.13.0 \|\| ^24.3.0 \|\| >= 25.0.0` | `engines.node` in `node_modules/react-native/package.json` |
| JDK | 17 | Expo's environment setup guide |
| Android SDK | Platform 36, Build tools 36.0.0, NDK 27.1.12297006 | `node_modules/react-native/gradle/libs.versions.toml` |
| Xcode (native iOS builds) | 26.4 or newer | Expo's SDK compatibility table; `MIN_XCODE` in `scripts/doctor.ts` |
| macOS (for that Xcode) | Tahoe 26.2 or newer | Apple's Xcode requirements; `MIN_MACOS_FOR_XCODE` |
| CocoaPods | Installed; terminal in UTF-8 | CocoaPods refuses to run otherwise |

**When upgrading the Expo SDK**, update `MIN_XCODE` and `MIN_MACOS_FOR_XCODE` in `scripts/doctor.ts`, and this table.

## The doctor

`npm run doctor [-- general|android|ios]`, from `scripts/doctor.ts`. Every check prints ✓ (ok), ! (warning), ✗ (blocking) or · (information), with a one-line fix. With no section given, it also prints a READY TO list, saying which of the commands above can work on this machine. It exits 1 if anything blocks.

| Section | Checks |
|---|---|
| general | Dependencies installed; Node in react-native's range; `expo.ios.bundleIdentifier` and `expo.android.package` set |
| android | A JDK 17 (and what your shell uses); the Android SDK; Platform, Build tools and NDK at React Native's versions; SDK licenses; adb and connected devices, including unauthorized ones; emulators |
| ios | macOS; Xcode against `MIN_XCODE`, with the upgrade path for this Mac's macOS; the selected developer directory; CocoaPods; terminal locale; simulator runtimes; paired Apple devices with iOS version, Developer Mode and connection state |

## The environment wrapper

`sh scripts/with-native-env.sh <command> [args…]` runs a command with the right toolchain, **without editing your shell profile**:

- **`JAVA_HOME`:** a JDK 17. It tries `$JAVA_HOME` if that's already 17, then `/usr/libexec/java_home -v 17`, then Android Studio's bundled JDK, then `/usr/lib/jvm/java-17-openjdk*`. `$JAVA_HOME/bin` goes first on `PATH`.
- **`ANDROID_HOME`:** if unset, `$ANDROID_SDK_ROOT`, `~/Library/Android/sdk`, or `~/Android/Sdk`. `platform-tools` and `emulator` go on `PATH`.
- **`LANG` and `LC_ALL`:** set to `en_US.UTF-8` when they aren't already UTF-8.

The npm scripts `android`, `ios`, `android:install`, `ios:install` and `ios:xcode` all run through it.

## App identifiers

`app.json` sets `expo.ios.bundleIdentifier` and `expo.android.package` to `com.hamzaarshad.sevgorod`. Changing either later installs as a separate app on devices. For iOS, the identifier must not already be registered to another Apple team.

## Installing on Android

1. **On the phone:** Settings → About phone → tap Build number 7 times → Developer options → **USB debugging**. Plug it in and accept "Allow USB debugging".
2. **Build and install:** `npm run android:install`, which runs `expo run:android --variant release --no-bundler`. It generates the git-ignored `android/` folder, builds with Gradle, installs the app, and opens it. If more than one device or emulator is connected, add `-- --device "<name>"`.
3. **Share with testers:** the APK is at `android/app/build/outputs/apk/release/app-release.apk`. Expo's template signs release builds with its debug keystore (`signingConfig signingConfigs.debug`), which is fine for testing. A Play Store release needs your own keystore, which isn't set up.

Missing SDK parts may be downloaded on the first build if SDK licenses are accepted; the NDK is about 1 GB. Installing them first in Android Studio → Settings → Languages & Frameworks → Android SDK is more reliable.

## Installing on an iPhone

1. **The Mac:** macOS Tahoe 26.2+ and Xcode 26.4+, with your Apple ID added in Xcode → Settings → Accounts. CocoaPods installed.
2. **The phone:** connected by cable, unlocked, **Trust This Computer** accepted, and Developer Mode on (Settings → Privacy & Security).
3. **Build and install:** `npm run ios:install -- --device "<name or UDID>"`, which runs `expo run:ios --configuration Release --no-bundler`. It generates the git-ignored `ios/` folder, installs pods, builds, and installs.
4. **First launch:** trust the developer under Settings → General → VPN & Device Management. With a free Apple ID the install expires after 7 days; install again to renew it.

**How Expo's CLI chooses a signing identity** (`@expo/cli`, `run/ios/codeSigning/`):

| Situation | What happens |
|---|---|
| The Xcode project already has a team | That team is used |
| No signing certificates in the keychain | Stops with "No code signing certificates are available to use". Create an Apple Development certificate in Xcode → Settings → Accounts → Manage Certificates |
| One certificate, or a non-interactive shell (including an agent) | The first certificate is used, which may be the wrong team if there are several |
| Several certificates, interactive terminal | Asks which team, and saves it as `ios.appleTeamId` in `app.json`. That's personal to your team, so don't commit it unless everyone signs with that team |

To sign by hand instead: `npm run ios:xcode` generates the project and opens it in Xcode. Pick a Team under Signing & Capabilities, set Product → Scheme → Edit Scheme → Run → Build Configuration to Release, and press ⌘R.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Android Gradle plugin requires Java 17" | Your shell's Java is older. Use the npm scripts, which switch to 17 |
| CocoaPods complains about UTF-8 | Use the npm scripts, which set a UTF-8 locale |
| adb lists the phone as `unauthorized` | Unlock it and accept the USB debugging prompt |
| The iPhone shows as not connected | Cable in, phone unlocked, Trust This Computer, Developer Mode on |
| `app.json` changed but the app didn't | Regenerate native folders: `sh scripts/with-native-env.sh npx expo prebuild --clean` |
