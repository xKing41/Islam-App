# Quellen & Lizenzen

Bei religiösen Inhalten ist die Quelle entscheidend. Hier ist dokumentiert, **woher jeder Inhalt der App stammt**, unter welchen Bedingungen er genutzt wird und wie man ihn nachprüfen kann.

**Grundsatz:** Alle Texte (Koran, Übersetzungen, Hadithe) werden **unverändert** übernommen. Die Skripte in `scripts/` bringen sie nur in ein anderes Dateiformat. Die Originaldateien liegen in `data/sources/`. Ein automatischer Test (`npm test`) vergleicht den arabischen Text der App Vers für Vers mit der Tanzil-Originaldatei.

Abgerufen: 24.11.2026

---

## 1. Arabischer Korantext: Tanzil Project

| | |
|---|---|
| Website | https://tanzil.net |
| Ausgabe | Uthmani-Text, Version 1.1 (wie im Medina-Mushaf, Rezitation Hafs ʿan ʿĀsim) |
| Zusätzlich | „Simple Clean“ (ohne Diakritika): nur für Suche und den geplanten Prüfmodus |
| Metadaten | `quran-data.xml`: Surennamen (arabisch), Versanzahl, mekkanisch/medinensisch, Dschuz, Sadschda-Stellen |
| Lizenz | Creative Commons Namensnennung 3.0 |

Bedingungen laut Tanzil:

> Permission is granted to copy and distribute verbatim copies of this text, but CHANGING IT IS NOT ALLOWED. This Quran text can be used in any website or application, provided that its source (Tanzil Project) is clearly indicated, and a link is made to tanzil.net to enable users to keep track of changes.

**Warum Tanzil?** Der Text wird von einer Gruppe von Fachleuten sorgfältig erstellt, geprüft und laufend überwacht. Er ist die verbreitetste digitale Referenz und wird von vielen bekannten Koran-Apps und -Websites verwendet.

Hinweis zur Anzeige: In der Tanzil-Datei steht die Basmala am Anfang von Vers 1 jeder Sure (außer Sure 1 und 9). Die App zeigt sie als Überschrift über der Sure an, wie es auch im gedruckten Mushaf üblich ist. Am Text selbst wird nichts geändert.

### Weitere Tanzil-Dateien
| Datei | Verwendung | Bedingungen |
|---|---|---|
| `quran-simple.txt` (einfacher Text mit Vokalzeichen, ohne Pausenzeichen) | Anzeige in „Rezitation prüfen“. Ein Test stellt sicher, dass jedes Wort genau dem Text ohne Vokalzeichen entspricht. | CC BY 3.0 wie oben |
| `tr.transliteration.txt` – „Çeviriyazı“ (Muhammet Abay) | Türkische Umschrift (okunuşu) | nur nicht-kommerziell |
| `en.transliteration.txt` – „Transliteration“ | Lateinische Umschrift (deutsche Oberfläche); `<u>` = lang/emphatisch, `<b>` = nicht gesprochen | nur nicht-kommerziell |

## 2. Deutsche Übersetzung: Bubenheim & Elyas (QuranEnc.com)

| | |
|---|---|
| Übersetzer | ʿAbdullah as-Sāmit (Frank Bubenheim) und Dr. Nadeem Elyas |
| Quelle | QuranEnc.com, Schlüssel `german_bubenheim`, **Version 1.1.5** |
| Warum diese? | Sie ist vom König-Fahd-Komplex in Medina herausgegeben. QuranEnc pflegt sie mit laufenden Korrekturen; die Tanzil-Fassung von 2011 weicht in 1.856 Versen davon ab. |
| Bedingungen | Weitergabe ohne Änderungen, mit Angabe von Herausgeber, Quelle (QuranEnc.com) und Versionsnummer |

## 3. Türkische Übersetzungen

### Diyanet İşleri (Standard)
| | |
|---|---|
| Herausgeber | T.C. Diyanet İşleri Başkanlığı |
| Quelle | Tanzil, Datei `tr.diyanet`, Stand 27.12.2011 |
| Bedingungen | Nur für nicht-kommerzielle Zwecke |

