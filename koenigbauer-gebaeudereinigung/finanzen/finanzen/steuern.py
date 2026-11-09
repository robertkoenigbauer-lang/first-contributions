"""Agent F2 – Steuer-Schätzer (Einzelunternehmen, Bayern).

Schätzt Einkommensteuer, Soli, Kirchensteuer, Gewerbesteuer (inkl. Anrechnung § 35 EStG)
und Umsatzsteuer-Zahllast. Ergebnis ist eine PLANUNGSHILFE, keine Steuerberechnung im Rechtssinn.
"""

# Einkommensteuertarif § 32a EStG – Werte für 2026 (für 2027 nach Gesetzesstand aktualisieren!)
TARIF = {
    2026: {"gfb": 12348, "z1": 17799, "z2": 69878, "z3": 277825,
           "a": 914.51, "b": 1400, "c": 173.10, "d": 2397, "e": 1034.87,
           "f": 0.42, "g": 11135.63, "h": 0.45, "i": 19470.38},
}
SOLI_FREIGRENZE = {2026: 20350}  # Einkommensteuer-Freigrenze Einzelveranlagung (verdoppelt bei Zusammenveranlagung)
GEWST_FREIBETRAG = 24500
GEWST_MESSZAHL = 0.035
GEWST_ANRECHNUNG_FAKTOR = 4.0


def _tarif_jahr(jahr):
    return max(j for j in TARIF if j <= jahr) if any(j <= jahr for j in TARIF) else min(TARIF)


def einkommensteuer_grundtarif(zve, jahr):
    t = TARIF[_tarif_jahr(jahr)]
    x = int(max(zve, 0))
    if x <= t["gfb"]:
        return 0.0
    if x <= t["z1"]:
        y = (x - t["gfb"]) / 10000
        return (t["a"] * y + t["b"]) * y
    if x <= t["z2"]:
        z = (x - t["z1"]) / 10000
        return (t["c"] * z + t["d"]) * z + t["e"]
    if x <= t["z3"]:
        return t["f"] * x - t["g"]
    return t["h"] * x - t["i"]


def einkommensteuer(zve, jahr, zusammen=False):
    if zusammen:
        return float(int(2 * einkommensteuer_grundtarif(zve / 2, jahr)))
    return float(int(einkommensteuer_grundtarif(zve, jahr)))


def soli(est, jahr, zusammen=False):
    grenze = SOLI_FREIGRENZE[_tarif_jahr(jahr)] * (2 if zusammen else 1)
    if est <= grenze:
        return 0.0
    return round(min(0.055 * est, 0.119 * (est - grenze)), 2)


def gewerbesteuer(gewinn, hebesatz_prozent):
    ertrag = max(0, int(gewinn // 100 * 100) - GEWST_FREIBETRAG)
    messbetrag = ertrag * GEWST_MESSZAHL
    return round(messbetrag * hebesatz_prozent / 100, 2), round(messbetrag, 2)


def jahresschaetzung(gewinn, cfg):
    """gewinn = voraussichtlicher Jahresgewinn (EÜR) vor Steuern."""
    jahr = cfg["steuerjahr"]
    zusammen = cfg.get("veranlagung") == "zusammen"
    gewst, messbetrag = gewerbesteuer(gewinn, cfg["gewerbesteuer_hebesatz_prozent"])
    abzuege = sum(cfg.get("abzuege_privat_jahr", {}).values())
    zve = max(0.0, gewinn + (cfg.get("zve_partner_euro", 0) if zusammen else 0) - abzuege)
    est_tarif = einkommensteuer(zve, jahr, zusammen)
    anrechnung = min(GEWST_ANRECHNUNG_FAKTOR * messbetrag, gewst, est_tarif)
    est = max(0.0, est_tarif - anrechnung)
    so = soli(est, jahr, zusammen)
    kist = round(est * cfg["kirchensteuer_satz"], 2) if cfg.get("kirchensteuer") else 0.0
    kammer = cfg.get("kammer_und_verbaende", {})
    hwk = kammer.get("handwerkskammer_grundbeitrag", 0) + max(0, gewinn - GEWST_FREIBETRAG) * kammer.get("handwerkskammer_zusatzbeitrag_prozent_gewerbeertrag", 0) / 100
    gesamt = est + so + kist + gewst
    return {
        "gewinn": round(gewinn, 2), "zve": round(zve, 2),
        "einkommensteuer_tarif": est_tarif, "gewst_anrechnung": round(anrechnung, 2),
        "einkommensteuer": round(est, 2), "soli": so, "kirchensteuer": kist,
        "gewerbesteuer": gewst, "gewst_messbetrag": messbetrag,
        "handwerkskammer": round(hwk, 2), "bg_bau": kammer.get("bg_bau_jahresbeitrag_geschaetzt", 0),
        "steuern_gesamt": round(gesamt, 2),
        "durchschnittssatz": round(gesamt / gewinn, 4) if gewinn > 0 else 0.0,
        "tarifjahr": _tarif_jahr(jahr),
    }
