"""Agent F6 – Personal: Lohnkosten je Monat, Mitarbeiter und Bereich, Minijob-Grenze, Mindestlohn.

Die echten Daten liegen in daten/personal.json (wird NICHT zu GitHub hochgeladen).
Vorlage: personal.beispiel.json
"""
import json
from collections import defaultdict
from pathlib import Path

DATEI = Path(__file__).resolve().parent.parent / "daten" / "personal.json"

# Gesetzlicher Mindestlohn und daraus abgeleitete Minijob-Grenze (Mindestlohn x 130 / 3, aufgerundet)
MINDESTLOHN = {2026: 13.90, 2027: 14.60}
MINIJOB_GRENZE = {2026: 603, 2027: 633}
MIDIJOB_OBERGRENZE = 2000


def _jahr_wert(tabelle, jahr):
    return tabelle.get(jahr) or tabelle[max(j for j in tabelle if j <= jahr)] if any(j <= jahr for j in tabelle) else tabelle[min(tabelle)]


def laden():
    if not DATEI.exists():
        return None
    return json.loads(DATEI.read_text(encoding="utf-8"))


def auswerten(d):
    ma = {m["kuerzel"]: m for m in d["mitarbeiter"]}
    pro_monat = defaultdict(lambda: {"brutto": 0.0, "gesamtkosten": 0.0, "netto": 0.0})
    pro_bereich = defaultdict(lambda: defaultdict(float))
    warnungen = []
    for a in d["abrechnungen"]:
        m = ma[a["kuerzel"]]
        jahr = int(a["monat"][:4])
        pm = pro_monat[a["monat"]]
        for k in ("brutto", "gesamtkosten", "netto"):
            pm[k] += a[k]
        pro_bereich[a["monat"]][m["bereich"]] += a["gesamtkosten"]
        grenze = _jahr_wert(MINIJOB_GRENZE, jahr)
        if m["art"] == "minijob":
            if a["brutto"] > grenze:
                warnungen.append(f"{a['monat']}: {m['name']} verdient {a['brutto']:.2f} € – über der Minijob-Grenze von {grenze} €!")
            elif a["brutto"] > grenze * 0.9:
                warnungen.append(f"{a['monat']}: {m['name']} liegt mit {a['brutto']:.2f} € knapp unter der Minijob-Grenze ({grenze} €).")
        if m["art"] == "midijob" and a["brutto"] > MIDIJOB_OBERGRENZE:
            warnungen.append(f"{a['monat']}: {m['name']} über der Midijob-Obergrenze von {MIDIJOB_OBERGRENZE} €.")
    # Ausblick: Mindestlohn und Minijob-Grenze im Folgejahr
    letzte = max(pro_monat) if pro_monat else None
    if letzte:
        naechstes = int(letzte[:4]) + 1
        ml, gr = _jahr_wert(MINDESTLOHN, naechstes), _jahr_wert(MINIJOB_GRENZE, naechstes)
        for m in d["mitarbeiter"]:
            if m.get("stundenlohn") and m["stundenlohn"] < ml:
                warnungen.append(f"Ab 01.01.{naechstes}: {m['name']} verdient {m['stundenlohn']:.2f} €/Std. – unter dem Mindestlohn von {ml:.2f} €!")
            if m["art"] == "minijob" and m.get("stundenlohn"):
                warnungen.append(f"Ab 01.01.{naechstes}: {m['name']} darf als Minijob max. {gr / m['stundenlohn']:.1f} Std./Monat arbeiten ({gr} € ÷ {m['stundenlohn']:.2f} €).")
    # Jahresprognose: Durchschnitt der vorhandenen Monate x 12
    n = len(pro_monat) or 1
    kosten_monat = sum(v["gesamtkosten"] for v in pro_monat.values()) / n
    # Bruttolohn der Ehefrau (für die Zusammenveranlagung)
    ehe = [a for a in d["abrechnungen"] if ma[a["kuerzel"]].get("ehegatte")]
    ehe_brutto_jahr = (sum(a["brutto"] for a in ehe) / len(ehe) * 12) if ehe else 0.0
    ehe_lst_jahr = (sum(a["lohnsteuer"] for a in ehe) / len(ehe) * 12) if ehe else 0.0
    return {
        "mitarbeiter": d["mitarbeiter"], "abrechnungen": d["abrechnungen"],
        "pro_monat": dict(sorted(pro_monat.items())),
        "pro_bereich": {m: dict(v) for m, v in sorted(pro_bereich.items())},
        "kosten_monat_schnitt": kosten_monat, "kosten_jahr_prognose": kosten_monat * 12,
        "ehegatte_brutto_jahr": ehe_brutto_jahr, "ehegatte_lohnsteuer_jahr": ehe_lst_jahr,
        "warnungen": warnungen,
    }
