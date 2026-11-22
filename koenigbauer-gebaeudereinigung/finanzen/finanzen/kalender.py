"""Agent F4 – Steuer- und Zahlungskalender: Wann muss was ans Finanzamt, die Gemeinde und die Krankenkassen?"""
from datetime import date, timedelta


def _werktag(d):
    while d.weekday() >= 5:  # Sa/So -> Montag (Feiertage vereinfacht nicht berücksichtigt)
        d += timedelta(days=1)
    return d


def _drittletzter_bankarbeitstag(jahr, monat):
    letzter = (date(jahr + (monat == 12), monat % 12 + 1, 1) - timedelta(days=1))
    tage = []
    d = letzter
    while len(tage) < 3:
        if d.weekday() < 5:
            tage.append(d)
        d -= timedelta(days=1)
    return tage[-1]


def termine(von, bis, cfg, hat_mitarbeiter=True):
    """Liefert [(datum, bezeichnung, betrag_oder_None)] im Zeitraum."""
    vz = cfg.get("vorauszahlungen", {})
    t = []
    jahr = von.year
    while date(jahr, 1, 1) <= bis:
        for monat in range(1, 13):
            # Umsatzsteuer-Voranmeldung
            if cfg.get("ust_voranmeldung") == "monat" or monat in (1, 4, 7, 10):
                offset = 1 if cfg.get("dauerfristverlaengerung") else 0
                m = monat + offset
                j = jahr + (m - 1) // 12
                m = (m - 1) % 12 + 1
                zeitraum = "Vormonat" if cfg.get("ust_voranmeldung") == "monat" else "Vorquartal"
                t.append((_werktag(date(j, m, 10)), f"Umsatzsteuer-Voranmeldung + Zahlung ({zeitraum})", None))
            if hat_mitarbeiter:
                t.append((_werktag(date(jahr, monat, 10)), "Lohnsteuer-Anmeldung + Zahlung (Vormonat)", None))
                t.append((_drittletzter_bankarbeitstag(jahr, monat), "Sozialversicherungsbeiträge (Beitragsnachweis 2 Arbeitstage vorher)", None))
            if monat in (3, 6, 9, 12):
                t.append((_werktag(date(jahr, monat, 10)), "Einkommensteuer-Vorauszahlung", vz.get("einkommensteuer_pro_quartal") or None))
            if monat in (2, 5, 8, 11):
                t.append((_werktag(date(jahr, monat, 15)), "Gewerbesteuer-Vorauszahlung (Gemeinde Neufahrn)", vz.get("gewerbesteuer_pro_quartal") or None))
        t.append((date(jahr, 2, 28), "Jahresmeldung Minijobber / Lohnsteuerbescheinigungen übermittelt?", None))
        t.append((date(jahr, 7, 31), f"Steuererklärungen {jahr - 1} fällig (ohne Steuerberater; mit Berater später)", None))
        jahr += 1
    return sorted((d, txt, b) for d, txt, b in t if von <= d <= bis)
