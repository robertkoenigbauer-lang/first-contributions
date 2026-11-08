/*
 * Königbauer Gebäudereinigung – Betriebs-App
 * Material & Kosten · Meldungen mit Foto · Stundenzettel mit Unterschrift
 *
 * Datenschutz-Grundsatz: Mitarbeiter sehen ausschließlich ihre eigenen Daten.
 * Nur der Chef (Rolle "admin") sieht alles.
 */
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { buildTimesheetPdf } = require('./lib/pdf');
const { sendMail, smtpConfigured } = require('./lib/mail');
const { DEFAULT_MATERIALS } = require('./lib/defaults');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SESSION_DAYS = 60;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Mini-Datenbank (JSON-Datei, atomar geschrieben)                     */
/* ------------------------------------------------------------------ */
function emptyDb() {
  return {
    users: [],
    sessions: {},
    materials: DEFAULT_MATERIALS.map((m) => ({ id: uid(), ...m })),
    purchases: [],
    reports: [],
    entries: [],
    signoffs: [],
    settings: {
      companyName: 'Königbauer Gebäudereinigung',
      ownerEmail: '',
      notifyOnReport: true,
      smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '' },
    },
  };
}
function uid() {
  return crypto.randomBytes(9).toString('base64url');
}
let db;
function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const def = emptyDb();
    for (const k of Object.keys(def)) if (db[k] === undefined) db[k] = def[k];
    db.settings = { ...def.settings, ...db.settings, smtp: { ...def.settings.smtp, ...(db.settings.smtp || {}) } };
  } else {
    db = emptyDb();
    saveDb();
  }
}
function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
loadDb();

/* ------------------------------------------------------------------ */
/* Passwörter & Sitzungen                                              */
/* ------------------------------------------------------------------ */
function hashPw(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return { salt, hash };
}
function checkPw(user, pw) {
  const { hash } = hashPw(pw, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}
function publicUser(u) {
  return { id: u.id, name: u.name, username: u.username, email: u.email || '', role: u.role, active: u.active !== false };
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function cleanSessions() {
  const now = Date.now();
  for (const [t, s] of Object.entries(db.sessions)) if (s.expires < now) delete db.sessions[t];
}

const loginAttempts = new Map(); // ip -> {count, until}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  const token = parseCookies(req).kb_session;
  const s = token && db.sessions[token];
  if (!s || s.expires < Date.now()) return res.status(401).json({ error: 'Bitte anmelden.' });
  const user = db.users.find((u) => u.id === s.userId && u.active !== false);
  if (!user) return res.status(401).json({ error: 'Bitte anmelden.' });
  req.user = user;
  next();
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Nur für den Chef.' });
  next();
}
function setSessionCookie(req, res, token) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `kb_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`
  );
}
function newSession(req, res, user) {
  cleanSessions();
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = { userId: user.id, expires: Date.now() + SESSION_DAYS * 86400e3 };
  saveDb();
  setSessionCookie(req, res, token);
}

/* ---------- Ersteinrichtung & Login ---------- */
app.get('/api/status', (req, res) => {
  res.json({ needsSetup: db.users.length === 0, companyName: db.settings.companyName });
});

app.post('/api/setup', (req, res) => {
  if (db.users.length > 0) return res.status(400).json({ error: 'Bereits eingerichtet.' });
  const { name, username, password, email } = req.body || {};
  if (!name || !username || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, Benutzername und Passwort (mind. 6 Zeichen) angeben.' });
  const user = { id: uid(), name, username: username.trim().toLowerCase(), email: email || '', role: 'admin', active: true, ...hashPw(password) };
  db.users.push(user);
  if (email) db.settings.ownerEmail = email;
  saveDb();
  newSession(req, res, user);
  res.json(publicUser(user));
});

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  const a = loginAttempts.get(ip);
  if (a && a.until > Date.now()) return res.status(429).json({ error: 'Zu viele Versuche. Bitte 5 Minuten warten.' });
  const { username, password } = req.body || {};
  const user = db.users.find((u) => u.username === String(username || '').trim().toLowerCase() && u.active !== false);
  if (!user || !checkPw(user, password || '')) {
    const n = (a && a.until <= Date.now() ? 0 : a?.count || 0) + 1;
    loginAttempts.set(ip, { count: n, until: n >= 8 ? Date.now() + 5 * 60e3 : 0 });
    return res.status(401).json({ error: 'Benutzername oder Passwort falsch.' });
  }
  loginAttempts.delete(ip);
  newSession(req, res, user);
  res.json(publicUser(user));
});

