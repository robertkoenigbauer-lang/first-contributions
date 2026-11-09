"""Agent 1 – Lead-Finder.

Sucht über OpenStreetMap (Overpass-API, kostenlos, Daten unter ODbL) alle Firmen im Umkreis,
die Büros, Treppenhäuser oder Gewerbeflächen haben, und bewertet sie nach Potenzial.
"""
import time
import requests

OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

# Segment -> (OSM-Filter, Basis-Score). Höherer Score = größeres/regelmäßigeres Reinigungsvolumen.
SEGMENTE = {
    "hausverwaltung": (['office"="property_management', 'office"="estate_agent'], 95),
    "versicherung":   (['office"="insurance'], 70),
    "steuer_recht":   (['office"="tax_advisor', 'office"="lawyer', 'office"="notary', 'office"="accountant'], 70),
    "firma_buero":    (['office"="company', 'office"="it', 'office"="consulting', 'office"="logistics',
                        'office"="employment_agency', 'office"="architect', 'office"="engineer'], 80),
    "praxis":         (['amenity"="doctors', 'amenity"="dentist', 'healthcare"="physiotherapist'], 85),
    "bank":           (['amenity"="bank'], 60),
    "kita_schule":    (['amenity"="kindergarten', 'amenity"="childcare'], 55),
    "laden":          (['shop"="car', 'shop"="furniture', 'shop"="optician', 'shop"="hairdresser',
                        'shop"="clothes', 'shop"="electronics'], 45),
    "fitness_hotel":  (['leisure"="fitness_centre', 'tourism"="hotel'], 65),
    "gewerbe":        (['building"="office', 'building"="commercial'], 75),
}


def _query(filters, lat, lon, radius_m):
    teile = []
    for f in filters:
        for typ in ("node", "way"):
            teile.append(f'{typ}["{f}"](around:{radius_m},{lat},{lon});')
    return f"[out:json][timeout:90];({''.join(teile)});out center tags;"


def _overpass(q):
    letzter_fehler = None
    for url in OVERPASS_URLS:
        for versuch in range(3):
            try:
                r = requests.post(url, data={"data": q}, timeout=120,
                                  headers={"User-Agent": "koenigbauer-leadfinder/1.0"})
                if r.status_code == 200:
                    return r.json().get("elements", [])
                letzter_fehler = f"HTTP {r.status_code}"
            except requests.RequestException as e:
                letzter_fehler = e
            time.sleep(2 ** (versuch + 1))
    raise RuntimeError(f"Overpass nicht erreichbar: {letzter_fehler}")


def _score(basis, tags):
    s = basis
    if tags.get("phone") or tags.get("contact:phone"): s += 5
    if tags.get("website") or tags.get("contact:website"): s += 5
    if tags.get("building:levels"):
        try: s += min(int(tags["building:levels"]) * 2, 10)
        except ValueError: pass
    return min(s, 100)


def finden(lat, lon, radius_km, segmente=None):
    radius_m = int(radius_km * 1000)
    ergebnis = []
    for seg, (filters, basis) in SEGMENTE.items():
        if segmente and seg not in segmente:
            continue
        for el in _overpass(_query(filters, lat, lon, radius_m)):
            t = el.get("tags", {})
            name = t.get("name")
            if not name:
                continue  # ohne Namen kein sinnvoller Lead
            ergebnis.append({
                "osm_id": f"{el['type']}/{el['id']}",
                "name": name,
                "segment": seg,
                "strasse": " ".join(x for x in [t.get("addr:street"), t.get("addr:housenumber")] if x),
                "plz": t.get("addr:postcode", ""),
                "ort": t.get("addr:city", ""),
                "telefon": t.get("phone") or t.get("contact:phone", ""),
                "email": t.get("email") or t.get("contact:email", ""),
                "website": t.get("website") or t.get("contact:website", ""),
                "score": _score(basis, t),
            })
        time.sleep(1)  # Overpass fair nutzen
    return ergebnis
