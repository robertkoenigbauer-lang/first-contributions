"""Agent F3 – Rechnungs-Prüfer.

Liest Ausgangsrechnungen (PDF, z. B. RE-1484.pdf) ein und gleicht sie mit den Zahlungseingängen
auf dem Konto ab: Was ist bezahlt, was ist offen, was ist überfällig?
"""
import re
import shutil
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path


def _pdf_text(pfad):
    try:
        from pypdf import PdfReader
        return "\n".join((s.extract_text() or "") for s in PdfReader(str(pfad)).pages)
    except ImportError:
        if shutil.which("pdftotext"):
            return subprocess.run(["pdftotext", "-layout", str(pfad), "-"], capture_output=True, text=True).stdout
        raise RuntimeError("Bitte 'pip install pypdf' ausführen, um PDF-Rechnungen zu lesen.")


def _betrag(s):
    return float(s.replace(".", "").replace(",", "."))


def rechnung_lesen(pfad):
    t = _pdf_text(pfad)
    nr = re.search(r"Rechnungs?-?\s*Nr\.?\s*:?\s*(RE-?\d+)", t, re.I) or re.search(r"\b(RE-\d{3,})\b", t)
    datum = re.search(r"Rechnungsdatum\s*:?\s*(\d{2}\.\d{2}\.\d{4})", t)
    brutto = re.search(r"Gesamtbetrag\s+brutto\s*:?\s*([\d.]+,\d{2})", t, re.I)
    netto = re.search(r"Gesamtbetrag\s+netto\s*:?\s*([\d.]+,\d{2})", t, re.I)
    ust = re.search(r"Umsatzsteuer\s*\d+\s*%\s*:?\s*([\d.]+,\d{2})", t, re.I)
    ziel = re.search(r"(?:innerhalb|binnen)\s+(?:von\s+)?(\d+)\s+Tag", t, re.I)
    # Empfänger: erste Zeile nach der Absenderzeile im Adressfeld (heuristisch)
    kunde = ""
    m = re.search(r"-\s*\d{5} Neufahrn bei\s*\n?\s*Freising\s*\n+(.+)", t)
    if m:
        kunde = m.group(1).split("  ")[0].strip()
    if not (nr and brutto):
        return None
    d = datetime.strptime(datum.group(1), "%d.%m.%Y").date() if datum else None
    return {
        "nr": nr.group(1).upper().replace("RE", "RE-").replace("--", "-"),
        "datum": d.isoformat() if d else "",
        "kunde": kunde,
        "netto": _betrag(netto.group(1)) if netto else round(_betrag(brutto.group(1)) / 1.19, 2),
        "ust": _betrag(ust.group(1)) if ust else 0.0,
        "brutto": _betrag(brutto.group(1)),
        "faellig": (d + timedelta(days=int(ziel.group(1)) if ziel else 14)).isoformat() if d else "",
        "datei": Path(pfad).name,
    }


def ordner_lesen(ordner):
    ergebnis, fehler = [], []
    for p in sorted(Path(ordner).glob("*.pdf")):
        r = rechnung_lesen(p)
        (ergebnis if r else fehler).append(r or p.name)
    return ergebnis, fehler


def abgleichen(rechnungen, buchungen):
    """Ordnet Zahlungseingänge den Rechnungen zu: zuerst über die Rechnungsnummer im Verwendungszweck, dann über den Betrag."""
    eingaenge = [b for b in buchungen if b["betrag"] > 0]
    benutzt = set()
    heute = date.today().isoformat()
    for r in rechnungen:
        r["bezahlt_am"] = None
        nummer = r["nr"].replace("-", "").lower()
        for i, b in enumerate(eingaenge):
            if i in benutzt:
                continue
            text = (b["zweck"] + " " + b["name"]).replace("-", "").replace(" ", "").lower()
            if nummer in text:
                r["bezahlt_am"] = b["datum"]; benutzt.add(i); break
        if not r["bezahlt_am"]:
            for i, b in enumerate(eingaenge):
                if i not in benutzt and abs(b["betrag"] - r["brutto"]) < 0.01 and b["datum"] >= (r["datum"] or "0"):
                    r["bezahlt_am"] = b["datum"]; r["zuordnung"] = "nur über Betrag"; benutzt.add(i); break
        r["status"] = "bezahlt" if r["bezahlt_am"] else ("ÜBERFÄLLIG" if r["faellig"] and r["faellig"] < heute else "offen")
    return rechnungen
