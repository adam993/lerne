#!/usr/bin/env bash
# Build the web bundle, sync Capacitor, then install + launch on a phone
# over wireless ADB. Single-mode (no debug/production split — the Lerne
# build doesn't bake any dev-only debug surfaces).
#
# Where the IP:PORT comes from (in order):
#   1. ADB_DEVICE env var, e.g. ADB_DEVICE=192.168.18.82:39073 yarn build:android-adb
#   2. .adb-device file in the repo root (gitignored), one line "IP:PORT"
#
# Find the current value on the phone:
#   Settings > Developer options > Wireless debugging > IP address & Port

set -euo pipefail

cd "$(dirname "$0")/.."

DEVICE="${ADB_DEVICE:-}"
if [ -z "$DEVICE" ] && [ -f .adb-device ]; then
  DEVICE="$(tr -d '[:space:]' < .adb-device)"
fi
if [ -z "$DEVICE" ]; then
  cat <<'MSG' >&2
ADB target not configured.

On the phone: Settings > Developer options > Wireless debugging
Read the "IP address & Port" shown at the top of that screen, then either:

  echo '192.168.x.y:PORT' > .adb-device          # remembered for next time
  ADB_DEVICE=192.168.x.y:PORT yarn build:android-adb   # one-shot
MSG
  exit 1
fi

APK_KEEP="release/lerne-android-latest.apk"

echo "==> adb connect $DEVICE"
adb connect "$DEVICE"

echo "==> Building web assets"
yarn build

echo "==> Syncing Capacitor with Android"
./node_modules/.bin/cap sync android

echo "==> Deploying to $DEVICE"
./node_modules/.bin/cap run android --target "$DEVICE"

SRC="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$SRC" ]; then
  mkdir -p release
  cp "$SRC" "$APK_KEEP"
  echo "==> Cached APK at $APK_KEEP"
fi
