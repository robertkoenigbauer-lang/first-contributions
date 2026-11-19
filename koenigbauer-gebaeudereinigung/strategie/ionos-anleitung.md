# Neue Homepage bei IONOS online stellen – Schritt für Schritt

Dauer: ca. 30–45 Minuten. Du brauchst: deine IONOS-Zugangsdaten und die Datei **`website-upload.zip`** (hat Claude dir geschickt bzw. liegt im Ordner `koenigbauer-gebaeudereinigung/`).

---

## Schritt 0 – Prüfen, was du bei IONOS hast (5 Min.)
1. Auf **ionos.de** einloggen → oben **„Menü“** → **„Verträge & Abrechnung“**.
2. Schau, welcher Vertrag noch läuft:
   - **„Webhosting“** (z. B. Webhosting Essential/Business) → perfekt, weiter mit Schritt 1.
   - **„MyWebsite“ / „Website-Baukasten“** → damit kann man **keine eigenen Dateien hochladen**. Dann im Kundenkonto auf das kleinste **Webhosting**-Paket wechseln (Tarif ändern) – oder Claude kurz schreiben, dann gehen wir das zusammen durch.
3. Prüfe unter **„Menü“ → „Domains & SSL“**, dass **koenigbauer-gebaeudereinigung.de** dort steht und **nicht gekündigt** ist. Steht dort ein Kündigungsdatum, Kündigung der Domain zurücknehmen – sonst ist sie weg.
4. Prüfe unter **„Menü“ → „E-Mail“**, ob das Postfach **info@koenigbauer-gebaeudereinigung.de** noch existiert. Wenn du die E-Mail gekündigt hast, Claude Bescheid geben: Dann ändern wir die Adresse auf der Website und im Kontaktformular.

## Schritt 1 – Alte Website sichern (5 Min.)
1. **„Menü“ → „Hosting“** → beim Webhosting-Paket auf **„Webspace“** bzw. **„Webspace-Explorer“** klicken.
2. Den Ordner, in dem die alte Seite liegt (meist das Hauptverzeichnis `/` oder ein Ordner wie `/koenigbauer`), anhaken → **„Herunterladen“**. Damit hast du eine Sicherung.

## Schritt 2 – Alte Website entfernen (2 Min.)
1. Im Webspace-Explorer im selben Ordner alle alten Dateien markieren → **„Löschen“**.
   (Nicht löschen: Ordner wie `logs` oder `.well-known`, falls vorhanden.)

## Schritt 3 – Neue Website hochladen (5 Min.)
1. Im leeren Ordner auf **„Hochladen“** → **`website-upload.zip`** auswählen.
2. Die hochgeladene ZIP-Datei anhaken → **„Entpacken“**.
3. Danach müssen direkt im Ordner liegen: `index.html`, `impressum.html`, `datenschutz.html`, `kontakt.php`, `danke.html`, die Ordner `img` und `fonts`. Liegen sie in einem Unterordner, alles eine Ebene nach oben verschieben.
4. Die ZIP-Datei selbst wieder löschen.

## Schritt 4 – Domain auf den Ordner zeigen lassen (3 Min.)
1. **„Menü“ → „Domains & SSL“** → bei koenigbauer-gebaeudereinigung.de auf das **Zahnrad** → **„Verwendungsart ändern“** bzw. **„Ziel“**.
2. **„Webspace“** wählen und genau den Ordner aus Schritt 3 angeben → speichern.
3. Dasselbe für **www.koenigbauer-gebaeudereinigung.de** prüfen.

## Schritt 5 – SSL einschalten (2 Min.)
1. **„Domains & SSL“** → bei der Domain auf **„SSL-Zertifikat“** → das kostenlose Zertifikat aktivieren/zuweisen (bei IONOS-Webhosting inklusive).
2. Falls angeboten: **„HTTPS-Weiterleitung“** einschalten, damit alle auf die sichere Seite kommen.

## Schritt 6 – Testen (10 Min.)
1. **https://www.koenigbauer-gebaeudereinigung.de** am Handy und am PC öffnen. (Neue Domains/Änderungen brauchen manchmal bis zu einer Stunde.)
2. Preisrechner ausprobieren, „Dieses Paket anfragen“ klicken und das Kontaktformular mit einer **Testanfrage** abschicken. Kommt die E-Mail bei info@ an? → Fertig.
3. Kommt nichts an: Im IONOS-Postfach ein zweites Postfach **website@koenigbauer-gebaeudereinigung.de** anlegen (wird als Absender genutzt) und erneut testen. Sonst Claude Bescheid geben.
4. Impressum und Datenschutz unten auf der Seite anklicken – beide müssen erreichbar sein.

## Schritt 7 – Danach
- **Auftragsverarbeitungsvertrag (AVV)** mit IONOS abschließen: **„Menü“ → „Datenschutz“** → AVV online zustimmen. Pflicht wegen Kontaktformular.
- Im **Google-Unternehmensprofil** die Website-Adresse eintragen.
- In der **Google Search Console** die Seite anmelden (Claude führt dich).

## Später Änderungen machen
Claude ändert die Dateien und schickt dir eine neue ZIP-Datei. Du wiederholst nur **Schritt 2 und 3**. Für den Preis im Rechner muss nur die eine Datei `index.html` ausgetauscht werden.

---

### Social-Media-Symbole auf der Website einschalten
Ganz unten in `index.html` steht `var SOCIAL = { instagram: '', tiktok: '', facebook: '' };`. Die Profil-Adressen eintragen (z. B. `'https://www.instagram.com/koenigbauer.gebaeudereinigung'`), dann erscheinen die Symbole automatisch im Fuß der Seite – oder Claude die Profilnamen schicken.
