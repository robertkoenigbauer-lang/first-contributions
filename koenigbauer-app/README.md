# Königbauer Gebäudereinigung – Betriebs-App

Handy-App (läuft im Browser und lässt sich auf den Startbildschirm legen) für den Chef und die Mitarbeiterinnen.

## Was die App kann

**Für die Mitarbeiterinnen**
- **Stundenzettel**: Tag antippen, „von – bis“, Pause und Objekt eintragen. Am Monatsende **mit dem Finger unterschreiben**.
- **PDF ansehen und drucken**: fertiger Stundenzettel mit Unterschriftsfeldern für Mitarbeiterin und Arbeitgeber.
- **„An Chef senden“**: Ein Knopfdruck schickt das PDF per E-Mail an den Chef. Ist kein Mailserver eingerichtet, öffnet sich die Mail-App des Handys mit dem PDF.
- **Bestellen**: Artikel antippen, Menge mit + und − wählen, dazu freie Wünsche (z. B. „Staubsaugerbeutel Typ XY“). Mit „dringend“ markieren, wenn etwas schon fehlt. Den Stand (offen, bestellt, geliefert) sehen sie unter „Verlauf“.
- **Frühere Stundenzettel**: Alle vergangenen Monate bleiben dauerhaft gespeichert. Die Mitarbeiterin kann sie jederzeit öffnen und als PDF drucken.
- **Kaputt/Melden**: Etwas ist kaputt oder Sonstiges, etwas ist kaputt oder Sonstiges, **mit Foto**. Jede Meldung bleibt mit Datum, Uhrzeit, Ort und Foto gespeichert.
- **Datenschutz**: Jede Mitarbeiterin sieht **nur ihre eigenen** Stunden und Meldungen. Sie sieht keine Kolleginnen, keine Namensliste und keine Preise. Der Server prüft das bei jeder Abfrage, nicht nur die Oberfläche (siehe `test/api.test.js`).

**Für den Chef**
- **Übersicht**: offene Meldungen, Einkaufsliste, Materialkosten pro Monat und Jahr, Stunden des Teams.
- **Material & Kosten**: Verbrauch pro Monat × Preis ergibt die Kosten pro Monat und Jahr. Alle Werte sind änderbar. Einkäufe lassen sich erfassen, dann steigt der Bestand automatisch und die App zeigt die tatsächlichen Ausgaben im Vergleich zur Schätzung.
- **Meldungen**: auf „in Arbeit“ oder „erledigt“ setzen und eine Notiz für die Mitarbeiterin schreiben. Auf Wunsch kommt jede neue Meldung mit Foto auch per E-Mail.
- **Stunden**: PDF für jede Person, gegenzeichnen (Unterschrift des Arbeitgebers) und bei Bedarf den Monat wieder freigeben.
- **Team**: Zugänge anlegen, Passwort zurücksetzen, Zugang deaktivieren.
- **Datensicherung** als Datei herunterladen.

## Starten

Voraussetzung: Node.js 18 oder neuer.

```bash
npm install
npm start          # → http://localhost:3000
```

Beim ersten Aufruf legst du dein Chef-Konto an. Danach unter **Mehr → Mitarbeiter/in anlegen** die Zugänge für die beiden Mitarbeiterinnen erstellen.

Daten (`data/db.json`) und Fotos (`data/uploads/`) liegen im Ordner `data/`. Diesen Ordner regelmäßig sichern.

### Im Internet erreichbar machen (damit es auf allen Handys geht)
Die App muss auf einem Rechner laufen, der immer an ist, zum Beispiel:
- ein kleiner Cloud-Server (Hetzner, IONOS, Strato; ca. 4–6 €/Monat) mit Docker:
  `docker build -t koenigbauer . && docker run -d -p 3000:3000 -v koenigbauer-data:/data koenigbauer`
- oder ein Raspberry Pi zu Hause.

Davor sollte HTTPS laufen (zum Beispiel mit Caddy oder nginx und Let's Encrypt), damit Passwörter verschlüsselt übertragen werden.

### E-Mail-Versand einrichten
Unter **Mehr → E-Mail** den Postausgang (SMTP) deines Mail-Anbieters eintragen und auf „Test-Mail senden“ tippen.
Beispiele: Gmail `smtp.gmail.com`, Port 465, SSL, mit App-Passwort · GMX `mail.gmx.net`, Port 587 · Web.de `smtp.web.de`, Port 587 · IONOS `smtp.ionos.de`, Port 587.

## Tests
```bash
npm test
```
