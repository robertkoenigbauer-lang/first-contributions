# Wachstumsplan Königbauer Gebäudereinigung – 90 Tage

**Ziel:** Mit wenig Geld maximal sichtbar werden, systematisch Gewerbekunden gewinnen und die Büroarbeit durch Automatisierung klein halten.
**Zielgruppen:** Hausverwaltungen/WEGs (Treppenhäuser = Daueraufträge), Firmen mit Büros, Arztpraxen, Kanzleien, Versicherungsagenturen, Banken, Läden, Fitnessstudios, Hotels im Umkreis von 20 km um Neufahrn (Freising, Eching, Hallbergmoos, Unterschleißheim, Garching, Erding, Moosburg, Flughafen-Umfeld).

---

## ⚖️ Erst die Spielregeln – damit dich keiner abmahnt
„Vollautomatisch Nachrichten rausballern" klingt gut, ist per **E-Mail in Deutschland aber verboten – auch an Firmen** (§ 7 UWG). Mitbewerber und Abmahnvereine verschicken dafür gern Abmahnungen (schnell 1.000 €+). Deshalb ist das Agenten-System so gebaut:

| Kanal | Erlaubt? | So nutzen wir ihn |
|---|---|---|
| **Brief per Post** an Firmen | ✅ Ja | Hauptkanal für Kaltakquise. Agent schreibt, du druckst / Online-Briefdienst verschickt. |
| **Anruf bei Firmen** | ⚠️ Mit „mutmaßlicher Einwilligung" | Nachfass-Anruf nach dem Brief bei Firmen mit klarem Reinigungsbedarf. Bei „kein Interesse" → Sperre. |
| **E-Mail / WhatsApp / SMS** | ❌ Nur mit Einwilligung | Nur an Interessenten, die angefragt oder zugestimmt haben (z. B. Checkbox im Website-Formular). |
| **Persönlicher Besuch** | ✅ Ja | Flyer + Visitenkarte bei Läden/Praxen persönlich abgeben – sehr wirksam. |
| **Google, Social Media, Plattformen** | ✅ Ja | Kunden kommen zu dir („Inbound"). |

Das Compliance-Modul der Agenten entscheidet pro Firma automatisch, welcher Kanal erlaubt ist. **Keine Rechtsberatung** – bei Zweifeln kurz mit IHK oder Anwalt abstimmen.

Auch wichtig: **keine Aussagen gegen Mitbewerber** („besser als XY", „die Billigheimer") – das ist unzulässige vergleichende Werbung. Wir gewinnen über Erreichbarkeit, persönlichen Kontakt und Tempo.

---

## Woche 1 – Fundament (fast kostenlos)
- [ ] **Domain** sichern: `koenigbauer-gebaeudereinigung.de` (Hauptdomain, ohne Umlaute – lässt sich in E-Mails/Visitenkarten sicher tippen) **und** `königbauer-gebäudereinigung.de` als Weiterleitung. Kosten ~1–2 €/Monat je Domain (z. B. bei IONOS, Strato, all-inkl., Netcup).
- [ ] **Website** aus `website/` hochladen (Hosting ~3–5 €/Monat oder kostenlos via Netlify/Cloudflare Pages). Platzhalter (Telefon, Adresse, USt-ID) ausfüllen, **Profi-Foto** als `website/img/robert-koenigbauer.jpg` ablegen, Impressum & Datenschutz fertigstellen.
- [ ] **E-Mail-Adresse** info@… und robert@… einrichten.
- [ ] **Google-Unternehmensprofil** anlegen/optimieren (business.google.com): Kategorie „Gebäudereinigungsdienst", Servicegebiete eintragen, 10+ Fotos (Team, Fahrzeug, vorher/nachher), Leistungen, Öffnungszeiten, Website-Link. **Das ist der wichtigste Einzelschritt für „Gebäudereinigung Neufahrn".**
- [ ] **Bewertungen**: Jeden Bestandskunden persönlich um eine Google-Bewertung bitten (Link/QR-Code aus dem Profil). Ziel: 15 Bewertungen in 30 Tagen. Bewertungen sind der größte Hebel im Maps-Ranking.
- [ ] Einträge in **Bing Places, Apple Business Connect, Gelbe Seiten, Das Örtliche, 11880, Cylex, Handwerkskammer-Betriebsbörse** – überall identischer Name/Adresse/Telefon.
- [ ] **Fotoshooting**: 1 Stunde mit lokalem Fotografen (~150–300 €): Porträt, du mit Team, du im Objekt. Für Website, Visitenkarte, Flyer, LinkedIn.

## Woche 2 – Druck & Werbung starten
- [ ] **Visitenkarten** (`print/visitenkarte.html` → PDF) bei Druckerei bestellen (z. B. 500 Stück ~20–30 € bei Online-Druckereien).
- [ ] **Flyer/Infoblatt** (`print/flyer-a4.html`) als Briefbeilage und PDF.
- [ ] **Google Ads** starten nach `google-ads-kampagne.md` (15 €/Tag).
- [ ] **Fahrzeugbeschriftung** mit Website + Telefon (einmalig ~300–600 €; fährt jeden Tag Werbung durch den Landkreis).
- [ ] Bauzaun-/Objektschild „Hier reinigt Königbauer" bei Kunden (mit Erlaubnis).

## Woche 3–12 – Die Akquise-Maschine (Agenten)
Jede Woche, ca. 1–2 Stunden deiner Zeit:
1. **Montag:** `python run.py kampagne --anzahl 25` → Agent schreibt 25 persönliche Briefe + Anrufliste. Du prüfst kurz, druckst oder lädst sie bei einem Online-Briefdienst hoch (z. B. Pingen, LetterXpress, Deutsche Post E-POST – Druck + Porto ab ~1 €/Brief, kein Kuvertieren).
2. **Täglich 5 Min:** `python run.py heute` → wer muss angerufen werden.
3. **Nachfass-Anrufe** 7 Tage nach dem Brief mit Leitfaden aus der Anrufliste (oder eine Teilzeit-Kraft / Bürohilfe übernimmt – du hast ja Personal-Budget).
4. **Status pflegen:** `python run.py status 12 termin` → Agent plant den nächsten Schritt automatisch.

Reihenfolge nach Potenzial: **Hausverwaltungen** zuerst (eine Verwaltung = viele Treppenhäuser), dann Praxen, Firmenbüros, Gewerbeobjekte, Kanzleien/Versicherungen, Läden.

**Rechnung:** 25 Briefe/Woche × 12 Wochen = 300 Firmen. Bei realistisch 2–4 % Abschluss = **6–12 neue Daueraufträge**. Kosten Porto/Druck ≈ 300–400 €.

## Weitere Kanäle (günstig, wirksam)
- **LinkedIn-Profil** für dich als Inhaber + 2 Posts/Woche (vorher/nachher, Team, Tipps). Kontaktanfragen an Facility-Manager und Hausverwalter in der Region sind erlaubt.
- **Netzwerken:** BNI-Chapter Freising/Erding, Gewerbeverband Neufahrn, IHK-Regionalausschuss Freising, Unternehmerfrühstück. Ein Hausverwalter im Netzwerk = Dutzende Objekte.
- **Empfehlungsprogramm:** Bestandskunden bekommen für jede erfolgreiche Empfehlung z. B. eine Monatsreinigung gratis oder 100 €.
- **Ausschreibungen:** Öffentliche Aufträge (Gemeinden, Schulen, Landratsamt Freising) über bund.de / Vergabeportal Bayern beobachten.
- **Plattformen:** MyHammer, Check24 Profis, Blauarbeit – nur für Lückenfüller, Gewerbekunden gibt's eher über Google und Briefe.

## Phase 2 (ab Monat 3): Kundenportal & Automatisierung
Damit du wenig Büroarbeit hast:
- **Kundenportal**: Kunden sehen Reinigungsplan, Reinigungsprotokolle (Foto + Uhrzeit), melden Reklamationen und Sonderwünsche, laden Rechnungen herunter. Einfacher Start: fertige Software für Reinigungsfirmen (z. B. Clean Manager, Fieldcode, Craftnote, Plancraft o. ä. – Testversionen vergleichen) statt Eigenentwicklung. Wenn keine passt, bauen wir es.
- **Mitarbeiter-App** für Zeiterfassung und Objekt-Checklisten (oft im selben Tool enthalten).
- **Angebots-Agent**: Aus Besichtigungsnotizen (Fläche, Intervall, Böden) automatisch ein Festpreis-Angebot als PDF.
- **Rechnungen** automatisch monatlich (lexoffice/sevDesk) + Mahnwesen.
- **Bewertungs-Agent**: Nach 4 Wochen Zusammenarbeit automatisch Bitte um Google-Bewertung (an Bestandskunden erlaubt).

## Budget-Übersicht (monatlich, Startphase)
| Posten | Kosten |
|---|---|
| Domain, Hosting, E-Mail | ~10 € |
| Google Ads | ~450 € |
| Briefe (100/Monat) | ~100–130 € |
| Claude API für die Agenten | ~5–20 € |
| **Summe** | **~600 €/Monat** |
| Einmalig: Fotos, Visitenkarten, Flyer, Fahrzeug | ~500–1.000 € |

## Kennzahlen, die wir jeden Monat ansehen
Anfragen (Google/Website/Telefon) · versendete Briefe · geführte Gespräche · Besichtigungen · Angebote · Abschlüsse · Kosten pro Neukunde · Google-Bewertungen.
