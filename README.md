# Islam App

Eine persönliche Android-App, die die wichtigsten islamischen Werkzeuge an einem Ort bündelt. Oberfläche auf **Deutsch und Türkisch**, mit Daten aus **geprüften Quellen** (siehe [QUELLEN.md](QUELLEN.md)).

## Funktionen

| Bereich | Was die App kann |
|---|---|
| 🕌 **Gebetszeiten** | Berechnung nach Standort (GPS oder Stadtliste), Methode Diyanet/DITIB als Standard, Countdown zum nächsten Gebet, Feinjustierung pro Gebet |
| 🔔 **Erinnerungen** | Benachrichtigung zur Gebetszeit mit Azan (2 Aufnahmen + Kurzfassung), optional Vorab-Erinnerung, „Wecker-Modus“ für maximale Zuverlässigkeit |
| 📖 **Koran** | Arabischer Uthmani-Text (Tanzil) mit Übersetzung (Bubenheim/Elyas bzw. Diyanet), Suren-/Dschuz-Liste, Suche, Lesezeichen, „Weiterlesen“ |
| 🎧 **Rezitation** | Vers für Vers mit 8 Rezitatoren (u. a. Alafasy, Husary, Minshawi), Mitlesen mit Hervorhebung, Vers wiederholen, Wiedergabe im Hintergrund |
| 📜 **Hadithe** | Über 600 (DE) bzw. 2.100 (TR) Hadithe von HadeethEnc mit arabischem Text, Einstufung, Quelle und Erläuterung; Themen, Suche, Favoriten |
| 🧭 **Qibla** | Kompass mit Kaaba-Richtung, Entfernung, Vibration bei richtiger Ausrichtung |
| 📿 **Tesbih** | Zähler mit Ziel (33/99/100), Tesbihat nach dem Gebet (33·33·34), Vibration |
| 🗓️ **Hijri-Kalender** | Monatsansicht mit Hijri-Daten, Kandil-Nächte und Feiertage mit Countdown |
| 🌙 **Ramadan** | Imsak- und Iftar-Tabelle für alle Fastentage |

Geplant: Dua & Zikr (Hisnul Muslim), **Rezitation prüfen** (Mikrofon erkennt falsche oder fehlende Wörter), offizielle Diyanet-Zeiten online.

## App aufs Handy bringen

1. Auf GitHub im Repository oben auf **Actions** gehen.
2. Den neuesten grünen Lauf „Android-APK“ öffnen.
3. Unten unter **Artifacts** die Datei `islam-app-apk-…` herunterladen (eine ZIP-Datei).
4. ZIP auf dem Handy entpacken und die `.apk` antippen. Android fragt einmalig, ob Installationen aus dieser Quelle erlaubt sind.

Updates lassen sich einfach drüber installieren. Lesezeichen und Einstellungen bleiben erhalten.

## Entwicklung

Technik: [Expo](https://expo.dev) SDK 58 (React Native 0.88, TypeScript, Expo Router).

```bash
npm install
npm run web          # im Browser ansehen
npm test             # automatische Tests (Gebetszeiten, Hijri, Qibla, Datenprüfung)
npm run typecheck    # TypeScript-Prüfung
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
tests/            automatische Tests
```
