"""Agent 4 – Versand-Vorbereitung: Serienbriefe (druckfertiges HTML/PDF), Anrufliste (CSV)."""
import csv
import html
from datetime import date
from pathlib import Path

AUSGABE = Path(__file__).resolve().parent.parent / "ausgabe"

LOGO = Path(__file__).resolve().parents[2] / "website" / "img" / "logo-rk.png"

BRIEF_CSS = """
@page{size:A4;margin:0}body{margin:0;font-family:Arial,sans-serif;font-size:10.5pt;color:#2a2a2b}
.brief{width:210mm;height:297mm;padding:0 20mm 0 25mm;position:relative;page-break-after:always;box-sizing:border-box}
.kopf{height:45mm;display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:4mm}
.kopf img{height:22mm}.kopf .kontakt{text-align:right;font-size:8.5pt;line-height:1.5}
.kopf .kontakt b{color:#121214;font-size:10pt}
.linie{height:1.2mm;background:linear-gradient(90deg,#2a2a2b 50%,#008dd2 50%)}
.absender{font-size:7pt;color:#5f6670;margin-top:5mm;text-decoration:underline}
.anschrift{height:40mm;padding-top:2mm;line-height:1.4}
.datum{text-align:right;margin-bottom:8mm}.betreff{font-weight:bold;margin-bottom:6mm;color:#121214}
.text{white-space:pre-line;line-height:1.5}
.fuss{position:absolute;bottom:12mm;left:25mm;right:20mm;font-size:7.5pt;color:#5f6670;border-top:1px solid #e4e7eb;padding-top:2mm}
"""


def _logo_src():
    import base64
    return "data:image/png;base64," + base64.b64encode(LOGO.read_bytes()).decode() if LOGO.exists() else ""


def serienbriefe(eintraege, profil, datei="briefe.html"):
    AUSGABE.mkdir(exist_ok=True)
    e = html.escape
    logo = _logo_src()
    seiten = []
    for lead, texte in eintraege:
        seiten.append(f"""<div class="brief">
<div class="kopf"><img src="{logo}" alt="Königbauer Gebäudereinigung">
<div class="kontakt"><b>{e(profil['firma'])}</b><br>{e(profil['inhaber'])}<br>Tel. {e(profil['telefon'])}<br>{e(profil['email'])}<br>{e(profil['website'])}</div></div>
<div class="linie"></div>
<div class="absender">{e(profil['firma'])} · {e(profil['strasse'])} · {e(profil['plz_ort'])}</div>
<div class="anschrift">{e(lead['name'])}<br>{e(lead.get('ansprechpartner') or '')}{'<br>' if lead.get('ansprechpartner') else ''}{e(lead.get('strasse') or '')}<br>{e(lead.get('plz') or '')} {e(lead.get('ort') or '')}</div>
<div class="datum">{e(profil['zentrum']['name'])}, {date.today().strftime('%d.%m.%Y')}</div>
<div class="betreff">{e(texte['betreff'])}</div>
<div class="text">{e(texte['brief'])}

Mit freundlichen Grüßen

{e(profil['inhaber'])}
{e(profil['rolle'])}, {e(profil['firma'])}</div>
<div class="fuss">{e(profil['firma'])} · Inhaber {e(profil['inhaber'])} · {e(profil['strasse'])}, {e(profil['plz_ort'])} · {e(profil['website'])}<br>
Ihre Adresse stammt aus öffentlich zugänglichen Verzeichnissen. Sie können der Nutzung Ihrer Daten für Werbung jederzeit formlos widersprechen (Art. 21 DSGVO).</div>
</div>""")
    pfad = AUSGABE / datei
    pfad.write_text(f"<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Serienbriefe</title><style>{BRIEF_CSS}</style></head><body>{''.join(seiten)}</body></html>", encoding="utf-8")
    return pfad


def anrufliste(eintraege, datei="anrufliste.csv"):
    AUSGABE.mkdir(exist_ok=True)
    pfad = AUSGABE / datei
    with pfad.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["ID", "Firma", "Segment", "Ort", "Telefon", "Score", "Leitfaden"])
        for lead, texte in eintraege:
            lf = texte.get("telefon_leitfaden")
            lf = " | ".join(lf) if isinstance(lf, list) else str(lf)
            w.writerow([lead["id"], lead["name"], lead["segment"], lead.get("ort"), lead.get("telefon"), lead["score"], lf])
    return pfad
