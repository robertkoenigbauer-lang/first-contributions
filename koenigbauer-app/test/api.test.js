// Prüft vor allem: Mitarbeiterinnen sehen sich gegenseitig NICHT.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
const app = require('../server');
let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; r(); }); }));
after(() => { server.close(); fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  return async (p, opts = {}) => {
    const o = { ...opts, headers: { ...(opts.headers || {}), cookie } };
    if (o.body && !(o.body instanceof FormData)) { o.headers['content-type'] = 'application/json'; o.body = JSON.stringify(o.body); }
    const r = await fetch(base + p, o);
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, data: ct.includes('json') ? await r.json() : await r.arrayBuffer() };
  };
}

test('Ablauf und Datenschutz', async () => {
  const chef = client(), anna = client(), berta = client();
  assert.equal((await chef('/setup', { method: 'POST', body: { name: 'Chef', username: 'chef', password: 'geheim1' } })).status, 200);
  await chef('/users', { method: 'POST', body: { name: 'Anna', username: 'anna', password: 'anna123' } });
  await chef('/users', { method: 'POST', body: { name: 'Berta', username: 'berta', password: 'berta123' } });
  assert.equal((await anna('/login', { method: 'POST', body: { username: 'anna', password: 'anna123' } })).status, 200);
  assert.equal((await berta('/login', { method: 'POST', body: { username: 'Berta', password: 'berta123' } })).status, 200);

  // Material: Chef sieht Kosten, Mitarbeiterin nur Namen
  const mat = (await chef('/materials')).data;
  assert.ok(mat.monthly > 0 && Math.abs(mat.yearly - mat.monthly * 12) < 0.01);
  const am = (await anna('/materials')).data;
  assert.ok(Array.isArray(am) && am[0].price === undefined);
  assert.equal((await anna('/users')).status, 403);
  assert.equal((await anna('/settings')).status, 403);
  assert.equal((await anna('/hours-overview/2026-11')).status, 403);

  // Meldung mit Foto
  const fd = new FormData();
  fd.set('type', 'defekt'); fd.set('text', 'Wasserhahn tropft');
  fd.append('photos', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), 'a.jpg');
  const rep = (await anna('/reports', { method: 'POST', body: fd })).data;
  assert.equal(rep.photos.length, 1);
  assert.equal((await berta('/reports')).data.length, 0);
  assert.equal((await anna('/reports')).data.length, 1);
  assert.equal((await chef('/reports')).data.length, 1);
  assert.equal((await berta('/photo/' + rep.photos[0])).status, 404);
  assert.equal((await anna('/photo/' + rep.photos[0])).status, 200);

  // Stunden
  await anna('/entries', { method: 'POST', body: { date: '2026-11-03', start: '07:00', end: '11:30', pause: 30 } });
  await anna('/entries', { method: 'POST', body: { date: '2026-11-04', start: '22:00', end: '01:00', pause: 0 } });
  const sh = (await anna('/timesheet/2026-11')).data;
  assert.equal(sh.totalMinutes, 240 + 180);
  // Berta kann Annas Zettel nicht abrufen (userId wird ignoriert)
  const annaId = sh.user.id;
  const bs = (await berta('/timesheet/2026-11?userId=' + annaId)).data;
  assert.equal(bs.user.name, 'Berta');
  assert.equal(bs.entries.length, 0);
  // Berta kann Annas Eintrag nicht löschen
  assert.equal((await berta('/entries/' + sh.entries[0].id, { method: 'DELETE' })).status, 404);
  // Chef sieht Annas Zettel
  assert.equal((await chef('/timesheet/2026-11?userId=' + annaId)).data.entries.length, 2);

  // Unterschreiben sperrt den Monat
  const sig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  assert.equal((await anna('/timesheet/2026-11/sign', { method: 'POST', body: { signature: sig } })).status, 200);
  assert.equal((await anna('/entries', { method: 'POST', body: { date: '2026-11-05', start: '07:00', end: '08:00' } })).status, 400);
  const pdf = await anna('/timesheet/2026-11/pdf');
  assert.equal(pdf.status, 200);
  assert.equal(Buffer.from(pdf.data).subarray(0, 4).toString(), '%PDF');
  const send = (await anna('/timesheet/2026-11/send', { method: 'POST' })).data;
  assert.equal(send.sent, false); // kein SMTP im Test
  assert.equal((await chef('/timesheet/2026-11/approve?userId=' + annaId, { method: 'POST', body: { signature: sig } })).status, 200);

  // Bestellung durch Mitarbeiterin
  const od = new FormData();
  od.set('type', 'bestellung'); od.set('urgent', 'true');
  od.set('items', JSON.stringify([{ name: 'Staubsaugerbeutel', qty: '2' }, { name: 'Swiffer', qty: '1' }]));
  const ord = (await berta('/reports', { method: 'POST', body: od })).data;
  assert.equal(ord.items.length, 2);
  assert.equal(ord.urgent, true);
  assert.equal((await anna('/reports')).data.length, 1); // Anna sieht Bertas Bestellung nicht
  assert.equal((await chef('/reports')).data.length, 2);

  // Archiv: frühere Monate bleiben sichtbar, nur eigene
  await anna('/entries', { method: 'POST', body: { date: '2026-08-10', start: '08:00', end: '12:00' } });
  const arch = (await anna('/timesheet-months')).data;
  assert.deepEqual(arch.map((a) => a.month), ['2026-11', '2026-08']);
  assert.equal((await berta('/timesheet-months?userId=' + annaId)).data.length, 0);
  assert.equal((await chef('/timesheet-months?userId=' + annaId)).data.length, 2);

  // Einkauf erhöht Bestand
  const m0 = mat.materials[0];
  await chef('/purchases', { method: 'POST', body: { materialId: m0.id, qty: 100, total: '18,00', date: '2026-11-02' } });
  const p = (await chef('/purchases')).data;
  assert.equal(p.byMonth['2026-11'], 18);
});