app.post('/api/logout', auth, (req, res) => {
  const token = parseCookies(req).kb_session;
  delete db.sessions[token];
  saveDb();
  res.setHeader('Set-Cookie', 'kb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

app.post('/api/me/password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!checkPw(req.user, oldPassword || '')) return res.status(400).json({ error: 'Altes Passwort stimmt nicht.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Neues Passwort: mind. 6 Zeichen.' });
  Object.assign(req.user, hashPw(newPassword));
  saveDb();
  res.json({ ok: true });
});

/* ---------- Team (nur Chef) ---------- */
app.get('/api/users', auth, adminOnly, (req, res) => res.json(db.users.map(publicUser)));

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { name, username, password, email, role } = req.body || {};
  if (!name || !username || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, Benutzername und Passwort (mind. 6 Zeichen) angeben.' });
  const uname = username.trim().toLowerCase();
  if (db.users.some((u) => u.username === uname)) return res.status(400).json({ error: 'Benutzername schon vergeben.' });
  const user = { id: uid(), name, username: uname, email: email || '', role: role === 'admin' ? 'admin' : 'mitarbeiter', active: true, ...hashPw(password) };
  db.users.push(user);
  saveDb();
  res.json(publicUser(user));
});

app.put('/api/users/:id', auth, adminOnly, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden.' });
  const { name, email, password, active } = req.body || {};
  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  if (active !== undefined && user.id !== req.user.id) user.active = !!active;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Passwort: mind. 6 Zeichen.' });
    Object.assign(user, hashPw(password));
    for (const [t, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[t];
  }
  if (active === false) for (const [t, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[t];
  saveDb();
  res.json(publicUser(user));
});

/* ---------- Material & Kosten ---------- */
function materialView(m) {
  const monthly = (Number(m.monthlyQty) || 0) * (Number(m.price) || 0);
  return { ...m, monthlyCost: round2(monthly), yearlyCost: round2(monthly * 12), low: !!m.stockTracked && Number(m.stock) <= Number(m.minStock || 0) };
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

// Mitarbeiter bekommen nur Namen (für das Melde-Formular), keine Preise.
app.get('/api/materials', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.json(db.materials.map((m) => ({ id: m.id, name: m.name, unit: m.unit })));
  const list = db.materials.map(materialView);
  const monthly = round2(list.reduce((s, m) => s + m.monthlyCost, 0));
  res.json({ materials: list, monthly, yearly: round2(monthly * 12) });
});

app.post('/api/materials', auth, adminOnly, (req, res) => {
  const m = sanitizeMaterial(req.body || {});
  if (!m.name) return res.status(400).json({ error: 'Bezeichnung fehlt.' });
  m.id = uid();
  db.materials.push(m);
  saveDb();
  res.json(materialView(m));
});

app.put('/api/materials/:id', auth, adminOnly, (req, res) => {
  const i = db.materials.findIndex((m) => m.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Nicht gefunden.' });
  const tracked = db.materials[i].stockTracked || (req.body.stock !== undefined && String(req.body.stock) !== String(db.materials[i].stock));
  db.materials[i] = { ...db.materials[i], ...sanitizeMaterial({ ...db.materials[i], ...req.body }), stockTracked: !!tracked };
  saveDb();
  res.json(materialView(db.materials[i]));
});

app.delete('/api/materials/:id', auth, adminOnly, (req, res) => {
  db.materials = db.materials.filter((m) => m.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

function sanitizeMaterial(b) {
  const num = (v) => (v === '' || v == null ? 0 : Math.max(0, Number(String(v).replace(',', '.')) || 0));
  return {
    name: String(b.name || '').trim(),
    unit: String(b.unit || 'Stück').trim(),
    pack: String(b.pack || '').trim(),
    monthlyQty: num(b.monthlyQty),
    price: num(b.price),
    stock: num(b.stock),
    minStock: num(b.minStock),
    note: String(b.note || '').trim(),
  };
}

/* ---------- Einkäufe (tatsächliche Kosten) ---------- */
app.get('/api/purchases', auth, adminOnly, (req, res) => {
  const list = [...db.purchases].sort((a, b) => b.date.localeCompare(a.date));
  const byMonth = {};
  for (const p of db.purchases) {
    const k = p.date.slice(0, 7);
    byMonth[k] = round2((byMonth[k] || 0) + p.total);
  }
  res.json({ purchases: list, byMonth });
});

app.post('/api/purchases', auth, adminOnly, (req, res) => {
  const { materialId, qty, total, date, note } = req.body || {};
  const m = db.materials.find((x) => x.id === materialId);
  const q = Number(String(qty).replace(',', '.')) || 0;
  const t = Number(String(total).replace(',', '.')) || 0;
  if (!m || q <= 0) return res.status(400).json({ error: 'Material und Menge angeben.' });
  const p = { id: uid(), materialId, materialName: m.name, unit: m.unit, qty: q, total: round2(t), date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today(), note: note || '' };
  db.purchases.push(p);
  m.stock = round2((Number(m.stock) || 0) + q);
  m.stockTracked = true;
  saveDb();
  res.json(p);
});

app.delete('/api/purchases/:id', auth, adminOnly, (req, res) => {
  const p = db.purchases.find((x) => x.id === req.params.id);
  if (p) {
    const m = db.materials.find((x) => x.id === p.materialId);
    if (m) m.stock = Math.max(0, round2((Number(m.stock) || 0) - p.qty));
    db.purchases = db.purchases.filter((x) => x.id !== p.id);
    saveDb();
  }
  res.json({ ok: true });
});

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ---------- Meldungen (fehlt / kaputt) mit Foto ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, uid() + (path.extname(file.originalname).toLowerCase().match(/^\.(jpe?g|png|webp|heic)$/) ? path.extname(file.originalname).toLowerCase() : '.jpg')),
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

function reportView(r) {
  const u = db.users.find((x) => x.id === r.userId);
  return { ...r, userName: u ? u.name : '?' };
}

app.get('/api/reports', auth, (req, res) => {
  const list = req.user.role === 'admin' ? db.reports : db.reports.filter((r) => r.userId === req.user.id);
  res.json([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(reportView));
});

app.post('/api/reports', auth, upload.array('photos', 4), async (req, res) => {
  const { type, materialId, location, text, qty, urgent } = req.body || {};
  const types = ['material', 'defekt', 'sonstiges', 'bestellung'];
  const m = db.materials.find((x) => x.id === materialId);
  // Bestellung: Liste von Artikeln [{name, qty}]
  let items = [];
  try {
    items = JSON.parse(req.body.items || '[]');
  } catch {
    items = [];
  }
  items = (Array.isArray(items) ? items : [])
    .map((i) => ({ name: String(i.name || '').trim().slice(0, 80), qty: String(i.qty || '').trim().slice(0, 30) }))
    .filter((i) => i.name)
    .slice(0, 30);
  const r = {
    id: uid(),
    userId: req.user.id,
    type: types.includes(type) ? type : 'sonstiges',
    items,
    urgent: urgent === 'true' || urgent === true,
    materialId: m ? m.id : '',
    materialName: m ? m.name : '',
    qty: String(qty || '').slice(0, 40),
    location: String(location || '').slice(0, 200),
    text: String(text || '').slice(0, 2000),
    photos: (req.files || []).map((f) => f.filename),
    status: 'offen',
    adminNote: '',
    createdAt: new Date().toISOString(),
  };
  if (r.type === 'bestellung' && !r.items.length) return res.status(400).json({ error: 'Bitte mindestens einen Artikel auswählen.' });
  if (!r.text && !r.materialId && !r.items.length && r.photos.length === 0) return res.status(400).json({ error: 'Bitte etwas beschreiben oder ein Foto machen.' });
  db.reports.push(r);
  saveDb();
  res.json(reportView(r));

  // Chef per Mail informieren (falls eingerichtet)
  if (db.settings.notifyOnReport && db.settings.ownerEmail && smtpConfigured(db.settings.smtp)) {
    const label = { material: 'Material fehlt', defekt: 'Etwas ist kaputt', sonstiges: 'Meldung', bestellung: 'Bestellung' }[r.type];
    const itemText = r.items.map((i) => `- ${i.qty ? i.qty + ' × ' : ''}${i.name}`).join('\n');
    sendMail(db.settings.smtp, {
      to: db.settings.ownerEmail,
      subject: `${r.urgent ? 'DRINGEND – ' : ''}${label}: ${r.items.length ? r.items.map((i) => i.name).join(', ').slice(0, 60) : r.materialName || r.location || ''} – ${req.user.name}`,
      text: `${label}${r.urgent ? ' (DRINGEND)' : ''}\nVon: ${req.user.name}\nZeit: ${new Date(r.createdAt).toLocaleString('de-DE')}\n${itemText ? itemText + '\n' : ''}${r.materialName ? 'Material: ' + r.materialName + (r.qty ? ' (' + r.qty + ')' : '') + '\n' : ''}${r.location ? 'Objekt/Ort: ' + r.location + '\n' : ''}\n${r.text}`,
      attachments: r.photos.map((p) => ({ filename: p, path: path.join(UPLOAD_DIR, p) })),
    }).catch((e) => console.error('Mail-Fehler (Meldung):', e.message));
  }
});

app.put('/api/reports/:id', auth, adminOnly, (req, res) => {
  const r = db.reports.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Nicht gefunden.' });
  const { status, adminNote } = req.body || {};
  if (['offen', 'in Arbeit', 'erledigt'].includes(status)) {
    r.status = status;
    r.doneAt = status === 'erledigt' ? new Date().toISOString() : '';
  }
  if (adminNote !== undefined) r.adminNote = String(adminNote).slice(0, 1000);
  saveDb();
  res.json(reportView(r));
});

app.delete('/api/reports/:id', auth, adminOnly, (req, res) => {
  const r = db.reports.find((x) => x.id === req.params.id);
  if (r) {
    r.photos.forEach((p) => fs.rm(path.join(UPLOAD_DIR, p), { force: true }, () => {}));
    db.reports = db.reports.filter((x) => x.id !== r.id);
    saveDb();
  }
  res.json({ ok: true });
});

// Fotos nur für den Ersteller oder den Chef
app.get('/api/photo/:file', auth, (req, res) => {
  const file = path.basename(req.params.file);
  const r = db.reports.find((x) => x.photos.includes(file));
  if (!r || (req.user.role !== 'admin' && r.userId !== req.user.id)) return res.status(404).end();
  res.sendFile(path.join(UPLOAD_DIR, file));
});

/* ---------- Stundenzettel ---------- */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesOf(e) {
  const [sh, sm] = e.start.split(':').map(Number);
  const [eh, em] = e.end.split(':').map(Number);
  let d = eh * 60 + em - (sh * 60 + sm);
  if (d < 0) d += 24 * 60; // über Mitternacht
  return Math.max(0, d - (Number(e.pause) || 0));
}
// Der Chef darf über ?userId= jeden Zettel sehen, Mitarbeiter immer nur den eigenen.
function targetUser(req) {
  if (req.user.role === 'admin' && req.query.userId) return db.users.find((u) => u.id === req.query.userId);
  return req.user;
}
function sheet(user, month) {
  const entries = db.entries
    .filter((e) => e.userId === user.id && e.date.startsWith(month))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((e) => ({ ...e, minutes: minutesOf(e) }));
  const signoff = db.signoffs.find((s) => s.userId === user.id && s.month === month) || null;
  return {
    user: publicUser(user),
    month,
    entries,
    totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
    workDays: new Set(entries.map((e) => e.date)).size,
    signoff,
  };
}

app.get('/api/timesheet/:month', auth, (req, res) => {
  if (!MONTH_RE.test(req.params.month)) return res.status(400).json({ error: 'Ungültiger Monat.' });
  const user = targetUser(req);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(sheet(user, req.params.month));
});

// Archiv: alle Monate mit Einträgen (Mitarbeiter nur eigene)
app.get('/api/timesheet-months', auth, (req, res) => {
  const user = targetUser(req);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden.' });
  const months = new Set(db.entries.filter((e) => e.userId === user.id).map((e) => e.date.slice(0, 7)));
  db.signoffs.filter((s) => s.userId === user.id).forEach((s) => months.add(s.month));
  res.json([...months].sort().reverse().map((m) => {
    const s = sheet(user, m);
    return { month: m, totalMinutes: s.totalMinutes, workDays: s.workDays, signedAt: s.signoff?.signedAt || '', sentAt: s.signoff?.sentAt || '', approvedAt: s.signoff?.approvedAt || '' };
  }));
});

function isLocked(userId, month) {
  return db.signoffs.some((s) => s.userId === userId && s.month === month);
}

app.post('/api/entries', auth, (req, res) => {
  const { id, date, start, end, pause, object, note } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !TIME_RE.test(start || '') || !TIME_RE.test(end || ''))
    return res.status(400).json({ error: 'Datum, Beginn und Ende angeben.' });
  if (isLocked(req.user.id, date.slice(0, 7)))
    return res.status(400).json({ error: 'Dieser Monat ist schon unterschrieben. Bitte beim Chef melden.' });
  const data = { date, start, end, pause: Math.max(0, Math.min(600, parseInt(pause, 10) || 0)), object: String(object || '').slice(0, 120), note: String(note || '').slice(0, 300) };
  if (id) {
    const e = db.entries.find((x) => x.id === id && x.userId === req.user.id);
    if (!e) return res.status(404).json({ error: 'Nicht gefunden.' });
    if (isLocked(req.user.id, e.date.slice(0, 7))) return res.status(400).json({ error: 'Monat ist unterschrieben.' });
    Object.assign(e, data);
  } else {
    db.entries.push({ id: uid(), userId: req.user.id, ...data });
  }
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/entries/:id', auth, (req, res) => {
  const e = db.entries.find((x) => x.id === req.params.id && x.userId === req.user.id);
  if (!e) return res.status(404).json({ error: 'Nicht gefunden.' });
  if (isLocked(req.user.id, e.date.slice(0, 7))) return res.status(400).json({ error: 'Monat ist unterschrieben.' });
  db.entries = db.entries.filter((x) => x.id !== e.id);
  saveDb();
  res.json({ ok: true });
});

// Monat unterschreiben (Unterschrift mit dem Finger) → Monat gesperrt
app.post('/api/timesheet/:month/sign', auth, (req, res) => {
  const { month } = req.params;
  if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'Ungültiger Monat.' });
  const { signature } = req.body || {};
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature || '') || signature.length > 1_500_000)
    return res.status(400).json({ error: 'Bitte unterschreiben.' });
  if (isLocked(req.user.id, month)) return res.status(400).json({ error: 'Schon unterschrieben.' });
  db.signoffs.push({ userId: req.user.id, month, signature, signedAt: new Date().toISOString(), sentAt: '', approvedAt: '', approvedSignature: '' });
  saveDb();
  res.json(sheet(req.user, month));
});

// Chef: gegenzeichnen oder Sperre aufheben
app.post('/api/timesheet/:month/approve', auth, adminOnly, (req, res) => {
  const s = db.signoffs.find((x) => x.userId === req.query.userId && x.month === req.params.month);
  if (!s) return res.status(400).json({ error: 'Noch nicht vom Mitarbeiter unterschrieben.' });
  const { signature } = req.body || {};
  if (signature && /^data:image\/png;base64,/.test(signature)) s.approvedSignature = signature;
  s.approvedAt = new Date().toISOString();
  saveDb();
  res.json({ ok: true });
});
app.post('/api/timesheet/:month/unlock', auth, adminOnly, (req, res) => {
  db.signoffs = db.signoffs.filter((x) => !(x.userId === req.query.userId && x.month === req.params.month));
  saveDb();
  res.json({ ok: true });
});

app.get('/api/timesheet/:month/pdf', auth, async (req, res) => {
  if (!MONTH_RE.test(req.params.month)) return res.status(400).end();
  const user = targetUser(req);
  if (!user) return res.status(404).end();
  const buf = await buildTimesheetPdf(sheet(user, req.params.month), db.settings.companyName);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdfName(user, req.params.month)}"`);
  res.send(buf);
});

function pdfName(user, month) {
  return `Stundenzettel_${month}_${user.name.replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, '_')}.pdf`.normalize('NFC');
}

// Per Knopfdruck an den Chef mailen
app.post('/api/timesheet/:month/send', auth, async (req, res) => {
  const { month } = req.params;
  if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'Ungültiger Monat.' });
  const st = db.settings;
  if (!smtpConfigured(st.smtp) || !st.ownerEmail) return res.json({ sent: false, reason: 'nosmtp', ownerEmail: st.ownerEmail });
  const data = sheet(req.user, month);
  const buf = await buildTimesheetPdf(data, st.companyName);
  const h = (data.totalMinutes / 60).toFixed(2).replace('.', ',');
  try {
    await sendMail(st.smtp, {
      to: st.ownerEmail,
      cc: req.user.email || undefined,
      replyTo: req.user.email || undefined,
      subject: `Stundenzettel ${monthLabel(month)} – ${req.user.name}`,
      text: `Hallo,\n\nanbei mein Stundenzettel für ${monthLabel(month)}.\nArbeitstage: ${data.workDays}\nStunden gesamt: ${h} h\n${data.signoff ? 'Unterschrieben am ' + new Date(data.signoff.signedAt).toLocaleString('de-DE') : 'Noch nicht unterschrieben.'}\n\nViele Grüße\n${req.user.name}`,
      attachments: [{ filename: pdfName(req.user, month), content: buf }],
    });
    if (data.signoff) {
      const s = db.signoffs.find((x) => x.userId === req.user.id && x.month === month);
      s.sentAt = new Date().toISOString();
      saveDb();
    }
    res.json({ sent: true });
  } catch (e) {
    console.error('Mail-Fehler (Stundenzettel):', e.message);
    res.json({ sent: false, reason: 'error', message: e.message, ownerEmail: st.ownerEmail });
  }
});

