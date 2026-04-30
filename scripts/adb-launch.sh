#!/usr/bin/env bash
# Wireless-ADB attach + install/launch a previously built APK. No rebuild.
#
# Use this when you just want to put the latest local APK back on the
# phone and open it. Use `yarn build:android-adb` instead when you want
# a fresh build from current sources.

set -euo pipefail

cd "$(dirname "$0")/.."

APK="release/lerne-android-latest.apk"

DEVICE="${ADB_DEVICE:-}"
if [ -z "$DEVICE" ] && [ -f .adb-device ]; then
  DEVICE="$(tr -d '[:space:]' < .adb-device)"
fi
if [ -z "$DEVICE" ]; then
  echo "ADB target not configured. See scripts/run-android-adb.sh for setup." >&2
  exit 1
fi

if [ ! -f "$APK" ]; then
  echo "No APK at $APK — run \`yarn build:android-adb\` first." >&2
  exit 1
fi

echo "==> adb connect $DEVICE"
adb connect "$DEVICE"

echo "==> adb install -r $APK"
adb -s "$DEVICE" install -r "$APK"

echo "==> Launching com.lerne.app/.MainActivity"
adb -s "$DEVICE" shell am start -n com.lerne.app/.MainActivity