### Diyanet Vakfı: Ali Özek u. a. (Alternative)
| | |
|---|---|
| Übersetzer | Ali Özek, Hayrettin Karaman, Ali Turgut, Mustafa Çağrıcı, İbrahim Kâfi Dönmez, Sadrettin Gümüş (Türkiye Diyanet Vakfı) |
| Quelle | QuranEnc.com, Schlüssel `turkish_shahin`, Version 1.0.0 |
| Geprüft | Der Text stimmt im Median zu 99,6 % mit der Tanzil-Datei `tr.vakfi` (Diyanet Vakfı) überein. Unterschiede sind fast nur Zirkumflexe wie â und î. |

In den Einstellungen umschaltbar.

## 4. Rezitationen: EveryAyah.com

Vers-für-Vers-Aufnahmen bekannter Rezitatoren werden beim Abspielen aus dem Internet geladen und nicht in der App gespeichert. URL-Schema: `https://everyayah.com/data/<Rezitator>/<SSS><AAA>.mp3`.

40 Rezitationen von 35 Rezitatoren, in der App nach Vortragsart gruppiert (Liste: `src/lib/quran/audio.ts`):

- **Murattal** (gleichmäßiges Tempo, 35): Abdul Basit Abdus-Samad, Abdullah Awad Al-Juhany, Abdullah Basfar, Abdullah Al-Matrood, Abdurrahman As-Sudais, Abu Bakr Ash-Shatri, Ahmed ibn Ali Al-Ajamy, Ahmed Neana, Akram Al-Alaqimi, Ali Al-Hudhaify, Ali Hajjaj As-Suwaisi, Ali Jaber, Ayman Suwaid, Aziz Alili, Fares Abbad, Hani Ar-Rifai, Khalid Al-Qahtani, Khalifa Al-Tunaiji, Maher Al-Muaiqly, Mahmoud Khalil Al-Husary, Mishary Rashid Alafasy, Mohammad Al-Tablawi, Mohamed Siddiq Al-Minshawi, Muhammad Abdul-Kareem, Muhammad Ayyub, Muhammad Jibreel, Muhsin Al-Qasim, Nasser Al-Qatami, Saad Al-Ghamdi, Sahl Yassin, Salah Al-Budair, Salah Bukhatir, Saud Ash-Shuraim, Yaser Salamah, Yasser Ad-Dossari.
- **Mujawwad** (langsam, melodisch, 3): Abdul Basit Abdus-Samad, Mahmoud Khalil Al-Husary, Mohamed Siddiq Al-Minshawi.
- **Lernmodus** (2): Al-Husary „Muallim“ (nach jedem Vers eine gleich lange Pause zum Nachsprechen), Al-Minshawi mit Kindern, die jeden Vers nachsprechen.

So wurde geprüft (November 2026):

- **Vollständigkeit:** Für jeden Ordner wurde die Dateiliste des Servers gelesen und mit allen 6236 Versen verglichen; außerdem wurden Dateien unter 4 KB gesucht (abgeschnittene Aufnahmen). Aufgenommen sind nur Ordner mit allen Versen und ohne solche Dateien. Nicht aufgenommen: `Mustafa_Ismail_48kbps` (nur 2016 Verse), `ahmed_ibn_ali_al_ajamy_128kbps` (5 leere Dateien; stattdessen der vollständige Ordner `…_ketaballah.net`), `mahmoud_ali_al_banna_32kbps` (eine leere Datei), `Ibrahim_Akhdar_64kbps` (nicht vorhanden).
- **Basmala:** Die App spielt vor Vers 1 jeder Sure (außer 1 und 9) die Datei 1:1. Mit dem Erkennungsmodell der App wurde für jeden Ordner mitgeschrieben, dass 1:1 die Basmala ist und 2:1 nur „الم“ enthält (keine doppelte Basmala).
- **Lernmodus:** Die Tonhöhe wurde gemessen: Bei Al-Minshawi folgt jedem Vers eine Stimme eine Oktave höher (ca. 370–420 Hz, Kinder), bei Al-Husary „Muallim“ eine Pause.
- **Hörprobe:** In der Auswahl spielt jeder Rezitator Sure 112 (al-Ichlas).

## 5. Hadithe: HadeethEnc.com

