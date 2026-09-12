#!/bin/sh
# Run a command with the toolchain that native builds need, without editing the user's shell profile:
#   JAVA_HOME     a JDK 17 (React Native 0.86 / Expo SDK 57 Android builds)
#   ANDROID_HOME  the Android SDK, with platform-tools and emulator on PATH
#   LANG          UTF-8 (CocoaPods refuses to run without it)
# Usage: sh scripts/with-native-env.sh <command> [args...]
# `npm run doctor` explains anything this can't fix. See docs/native-builds.md.

is_jdk17() {
  [ -x "$1/bin/java" ] && "$1/bin/java" -version 2>&1 | head -1 | grep -q '"17\.'
}

if ! { [ -n "$JAVA_HOME" ] && is_jdk17 "$JAVA_HOME"; }; then
  found=""
  if [ -x /usr/libexec/java_home ]; then
    candidate=$(/usr/libexec/java_home -v 17 2>/dev/null) && is_jdk17 "$candidate" && found="$candidate"
  fi
  for candidate in \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    "$HOME/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    /usr/lib/jvm/java-17-openjdk*; do
    if [ -z "$found" ] && is_jdk17 "$candidate"; then found="$candidate"; fi
  done
  if [ -n "$found" ]; then
    export JAVA_HOME="$found"
  else
    echo "with-native-env: no JDK 17 found, so Android builds will fail. Run: npm run doctor" >&2
  fi
fi
if [ -n "$JAVA_HOME" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi

if [ -z "$ANDROID_HOME" ]; then
  for candidate in "$ANDROID_SDK_ROOT" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    if [ -n "$candidate" ] && [ -d "$candidate" ]; then
      export ANDROID_HOME="$candidate"
      break
    fi
  done
fi
if [ -n "$ANDROID_HOME" ]; then export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"; fi

case "${LANG:-}" in
  *UTF-8* | *utf8* | *UTF8*) ;;
  *) export LANG=en_US.UTF-8 ;;
esac
case "${LC_ALL:-}" in
  "" | *UTF-8* | *utf8* | *UTF8*) ;;
  *) export LC_ALL=en_US.UTF-8 ;;
esac

exec "$@"