function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

// Chef: Übersicht aller Stunden eines Monats
app.get('/api/hours-overview/:month', auth, adminOnly, (req, res) => {
  if (!MONTH_RE.test(req.params.month)) return res.status(400).json({ error: 'Ungültiger Monat.' });
  res.json(db.users.map((u) => {
    const s = sheet(u, req.params.month);
    return { user: s.user, totalMinutes: s.totalMinutes, workDays: s.workDays, signedAt: s.signoff?.signedAt || '', sentAt: s.signoff?.sentAt || '', approvedAt: s.signoff?.approvedAt || '' };
  }));
});

/* ---------- Einstellungen (nur Chef) ---------- */
app.get('/api/settings', auth, adminOnly, (req, res) => {
  const s = db.settings;
  res.json({ ...s, smtp: { ...s.smtp, pass: s.smtp.pass ? '••••••' : '' }, smtpOk: smtpConfigured(s.smtp) });
});
app.put('/api/settings', auth, adminOnly, (req, res) => {
  const b = req.body || {};
  const s = db.settings;
  if (b.companyName) s.companyName = String(b.companyName).slice(0, 100);
  if (b.ownerEmail !== undefined) s.ownerEmail = String(b.ownerEmail).trim();
  if (b.notifyOnReport !== undefined) s.notifyOnReport = !!b.notifyOnReport;
  if (b.smtp) {
    const n = b.smtp;
    s.smtp = {
      host: String(n.host || '').trim(),
      port: parseInt(n.port, 10) || 587,
      secure: !!n.secure,
      user: String(n.user || '').trim(),
      pass: n.pass && n.pass !== '••••••' ? n.pass : s.smtp.pass,
      from: String(n.from || '').trim(),
    };
  }
  saveDb();
  res.json({ ok: true });
});
app.post('/api/settings/testmail', auth, adminOnly, async (req, res) => {
  try {
    await sendMail(db.settings.smtp, { to: db.settings.ownerEmail, subject: 'Test – Königbauer App', text: 'Der E-Mail-Versand funktioniert.' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Senden fehlgeschlagen: ' + e.message });
  }
});

// Datensicherung (nur Chef)
app.get('/api/backup', auth, adminOnly, (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="koenigbauer-backup-${today()}.json"`);
  res.json({ ...db, sessions: {} });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Nicht gefunden.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Foto zu groß (max. 12 MB).' : 'Interner Fehler.' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Königbauer App läuft auf http://localhost:${PORT}`));
}
module.exports = app;
