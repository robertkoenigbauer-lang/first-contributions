"""Agent F5 – Finanz-Cockpit: Auswertung, Hochrechnung, Rücklagen-Empfehlung als HTML-Bericht."""
import html
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

from . import steuern, kalender

AUSGABE = Path(__file__).resolve().parent.parent / "ausgabe"


def _netto(betrag, ust):
    return betrag / (1 + ust) if ust else betrag


def auswerten(buchungen, cfg, kat_cfg, jahr):
    kats = kat_cfg["kategorien"]
    monate = defaultdict(lambda: {"einnahmen": 0.0, "ausgaben": 0.0, "ust": 0.0, "vorsteuer": 0.0, "gewinn": 0.0})
    nach_kat = defaultdict(float)
    unklar, privat, steuerzahlungen = [], 0.0, defaultdict(float)
    for b in buchungen:
        if not b["datum"].startswith(str(jahr)):
            continue
        k = b.get("kategorie", "unklar"); info = kats.get(k, kats["unklar"]); m = b["datum"][:7]
        if info["art"] == "einnahme":
            netto = _netto(b["betrag"], info["ust"])
            monate[m]["einnahmen"] += netto; monate[m]["ust"] += b["betrag"] - netto; monate[m]["gewinn"] += netto
            nach_kat[k] += netto
        elif info["art"] == "ausgabe":
            netto = _netto(b["betrag"], info["ust"])  # negativ
            monate[m]["ausgaben"] += -netto; monate[m]["vorsteuer"] += -(b["betrag"] - netto)
            if info["abzugsfaehig"]:
                monate[m]["gewinn"] += netto
            nach_kat[k] += -netto
        elif info["art"] == "steuer" or k == "Einkommensteuer/Soli":
            steuerzahlungen[k] += -b["betrag"]
        elif info["art"] == "privat":
            privat += b["betrag"]
        else:
            unklar.append(b)
    monate_sortiert = dict(sorted(monate.items()))
    n = len(monate_sortiert) or 1
    gewinn_bisher = sum(v["gewinn"] for v in monate_sortiert.values())
    gewinn_jahr = gewinn_bisher / n * 12 if n < 12 else gewinn_bisher
    schaetzung = steuern.jahresschaetzung(gewinn_jahr, cfg)
    umsatz_jahr = sum(v["einnahmen"] for v in monate_sortiert.values()) / n * 12
    zuschlag = 1 + cfg.get("sicherheitszuschlag_ruecklage", 0.1)
    ruecklage_monat = (schaetzung["steuern_gesamt"] + schaetzung["handwerkskammer"]) / 12 * zuschlag
    vz = cfg.get("vorauszahlungen", {})
    vz_laut_bescheid = 4 * (vz.get("einkommensteuer_pro_quartal", 0) + vz.get("gewerbesteuer_pro_quartal", 0))
    vz_laut_konto = steuerzahlungen.get("Einkommensteuer/Soli", 0) + steuerzahlungen.get("Gewerbesteuer", 0)
    vorauszahlungen_jahr = max(vz_laut_bescheid, vz_laut_konto)
    return {
        "jahr": jahr, "monate": monate_sortiert, "anzahl_monate": n, "nach_kategorie": dict(sorted(nach_kat.items(), key=lambda x: -x[1])),
        "unklar": unklar, "privat_saldo": privat, "steuerzahlungen": dict(steuerzahlungen),
        "gewinn_bisher": gewinn_bisher, "gewinn_jahr": gewinn_jahr, "umsatz_jahr_netto": umsatz_jahr,
        "schaetzung": schaetzung, "ruecklage_monat": ruecklage_monat,
        "ruecklage_quote_umsatz": (schaetzung["steuern_gesamt"] * zuschlag / umsatz_jahr) if umsatz_jahr else 0,
        "vorauszahlungen_jahr": vorauszahlungen_jahr,
        "nachzahlung_geschaetzt": schaetzung["steuern_gesamt"] - vorauszahlungen_jahr,
    }


