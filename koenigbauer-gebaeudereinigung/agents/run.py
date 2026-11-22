#!/usr/bin/env python3
"""Königbauer Vertriebs-Agenten – Steuerzentrale.

  python run.py leads-finden [--radius 20] [--segment hausverwaltung praxis]
  python run.py kampagne [--anzahl 25] [--segment hausverwaltung]   # Texte + Serienbriefe + Anrufliste
  python run.py versendet <id> [<id> ...]                            # Briefe als versendet markieren (Nachfass in 7 Tagen)
  python run.py status <id> <status> [--notiz "..."]                 # z. B. termin, angebot, kunde, sperre
  python run.py heute                                                # Was ist heute fällig?
  python run.py uebersicht                                           # Pipeline-Statistik
  python run.py import-csv datei.csv                                 # eigene Kontakte (Messe, Netzwerk) importieren
"""
import argparse
import csv
import json
import sys
from pathlib import Path

from agents import crm, lead_finder, texter, compliance, export

PROFIL = json.loads((Path(__file__).parent / "firmenprofil.json").read_text(encoding="utf-8"))


def cmd_leads_finden(a):
    z = PROFIL["zentrum"]
    print(f"🔎 Lead-Finder sucht im Umkreis von {a.radius} km um {z['name']} …")
    gefunden = lead_finder.finden(z["lat"], z["lon"], a.radius, a.segment)
    con = crm.verbinden()
    neu = sum(crm.lead_speichern(con, l) for l in gefunden)
    print(f"✅ {len(gefunden)} Treffer, davon {neu} neu im CRM.")


def cmd_kampagne(a):
    con = crm.verbinden()
    kandidaten = crm.leads(con, status="neu", segment=a.segment)
    briefe, anrufe, uebersprungen = [], [], 0
    for lead in kandidaten:
        if len(briefe) + len(anrufe) >= a.anzahl:
            break
        kanaele = compliance.erlaubte_kanaele(lead)
        if not kanaele:
            uebersprungen += 1
            continue
        texte = texter.texte_erstellen(lead, PROFIL)
        warnungen = compliance.text_pruefen(texte.get("brief", ""))
        if any(w.startswith("Riskante") for w in warnungen):
            print(f"⚠️  {lead['name']}: {warnungen} – Text verworfen, Vorlage genutzt.")
            texte = texter._vorlage(lead, PROFIL)
        if compliance.KANAL_BRIEF in kanaele:
            briefe.append((lead, texte))
        if compliance.KANAL_ANRUF in kanaele:
            anrufe.append((lead, texte))
        crm.status_setzen(con, lead["id"], "anschreiben_bereit", "Brief drucken & versenden")
        crm.kontakt_loggen(con, lead["id"], "entwurf", json.dumps(texte, ensure_ascii=False))
        print(f"✍️  {lead['name']} ({lead['segment']}) → {', '.join(kanaele)}")
    if briefe:
        print(f"📄 Serienbriefe: {export.serienbriefe(briefe, PROFIL)}")
    if anrufe:
        print(f"📞 Anrufliste:   {export.anrufliste(anrufe)}")
    print(f"Fertig: {len(briefe)} Briefe, {len(anrufe)} Anrufe vorbereitet, {uebersprungen} ohne zulässigen Kanal übersprungen.")
    print("Nächster Schritt: Briefe prüfen, drucken/über Online-Briefdienst versenden, dann 'python run.py versendet <ids>'.")


def cmd_versendet(a):
    con = crm.verbinden()
    for i in a.ids:
        crm.status_setzen(con, i, "brief_versendet", "Nachfass-Anruf", in_tagen=7)
        crm.kontakt_loggen(con, i, "brief", "Anschreiben versendet")
    print(f"📬 {len(a.ids)} Leads markiert – Nachfass in 7 Tagen.")


def cmd_status(a):
    con = crm.verbinden()
    folgeschritte = {"angerufen": ("Erneut anrufen", 14), "termin": ("Besichtigung durchführen", 3),
                     "angebot": ("Angebot nachfassen", 5)}
    schritt, tage = folgeschritte.get(a.status, (None, None))
    crm.status_setzen(con, a.id, a.status, schritt, tage)
    if a.notiz:
        crm.kontakt_loggen(con, a.id, "notiz", a.notiz)
    print(f"Lead {a.id} → {a.status}")


def cmd_heute(a):
    con = crm.verbinden()
    f = crm.faellige(con)
    if not f:
        print("Heute nichts fällig. 👉 'python run.py kampagne' für neue Anschreiben.")
    for l in f:
        print(f"[{l['id']}] {l['faellig_am']}  {l['naechster_schritt']:<25} {l['name']} · {l.get('telefon') or '-'} · {l.get('ort') or ''}")


def cmd_uebersicht(a):
    con = crm.verbinden()
    for s in crm.STATUS:
        print(f"{s:<20} {crm.statistik(con).get(s, 0)}")


def cmd_import_csv(a):
    """CSV mit Spalten: name;segment;strasse;plz;ort;telefon;email;email_einwilligung;ansprechpartner"""
    con = crm.verbinden()
    n = 0
    with open(a.datei, encoding="utf-8-sig") as f:
        for z in csv.DictReader(f, delimiter=";"):
            z["osm_id"] = f"import/{z.get('name')}/{z.get('plz')}"
            z["score"] = int(z.get("score") or 90)  # eigene Kontakte = warm
            if crm.lead_speichern(con, z):
                n += 1
                if z.get("email_einwilligung", "").strip() in ("1", "ja", "true"):
                    con.execute("UPDATE leads SET email_einwilligung=1, ansprechpartner=? WHERE osm_id=?",
                                (z.get("ansprechpartner"), z["osm_id"]))
                    con.commit()
    print(f"{n} Kontakte importiert.")


def main():
    p = argparse.ArgumentParser(description="Königbauer Vertriebs-Agenten")
    sp = p.add_subparsers(dest="cmd", required=True)
    x = sp.add_parser("leads-finden"); x.add_argument("--radius", type=float, default=PROFIL["radius_km"])
    x.add_argument("--segment", nargs="*", choices=list(lead_finder.SEGMENTE)); x.set_defaults(f=cmd_leads_finden)
    x = sp.add_parser("kampagne"); x.add_argument("--anzahl", type=int, default=25)
    x.add_argument("--segment", choices=list(lead_finder.SEGMENTE)); x.set_defaults(f=cmd_kampagne)
    x = sp.add_parser("versendet"); x.add_argument("ids", nargs="+", type=int); x.set_defaults(f=cmd_versendet)
    x = sp.add_parser("status"); x.add_argument("id", type=int); x.add_argument("status", choices=crm.STATUS)
    x.add_argument("--notiz"); x.set_defaults(f=cmd_status)
    sp.add_parser("heute").set_defaults(f=cmd_heute)
    sp.add_parser("uebersicht").set_defaults(f=cmd_uebersicht)
    x = sp.add_parser("import-csv"); x.add_argument("datei"); x.set_defaults(f=cmd_import_csv)
    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    sys.exit(main())
