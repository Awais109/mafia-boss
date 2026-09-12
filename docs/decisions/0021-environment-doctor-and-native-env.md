# 0021. Environment doctor and a per-command toolchain wrapper

- **Status:** Accepted
- **Date:** 2026-09-12

## Context
`/setup-project` installed packages and ran the tests, then called a platform ready if an emulator or simulator existed. On the first development laptop that was wrong in several ways at once:
- the shell's `JAVA_HOME` pointed at Java 11, while React Native 0.86 needs 17;
- `ANDROID_HOME` was unset, and SDK Platform 36, Build tools 36.0.0 and NDK 27.1 were missing;
- CocoaPods refused to run without a UTF-8 locale;
- Xcode 15.4 on macOS 14.4 can't build Expo SDK 57, which needs Xcode 26.4, which in turn needs macOS Tahoe 26.2;
- Node 24.2 was just outside react-native's supported range;
- `app.json` had no bundle ID or Android package.

Each fix is machine-specific, and the requirements change with every SDK upgrade.

## Decision
- **`scripts/doctor.ts` (`npm run doctor`)** checks the machine and prints a fix for every problem, plus which run and install commands can work. Where possible it reads requirements from installed packages: react-native's `engines.node` and its Android version catalog. The Xcode and macOS minimums are constants with their sources noted, updated on SDK upgrades.
- **`scripts/with-native-env.sh`** sets JDK 17, `ANDROID_HOME` with the SDK tools on `PATH`, and a UTF-8 locale for one command. It never edits the user's shell profile. Every native npm script runs through it.
- **`android:install` and `ios:install`** build release variants with `--no-bundler`. The app runs without Metro, and the command exits once it's installed.
- **Default app identifiers:** `com.hamzaarshad.sevgorod` for both iOS and Android.
- **The commands** (`/setup-project`, `/start-*`, `/install-*`) run the doctor first. They ask before installing tools or starting large downloads, and treat macOS and Xcode upgrades and Apple ID sign-in as the user's steps.

## Consequences
- Setup reports the real state of a machine; when something can't work here, it says why and what to change.
- `MIN_XCODE` and `MIN_MACOS_FOR_XCODE` in `scripts/doctor.ts` must be updated on Expo SDK upgrades, or the doctor will pass machines that can't build.
- The Android release APK is signed with the template's debug keystore: good for testers, not for the Play Store.
- Changing an app identifier later installs as a separate app.
- An interactive first iOS install with several signing teams writes `ios.appleTeamId` into `app.json`. That value is personal and shouldn't be committed unless the team is shared.
- The wrapper is POSIX `sh`: macOS and Linux only.

## Related
`scripts/doctor.ts`, `scripts/with-native-env.sh`, `package.json` scripts, `app.json`, `.claude/skills/`, [native-builds.md](../native-builds.md).