def eur(x):
    return f"{x:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def html_bericht(a, cfg, rechnungen=None, datei="finanzbericht.html", personal_auswertung=None):
    AUSGABE.mkdir(exist_ok=True)
    e = html.escape
    s = a["schaetzung"]
    maxwert = max([max(v["einnahmen"], v["ausgaben"]) for v in a["monate"].values()] or [1]) or 1
    balken = "".join(
        f"<div class='monat'><div class='saeulen'><i class='ein' style='height:{v['einnahmen']/maxwert*100:.0f}%' title='Einnahmen {eur(v['einnahmen'])}'></i>"
        f"<i class='aus' style='height:{v['ausgaben']/maxwert*100:.0f}%' title='Ausgaben {eur(v['ausgaben'])}'></i></div><span>{m[5:]}/{m[2:4]}</span></div>"
        for m, v in a["monate"].items())
    ust_zeilen = "".join(f"<tr><td>{m}</td><td>{eur(v['ust'])}</td><td>{eur(v['vorsteuer'])}</td><td><b>{eur(v['ust']-v['vorsteuer'])}</b></td></tr>" for m, v in a["monate"].items())
    kat_zeilen = "".join(f"<tr><td>{e(k)}</td><td>{eur(v)}</td></tr>" for k, v in a["nach_kategorie"].items())
    heute = date.today()
    termine = kalender.termine(heute, heute + timedelta(days=90), cfg)
    term_zeilen = "".join(f"<tr><td>{d.strftime('%d.%m.%Y')}</td><td>{e(t)}</td><td>{eur(b) if b else '–'}</td></tr>" for d, t, b in termine)
    offen = [r for r in (rechnungen or []) if r.get("status") != "bezahlt"]
    re_zeilen = "".join(f"<tr class='{'rot' if r['status']=='ÜBERFÄLLIG' else ''}'><td>{e(r['nr'])}</td><td>{e(r['kunde'])}</td><td>{r['datum']}</td><td>{r['faellig']}</td><td>{eur(r['brutto'])}</td><td>{r['status']}</td></tr>" for r in offen)
    unklar_zeilen = "".join(f"<tr><td>{b['datum']}</td><td>{eur(b['betrag'])}</td><td>{e(b['name'])}</td><td>{e(b['zweck'][:80])}</td></tr>" for b in a["unklar"][:30])
    nachz = a["nachzahlung_geschaetzt"]
    pa = personal_auswertung
    personal_html = ""
    if pa:
        namen = {m["kuerzel"]: m for m in pa["mitarbeiter"]}
        zeilen = "".join(
            f"<tr><td>{r['monat']}</td><td>{e(namen[r['kuerzel']]['name'])}</td><td>{e(namen[r['kuerzel']]['art'])}</td>"
            f"<td>{e(namen[r['kuerzel']]['bereich'])}</td><td>{eur(r['brutto'])}</td><td>{eur(r['gesamtkosten'])}</td></tr>"
            for r in pa["abrechnungen"])
        bereiche = "".join(f"<tr><td>{m}</td><td>{', '.join(f'{e(b)}: {eur(k)}' for b, k in v.items())}</td><td><b>{eur(sum(v.values()))}</b></td></tr>"
                           for m, v in pa["pro_bereich"].items())
        warn = "".join(f"<li>{e(w)}</li>" for w in pa["warnungen"])
        personal_html = (f"<section><h2>👷 Personal</h2><div class='kacheln'><div class='k'><small>Ø Personalkosten pro Monat (inkl. Arbeitgeberanteile)</small><b>{eur(pa['kosten_monat_schnitt'])}</b></div>"
                         f"<div class='k'><small>Hochgerechnet aufs Jahr</small><b>{eur(pa['kosten_jahr_prognose'])}</b></div></div>"
                         f"<table><tr><th>Monat</th><th>Kosten nach Bereich</th><th>Summe</th></tr>{bereiche}</table>"
                         f"<details style='margin-top:12px'><summary>Einzelne Abrechnungen</summary><table><tr><th>Monat</th><th>Name</th><th>Art</th><th>Bereich</th><th>Brutto</th><th>Kosten AG</th></tr>{zeilen}</table></details>"
                         + (f"<h3 style='margin-top:18px'>Hinweise</h3><ul>{warn}</ul>" if warn else "") + "</section>")
    seite = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finanz-Cockpit {a['jahr']} – Königbauer</title><style>
