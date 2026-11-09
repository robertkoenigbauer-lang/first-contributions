"""Agent 3 – Compliance-Wächter.

Entscheidet pro Lead, über welchen Kanal Werbung rechtlich zulässig ist (Deutschland, UWG § 7, DSGVO).
Kurzfassung (keine Rechtsberatung):
  * Brief/Post an Firmen:       erlaubt, solange kein Widerspruch vorliegt (Briefkasten-Aufkleber/Werbesperre beachten).
  * Anruf bei Firmen (B2B):     nur mit "mutmaßlicher Einwilligung" – konkreter, sachlicher Bezug zum Betrieb nötig.
                                Bei Gewerbeobjekten mit Reinigungsbedarf vertretbar, aber Graubereich. Nie bei Privatleuten.
  * E-Mail / SMS / WhatsApp / Kontaktformular-Werbung: NUR mit ausdrücklicher vorheriger Einwilligung – auch B2B!
                                Kalt-E-Mails sind abmahnfähig (typisch 500–2.000 € + Unterlassungserklärung).
  * Antwort auf eine Anfrage des Kunden: immer erlaubt.
"""

KANAL_BRIEF = "brief"
KANAL_ANRUF = "anruf"
KANAL_EMAIL = "email"

# Segmente, bei denen ein Bezug zu Reinigungsleistungen plausibel ist (Basis für mutmaßliche Einwilligung).
ANRUF_SEGMENTE = {"hausverwaltung", "firma_buero", "praxis", "gewerbe", "fitness_hotel", "versicherung", "steuer_recht", "bank"}

VERBOTENE_FORMULIERUNGEN = ["garantiert günstigster", "billigste", "besser als", "die anderen", "konkurrenz", "100 % keimfrei",
                            "bester", "nummer 1", "marktführer"]


def erlaubte_kanaele(lead: dict) -> list[str]:
    if lead.get("werbewiderspruch"):
        return []
    kanaele = []
    if lead.get("strasse") and (lead.get("plz") or lead.get("ort")):
        kanaele.append(KANAL_BRIEF)
    if lead.get("telefon") and lead.get("segment") in ANRUF_SEGMENTE:
        kanaele.append(KANAL_ANRUF)
    if lead.get("email") and lead.get("email_einwilligung"):
        kanaele.append(KANAL_EMAIL)
    return kanaele


def text_pruefen(text: str) -> list[str]:
    """Findet riskante Werbeaussagen (irreführend / unzulässig vergleichend, § 5, § 6 UWG)."""
    warnungen = [f"Riskante Aussage: '{w}'" for w in VERBOTENE_FORMULIERUNGEN if w in text.lower()]
    if "abmelden" not in text.lower() and "widersprechen" not in text.lower() and "keine weitere" not in text.lower():
        warnungen.append("Hinweis auf Widerspruchsmöglichkeit fehlt (Art. 21 DSGVO) – bitte ergänzen.")
    return warnungen
