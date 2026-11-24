#!/usr/bin/env bash
# Start-Test im Android-Emulator: installiert die APK, öffnet die wichtigsten Seiten,
# prüft, ob die App noch läuft, und sammelt Screenshots + Logs in ./smoke/.
set -u

APK="${APK:-$(ls apk/*.apk 2>/dev/null | head -1)}"
PKG=com.islamapp.personal
OUT=smoke
mkdir -p "$OUT"
fail=0

echo "APK: $APK"
adb install -r -g "$APK" 2>&1 | tee "$OUT/install.txt"
adb logcat -c

running() { [ -n "$(adb shell pidof "$PKG" | tr -d '\r')" ]; }

open_page() { # $1 = Name, $2 = Deep-Link (leer = normaler Start), $3 = Wartezeit
  local name=$1 url=${2:-} wait=${3:-10}
  if [ -z "$url" ]; then
    adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
  else
    adb shell am start -W -a android.intent.action.VIEW -d "$url" "$PKG" > /dev/null 2>&1
  fi
  sleep "$wait"
  adb exec-out screencap -p > "$OUT/$name.png"
  if running; then
    echo "OK: $name"
  else
    echo "::error::App läuft nicht mehr nach: $name"
    fail=1
  fi
}

open_page start "" 25
open_page quran "islamapp://quran"
open_page sura2 "islamapp://sura/2"
open_page hadith "islamapp://hadith"
open_page hadith-detail "islamapp://hadith/66535"
open_page qibla "islamapp://qibla"
open_page tasbih "islamapp://tasbih"
open_page calendar "islamapp://calendar"
open_page ramadan "islamapp://ramadan"
open_page settings "islamapp://settings"
open_page prayer-settings "islamapp://prayer-settings"
open_page location "islamapp://location"
open_page sources "islamapp://sources"

adb logcat -d > "$OUT/logcat.txt"
echo "================ Auffällige Log-Zeilen ================"
grep -nE "FATAL EXCEPTION|AndroidRuntime|ReactNativeJS|E ReactNative|unknown:React|Exception|Error:|TypeError|ReferenceError|Invariant" "$OUT/logcat.txt" \
  | grep -vE "ConnectivityService|NetworkMonitor|GmsClient|chromium|Finsky|gms\." | head -200
echo "======================================================="
exit $fail