| | |
|---|---|
| Website | https://hadeethenc.com |
| Herausgeber | Enzyklopädie der übersetzten Prophetenüberlieferungen (Rowwad Translation Center, in Zusammenarbeit mit IslamHouse) |
| Inhalt | Ausgewählte Hadithe, jeweils mit arabischem Originaltext, Übersetzung, **Einstufung** (z. B. sahih), **Quellenangabe** (z. B. Bukhari/Muslim), Erläuterung und Lehren |
| Umfang | Deutsch: 622 Hadithe · Türkisch: über 2.100 Hadithe |
| Abruf | Offizielle API (`/api/v1/…`), Skript `scripts/fetch-hadeethenc.py` |

Bei einzelnen Hadithen gibt HadeethEnc die Einstufung oder Quelle nur auf Arabisch an. Die App zeigt sie dann so, wie sie dort steht.

**Ordnung in der App** (abgeleitet, die Texte selbst bleiben unverändert):

- **Themen:** der Themenbaum von HadeethEnc (7 Hauptthemen, darunter Unterthemen). Einige deutsche und türkische Themen-Namen von HadeethEnc enthalten Tippfehler oder sind unübersetzt geblieben (z. B. „Fraid - Erbracht“, „Stops and Starts“). Nur diese Navigations-Überschriften werden korrigiert, siehe `scripts/hadith-titles.mjs`.
- **Einstufung (Sahih/Hasan):** aus dem arabischen Urteil von HadeethEnc (صحيح → Sahih, حسن → Hasan). Das vollständige Urteil steht in der Detailansicht im Wortlaut.
- **Sammlungen:** aus der arabischen Quellenangabe, z. B. „متفق عليه“ → Buchari und Muslim (Muttafaqun ʿalayh), „رواه أبو داود والترمذي“ → Abu Dawud und Tirmidhi. Die vollständige Angabe steht in der Detailansicht im Wortlaut.
- **Hadith des Tages:** jeden Tag ein anderer authentischer (sahih) Hadith aus den Themen Koran sowie Charakter und Benehmen.

## 5a. Dua & Zikr

- **Aus dem Koran:** eine Auswahl bekannter Bittgebete (vor allem „Rabbanā“-Verse), siehe `src/lib/duas.ts`. Die App zeigt den Vers **unverändert** aus den Koran-Quellen oben (Tanzil, QuranEnc), mit Umschrift von Tanzil. Hier wird nur festgelegt, *welche* Verse gezeigt werden. Jede Stelle lässt sich im Koran-Leser nachprüfen, und ein Test prüft, dass die Verse existieren und die erwarteten Worte enthalten.
- **Aus der Sunnah:** die Themen „Dua und Zikr“ der HadeethEnc-Enzyklopädie, zum Beispiel Morgen- und Abendgedenken, Gedenken beim Gebet, überlieferte Bittgebete sowie Bittgebete in schwierigen Zeiten, jeweils mit arabischem Text, Übersetzung, Quelle, Einstufung und Erläuterung. Im Türkischen gibt es dazu über 100 Hadithe, im Deutschen über 50.
- **Vers des Tages** (Startseite): eine feste Auswahl bekannter, für sich verständlicher Verse (`src/lib/daily.ts`), unverändert aus den Koran-Quellen oben. Ein Test prüft, dass alle Stellen existieren.
- **Nicht verwendet:** Hisnul Muslim. Ein geprüfter, frei verfügbarer Datensatz mit deutscher und türkischer Übersetzung war nicht zu finden, und selbst übersetzen kommt bei religiösen Texten nicht infrage.

## 5b. Rezitation prüfen: Spracherkennung auf dem Gerät

