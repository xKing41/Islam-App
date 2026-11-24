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

# Tippt auf ein Element mit genau diesem sichtbaren Text oder dieser Klasse (UI-Baum von uiautomator).
tap_text() {
  adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1
  adb pull /sdcard/ui.xml "$OUT/ui.xml" > /dev/null 2>&1
  local pos
  pos=$(python3 - "$1" "$OUT/ui.xml" <<'PY'
import re, sys
text, path = sys.argv[1], sys.argv[2]
xml = open(path, encoding='utf-8').read()
for m in re.finditer(r'<node [^>]*>', xml):
    n = m.group(0)
    t = re.search(r' text="([^"]*)"', n)
    d = re.search(r'content-desc="([^"]*)"', n)
    c = re.search(r' class="([^"]*)"', n)
    if (t and t.group(1) == text) or (d and d.group(1) == text) or (c and c.group(1) == text):
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        x1, y1, x2, y2 = map(int, b.groups())
        print((x1 + x2) // 2, (y1 + y2) // 2)
        break
PY
)
  if [ -n "$pos" ]; then
    adb shell input tap $pos
    echo "Tippe auf \"$1\" bei $pos"
  else
    echo "::warning::Text nicht gefunden: $1"
  fi
}

check_running() { # $1 = Name
  adb exec-out screencap -p > "$OUT/$1.png"
  if running; then echo "OK: $1"; else echo "::error::App läuft nicht mehr nach: $1"; fail=1; fi
}

open_page start "" 25

# Standort wählen (Köln) -> Gebetszeiten werden berechnet und Erinnerungen geplant
open_page location "islamapp://location"
tap_text "android.widget.EditText"
sleep 1
adb shell input text "Koln"
sleep 2
tap_text "Köln"
sleep 8
check_running home-mit-standort
open_page home-gebetszeiten "islamapp://" 6

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
open_page sources "islamapp://sources"
open_page more "islamapp://more"

# Koran-Audio starten (Sure 1)
open_page sura1 "islamapp://sura/1"
tap_text "Abspielen"
sleep 10
check_running audio

echo "================ Geplante Alarme (Erinnerungen) ================"
adb shell dumpsys alarm | grep -c "$PKG" || true
echo "================================================================"

adb logcat -d > "$OUT/logcat.txt"
echo "================ Auffällige Log-Zeilen ================"
grep -nE "FATAL EXCEPTION|E AndroidRuntime|ReactNativeJS|E ReactNative|unknown:React|islamapp|expo\.modules" "$OUT/logcat.txt" | head -250
echo "======================================================="
exit $fail
