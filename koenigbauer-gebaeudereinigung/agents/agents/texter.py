"""Agent 2 – Texter.

Schreibt mit Claude personalisierte Anschreiben (Brief), Telefon-Leitfäden und Nachfass-Texte
im Ton von Robert Königbauer. Ohne API-Schlüssel wird eine solide Vorlage genutzt.
"""
import json
import os

MODELL = os.environ.get("KOENIGBAUER_MODELL", "claude-sonnet-5-5")

SEGMENT_AUFHAENGER = {
    "hausverwaltung": "Treppenhaus- und Objektreinigung für Ihre verwalteten Wohnanlagen – mit Reinigungsnachweis und festen Intervallen. Als ista Servicepartner sind wir ohnehin regelmäßig in Wohnanlagen im Landkreis unterwegs",
    "versicherung": "eine saubere, gepflegte Agentur, in der sich Ihre Kunden wohlfühlen",
    "steuer_recht": "diskrete, zuverlässige Büroreinigung außerhalb Ihrer Mandantenzeiten",
    "firma_buero": "Büroreinigung mit Schlüsselservice: Wir reinigen abends oder frühmorgens, wenn niemand da ist – abgesichert durch unsere Betriebshaftpflicht inklusive Schlüsselverlust. Sie kommen ins saubere Büro und müssen sich um nichts kümmern",
    "praxis": "hygienische Praxisreinigung nach Ihren Hygieneplänen, außerhalb der Sprechzeiten",
    "bank": "gepflegte Filial- und Kundenbereiche, auch SB-Zonen",
    "kita_schule": "gründliche, kindgerechte Reinigung Ihrer Einrichtung",
    "laden": "ein sauberer erster Eindruck für Ihre Kunden – Laden- und Schaufensterreinigung",
    "fitness_hotel": "Reinigung von Trainings-, Umkleide- und Sanitärbereichen mit festen Intervallen",
    "gewerbe": "Unterhaltsreinigung für Ihr Gewerbeobjekt – Büros, Treppenhäuser, Sanitär – auf Wunsch als Schlüsselobjekt außerhalb Ihrer Geschäftszeiten",
}

SYSTEM = """Du bist der Vertriebstexter von {inhaber}, Inhaber der {firma} in {plz_ort}.
Du schreibst Texte, die {inhaber} persönlich unterschreibt. Ton: {tonalitaet}.
Regeln:
- Deutsch, Sie-Form, maximal 170 Wörter für Briefe.
- Konkreter Bezug zum Empfänger (Branche, Ort). Nichts erfinden, was nicht in den Daten steht.
- Keine Herabsetzung von Mitbewerbern, keine Superlative ("bester", "günstigster"), keine Garantien, die nicht im Firmenprofil stehen.
- Klarer nächster Schritt: kostenlose Besichtigung / kurzer Anruf.
- Nenne niemals Mitarbeiter- oder Kundenzahlen und keine Namen von Bestandskunden.
- Bei Büros und Gewerbe den Schlüsselservice betonen (Reinigung außerhalb der Geschäftszeiten).
- Den Hinweis "ista Servicepartner" nur bei Hausverwaltungen verwenden.
- Am Ende ein Satz: Wer keine weiteren Informationen wünscht, genügt eine kurze Nachricht.
Antworte ausschließlich als JSON."""

AUFGABE = """Firmenprofil:
{profil}

Empfänger:
{lead}

Erstelle JSON mit den Schlüsseln:
"betreff": Betreffzeile für den Brief (max. 70 Zeichen),
"brief": Brieftext ohne Anschrift, ohne Datum, beginnend mit der Anrede, endend vor der Grußformel,
"telefon_leitfaden": Stichpunkte für ein 60-Sekunden-Telefonat (Einstieg, Bedarfsfrage, 2 Einwandbehandlungen, Terminvorschlag),
"nachfass": kurzer Nachfass-Text für einen Anruf 7 Tage nach dem Brief."""


def _vorlage(lead, profil):
    aufh = SEGMENT_AUFHAENGER.get(lead.get("segment"), SEGMENT_AUFHAENGER["gewerbe"])
    ort = lead.get("ort") or "Ihrer Region"
    return {
        "betreff": f"Gebäudereinigung für {lead['name']} – direkt aus {profil['zentrum']['name']}",
        "brief": (
            "Sehr geehrte Damen und Herren,\n\n"
            f"mein Name ist {profil['inhaber']}, ich bin Inhaber der {profil['firma']} hier in "
            f"{profil['zentrum']['name']}. Für Betriebe in {ort} biete ich {aufh}.\n\n"
            "Was Sie bei uns bekommen:\n"
            + "".join(f"• {u}\n" for u in profil["usps"][:4]) +
            "\nIch komme gern persönlich vorbei und schaue mir Ihre Räume an – kostenlos und unverbindlich. "
            "Innerhalb von 24 Stunden erhalten Sie einen Festpreis.\n\n"
            f"Rufen Sie mich einfach an unter {profil['telefon']} – oder ich melde mich in den nächsten Tagen kurz telefonisch bei Ihnen.\n\n"
            "Sollten Sie keine weiteren Informationen wünschen, genügt eine kurze Nachricht."
        ),
        "telefon_leitfaden": [
            f"Grüß Gott, {profil['inhaber']} von der {profil['firma']} aus {profil['zentrum']['name']}. Ich hatte Ihnen letzte Woche einen Brief geschickt.",
            "Wer kümmert sich bei Ihnen um die Reinigung? Sind Sie damit rundum zufrieden?",
            "Einwand 'Haben schon jemanden': Völlig verständlich – darf ich trotzdem ein Vergleichsangebot machen? Kostet Sie nichts.",
            "Einwand 'Zu teuer': Nach der Besichtigung bekommen Sie einen Festpreis – und entscheiden dann in Ruhe.",
            "Termin: Passt Ihnen Dienstag oder Donnerstag für 15 Minuten Besichtigung?",
        ],
        "nachfass": f"Kurz nachgefragt: Haben Sie meinen Brief zur Gebäudereinigung erhalten? Ich würde mir Ihre Räume gern 15 Minuten ansehen – kostenlos und unverbindlich.",
    }


def texte_erstellen(lead: dict, profil: dict) -> dict:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return _vorlage(lead, profil)
    import anthropic
    client = anthropic.Anthropic()
    lead_kurz = {k: lead.get(k) for k in ("name", "segment", "strasse", "plz", "ort", "website", "ansprechpartner", "notizen")}
    lead_kurz["branchen_aufhaenger"] = SEGMENT_AUFHAENGER.get(lead.get("segment"), "")
    antwort = client.messages.create(
        model=MODELL,
        max_tokens=1500,
        system=SYSTEM.format(**profil),
        messages=[{"role": "user", "content": AUFGABE.format(
            profil=json.dumps(profil, ensure_ascii=False, indent=1),
            lead=json.dumps(lead_kurz, ensure_ascii=False, indent=1))}],
    )
    text = "".join(b.text for b in antwort.content if b.type == "text").strip()
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return _vorlage(lead, profil)
