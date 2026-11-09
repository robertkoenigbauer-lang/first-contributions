# Königbauer Gebäudereinigung – Wachstumspaket

| Ordner | Inhalt |
|---|---|
| `website/` | Neue Homepage (modern, Logo-Farben Schwarz/Blau/Weiß, Slider, Animationen, handyoptimiert, ohne Cookies/Tracking), Impressum, Datenschutz, Kontaktformular (`kontakt.php`), Foto-Aufbereitung |
| `print/visitenkarte.html` | Visitenkarte 85×55 mm (+3 mm Beschnitt), Vorderseite Logo, Rückseite Foto + Kontakt |
| `print/flyer-a4.html` | Infoblatt A4 als Briefbeilage / PDF |
| `agents/` | **Vertriebs-Agenten**: Lead-Finder → Texter (KI) → Rechts-Check → Serienbriefe mit Logo + Anrufliste → CRM mit Nachfass |
| `finanzen/` | **Finanz-Agenten**: Kontoauszüge zuordnen, Rechnungen prüfen, Steuern schätzen, Rücklagen, Steuerkalender, KI-Fragen |
| `strategie/` | 90-Tage-Wachstumsplan, Google-Ads-Kampagne |

---

## 1. Website online bringen (≈ 2–5 €/Monat statt IONOS)

**Domain behalten!** `koenigbauer-gebaeudereinigung.de` steht schon auf deinen Rechnungen und ist bei Google bekannt. Nicht neu kaufen, sondern **umziehen**:

1. Neues Webhosting mit PHP und E-Mail buchen, Server in Deutschland, z. B. *netcup Webhosting*, *all-inkl.com*, *Strato* oder *webgo* – Einstiegstarife liegen meist bei ca. 2–5 €/Monat inkl. Domain und E-Mail-Postfächern (Preise beim Anbieter prüfen).
2. Bei IONOS im Kundenbereich den **Auth-Code** (Transfer-Code) für die Domain anfordern.
3. Beim neuen Anbieter „Domain-Umzug / KK-Antrag" wählen und den Auth-Code eingeben.
4. **Vorher** beim neuen Anbieter die Postfächer `info@…` (und z. B. `website@…` für das Formular) anlegen – sonst kommen während des Umzugs keine Mails an.
5. Erst wenn die Domain umgezogen ist und Mails laufen: IONOS-Vertrag kündigen.
6. Den Inhalt des Ordners `website/` per FTP/Dateimanager hochladen (bei den meisten Hostern im Browser möglich), SSL-Zertifikat (Let's Encrypt, kostenlos) einschalten.
7. In `datenschutz.html` den Namen des Hosters eintragen, Auftragsverarbeitungsvertrag im Kundenbereich des Hosters abschließen (ein Klick).
8. Im **Google-Unternehmensprofil** die Website-Adresse eintragen.

Optional die Umlaut-Domain `königbauer-gebäudereinigung.de` dazu registrieren und auf die Hauptdomain weiterleiten.

### Fotos einsetzen
```bash
cd website
pip install pillow
python foto_aufbereiten.py dein-foto.jpg              # Porträt -> img/robert-koenigbauer.jpg
python foto_aufbereiten.py buero-vorher-nachher.jpg --galerie 1   # bis --galerie 6
```
Das Skript schneidet zu, hellt dezent auf und entfernt GPS-Daten – kein KI-Filter. Fotos mit Kunden-Objekten nur verwenden, wenn der Kunde einverstanden ist und nichts Vertrauliches zu sehen ist.

---

## 2. Vertriebs-Agenten (`agents/`)
```bash
cd agents
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...     # optional für KI-Texte; Windows: set ANTHROPIC_API_KEY=...
python run.py leads-finden                       # Firmen im 20-km-Umkreis (Büros zuerst) ins CRM
python run.py kampagne --anzahl 25 --segment firma_buero   # 25 Briefe + Anrufliste
python run.py versendet 1 2 3                    # nach Versand -> Nachfass in 7 Tagen
python run.py heute                              # tägliche To-do-Liste
python run.py status 2 termin --notiz "Do 10 Uhr"
python run.py uebersicht
```
Briefe liegen danach in `agents/ausgabe/briefe.html` (mit Logo) → im Browser drucken / als PDF an einen Online-Briefdienst.

---

## 3. Finanz-Agenten (`finanzen/`)
```bash
cd finanzen
pip install -r requirements.txt
python run.py demo && python run.py import daten/demo-konto.csv && python run.py bericht   # erst mal mit Beispieldaten ansehen
```
Echter Betrieb:
1. **Einstellungen** in `einstellungen.json` aus deinen Bescheiden eintragen (Vorauszahlungen ESt/GewSt, Veranlagung einzeln/zusammen, Kirchensteuer, HWK- und BG-BAU-Beitrag).
2. **Kontoauszüge**: Im Sparkasse-Online-Banking → Umsätze → Export „CSV-CAMT" → `python run.py import umsaetze.csv`
3. **Ausgangsrechnungen**: alle RE-xxxx.pdf in einen Ordner → `python run.py rechnungen ordner/`
4. **Cockpit**: `python run.py bericht` → `ausgabe/finanzbericht.html`

| Befehl | Was du bekommst |
|---|---|
| `bericht` | Umsatz, Gewinn, Steuerschätzung, **„Jeden Monat zurücklegen: X €"**, USt-Zahllast pro Monat, Ausgaben nach Kategorie, Termine, offene Rechnungen |
| `offen` | Welche Rechnungen sind noch nicht bezahlt / überfällig |
| `kalender` | USt-VA, Lohnsteuer, SV-Beiträge, ESt- und GewSt-Vorauszahlungen der nächsten 90 Tage |
| `unklar` | Buchungen, die noch keiner Kategorie zugeordnet sind (Stichwort in `kategorien.json` ergänzen) |
| `personal` | Lohnkosten je Monat, Mitarbeiter und Bereich (Gebäudereinigung / ista), Warnungen zu Minijob-Grenze und Mindestlohn. Daten in `daten/personal.json` (Vorlage: `personal.beispiel.json`, bleibt auf deinem Rechner) |
| `frag "…"` | Steuerfrage an die KI – mit deinen echten Zahlen als Grundlage |

**Wichtig:** Das ist ein Planungs- und Frühwarnsystem, damit du nie von einer Nachzahlung überrascht wirst. Die Steuererklärungen und verbindlichen Zahlen macht weiterhin dein Steuerberater – dem kannst du das Cockpit und die zugeordneten Buchungen aber als saubere Grundlage geben.