| | |
|---|---|
| Modell | [tarteel-ai/whisper-base-ar-quran](https://huggingface.co/tarteel-ai/whisper-base-ar-quran) von Tarteel AI: ein Whisper-Modell, das auf Koran-Rezitationen trainiert wurde (Apache-2.0) |
| Umwandlung | Automatisch per GitHub-Workflow `.github/workflows/model.yml`: whisper.cpp v1.9.3 (MIT), quantisiert auf q8_0 (82 MB), Release `modell-quran-v2` |
| Einbindung | whisper.rn (MIT); Mikrofon über expo-audio |
| Datenschutz | Die Erkennung läuft vollständig auf dem Handy. Die Stimme wird nicht gespeichert und nicht übertragen. Aus dem Internet geladen wird nur einmalig das Modell (aus dem GitHub-Release, mit Prüfsumme). |

**So prüft die App** (`src/lib/recite/`):

- **Streng, Buchstabe für Buchstabe:** Jedes erkannte Wort wird mit dem Wort aus dem Tanzil-Text verglichen. Toleriert werden nur Schreibvarianten ohne Einfluss auf die Aussprache (Vokalzeichen, Hamza-Träger, Alif-Formen, Ta marbuta/Ha, Alif maqsura/Ya). Schon ein anderer Buchstabe ist ein Fehler (z. B. „نرزقهم“ statt „نرزقكم“, „يعلمون“ statt „تعلمون“, „فقال“ statt „قال“).
- **Wiederholungen und Neuansätze** sind kein Fehler: Wer zurückspringt und noch einmal ansetzt, wird nicht bestraft. Für jedes Wort zählt der letzte Durchgang; ein früherer Versprecher erscheint als „selbst korrigiert“.
- **Isti‘adha, Basmala vor einer Sure, „Sadaqa llahu l-‘azim“ und „Amin“** nach Al-Fatiha werden übergangen. Bei Al-Fatiha ist die Basmala freiwillig (in der hanafitischen Schule wird sie still gesprochen).
- **Unsicher statt falsch (gelb):** (1) wenn eine zweite, gründlichere Erkennung (Strahlsuche) an dieser Stelle das richtige Wort hört, (2) wenn das gehörte Wort so nirgends im Koran vorkommt – wer sich beim Auswendig-Rezitieren vertut, sagt fast immer ein anderes echtes Koranwort; ein Nicht-Wort ist meist ein Hörfehler der Erkennung. Der Wortschatz (14.648 Wortformen) wird aus dem Tanzil-Text erzeugt (`scripts/build-quran-vocab.mjs`).
- **Zusammenhören:** Die häufigste Ursache für Fehlalarme ist ein Schnitt zwischen zwei Aufnahme-Abschnitten mitten im Vers – ganze Verse erkennt das Modell fast fehlerfrei. Wird ein Wort an einer Schnittstelle markiert, hört die App die beiden Abschnitte noch einmal gemeinsam ab. Hört sie dort das erwartete Wort, entfällt „ausgelassen“; „falsch“ wird höchstens zu „unsicher“, nie zu „richtig“.
- **Nachhören:** Scheint mitten in einem Abschnitt eine Phrase zu fehlen, hört die App den Abschnitt noch einmal in zwei Hälften ab. Die Erkennung überspringt sonst manchmal wiederholte Phrasen (z. B. 94:5–6). Das ändert nur Auslassungen, nie falsche Wörter.
- **Abschnitte** entstehen an Pausen (ab 0,5 s); längere Passagen werden ab 14 s an der nächsten Atempause geteilt (spätestens bei 20 s), nie mitten im Wort. Längere Abschnitte überschreiten sonst das Token-Limit der Erkennung (pro Abschnitt nur etwa 28 Wörter mit Vokalzeichen).
- **Vokal-Hinweise (zuschaltbar):** Vokalzeichen werden nur als Hinweis verglichen (gemessen: 99,4 % Übereinstimmung bei korrekter Rezitation unbekannter Rezitatoren – für ein Urteil „falsch“ zu wenig).

**Messung** (`scripts/recite-eval/`, Workflows „Auswertung Rezitation prüfen“; Berichte und Rohdaten am Release `rezitation-auswertung`). Erkannt wird mit genau dem whisper.cpp der App, abgeglichen mit genau dem Code der App:

| Test | Ergebnis |
|---|---|
| **Verwechslungen ähnlicher Verse** (Mutashabihat): Aufnahme eines Verses, geprüft gegen den Text eines Verses, der sich nur in 1–2 Wörtern unterscheidet (406 Verspaare aus dem Korantext, 3 Rezitatoren, 3.936 Abweichungen) | **99,92 % gefunden**, davon Ein-Buchstaben-Unterschiede 99,59 %, andere Wörter, ausgelassene und eingefügte Wörter je 100 % (vorher, mit 75-%-Ähnlichkeit: 95 %, Ein-Buchstaben-Unterschiede nur 73 %) |
| **Korrekte Rezitation, bekannte Rezitatoren** (1.365 Verse von Alafasy, Husary, Minshawi; EveryAyah) | 0,05 % der Wörter zu Unrecht rot (4 von 7.845), 1,3 % gelb; **99,71 % der Verse ganz ohne rote Markierung** |
| **Korrekte Rezitation, unbekannte Rezitatoren** (88 ganze Suren am Stück von 8 Rezitatoren, die nicht in den Trainingsdaten sind; mp3quran.net) | 1,29 % der Wörter zu Unrecht rot, 3,6 % gelb; **63 von 88 Suren ganz ohne rote Markierung** (vor den Verbesserungen: 6,4 % rot, 31 Suren) |

**Modellwahl:** Im Workflow „Modellvergleich“ wurden fünf weitere frei lizenzierte Koran-Erkennungsmodelle von Hugging Face unter denselben Bedingungen gemessen (deepdml/whisper-base- und -small-ar-quran-mix-norm, NightPrince/whisper-small-quran-tashkeel, Baselhany/Quran_Whisper_base_fine_tune, jodijhouranda/ayata-whisper-quran-v2). Keines war klar besser: Das dreimal größere deepdml-small lag insgesamt leicht vorn, hatte aber mehr rote Fehlalarme und wäre auf dem Handy deutlich langsamer; alle anderen lagen deutlich zurück. Deshalb bleibt es bei Tarteel.

**Ehrliche Grenzen:** Das Erkennungsmodell wurde mit den EveryAyah-Rezitatoren trainiert und versteht unbekannte Stimmen – also auch deine – schlechter. Bei Rot oder Gelb deshalb die eigene Aufnahme anhören („Meine Aufnahme“) und mit dem Vorbild vergleichen. Tajwid-Regeln wie Dehnungen, Ghunna oder die genaue Aussprache einzelner Laute werden **nicht** bewertet.

## 6. Gebetszeiten, Qibla & Hijri-Kalender: Berechnung auf dem Gerät

- **adhan-js** (Batoul Apps, MIT-Lizenz, v4.4.6): astronomische Berechnung der Gebetszeiten und der Qibla-Richtung. Standard ist die Methode „Turkey“, eine Annäherung an die Diyanet-Methode (Fajr 18°, Isha 17° plus die Diyanet-Zuschläge, *temkin*). Für Deutschland ist das eine **Annäherung**. Die offiziellen DITIB-/Diyanet-Zeiten können um einige Minuten abweichen, im Sommer bei Fajr und Isha auch mehr. Deshalb gibt es eine Feinjustierung pro Gebet.
- **@umalqura/core** (MIT): Hijri-Datum nach dem Umm-al-Qura-Kalender. Der Diyanet-Kalender kann um einen Tag abweichen; dafür gibt es die Hijri-Korrektur (±2 Tage).

## 7. Azan-Aufnahmen: Wikimedia Commons und Freesound

Fünf Stimmen und ein Fadschr-Ruf. Alle Aufnahmen sind frei lizenziert (CC0, CC BY oder CC BY-SA) und liegen als OGG-Dateien in `assets/sounds`; Android spielt sie als Ton der Gebetserinnerung (ein Benachrichtigungskanal je Datei). Jede Stimme gibt es vollständig und als Kurzfassung, die an der ersten Atempause nach etwa 25–35 Sekunden endet (nach dem vierfachen „Allāhu akbar“ bzw. dem ersten Glaubensbekenntnis). Verwaltung in der App: `src/lib/azan.ts`.

### So wurden die Aufnahmen ausgewählt (November 2026)

1. **Suche:** 83 Kandidaten – 15 von Wikimedia Commons, 68 von Freesound (Suche nach adhan, azan, ezan, adzan, athan, muezzin, call to prayer; nur Lizenzen ohne „NC“ und ohne „Sampling+“). Werkzeug: `scripts/azan/check.py`, Ablauf `.github/workflows/azan-check.yml`, Bericht mit Spektrogrammen und verlustfreien Tonspuren im Release „azan-kandidaten“.
2. **Klang:** Abstand zwischen Stimme und Grundrauschen gemessen (50-ms-Fenster, 95. gegen 10. Perzentil) und jedes Spektrogramm angesehen. 59 Aufnahmen hatten weniger als 25 dB Abstand – fast alle Feldaufnahmen mit Verkehr, Wind, Booten oder mehreren Moscheen gleichzeitig (auch alle Istanbul-Aufnahmen) – und schieden aus.
3. **Wortlaut:** Whisper large-v3 schreibt jeden Ruf einzeln mit (an den Atempausen geschnitten, `scripts/azan/phrases.py`). Aufgenommen wurden nur vollständige sunnitische Gebetsrufe in der richtigen Reihenfolge – 4× Allāhu akbar, 2× Glaubensbekenntnis, 2× Bekenntnis zum Gesandten, 2× ḥayya ʿalā ṣ-ṣalāh, 2× ḥayya ʿalā l-falāḥ, 2× Allāhu akbar, 1× lā ilāha illā llāh – ohne Zusätze wie „ḥayya ʿalā khayri l-ʿamal“ oder „ashhadu anna ʿAliyyan waliyyu llāh“ und ohne doppeltes Schluss-„lā ilāha illā llāh“.
   - Aussortiert, weil unvollständig: „Adhan, Great Mosque of Mecca – Jan 21, 2013“ (endet nach dem zweiten ḥayya ʿalā l-falāḥ).
   - Aussortiert, weil sich der Wortlaut nicht belegen ließ (Whisper erkennt den stark verzierten Gesang nicht): Mardin (Freesound 168652) und Shalqar/Kasachstan (Commons).
   - Lizenz nicht belastbar: „Call to prayer by Sabah Fakhry.mp3“ (als gemeinfrei markiert mit der Begründung, der Adhan sei alt – das gilt für den Text, nicht für die Aufnahme von 1985).
4. **Bearbeitung** (`scripts/azan/make_sound.py`): Ausschnitt, sanfte Verdichtung lauter Stellen, Lautheit ca. −10,5 LUFS (wie die bisherigen Töne), Spitzen ≤ −1,5 dBTP, Ein-/Ausblenden, Mono, OGG Vorbis.

### Stimmen

| Stimme in der App | Dateien | Original | Urheber | Lizenz | Prüfung |
|---|---|---|---|---|---|
| Stimme 1 | `azan_a.ogg` (2:34), `azan_short.ogg` (0:28) | [Beautiful adhan.ogg](https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg) | Adam-synagda | CC0 | alle 12 Rufe erkannt |
| Stimme 2 | `azan_b.ogg` (3:03), `azan_b_short.ogg` (0:32) | [Azan.ogg](https://commons.wikimedia.org/wiki/File:Azan.ogg) | Andrewler | CC BY-SA 4.0 | Rufe vollständig; am Ende das Bittgebet nach dem Adhan („Allāhumma rabba hādhihi d-daʿwati t-tāmma …“) |
| Medina | `azan_medina.ogg` (3:06), `azan_medina_short.ogg` (0:35) | [33937 ejaz215 call-to-prayer-from-the-prophet-s-mo.ogg](https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg) (ursprünglich Freesound 33937; laut Beschreibung aus der Prophetenmoschee) | ejaz215 | CC BY 3.0 | alle 12 Rufe erkannt |
| Türkischer Ezan | `azan_rast.ogg` (4:52), `azan_rast_short.ogg` (0:27) | [الأذان (Adhan/Call to Prayer)](https://freesound.org/people/sonically_sound/sounds/639494/) (Freesound 639494; Schlagwörter: Turkish, ezan, cami, rast) | sonically_sound | CC0 | 11 von 12 Rufen erkannt; der zwölfte steht an der Stelle des ersten ḥayya ʿalā ṣ-ṣalāh, insgesamt sunnitischer Aufbau mit einfachem Schluss |
| Aaqib Azeez | `azan_aaqib.ogg` (1:26), `azan_aaqib_short.ogg` (0:27) | [The Adhan - Muslim Call to Prayer - Aaqib Azeez.mp3](https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3) | Atcovi | CC BY-SA 4.0 | alle 12 Rufe erkannt |
| Fadschr-Ruf (nur Morgengebet) | `azan_fajr.ogg` (3:51) | [Eid al-Fitr Fajr azan at Malmö Mosque - 19 August 2012.webm](https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm) (Islamic Center Malmö, Muezzin Besim Azemi; auf YouTube unter CC BY veröffentlicht, von Commons geprüft) | Islamic Center Malmö | CC BY 3.0 | alle Rufe einschließlich 2× „aṣ-ṣalātu khayrun mina n-naum“; abgeschnitten vor dem anschließenden Segensgruß (Ṣalawāt) |

Die bearbeiteten Dateien (gekürzt, Lautstärke angeglichen, Mono) stehen unter derselben Lizenz wie das jeweilige Original.

„Stimmen abwechseln“ wechselt bei jedem Gebet zur nächsten der fünf Stimmen (für ein Datum immer gleich). „Fadschr-Ruf am Morgen“ gilt nur für die vollständige Länge, weil die Kurzfassung vor dem Satz „aṣ-ṣalātu khayrun mina n-naum“ endet.

### SHA-256 der Dateien in der App

```
35fe06b08fe80505c550c33fed8a783fa9901ddc81ac884958b4be048f5b2a79  assets/sounds/azan_a.ogg
39022381cab76d098185e07178dc7e0a999fda04aeffa3e55602d603d227954e  assets/sounds/azan_short.ogg
2163ceafb8a05064a5ea5e1e0a7fac5fff958a21fcf830844d557d496b9b23c3  assets/sounds/azan_b.ogg
df7a83cf42eb4c8fd5c17b363cd97713e62493fbe5942e70012c6cbbe18dc14f  assets/sounds/azan_b_short.ogg
f3b0eb057da821213b77cafba8464ef58a0f9ad7775da4b8ad78d438968bbf92  assets/sounds/azan_medina.ogg
ba4e7585b0f11cd95c356ac83b906748d52ba62f6a2877e7b464ae07538e255c  assets/sounds/azan_medina_short.ogg
2086de7c4492f2cd26401a12edda2b079b47a5d4dec87c0b4b629bdb841dddc5  assets/sounds/azan_rast.ogg
272089f07af57579dbf4c6e73e182e01c181aa492ff70a6852ba3f246a1a1c27  assets/sounds/azan_rast_short.ogg
670f60b1996e8458cb42a3809e42b71676dc43f7a57ab36391444f1614c2cc1b  assets/sounds/azan_aaqib.ogg
9b450da7106ab99af9c3d55f0f8ea38a3e4683035630e1908c3399223f0e1eca  assets/sounds/azan_aaqib_short.ogg
97f17309790deedfc60ebaea26c684fc7802d3b9abea9e8d1ed5e3501f8714f6  assets/sounds/azan_fajr.ogg
```

## 8. Schriften

- **Amiri Quran** und **Amiri** von Khaled Hosny, SIL Open Font License 1.1 (über `@expo-google-fonts`).

## 9. Suren-Namen auf Deutsch und Türkisch

Die arabischen Namen stammen aus den Tanzil-Metadaten. Die deutschen Umschriften und Bedeutungen sind gängige Bezeichnungen, angelehnt an die Surentitel bei Bubenheim/Elyas. Die türkischen Namen folgen der bei Diyanet üblichen Schreibweise. Beides haben wir selbst zusammengestellt; Korrekturhinweise sind willkommen.

---

## Prüfsummen der Originaldateien (SHA-256)

```
7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326  data/sources/tanzil/quran-uthmani.txt
228df2a717671aeb9d2ff573002bd28d6b3f973f4bc7153554e3a81663d67610  data/sources/tanzil/quran-simple-clean.txt
8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a  data/sources/tanzil/quran-data.xml
a9be7b4f291d8cf6f72dbd22dbc4b58f4716c137e56dbdc562aee3fc8c4bc4af  data/sources/tanzil/tr.diyanet.txt
7c30902a1060d14249791a24cb364ac8ae178455373fd545633b33a2254d3151  data/sources/tanzil/quran-simple.txt
a4130441fb6c2e8c38510461cbb1588170f593d046680691c99cdb5fb474bb19  data/sources/tanzil/tr.transliteration.txt
8c20d95e484534e921cd2e0d2546aab7f5300090c0bd76697095b3ca1db1e01d  data/sources/tanzil/en.transliteration.txt
568994caa6efeafea41a2388d69df391688ae4146a65d05ce081c88720db03fb  data/sources/quranenc/german_bubenheim.sqlite
1bad8f575b1bc9d1da69198b2668cb74f148456c2d9e15b7a900858561b38bfb  data/sources/quranenc/turkish_shahin.sqlite
```

Nachprüfen: `sha256sum data/sources/*/*` und `node scripts/build-quran-data.mjs` (gibt die Prüfsummen ebenfalls aus).
