#!/usr/bin/env python3
"""Königbauer Finanz-Agenten – Steuerzentrale.

  python run.py import kontoauszug.csv [weitere.csv]   # Kontoumsätze einlesen + automatisch zuordnen
  python run.py rechnungen ordner/mit/pdfs             # Ausgangsrechnungen (RE-xxxx.pdf) einlesen
  python run.py bericht [--jahr 2027]                  # Finanz-Cockpit als HTML (ausgabe/finanzbericht.html)
  python run.py offen                                  # Offene / überfällige Rechnungen
  python run.py kalender [--tage 90]                   # Steuer- und Zahlungstermine
  python run.py unklar                                 # Buchungen ohne Kategorie
  python run.py personal                               # Lohnkosten je Monat/Mitarbeiter/Bereich, Minijob-Grenzen
  python run.py frag "Kann ich den neuen Staubsauger absetzen?"   # Finanzfrage an die KI (mit deinen Zahlen)
  python run.py demo                                   # Beispieldaten erzeugen, um das Cockpit anzusehen
"""
import argparse
import json
import os
import random
import sys
from datetime import date, timedelta
from pathlib import Path

from finanzen import bank, steuern, rechnungen, kalender, bericht, personal

BASIS = Path(__file__).parent
DATEN = BASIS / "daten"
BUCHUNGEN = DATEN / "buchungen.json"
RECHNUNGEN = DATEN / "rechnungen.json"


def cfg():
    c = json.loads((BASIS / "einstellungen.json").read_text(encoding="utf-8"))
    privat = DATEN / "einstellungen.privat.json"  # eigene Werte, nicht in Git
    if privat.exists():
        c.update({k: v for k, v in json.loads(privat.read_text(encoding="utf-8")).items() if not k.startswith("_")})
    return c