:root{{--s:#121214;--b:#008dd2;--g:#5f6670;--l:#e4e7eb;--f:#f5f7f9}}*{{box-sizing:border-box}}
body{{margin:0;font-family:system-ui,Arial,sans-serif;background:var(--f);color:#2a2a2b}}
header{{background:var(--s);color:#fff;padding:28px 20px}}header div,main{{max-width:1100px;margin:0 auto}}
header h1{{margin:0;font-size:1.6rem}}header p{{margin:4px 0 0;color:#bbb}}
main{{padding:24px 20px 60px}}.kacheln{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px}}
.k{{background:#fff;border-radius:16px;padding:20px;border:1px solid var(--l)}}.k small{{color:var(--g);font-weight:600}}.k b{{display:block;font-size:1.6rem;color:var(--s);margin-top:4px}}
.k.blau{{background:var(--b);color:#fff;border-color:var(--b)}}.k.blau b,.k.blau small{{color:#fff}}
section{{background:#fff;border-radius:16px;padding:22px;border:1px solid var(--l);margin-bottom:20px;overflow-x:auto}}
h2{{margin:0 0 14px;font-size:1.15rem;color:var(--s)}}table{{width:100%;border-collapse:collapse;font-size:.92rem}}
td,th{{padding:8px 10px;border-bottom:1px solid var(--l);text-align:left}}th{{color:var(--g);font-weight:600}}td:nth-child(n+2){{font-variant-numeric:tabular-nums}}
.chart{{display:flex;gap:10px;align-items:flex-end;height:200px;padding-top:10px}}.monat{{flex:1;text-align:center;font-size:.75rem;color:var(--g)}}
.saeulen{{height:170px;display:flex;gap:3px;align-items:flex-end;justify-content:center}}.saeulen i{{width:40%;border-radius:4px 4px 0 0;display:block}}
.ein{{background:var(--b)}}.aus{{background:#2a2a2b}}.leg i{{display:inline-block;width:10px;height:10px;border-radius:2px;margin:0 4px 0 12px}}
.rot td{{color:#c62828;font-weight:600}}.hinweis{{font-size:.85rem;color:var(--g)}}.zwei{{display:grid;grid-template-columns:1fr 1fr;gap:20px}}
@media(max-width:760px){{.zwei{{grid-template-columns:1fr}}}}</style></head><body>
<header><div><h1>Finanz-Cockpit {a['jahr']}</h1><p>Königbauer Gebäudereinigung · Stand {heute.strftime('%d.%m.%Y')} · Datenbasis: {a['anzahl_monate']} Monat(e) Kontoumsätze</p></div></header><main>
<div class="kacheln">
<div class="k"><small>Umsatz netto (Jahr, hochgerechnet)</small><b>{eur(a['umsatz_jahr_netto'])}</b></div>
<div class="k"><small>Gewinn vor Steuern (Jahr, hochgerechnet)</small><b>{eur(a['gewinn_jahr'])}</b></div>
<div class="k"><small>Steuern gesamt geschätzt (ESt, Soli, GewSt{', KiSt' if cfg.get('kirchensteuer') else ''})</small><b>{eur(s['steuern_gesamt'])}</b></div>
<div class="k blau"><small>👉 Jeden Monat zurücklegen</small><b>{eur(a['ruecklage_monat'])}</b></div>
</div>
<section><h2>💡 Klartext</h2><p>Robert, von jedem Euro Netto-Umsatz solltest du etwa <b>{a['ruecklage_quote_umsatz']*100:.0f} Cent</b> für Einkommen- und Gewerbesteuer auf ein Extra-Konto legen. Die <b>Umsatzsteuer (19 %)</b> auf jeder Rechnung gehört nie dir: Sie geht jeden Monat bzw. jedes Quartal komplett ans Finanzamt, deshalb gleich mit weglegen.</p>
<p>Deine Einkommen- und Gewerbesteuer-Vorauszahlungen (laut Bescheid bzw. Konto): <b>{eur(a['vorauszahlungen_jahr'])}</b> im Jahr. Geschätzte {'Nachzahlung' if nachz > 0 else 'Erstattung'} nach der Steuererklärung: <b>{eur(abs(nachz))}</b>{' – bitte zusätzlich zurücklegen!' if nachz > 0 else '.'}</p>
<p class="hinweis">Durchschnittliche Steuerbelastung auf den Gewinn: {s['durchschnittssatz']*100:.1f} %. Gewerbesteuer {eur(s['gewerbesteuer'])}, davon werden {eur(s['gewst_anrechnung'])} auf die Einkommensteuer angerechnet. Handwerkskammer ca. {eur(s['handwerkskammer'])}, BG BAU ca. {eur(s['bg_bau'])} (laut Einstellungen).</p></section>
{personal_html}
<section><h2>Einnahmen &amp; Ausgaben pro Monat (netto)</h2><div class="leg"><i class="ein"></i>Einnahmen<i class="aus"></i>Ausgaben</div><div class="chart">{balken}</div></section>
<section><h2>📅 Was in den nächsten 90 Tagen fällig wird</h2><table><tr><th>Datum</th><th>Was</th><th>Betrag</th></tr>{term_zeilen}</table></section>
<div class="zwei">
<section><h2>Umsatzsteuer-Zahllast pro Monat</h2><table><tr><th>Monat</th><th>USt eingenommen</th><th>Vorsteuer</th><th>Ans Finanzamt</th></tr>{ust_zeilen}</table><p class="hinweis">Berechnet aus den Zahlungen (Ist). Bei Soll-Versteuerung zählt das Rechnungsdatum – die Summen gleichen sich über das Jahr aus.</p></section>
<section><h2>Betriebsausgaben &amp; Einnahmen nach Kategorie</h2><table><tr><th>Kategorie</th><th>Netto</th></tr>{kat_zeilen}</table></section>
</div>
<section><h2>🧾 Offene Rechnungen</h2>{'<table><tr><th>Nr.</th><th>Kunde</th><th>Datum</th><th>Fällig</th><th>Brutto</th><th>Status</th></tr>' + re_zeilen + '</table>' if re_zeilen else '<p>Keine offenen Rechnungen – oder noch keine Rechnungen eingelesen (<code>python run.py rechnungen &lt;ordner&gt;</code>).</p>'}</section>
<section><h2>❓ Nicht zugeordnete Buchungen ({len(a['unklar'])})</h2>{'<table><tr><th>Datum</th><th>Betrag</th><th>Name</th><th>Zweck</th></tr>' + unklar_zeilen + '</table><p class="hinweis">Stichwort in kategorien.json ergänzen oder mit KI-Schlüssel automatisch zuordnen lassen.</p>' if unklar_zeilen else '<p>Alles zugeordnet. 👍</p>'}</section>
<p class="hinweis">Planungshilfe auf Basis von Kontoumsätzen und vereinfachten Annahmen (Einkommensteuertarif {s['tarifjahr']}, ohne Abschreibungen, ohne Sonderfälle). Ersetzt keine Steuerberatung – die verbindlichen Zahlen kommen vom Steuerberater bzw. Finanzamt.</p>
</main></body></html>"""
    pfad = AUSGABE / datei
    pfad.write_text(seite, encoding="utf-8")
    return pfad
