# Mayas Lernheft

Lern-App für Mathe, Deutsch, Englisch, NT und GPG (5. Klasse, bayerische Mittelschule).

- `index.html` ist die ganze App: einfach im Browser öffnen, sie läuft auch ohne Internet (nur die Schriftarten kommen aus dem Netz).
- Jedes Thema hat einen **Hefteintrag** zum Lernen und **Üben** mit immer neuen Aufgaben.
- **Probe-Training**: gemischte Aufgaben aus den gewählten Themen, ohne Hilfe, am Ende mit Note.
- **Fehler-Kiste**: falsch gelöste Aufgaben kommen zurück, bis sie richtig gelöst sind.
- Der Fortschritt (Sterne, Fehler-Kiste) wird im Browser des Geräts gespeichert.

## Inhalte anpassen

Alle Fächer und Themen stehen im Block `const FAECHER=[...]` in `index.html`.
Ein Thema besteht aus `titel`, `merke` (Hefteintrag als HTML) und `gen()` (liefert eine Aufgabe).
Aufgabentypen: `mc(...)` (Auswahl), `text(...)` (Wort eintippen), `zahl(...)` und `bruch(...)`.