def laden(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def speichern(p, daten):
    DATEN.mkdir(exist_ok=True)
    p.write_text(json.dumps(daten, ensure_ascii=False, indent=1), encoding="utf-8")


def cmd_import(a):
    kat = bank.regeln_laden()
    alt = laden(BUCHUNGEN)
    schluessel = {(b["datum"], b["betrag"], b["zweck"]) for b in alt}
    neu = []
    for datei in a.dateien:
        for b in bank.csv_lesen(datei):
            if (b["datum"], b["betrag"], b["zweck"]) in schluessel:
                continue
            b["kategorie"] = bank.kategorisieren(b, kat)
            neu.append(b); schluessel.add((b["datum"], b["betrag"], b["zweck"]))
    unklar = [b for b in neu if b["kategorie"] == "unklar"]
    for i, k in bank.ki_kategorisieren(unklar, kat).items():
        unklar[i]["kategorie"] = k; unklar[i]["ki"] = True
    speichern(BUCHUNGEN, sorted(alt + neu, key=lambda b: b["datum"]))
    print(f"✅ {len(neu)} neue Buchungen, davon {sum(b['kategorie'] == 'unklar' for b in neu)} noch unklar.")


def cmd_rechnungen(a):
    liste, fehler = rechnungen.ordner_lesen(a.ordner)
    bekannt = {r["nr"]: r for r in laden(RECHNUNGEN)}
    for r in liste:
        bekannt.setdefault(r["nr"], r)
    speichern(RECHNUNGEN, sorted(bekannt.values(), key=lambda r: r["datum"]))
    print(f"🧾 {len(liste)} Rechnungen gelesen." + (f" Nicht lesbar: {', '.join(fehler)}" if fehler else ""))


def _abgeglichen():
    return rechnungen.abgleichen(laden(RECHNUNGEN), laden(BUCHUNGEN))


def _cfg_mit_personal():
    """Übernimmt den Bruttolohn der angestellten Ehefrau automatisch in die Steuerschätzung."""
    c = cfg()
    d = personal.laden()
    p = personal.auswerten(d) if d else None
    if p and p["ehegatte_brutto_jahr"] and c.get("veranlagung") == "zusammen":
        c["zve_partner_euro"] = max(0.0, p["ehegatte_brutto_jahr"] - 1230)  # minus Arbeitnehmer-Pauschbetrag
        c["einbehaltene_lohnsteuer_partner_jahr"] = p["ehegatte_lohnsteuer_jahr"]
    return c, p


def cmd_bericht(a):
    c, p = _cfg_mit_personal()
    jahr = a.jahr or (max((b["datum"][:4] for b in laden(BUCHUNGEN)), default=str(date.today().year)))
    auswertung = bericht.auswerten(laden(BUCHUNGEN), c, bank.regeln_laden(), int(jahr))
    pfad = bericht.html_bericht(auswertung, c, _abgeglichen(), personal_auswertung=p)
    s = auswertung["schaetzung"]
    print(f"📊 Finanz-Cockpit {jahr}: {pfad}")
    print(f"   Gewinn hochgerechnet: {bericht.eur(auswertung['gewinn_jahr'])} | Steuern geschätzt: {bericht.eur(s['steuern_gesamt'])}"
          f" | Rücklage pro Monat: {bericht.eur(auswertung['ruecklage_monat'])}")


def cmd_offen(a):
    offen = [r for r in _abgeglichen() if r["status"] != "bezahlt"]
    if not offen:
        print("Keine offenen Rechnungen. 👍")
    for r in offen:
        print(f"{r['status']:<11} {r['nr']:<9} {r['datum']}  fällig {r['faellig']}  {bericht.eur(r['brutto']):>14}  {r['kunde']}")


def cmd_kalender(a):
    for d, t, b in kalender.termine(date.today(), date.today() + timedelta(days=a.tage), cfg()):
        print(f"{d.strftime('%a %d.%m.%Y')}  {t}" + (f"  ({bericht.eur(b)})" if b else ""))


def cmd_personal(a):
    d = personal.laden()
    if not d:
        sys.exit("Keine Personaldaten. Vorlage personal.beispiel.json nach daten/personal.json kopieren und ausfüllen.")
    p = personal.auswerten(d)
    namen = {m["kuerzel"]: m for m in p["mitarbeiter"]}
    for monat in p["pro_monat"]:
        print(f"\n── {monat} " + "─" * 60)
        print(f"{'Mitarbeiter':<24}{'Art':<10}{'Bereich':<19}{'Std.':>6}{'Brutto':>12}{'Netto':>12}{'Kosten AG':>13}")
        for r in (x for x in p["abrechnungen"] if x["monat"] == monat):
            m = namen[r["kuerzel"]]
            std = f"{r['stunden']:.1f}" if r.get("stunden") else "–"
            print(f"{m['name']:<24}{m['art']:<10}{m['bereich']:<19}{std:>6}{bericht.eur(r['brutto']):>12}{bericht.eur(r['netto']):>12}{bericht.eur(r['gesamtkosten']):>13}")
        v = p["pro_monat"][monat]
        print(f"{'SUMME':<59}{bericht.eur(v['brutto']):>12}{bericht.eur(v['netto']):>12}{bericht.eur(v['gesamtkosten']):>13}")
        print("   nach Bereich: " + ", ".join(f"{b}: {bericht.eur(k)}" for b, k in p["pro_bereich"][monat].items()))
    print(f"\nØ Personalkosten pro Monat: {bericht.eur(p['kosten_monat_schnitt'])}  →  aufs Jahr: {bericht.eur(p['kosten_jahr_prognose'])}")
    if p["ehegatte_brutto_jahr"]:
        print(f"Bruttolohn Ehefrau aufs Jahr: {bericht.eur(p['ehegatte_brutto_jahr'])} (fließt automatisch in die Steuerschätzung)")
    for w in p["warnungen"]:
        print("⚠️  " + w)


def cmd_unklar(a):
    for b in laden(BUCHUNGEN):
        if b["kategorie"] == "unklar":
            print(f"{b['datum']}  {bericht.eur(b['betrag']):>12}  {b['name'][:30]:<30} {b['zweck'][:60]}")


def cmd_frag(a):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Für Fragen an die KI bitte ANTHROPIC_API_KEY setzen (siehe README).")
    import anthropic
    c, p = _cfg_mit_personal()
    buch = laden(BUCHUNGEN)
    jahr = max((b["datum"][:4] for b in buch), default=str(date.today().year))
    aw = bericht.auswerten(buch, c, bank.regeln_laden(), int(jahr)) if buch else {}
    kontext = {k: aw.get(k) for k in ("jahr", "gewinn_jahr", "umsatz_jahr_netto", "schaetzung", "ruecklage_monat", "nach_kategorie", "nachzahlung_geschaetzt")}
    if p:  # Personal ohne Namen an die KI geben
        kontext["personal"] = {"anzahl": len(p["mitarbeiter"]), "arten": [m["art"] for m in p["mitarbeiter"]],
                               "kosten_monat_schnitt": p["kosten_monat_schnitt"], "pro_bereich": p["pro_bereich"], "warnungen": p["warnungen"]}
    antwort = anthropic.Anthropic().messages.create(
        model=os.environ.get("KOENIGBAUER_MODELL", "claude-sonnet-5-5"), max_tokens=1500,
        system=("Du bist der Finanz-Assistent von Robert Königbauer (Gebäudereinigung, Einzelunternehmen, EÜR, Neufahrn bei Freising, Bayern, "
                "Mitarbeiter angestellt, umsatzsteuerpflichtig, Mitglied der Handwerkskammer München und Oberbayern, BG BAU). "
                "Antworte auf Deutsch, kurz, konkret und mit Zahlen, per Du. Nenne die Rechtsgrundlage (z. B. § 4 Abs. 4 EStG). "
                "Sag klar, wenn etwas unsicher ist oder der Steuerberater entscheiden sollte. Erfinde keine Beträge."),
        messages=[{"role": "user", "content": f"Meine aktuellen Zahlen (Schätzung):\n{json.dumps(kontext, ensure_ascii=False, default=str)}\n\nEinstellungen:\n{json.dumps(c, ensure_ascii=False)}\n\nFrage: {a.frage}"}])
    print("".join(b.text for b in antwort.content if b.type == "text"))


def cmd_demo(a):
    """Erzeugt erfundene Beispiel-Kontoumsätze für ein Jahr, damit man das Cockpit ansehen kann."""
    random.seed(7)
    jahr = cfg()["steuerjahr"] - 1
    zeilen = ["Buchungstag;Beguenstigter/Zahlungspflichtiger;Verwendungszweck;Betrag"]
    kunden = ["Muster Bürogebäude GmbH", "Praxis Dr. Beispiel", "Hausverwaltung Demo", "Kanzlei Exempel", "Beispiel Logistik GmbH", "ista SE"]
    nr = 2000
    for m in range(1, 13):
        for k in kunden:
            nr += 1
            zeilen.append(f"{min(28, 5 + kunden.index(k) * 4):02d}.{m:02d}.{jahr};{k};RE-{nr} Reinigung;{random.choice([1904.0, 2380.0, 2975.0, 1428.0, 3332.0]):.2f}")
        for name, zweck, betrag in [("Mitarbeiterin A", "Lohn", -1480), ("Mitarbeiter B", "Lohn", -1350), ("Minijob-Zentrale", "Beitraege", -310),
                                    ("AOK Bayern", "SV-Beitraege", -1150), ("Finanzamt Freising", "Lohnsteuer LStA", -240),
                                    ("Finanzamt Freising", "Umsatzsteuer USt-VA", -820), ("ARAL Station", "Tanken", -260),
                                    ("Hagleitner Hygiene", "Reinigungsmittel", -310), ("Telekom", "Mobilfunk", -65), ("Sparkasse Freising", "Kontoführung", -18)]:
            zeilen.append(f"{random.randint(1, 27):02d}.{m:02d}.{jahr};{name};{zweck};{betrag * random.uniform(.9, 1.1):.2f}")
        if m in (3, 6, 9, 12):
            zeilen.append(f"10.{m:02d}.{jahr};Finanzamt Freising;Einkommensteuer Vorauszahlung;-1200.00")
        if m in (2, 5, 8, 11):
            zeilen.append(f"15.{m:02d}.{jahr};Gemeinde Neufahrn;Gewerbesteuer Vorauszahlung;-450.00")
    zeilen.append(f"20.06.{jahr};Unbekannt GmbH;Gutschrift 4711;150.00")
    DATEN.mkdir(exist_ok=True)
    pfad = DATEN / "demo-konto.csv"
    pfad.write_text("\n".join(zeilen), encoding="utf-8")
    print(f"Beispieldaten (erfunden): {pfad}\nWeiter mit: python run.py import {pfad} && python run.py bericht")


def main():
    p = argparse.ArgumentParser(description="Königbauer Finanz-Agenten")
    sp = p.add_subparsers(dest="cmd", required=True)
    x = sp.add_parser("import"); x.add_argument("dateien", nargs="+"); x.set_defaults(f=cmd_import)
    x = sp.add_parser("rechnungen"); x.add_argument("ordner"); x.set_defaults(f=cmd_rechnungen)
    x = sp.add_parser("bericht"); x.add_argument("--jahr", type=int); x.set_defaults(f=cmd_bericht)
    sp.add_parser("offen").set_defaults(f=cmd_offen)
    x = sp.add_parser("kalender"); x.add_argument("--tage", type=int, default=90); x.set_defaults(f=cmd_kalender)
    sp.add_parser("unklar").set_defaults(f=cmd_unklar)
    sp.add_parser("personal").set_defaults(f=cmd_personal)
    x = sp.add_parser("frag"); x.add_argument("frage"); x.set_defaults(f=cmd_frag)
    sp.add_parser("demo").set_defaults(f=cmd_demo)
    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
