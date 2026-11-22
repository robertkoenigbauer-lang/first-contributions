"""Mini-CRM auf SQLite: speichert Leads, Status, Kontaktverlauf und Einwilligungen."""
import sqlite3
from datetime import datetime, date, timedelta
from pathlib import Path

DB_PFAD = Path(__file__).resolve().parent.parent / "daten" / "crm.sqlite"

STATUS = ["neu", "recherchiert", "anschreiben_bereit", "brief_versendet", "angerufen",
          "termin", "angebot", "kunde", "kein_interesse", "sperre"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY,
  osm_id TEXT UNIQUE,
  name TEXT, segment TEXT, strasse TEXT, plz TEXT, ort TEXT,
  telefon TEXT, email TEXT, website TEXT,
  ansprechpartner TEXT,
  score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'neu',
  email_einwilligung INTEGER DEFAULT 0,   -- 1 nur bei nachweisbarer Einwilligung (UWG § 7)
  werbewiderspruch INTEGER DEFAULT 0,     -- 1 = nie wieder kontaktieren
  naechster_schritt TEXT, faellig_am TEXT,
  notizen TEXT,
  erstellt TEXT, geaendert TEXT
);
CREATE TABLE IF NOT EXISTS kontakte (
  id INTEGER PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  kanal TEXT, richtung TEXT, inhalt TEXT, zeitpunkt TEXT
);
"""


def verbinden():
    DB_PFAD.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PFAD)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def jetzt():
    return datetime.now().isoformat(timespec="seconds")


def lead_speichern(con, lead: dict) -> bool:
    """Legt einen Lead an, wenn er noch nicht existiert. Gibt True zurück, wenn neu."""
    felder = ["osm_id", "name", "segment", "strasse", "plz", "ort", "telefon", "email", "website", "score"]
    werte = [lead.get(f) for f in felder]
    cur = con.execute(
        f"INSERT OR IGNORE INTO leads ({','.join(felder)}, erstellt, geaendert) "
        f"VALUES ({','.join('?' * len(felder))}, ?, ?)", werte + [jetzt(), jetzt()])
    con.commit()
    return cur.rowcount == 1


def leads(con, status=None, limit=None, segment=None):
    sql, args = "SELECT * FROM leads WHERE werbewiderspruch = 0", []
    if status:
        sql += " AND status = ?"; args.append(status)
    if segment:
        sql += " AND segment = ?"; args.append(segment)
    sql += " ORDER BY score DESC, id"
    if limit:
        sql += " LIMIT ?"; args.append(limit)
    return [dict(r) for r in con.execute(sql, args)]


def status_setzen(con, lead_id, status, naechster_schritt=None, in_tagen=None):
    if status not in STATUS:
        raise ValueError(f"Unbekannter Status {status!r}. Erlaubt: {', '.join(STATUS)}")
    faellig = (date.today() + timedelta(days=in_tagen)).isoformat() if in_tagen is not None else None
    con.execute("UPDATE leads SET status=?, naechster_schritt=COALESCE(?, naechster_schritt), "
                "faellig_am=COALESCE(?, faellig_am), geaendert=? WHERE id=?",
                (status, naechster_schritt, faellig, jetzt(), lead_id))
    if status == "sperre":
        con.execute("UPDATE leads SET werbewiderspruch=1 WHERE id=?", (lead_id,))
    con.commit()


def kontakt_loggen(con, lead_id, kanal, inhalt, richtung="raus"):
    con.execute("INSERT INTO kontakte (lead_id, kanal, richtung, inhalt, zeitpunkt) VALUES (?,?,?,?,?)",
                (lead_id, kanal, richtung, inhalt, jetzt()))
    con.commit()


def faellige(con):
    heute = date.today().isoformat()
    return [dict(r) for r in con.execute(
        "SELECT * FROM leads WHERE werbewiderspruch=0 AND faellig_am IS NOT NULL AND faellig_am <= ? "
        "AND status NOT IN ('kunde','kein_interesse','sperre') ORDER BY faellig_am", (heute,))]


def statistik(con):
    return {r["status"]: r["n"] for r in con.execute("SELECT status, COUNT(*) n FROM leads GROUP BY status")}
