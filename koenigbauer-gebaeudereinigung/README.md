# Königbauer Gebäudereinigung – Wachstumspaket

| Ordner | Inhalt |
|---|---|
| `strategie/wachstumsplan.md` | 90-Tage-Plan, rechtliche Spielregeln, Budget, Kanäle, Kundenportal-Roadmap |
| `strategie/google-ads-kampagne.md` | Fertige Google-Ads-Kampagne: Keywords, Negativliste, Anzeigentexte, Einstellungen |
| `website/` | Neue Homepage (eine Seite, Handy-optimiert, lokales SEO, Kontaktformular) + Impressum/Datenschutz |
| `print/visitenkarte.html` | Visitenkarte 85×55 mm, Vorder- und Rückseite mit Foto |
| `print/flyer-a4.html` | Infoblatt A4 mit Foto als Briefbeilage/PDF |
| `agents/` | Vertriebs-Agenten: Lead-Finder → Texter (Claude) → Compliance-Wächter → Serienbriefe/Anrufliste → CRM mit Nachfass-Planung |

## Die Agenten
```
 Lead-Finder ──► CRM ──► Texter (KI) ──► Compliance ──► Serienbriefe + Anrufliste
 (OpenStreetMap:      (SQLite)  (persönliche     (welcher Kanal     (drucken/Online-
  Hausverwaltungen,             Briefe, Telefon-  ist erlaubt?)       Briefdienst)
  Praxen, Büros …)              leitfaden)                │
                                     ▲                    ▼
                                     └──── Nachfass-Planer: „python run.py heute"
```

### Einrichten (einmalig, auf deinem PC)
```bash
cd agents
pip install -r requirements.txt
# Optional für KI-Texte (sonst wird eine gute Vorlage genutzt): API-Schlüssel von console.anthropic.com
export ANTHROPIC_API_KEY=sk-ant-...        # Windows: set ANTHROPIC_API_KEY=sk-ant-...
```
Dann `firmenprofil.json` mit deinen echten Daten füllen (Telefon, Adresse, Referenzen).

### Benutzen
```bash
python run.py leads-finden                         # alle Firmen im 20-km-Umkreis ins CRM
python run.py kampagne --anzahl 25                 # 25 Briefe + Anrufliste in agents/ausgabe/
python run.py versendet 1 2 3                      # nach dem Versand markieren → Nachfass in 7 Tagen
python run.py heute                                # tägliche To-do-Liste
python run.py status 2 termin --notiz "Do 10 Uhr"  # Status pflegen
python run.py uebersicht                           # Pipeline
python run.py import-csv kontakte.csv              # eigene Kontakte (Netzwerk, Messe) importieren
```
`agents/ausgabe/briefe.html` im Browser öffnen → Drucken → als PDF speichern → drucken oder bei einem Online-Briefdienst hochladen.

### Warum keine Massen-E-Mails?
Unaufgeforderte Werbe-E-Mails sind in Deutschland auch an Firmen abmahnfähig (§ 7 UWG). Die Agenten nutzen deshalb Brief + Nachfass-Anruf für Kaltakquise und E-Mail nur bei Einwilligung. Details im Wachstumsplan.
