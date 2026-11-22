# E-Mail neu aufstellen: Outlook, Signatur, sevdesk, KI-Hilfe

## Das Wichtigste vorweg
- **1&1 und IONOS sind dieselbe Firma.** Dein Postfach info@koenigbauer-gebaeudereinigung.de liegt bei IONOS. Das bleibt auch so: Es ist im Webhosting-Vertrag drin und kostet nichts extra.
- Du musst **nicht umziehen**, sondern nur **das Programm wechseln**: statt der 1&1-App **Outlook**, am PC und am Handy.
- Die Mails liegen auf dem IONOS-Server (IMAP). Wenn du die 1&1-App löschst, **geht keine Mail verloren**. Outlook zeigt danach dieselben Ordner und dieselben Mails.

---

## Teil 1: Outlook am PC einrichten (10 Min.)
1. Outlook öffnen → **Datei → Konto hinzufügen** (im neuen Outlook: Zahnrad → Konten → **Konto hinzufügen**).
2. E-Mail eingeben: `info@koenigbauer-gebaeudereinigung.de` → **Erweiterte Optionen → Konto manuell einrichten** → **IMAP**.
3. Eintragen:

| | Server | Port | Verschlüsselung |
|---|---|---|---|
| Posteingang (IMAP) | `imap.ionos.de` | **993** | SSL/TLS |
| Postausgang (SMTP) | `smtp.ionos.de` | **465** | SSL/TLS |

   Benutzername ist bei beiden die **komplette E-Mail-Adresse**. Das Passwort ist dein E-Mail-Passwort, nicht das IONOS-Login.
4. **Verbinden.** Nach ein paar Minuten sind alle Ordner und Mails da.
5. Passwort vergessen? IONOS → **E-Mail** → Postfach anklicken → **Passwort ändern**. Danach überall das neue eintragen.

## Teil 2: Outlook am Handy
1. App **„Microsoft Outlook“** installieren → **Konto hinzufügen** → E-Mail eingeben.
2. Wenn gefragt wird: **IMAP** wählen und **Erweiterte Einstellungen** öffnen. Dann dieselben Daten wie oben eintragen.
3. Erst wenn alles in Outlook ankommt, die **1&1-App löschen**.

## Teil 3: Signatur einbauen
1. Erst die Datei **signatur-logo.png** nach IONOS → Webspace → **/public/img** hochladen. Sonst fehlt in der Signatur das Logo.
2. **signatur.html** am PC doppelt anklicken. Sie öffnet sich im Browser.
3. Im Browser **Strg+A** (alles markieren) und **Strg+C** (kopieren) drücken.
4. In Outlook: **Datei → Optionen → E-Mail → Signaturen → Neu** (im neuen Outlook: Zahnrad → Konten → **Signaturen**) → Namen „Königbauer“ eingeben → ins Feld klicken und **Strg+V** drücken → als Standard für neue Nachrichten und Antworten auswählen → **Speichern**.
5. Am Handy (Outlook-App → Einstellungen → Signatur) geht nur eine einfache Text-Version, zum Beispiel:
   `Robert Königbauer · Königbauer Gebäudereinigung · 0172 108 3808 · www.koenigbauer-gebaeudereinigung.de`

Warum kein QR-Code in der E-Mail? Wer die Mail liest, sitzt schon am Handy oder PC und kann direkt **auf die Knöpfe tippen** (Preis berechnen, WhatsApp, Google-Bewertung). Ein QR-Code müsste man mit einem zweiten Gerät abscannen. QR-Codes gehören auf Papier, also auf Visitenkarte, Rechnung und Auto.

## Teil 4: sevdesk – gesendete Rechnungen wiederfinden
sevdesk verschickt Rechnungen **über einen eigenen Server**. Deshalb tauchen sie nicht in deinem „Gesendet“-Ordner auf. So bekommst du trotzdem eine Spur:
1. **In sevdesk nachsehen:** Rechnung öffnen → **Verlauf/Historie**. Dort steht, wann und an wen die Mail rausging.
2. **Kopie an dich selbst:** Beim Versenden das Feld **„Kopie an mich“ / BCC** mit `info@koenigbauer-gebaeudereinigung.de` ausfüllen. Oder es in sevdesk unter **Einstellungen → E-Mail** als Standard hinterlegen. Dann liegt jede Rechnungsmail auch in deinem Posteingang. Leg in Outlook eine Regel an, die sie automatisch in einen Ordner **„Rechnungen gesendet“** verschiebt.
3. **Optional, die sauberste Lösung:** In sevdesk unter den E-Mail-Einstellungen den **eigenen Mailserver (SMTP)** eintragen: `smtp.ionos.de`, Port 465, SSL, Benutzername = deine E-Mail-Adresse. Dann gehen Rechnungen wirklich **von info@** raus, und die Kunden sehen deinen Absender.
   Die Menünamen heißen je nach sevdesk-Version etwas anders. Wenn du es nicht findest, schick mir einen Screenshot.

## Teil 5: Damit Claude deine Mails mitlesen und vorsortieren kann
Mit deinem Gmail-Konto ist Claude schon verbunden. Mit Outlook bzw. dem IONOS-Postfach direkt geht es nicht. Lösung: **IONOS schickt eine Kopie** jeder neuen Mail an dein Gmail. Dann kann Claude:
- jeden Morgen sagen, was ansteht (Anfragen, Rechnungen, Fristen),
- **Antwort-Entwürfe** schreiben, zum Beispiel für eine Preisanfrage. Abgeschickt wird nie automatisch, **du gibst jeden Entwurf frei**.

**So richtest du es ein (IONOS):**
1. IONOS → **E-Mail** → Postfach info@ → **Weiterleitung / Filterregeln**.
2. Neue Regel: **Kopie weiterleiten an** `isp.koenigbauer@gmail.com`, **Original im Postfach behalten** ✔.
3. **Wichtig für den Datenschutz:** Mails der **Steuerberaterin** enthalten Lohndaten deiner Mitarbeiter. Die sollten nicht in ein privates Gmail-Konto. Deshalb in der Regel eine **Ausnahme** eintragen: Absender enthält die Domain der Steuerberaterin (z. B. `@kanzlei-xy.de`) → **nicht** weiterleiten. Lohn- und Steuersachen bleiben dann nur bei IONOS und in Outlook.

Später, wenn das gut läuft: Für Angebote und Rechnungen hat sevdesk eine Schnittstelle (API). Damit könnte Claude Angebote direkt als Entwurf in sevdesk anlegen. Den Zugangsschlüssel würdest du dafür über ein sicheres Formular eingeben, nie in den Chat.

---

## Vorlage: Antwort auf eine Preisanfrage
> Guten Tag Herr/Frau [Name],
>
> vielen Dank für Ihre Anfrage und Ihr Interesse an unserer [Büroreinigung].
>
> Der Preis aus unserem Online-Rechner ist eine gute erste Orientierung. Damit wir Ihnen einen verbindlichen Festpreis nennen können, schauen wir uns Ihr Objekt einmal kurz vor Ort an: kostenlos und unverbindlich, in ca. 15–20 Minuten. Danach erhalten Sie innerhalb von 24 Stunden ein schriftliches Angebot mit monatlichem Pauschalpreis, ohne versteckte Kosten.
>
> Passt Ihnen [Tag, Uhrzeit] oder [Tag, Uhrzeit]? Gerne auch ein anderer Termin, Sie erreichen mich direkt unter 0172 108 3808 oder per WhatsApp.
>
> [Signatur]
