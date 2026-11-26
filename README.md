# Islam App

Eine persönliche Android-App, die die wichtigsten islamischen Werkzeuge an einem Ort bündelt. Oberfläche auf **Deutsch und Türkisch**, mit Daten aus **geprüften Quellen** (siehe [QUELLEN.md](QUELLEN.md)).

## Funktionen

| Bereich | Was die App kann |
|---|---|
| 🕌 **Gebetszeiten** | Berechnung nach Standort (GPS oder Stadtliste), Methode Diyanet/DITIB als Standard, Countdown zum nächsten Gebet, Feinjustierung pro Gebet |
| 🔔 **Erinnerungen** | Benachrichtigung zur Gebetszeit mit Azan (2 Aufnahmen + Kurzfassung), optional Vorab-Erinnerung, „Wecker-Modus“ für maximale Zuverlässigkeit |
| 📖 **Koran** | Arabischer Uthmani-Text (Tanzil) mit Übersetzung (Bubenheim/Elyas bzw. Diyanet) und optionaler Umschrift (okunuşu), Suren-/Dschuz-Liste, Suche, Lesezeichen, „Weiterlesen“ |
| 🎧 **Rezitation** | Vers für Vers mit 8 Rezitatoren (u. a. Alafasy, Husary, Minshawi), Mitlesen mit Hervorhebung, Vers wiederholen, Wiedergabe im Hintergrund |
| 📜 **Hadithe** | Über 600 (DE) bzw. 2.100 (TR) Hadithe von HadeethEnc mit arabischem Text, Erläuterung und Lehren. Geordnet nach Themen (mit Unterthemen) und nach Sammlungen (Buchari & Muslim, Sahih al-Buchari, Sahih Muslim, Sunan …), Einstufung Sahih/Hasan auf einen Blick, Volltextsuche (auch arabisch), Hadith des Tages, Favoriten |
| 🧭 **Qibla** | Kompass mit Kaaba-Richtung, Entfernung, Vibration bei richtiger Ausrichtung |
| 📿 **Tesbih** | Zähler mit Ziel (33/99/100), Tesbihat nach dem Gebet (33·33·34), Vibration |
| 🎙️ **Rezitation prüfen** | Du rezitierst, die App hört zu und vergleicht jedes Wort Buchstabe für Buchstabe mit dem Mushaf: falsche, ausgelassene und zusätzliche Wörter – schon ein falscher Buchstabe zählt. Wiederholungen und Selbstkorrekturen gelten nicht als Fehler, unsichere Stellen werden per Gegenprobe gelb markiert. Pro Vers: Vorbild-Rezitation und eigene Aufnahme anhören. Auch im Auswendig-Modus, offline auf dem Handy (Tarteel-Koranmodell). Gemessen an echten Rezitationen: 99,9 % der Verwechslungen ähnlicher Verse erkannt, bei korrekter Rezitation 99,7 % der Verse ohne Fehlalarm (bei unbekannten Stimmen weniger, siehe [QUELLEN.md](QUELLEN.md)). |
| 🤲 **Dua & Zikr** | Eigener Tab: Bittgebete aus dem Koran (arabisch, Umschrift, Übersetzung, Audio) und Dua/Zikr aus der Sunnah (HadeethEnc) |
| 🏠 **Startseite** | Gebetszeiten, Schnellzugriff (Qibla, Tesbih, Kalender, Weiterlesen, Rezitation prüfen, Ramadan), Vers des Tages und Hadith des Tages |
| 🗓️ **Hijri-Kalender** | Monatsansicht mit Hijri-Daten, Kandil-Nächte und Feiertage mit Countdown |
| 🌙 **Ramadan** | Imsak- und Iftar-Tabelle für alle Fastentage |

Aufbau: Tabs **Gebet · Koran · Hadith · Dua & Zikr · Mehr**. Qibla, Tesbih, Kalender und Ramadan sind über die Startseite und „Mehr“ erreichbar.

Geplant: offizielle Diyanet-Zeiten online.

## App aufs Handy bringen

**Download (immer die neueste Version):**
https://github.com/xKing41/Islam-App/releases/latest/download/islam-app.apk

Link auf dem Handy antippen → herunterladen → öffnen → installieren. Beim ersten Mal fragt Android, ob Installationen aus dem Browser erlaubt sind.
Updates einfach drüber installieren – Einstellungen und Lesezeichen bleiben erhalten.

Jede neue Version wird automatisch gebaut, im Android-Emulator gestartet (Start-Test) und nur dann veröffentlicht, wenn die App dort fehlerfrei läuft.

## Entwicklung

Technik: [Expo](https://expo.dev) SDK 58 (React Native 0.88, TypeScript, Expo Router).

```bash
npm install
npm run web          # im Browser ansehen
npm test             # automatische Tests (Gebetszeiten, Hijri, Qibla, Datenprüfung, Wortabgleich)
npm run typecheck    # TypeScript-Prüfung
npm run lint         # Code-Prüfung (ESLint)
```

Daten neu erzeugen (nur nötig, wenn sich Quellen ändern):

```bash
node scripts/build-quran-data.mjs              # Koran aus data/sources/
python3 scripts/fetch-hadeethenc.py data/sources/hadeethenc   # Hadithe herunterladen
node scripts/build-hadith-data.mjs             # Hadithe aufbereiten
```

### Ordnerstruktur

```
src/app/          Bildschirme (jede Datei = eine Seite)
src/components/   Bausteine der Oberfläche
src/lib/          Logik: Gebetszeiten, Hijri, Qibla, Koran, Hadith, Erinnerungen
src/i18n/         Texte auf Deutsch (de.ts) und Türkisch (tr.ts)
src/store/        gespeicherte Einstellungen, Lesezeichen, Tesbih-Stand
src/data/         aufbereitete Koran- und Hadith-Daten (automatisch erzeugt)
data/sources/     Originaldateien der Quellen (unverändert)
scripts/          Skripte zum Erzeugen der Daten
scripts/recite-eval/  Messung von „Rezitation prüfen“ an echten Rezitationen (Workflow „Auswertung Rezitation prüfen“)
tests/            automatische Tests
```
