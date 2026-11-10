# Majas Lernheft

Lern-App für Maja (6. Klasse), gezielt auf ihren **aktuellen** Stoff in Mathe, Deutsch, Englisch, NT und GPG.
Die Themen kommen aus Fotos ihrer Hefteinträge, Buchseiten und Arbeitsblätter.

- **Heute dran**: täglich bis zu 15 Fragen aus allen Fächern (Lernkartei mit 5 Boxen).
  Richtig → kommt nach 1, 2, 4, 7, 14 Tagen wieder. Falsch → morgen wieder.
  Themen mit naher Probe kommen zuerst.
- **Hefteintrag** zum Nachlesen, **Üben** pro Thema, **Probe-Training** mit Note.
- Fragetypen: Auswahl, Eintippen (z. B. englische Rechtschreibung), Zahlen, Brüche, Karteikarten zum Umdrehen
  (für Fragen wie „Was ist das Präsens?“), Zuordnen (`paare`) und Satzbau (`satz`), Bildkarten (`bild(...)`).
- Englisch Unit 2 (Probe 13.11.2026): Vokabelblatt S. 28–30, „Where is it?“ (Buch S. 28),
  simple past Aussagen (Heft 28.09.) und Verneinung/Fragen/Kurzantworten (Heft 06.10.).
- Der Fortschritt wird im Browser des Geräts gespeichert.

## Neues Thema eintragen

Im Array `THEMEN` in `index.html` ein Objekt ergänzen:
`{id, fach, titel, quelle, probe, merke, karten:[...]}`.
Neue Karten in bestehenden Themen immer hinten anhängen, damit der Lernstand erhalten bleibt.
Themen mit `quelle:"Beispiel"` sind Platzhalter, bis Majas echte Unterlagen da sind.
