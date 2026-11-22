"""Agent F1 – Bank-Import & Kategorisierung.

Liest Kontoumsätze als CSV (Sparkasse „CSV-CAMT", VR-Bank, DKB, Commerzbank, generisch)
und ordnet jede Buchung einer steuerlichen Kategorie zu.
"""
import csv
import io
import json
import re
from datetime import date, datetime
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent

SPALTEN = {
    "datum": ["buchungstag", "buchungsdatum", "datum", "valutadatum", "wertstellung"],
    "betrag": ["betrag", "betrag (eur)", "umsatz", "betrag in eur"],
    "name": ["beguenstigter/zahlungspflichtiger", "begünstigter/zahlungspflichtiger", "name zahlungsbeteiligter",
             "zahlungsempfänger*in", "auftraggeber / begünstigter", "empfänger", "auftraggeber/empfänger", "name"],
    "zweck": ["verwendungszweck", "buchungstext", "vorgang/verwendungszweck", "beschreibung"],
}


def _zahl(text):
    t = str(text).strip().replace("€", "").replace(" ", "")
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    return float(t or 0)


def _datum(text):
    for fmt in ("%d.%m.%y", "%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.strip(), fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Unbekanntes Datumsformat: {text!r}")


def csv_lesen(pfad):
    roh = Path(pfad).read_bytes()
    for enc in ("utf-8-sig", "cp1252"):
        try:
            text = roh.decode(enc); break
        except UnicodeDecodeError:
            continue
    zeilen = text.splitlines()
    # Kopfzeile suchen (manche Banken haben Vorspann-Zeilen)
    start = next(i for i, z in enumerate(zeilen) if any(k in z.lower() for k in ("buchungstag", "buchungsdatum", "datum")))
    trenner = ";" if zeilen[start].count(";") >= zeilen[start].count(",") else ","
    leser = csv.DictReader(io.StringIO("\n".join(zeilen[start:])), delimiter=trenner)
    kopf = {k.lower().strip(): k for k in leser.fieldnames}

    def finde(feld):
        for kandidat in SPALTEN[feld]:
            if kandidat in kopf:
                return kopf[kandidat]
        return None

    sp = {f: finde(f) for f in SPALTEN}
    if not sp["datum"] or not sp["betrag"]:
        raise ValueError(f"Spalten Datum/Betrag nicht gefunden. Vorhanden: {list(kopf)}")
    buchungen = []
    for z in leser:
        if not (z.get(sp["datum"]) or "").strip():
            continue
        buchungen.append({
            "datum": _datum(z[sp["datum"]]).isoformat(),
            "betrag": round(_zahl(z[sp["betrag"]]), 2),
            "name": (z.get(sp["name"]) or "").strip() if sp["name"] else "",
            "zweck": (z.get(sp["zweck"]) or "").strip() if sp["zweck"] else "",
        })
    return buchungen


def regeln_laden():
    return json.loads((BASIS / "kategorien.json").read_text(encoding="utf-8"))


def kategorisieren(buchung, cfg):
    text = f" {buchung['name']} {buchung['zweck']} ".lower()
    for stichwort, kat in cfg["regeln"]:
        if stichwort in text:
            art = cfg["kategorien"][kat]["art"]
            if art == "einnahme" and buchung["betrag"] < 0:
                continue
            return kat
    if buchung["betrag"] > 0 and re.search(r"\bre[- ]?\d{3,}", text):
        return "Umsatzerlöse"
    return "unklar"


def ki_kategorisieren(unklare, cfg):
    """Optional: Claude ordnet unklare Buchungen zu (nur mit ANTHROPIC_API_KEY)."""
    import os
    if not unklare or not os.environ.get("ANTHROPIC_API_KEY"):
        return {}
    import anthropic
    kats = [k for k in cfg["kategorien"] if k != "unklar"]
    liste = "\n".join(f"{i}|{b['datum']}|{b['betrag']:.2f}|{b['name']}|{b['zweck'][:120]}" for i, b in enumerate(unklare))
    antwort = anthropic.Anthropic().messages.create(
        model=os.environ.get("KOENIGBAUER_MODELL", "claude-sonnet-5-5"), max_tokens=2000,
        system="Du bist Buchhalter für einen Gebäudereinigungsbetrieb (Einzelunternehmen, Bayern). "
               "Ordne jede Buchung genau einer Kategorie zu. Bei echter Unsicherheit 'unklar'. Antworte nur als JSON-Objekt {index: kategorie}.",
        messages=[{"role": "user", "content": f"Kategorien: {kats + ['unklar']}\n\nBuchungen (index|datum|betrag|name|zweck):\n{liste}"}])
    text = "".join(b.text for b in antwort.content if b.type == "text").strip().strip("`").removeprefix("json").strip()
    try:
        roh = json.loads(text)
        return {int(k): v for k, v in roh.items() if v in cfg["kategorien"]}
    except (json.JSONDecodeError, ValueError):
        return {}
