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

Verfügbar: Mishary Rashid Alafasy, Mahmoud Khalil Al-Husary (auch im Lernmodus „Muallim“), Mohamed Siddiq Al-Minshawi, Abdul Basit Abdus-Samad, Abdurrahman As-Sudais, Maher Al-Muaiqly, Saud Ash-Shuraim.

## 5. Hadithe: HadeethEnc.com

| | |
|---|---|
| Website | https://hadeethenc.com |
| Herausgeber | Enzyklopädie der übersetzten Prophetenüberlieferungen (Rowwad Translation Center, in Zusammenarbeit mit IslamHouse) |
| Inhalt | Ausgewählte Hadithe, jeweils mit arabischem Originaltext, Übersetzung, **Einstufung** (z. B. sahih), **Quellenangabe** (z. B. Bukhari/Muslim), Erläuterung und Lehren |
| Umfang | Deutsch: 622 Hadithe · Türkisch: über 2.100 Hadithe |
| Abruf | Offizielle API (`/api/v1/…`), Skript `scripts/fetch-hadeethenc.py` |

Bei einzelnen Hadithen gibt HadeethEnc die Einstufung oder Quelle nur auf Arabisch an. Die App zeigt sie dann so, wie sie dort steht.

## 6. Gebetszeiten, Qibla & Hijri-Kalender: Berechnung auf dem Gerät

- **adhan-js** (Batoul Apps, MIT-Lizenz, v4.4.6): astronomische Berechnung der Gebetszeiten und der Qibla-Richtung. Standard ist die Methode „Turkey“, eine Annäherung an die Diyanet-Methode (Fajr 18°, Isha 17° plus die Diyanet-Zuschläge, *temkin*). Für Deutschland ist das eine **Annäherung**. Die offiziellen DITIB-/Diyanet-Zeiten können um einige Minuten abweichen, im Sommer bei Fajr und Isha auch mehr. Deshalb gibt es eine Feinjustierung pro Gebet.
- **@umalqura/core** (MIT): Hijri-Datum nach dem Umm-al-Qura-Kalender. Der Diyanet-Kalender kann um einen Tag abweichen; dafür gibt es die Hijri-Korrektur (±2 Tage).

## 7. Azan-Aufnahmen: Wikimedia Commons

| Datei in der App | Original | Urheber | Lizenz | SHA-256 |
|---|---|---|---|---|
| `assets/sounds/azan_a.ogg` | [Beautiful adhan.ogg](https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg) (2:34) | Adam-synagda | CC0 | `35fe06b0…2a79` |
| `assets/sounds/azan_b.ogg` | [Azan.ogg](https://commons.wikimedia.org/wiki/File:Azan.ogg) (3:03) | Andrewler | CC BY-SA 4.0 | `2163ceaf…23c3` |
| `assets/sounds/azan_short.ogg` | Die ersten 28 Sekunden von „Beautiful adhan.ogg“ mit Ausblendung | Adam-synagda | CC0 | `39022381…954e` |

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
568994caa6efeafea41a2388d69df391688ae4146a65d05ce081c88720db03fb  data/sources/quranenc/german_bubenheim.sqlite
1bad8f575b1bc9d1da69198b2668cb74f148456c2d9e15b7a900858561b38bfb  data/sources/quranenc/turkish_shahin.sqlite
```

Nachprüfen: `sha256sum data/sources/*/*` und `node scripts/build-quran-data.mjs` (gibt die Prüfsummen ebenfalls aus).
