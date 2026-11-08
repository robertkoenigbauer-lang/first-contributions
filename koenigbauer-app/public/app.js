/* Königbauer Gebäudereinigung – Oberfläche */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const main = $('#main');
const S = { me: null, tab: null, month: curMonth(), materials: null };

/* ---------------- Hilfsfunktionen ---------------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function curMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftMonth(m, n) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}
const eur = (n) => (Number(n) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const num = (n, d = 0) => (Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: d });
const hours = (min) => (min / 60).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (iso) => new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', ...opts };
  if (o.body && !(o.body instanceof FormData)) {
    o.headers = { 'Content-Type': 'application/json', ...(o.headers || {}) };
    o.body = JSON.stringify(o.body);
  }
  const r = await fetch('/api' + path, o);
  if (r.status === 401 && path !== '/login') {
    S.me = null;
    renderLogin();
    throw new Error('Bitte anmelden.');
  }
  const data = r.headers.get('content-type')?.includes('json') ? await r.json() : null;
  if (!r.ok) throw new Error(data?.error || 'Fehler ' + r.status);
  return data;
}
function toast(msg, err = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (err ? ' err' : '');
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), 3200);
}
async function run(fn) {
  try {
    return await fn();
  } catch (e) {
    toast(e.message, true);
  }
}
function openModal(html, onReady) {
  $('#modalBox').innerHTML = html;
  $('#modal').hidden = false;
  onReady && onReady($('#modalBox'));
}
function closeModal() {
  $('#modal').hidden = true;
  $('#modalBox').innerHTML = '';
}
$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});
function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

/* ---------------- Start / Login ---------------- */
async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  try {
    S.me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null));
  } catch {
    S.me = null;
  }
  if (S.me) return startApp();
  const st = await fetch('/api/status').then((r) => r.json());
  st.needsSetup ? renderSetup() : renderLogin();
}

function renderLogin() {
  $('#nav').hidden = true;
  $('#who').textContent = '';
  main.innerHTML = `
  <div class="login card">
    <img src="icon.svg" class="logo-big" alt="">
    <h1 class="center">Anmelden</h1>
    <form id="f">
      <label>Benutzername</label><input name="username" autocomplete="username" autocapitalize="none" required>
      <label>Passwort</label><input name="password" type="password" autocomplete="current-password" required>
      <div class="actions" style="grid-template-columns:1fr"><button>Anmelden</button></div>
    </form>
    <p class="muted center small">Zugangsdaten bekommst du vom Chef.</p>
  </div>`;
  $('#f').onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      S.me = await api('/login', { method: 'POST', body: formData(e.target) });
      startApp();
    });
  };
}

function renderSetup() {
  main.innerHTML = `
  <div class="login card">
    <img src="icon.svg" class="logo-big" alt="">
    <h1 class="center">Ersteinrichtung</h1>
    <p class="muted">Lege zuerst dein Chef-Konto an. Danach kannst du deine Mitarbeiterinnen hinzufügen.</p>
    <form id="f">
      <label>Dein Name</label><input name="name" required value="Robert Königbauer">
      <label>Benutzername</label><input name="username" required autocapitalize="none" value="chef">
      <label>E-Mail (hier kommen Stundenzettel & Meldungen an)</label><input name="email" type="email">
      <label>Passwort (mind. 6 Zeichen)</label><input name="password" type="password" minlength="6" required>
      <div class="actions" style="grid-template-columns:1fr"><button>Einrichten</button></div>
    </form>
  </div>`;
  $('#f').onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      S.me = await api('/setup', { method: 'POST', body: formData(e.target) });
      startApp();
    });
  };
}

/* ---------------- Navigation ---------------- */
const TABS_ADMIN = [
  ['start', '🏠', 'Übersicht'],
  ['material', '🧴', 'Material'],
  ['meldungen', '📋', 'Meldungen'],
  ['stunden', '🕒', 'Stunden'],
  ['mehr', '⚙️', 'Mehr'],
];
const TABS_MA = [
  ['stunden', '🕒', 'Stunden'],
  ['bestellen', '🛒', 'Bestellen'],
  ['melden', '📷', 'Kaputt/Melden'],
  ['meldungen', '📋', 'Verlauf'],
  ['konto', '👤', 'Konto'],
];
function isAdmin() {
  return S.me?.role === 'admin';
}
function startApp() {
  $('#who').innerHTML = `${esc(S.me.name)}<br><span style="opacity:.8">${isAdmin() ? 'Chef' : 'Mitarbeiter/in'}</span>`;
  const tabs = isAdmin() ? TABS_ADMIN : TABS_MA;
  const nav = $('#nav');
  nav.innerHTML = tabs.map(([k, ic, l]) => `<button data-tab="${k}"><span class="ic">${ic}</span>${l}</button>`).join('');
  nav.hidden = false;
  $$('button', nav).forEach((b) => (b.onclick = () => go(b.dataset.tab)));
  go(location.hash.slice(1) && tabs.some((t) => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : tabs[0][0]);
}
function go(tab) {
  S.tab = tab;
  history.replaceState(null, '', '#' + tab);
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  window.scrollTo(0, 0);
  main.innerHTML = '<div class="loading">Lädt …</div>';
  const views = { start: viewStart, material: viewMaterial, meldungen: viewReports, melden: viewReportForm, bestellen: viewOrder, stunden: viewHours, mehr: viewMore, konto: viewAccount };
  run(views[tab]);
}
async function updateBadge() {
  if (!isAdmin()) return;
  const reps = await api('/reports');
  const n = reps.filter((r) => r.status !== 'erledigt').length;
  const b = $('#nav [data-tab="meldungen"]');
  $('.badge', b)?.remove();
  if (n) b.insertAdjacentHTML('beforeend', `<span class="badge">${n}</span>`);
}

/* ---------------- Chef: Übersicht ---------------- */
async function viewStart() {
  const [mat, reps, pur, hrs] = await Promise.all([api('/materials'), api('/reports'), api('/purchases'), api('/hours-overview/' + curMonth())]);
  const open = reps.filter((r) => r.status !== 'erledigt');
  const y = String(new Date().getFullYear());
  const spentMonth = pur.byMonth[curMonth()] || 0;
  const spentYear = Object.entries(pur.byMonth).filter(([k]) => k.startsWith(y)).reduce((s, [, v]) => s + v, 0);
  const shopping = buildShoppingList(mat.materials, open);
  main.innerHTML = `
    <h1>Übersicht</h1>
    <div class="grid2">
      <div class="stat"><div class="v">${eur(mat.monthly)}</div><div class="l">Material geschätzt / Monat</div></div>
      <div class="stat"><div class="v">${eur(mat.yearly)}</div><div class="l">Material geschätzt / Jahr</div></div>
      <div class="stat"><div class="v">${eur(spentMonth)}</div><div class="l">Tatsächlich gekauft ${esc(monthLabel(curMonth()))}</div></div>
      <div class="stat"><div class="v">${eur(spentYear)}</div><div class="l">Tatsächlich gekauft ${y}</div></div>
    </div>
    <h2>Offene Meldungen <span class="pill ${open.length ? 'red' : ''}">${open.length}</span></h2>
    ${open.length ? open.slice(0, 5).map(reportCard).join('') : '<div class="card muted">Alles erledigt 👍</div>'}
    ${open.length > 5 ? `<button class="btn-sec btn-block" onclick="go('meldungen')">Alle ${open.length} anzeigen</button>` : ''}
    <h2>Einkaufsliste</h2>
    <div class="card">${shopping.length ? shopping.map((s) => `<div class="list-item row"><div class="grow"><b>${esc(s.name)}</b><div class="muted small">${esc(s.why)}</div></div>${s.pack ? `<span class="muted small">${esc(s.pack)}</span>` : ''}</div>`).join('') : '<span class="muted">Nichts nachzukaufen.</span>'}</div>
    <h2>Stunden ${esc(monthLabel(curMonth()))}</h2>
    <div class="card">${hoursTable(hrs, curMonth())}</div>`;
  bindReportCards();
  bindHoursTable();
  updateBadge();
}

function buildShoppingList(materials, openReports) {
  const out = [];
  for (const m of materials) {
    const reps = openReports.filter((r) => r.type === 'material' && r.materialId === m.id);
    if (reps.length) out.push({ name: m.name, pack: m.pack, why: `Gemeldet von ${[...new Set(reps.map((r) => r.userName))].join(', ')}` + (reps[0].qty ? ` (${reps[0].qty})` : '') });
    else if (m.low && m.minStock > 0) out.push({ name: m.name, pack: m.pack, why: `Bestand ${num(m.stock, 1)} ${m.unit} – Mindestbestand ${num(m.minStock, 1)}` });
  }
  // Bestellungen der Mitarbeiterinnen (noch nicht bestellt)
  for (const r of openReports.filter((x) => x.type === 'bestellung' && x.status === 'offen')) {
    for (const i of r.items || []) out.unshift({ name: (r.urgent ? '❗ ' : '') + i.name, pack: i.qty, why: `Bestellt von ${r.userName}, ${dt(r.createdAt)}${r.location ? ' · ' + r.location : ''}` });
  }
  return out;
}

/* ---------------- Chef: Material & Kosten ---------------- */
async function viewMaterial() {
  const [mat, pur] = await Promise.all([api('/materials'), api('/purchases')]);
  S.materials = mat.materials;
  const months = Object.entries(pur.byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  main.innerHTML = `
    <h1>Material & Kosten</h1>
    <div class="grid2">
      <div class="stat"><div class="v">${eur(mat.monthly)}</div><div class="l">geschätzt pro Monat</div></div>
      <div class="stat"><div class="v">${eur(mat.yearly)}</div><div class="l">geschätzt pro Jahr</div></div>
    </div>
    <p class="muted small">Schätzung für 3 Personen. Tippe auf ein Material, um Verbrauch, Preis oder Bestand anzupassen. Preise netto.</p>
    <div class="row" style="margin-bottom:12px">
      <button class="grow" id="addPur">🛒 Einkauf erfassen</button>
      <button class="btn-sec grow" id="addMat">＋ Material</button>
    </div>
    <div class="card">
      ${mat.materials.map((m) => `<div class="list-item mat" data-id="${m.id}">
        <div><b>${esc(m.name)}</b>${m.low ? ' <span class="pill red">nachkaufen</span>' : ''}
          <div class="muted small">${num(m.monthlyQty, 1)} ${esc(m.unit)}/Monat × ${eur(m.price)}${m.pack ? ' · ' + esc(m.pack) : ''}</div>
          <div class="muted small">Bestand: ${num(m.stock, 1)} ${esc(m.unit)}</div></div>
        <div class="price"><b>${eur(m.monthlyCost)}</b><div class="muted small">${eur(m.yearlyCost)} / Jahr</div></div>
      </div>`).join('')}
      <div class="list-item mat" style="cursor:default"><b>Summe</b><div class="price"><b>${eur(mat.monthly)}</b><div class="muted small">${eur(mat.yearly)} / Jahr</div></div></div>
    </div>
    <h2>Tatsächliche Ausgaben</h2>
    <div class="card">${months.length ? `<table><thead><tr><th>Monat</th><th class="num">Ausgaben</th><th class="num">vs. Schätzung</th></tr></thead><tbody>${months.map(([k, v]) => `<tr><td>${esc(monthLabel(k))}</td><td class="num">${eur(v)}</td><td class="num">${v > mat.monthly ? '<span class="pill orange">' : '<span class="pill">'}${v - mat.monthly >= 0 ? '+' : ''}${eur(v - mat.monthly)}</span></td></tr>`).join('')}</tbody></table>` : '<span class="muted">Noch keine Einkäufe erfasst. Erfasse jeden Einkauf, dann siehst du hier, was du wirklich ausgibst.</span>'}</div>
    <h2>Letzte Einkäufe</h2>
    <div class="card">${pur.purchases.length ? pur.purchases.slice(0, 30).map((p) => `<div class="list-item row"><div class="grow"><b>${esc(p.materialName)}</b> – ${num(p.qty, 1)} ${esc(p.unit)}<div class="muted small">${new Date(p.date).toLocaleDateString('de-DE')}${p.note ? ' · ' + esc(p.note) : ''}</div></div><b>${eur(p.total)}</b><button class="btn-light btn-sm" data-delpur="${p.id}">✕</button></div>`).join('') : '<span class="muted">–</span>'}</div>`;
  $$('.mat[data-id]').forEach((el) => (el.onclick = () => editMaterial(mat.materials.find((m) => m.id === el.dataset.id))));
  $('#addMat').onclick = () => editMaterial(null);
  $('#addPur').onclick = () => addPurchase(mat.materials);
  $$('[data-delpur]').forEach((b) => (b.onclick = () => confirm('Einkauf löschen? Der Bestand wird zurückgerechnet.') && run(async () => { await api('/purchases/' + b.dataset.delpur, { method: 'DELETE' }); viewMaterial(); })));
}

function editMaterial(m) {
  const v = m || { name: '', unit: 'Stück', pack: '', monthlyQty: '', price: '', stock: '', minStock: '', note: '' };
  openModal(`
    <h2>${m ? 'Material bearbeiten' : 'Neues Material'}</h2>
    <form id="mf">
      <label>Bezeichnung</label><input name="name" value="${esc(v.name)}" required>
      <div class="grid2">
        <div><label>Einheit</label><select name="unit">${['Stück', 'Liter', 'Rolle', 'Packung', 'kg', 'Flasche', 'Kanister'].map((u) => `<option ${u === v.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <div><label>Gebinde</label><input name="pack" value="${esc(v.pack)}" placeholder="z. B. Rolle à 25"></div>
        <div><label>Verbrauch / Monat</label><input name="monthlyQty" inputmode="decimal" value="${esc(v.monthlyQty)}"></div>
        <div><label>Preis je Einheit (€)</label><input name="price" inputmode="decimal" value="${esc(v.price)}"></div>
        <div><label>Bestand aktuell</label><input name="stock" inputmode="decimal" value="${esc(v.stock)}"></div>
        <div><label>Mindestbestand</label><input name="minStock" inputmode="decimal" value="${esc(v.minStock)}"></div>
      </div>
      <label>Notiz</label><input name="note" value="${esc(v.note)}">
      <div class="actions"><button>Speichern</button>${m ? '<button type="button" class="btn-danger" id="del">Löschen</button>' : ''}<button type="button" class="btn-light" onclick="closeModal()">Abbrechen</button></div>
    </form>`, (box) => {
    $('#mf', box).onsubmit = (e) => {
      e.preventDefault();
      run(async () => {
        await api('/materials' + (m ? '/' + m.id : ''), { method: m ? 'PUT' : 'POST', body: formData(e.target) });
        closeModal();
        viewMaterial();
      });
    };
    if (m) $('#del', box).onclick = () => confirm(`„${m.name}“ löschen?`) && run(async () => { await api('/materials/' + m.id, { method: 'DELETE' }); closeModal(); viewMaterial(); });
  });
}

function addPurchase(materials) {
  openModal(`
    <h2>Einkauf erfassen</h2>
    <form id="pf">
      <label>Material</label><select name="materialId">${materials.map((m) => `<option value="${m.id}">${esc(m.name)} (${esc(m.unit)})</option>`).join('')}</select>
      <div class="grid2">
        <div><label>Menge (in Einheit)</label><input name="qty" inputmode="decimal" required></div>
        <div><label>Betrag gesamt (€)</label><input name="total" inputmode="decimal" required></div>
      </div>
      <label>Datum</label><input name="date" type="date" value="${todayIso()}">
      <label>Notiz (z. B. Händler)</label><input name="note">
      <div class="actions"><button>Speichern</button><button type="button" class="btn-light" onclick="closeModal()">Abbrechen</button></div>
    </form>`, (box) => {
    const sel = $('[name=materialId]', box);
    const qty = $('[name=qty]', box);
    const tot = $('[name=total]', box);
    const suggest = () => {
      const m = materials.find((x) => x.id === sel.value);
      const q = Number(qty.value.replace(',', '.'));
      if (m && q && !tot.dataset.touched) tot.value = (q * m.price).toFixed(2).replace('.', ',');
    };
    qty.oninput = suggest;
    sel.onchange = suggest;
    tot.oninput = () => (tot.dataset.touched = '1');
    $('#pf', box).onsubmit = (e) => {
      e.preventDefault();
      run(async () => {
        await api('/purchases', { method: 'POST', body: formData(e.target) });
        closeModal();
        toast('Einkauf gespeichert, Bestand erhöht.');
        viewMaterial();
      });
    };
  });
}

/* ---------------- Meldungen ---------------- */
const TYPE = {
  material: ['🧴', 'Material fehlt', 'orange'],
  defekt: ['🔧', 'Kaputt', 'red'],
  sonstiges: ['💬', 'Sonstiges', 'gray'],
  bestellung: ['🛒', 'Bestellung', 'orange'],
};
function reportCard(r) {
  const [ic, label, col] = TYPE[r.type] || TYPE.sonstiges;
  const order = r.type === 'bestellung';
  const L = order ? { done: 'geliefert', work: 'bestellt' } : { done: 'erledigt', work: 'in Arbeit' };
  const st = r.status === 'erledigt' ? `<span class="pill">✓ ${L.done}</span>` : r.status === 'in Arbeit' ? `<span class="pill orange">${L.work}</span>` : '<span class="pill red">offen</span>';
  return `<div class="card" data-rep="${r.id}">
    <div class="row"><span class="pill ${col}">${ic} ${label}</span>${st}${r.urgent ? '<span class="pill red">❗ dringend</span>' : ''}<span class="muted small grow" style="text-align:right">${dt(r.createdAt)}</span></div>
    ${isAdmin() ? `<div class="small" style="margin-top:6px">von <b>${esc(r.userName)}</b></div>` : ''}
    ${r.items?.length ? `<ul style="margin:8px 0 0;padding-left:20px">${r.items.map((i) => `<li><b>${i.qty ? esc(i.qty) + ' × ' : ''}</b>${esc(i.name)}</li>`).join('')}</ul>` : ''}
    ${r.materialName ? `<h3 style="margin-top:8px">${esc(r.materialName)}${r.qty ? ` <span class="muted small">(${esc(r.qty)})</span>` : ''}</h3>` : ''}
    ${r.location ? `<div class="small">📍 ${esc(r.location)}</div>` : ''}
    ${r.text ? `<div style="margin-top:6px;white-space:pre-wrap">${esc(r.text)}</div>` : ''}
    ${r.photos.length ? `<div class="photos">${r.photos.map((p) => `<img src="/api/photo/${encodeURIComponent(p)}" loading="lazy" data-photo="${esc(p)}" alt="Foto">`).join('')}</div>` : ''}
    ${r.adminNote ? `<div class="hint small">Chef: ${esc(r.adminNote)}</div>` : ''}
    ${isAdmin() ? `<div class="row" style="margin-top:10px">
      ${r.status !== 'erledigt' ? `<button class="btn-sm" data-act="erledigt">✓ ${order ? 'Geliefert' : 'Erledigt'}</button>` : `<button class="btn-sm btn-light" data-act="offen">Wieder öffnen</button>`}
      ${r.status === 'offen' ? `<button class="btn-sm btn-sec" data-act="in Arbeit">${order ? 'Bestellt' : 'In Arbeit'}</button>` : ''}
      <button class="btn-sm btn-light" data-act="note">Notiz</button>
      <button class="btn-sm btn-danger" data-act="del">Löschen</button></div>` : ''}
  </div>`;
}
function bindReportCards() {
  $$('[data-photo]').forEach((img) => (img.onclick = () => openModal(`<img class="imgview" src="${img.src}"><div class="actions" style="grid-template-columns:1fr"><button onclick="closeModal()">Schließen</button></div>`)));
  $$('[data-rep]').forEach((card) =>
    $$('[data-act]', card).forEach((b) => {
      b.onclick = () =>
        run(async () => {
          const id = card.dataset.rep;
          const a = b.dataset.act;
          if (a === 'del') {
            if (!confirm('Meldung mit Fotos endgültig löschen?')) return;
            await api('/reports/' + id, { method: 'DELETE' });
          } else if (a === 'note') {
            const n = prompt('Notiz zur Meldung (sieht auch die Mitarbeiterin):');
            if (n === null) return;
            await api('/reports/' + id, { method: 'PUT', body: { adminNote: n } });
          } else await api('/reports/' + id, { method: 'PUT', body: { status: a } });
          go(S.tab);
        });
    })
  );
}

async function viewReports() {
  const reps = await api('/reports');
  const filter = viewReports.filter || 'offen';
  const shown = filter === 'alle' ? reps : reps.filter((r) => r.status !== 'erledigt');
  main.innerHTML = `
    <h1>${isAdmin() ? 'Meldungen & Bestellungen' : 'Meine Bestellungen & Meldungen'}</h1>
    <div class="row" style="margin-bottom:12px">
      <button class="btn-sm ${filter === 'offen' ? '' : 'btn-light'}" data-f="offen">Offen (${reps.filter((r) => r.status !== 'erledigt').length})</button>
      <button class="btn-sm ${filter === 'alle' ? '' : 'btn-light'}" data-f="alle">Alle (${reps.length})</button>
      ${!isAdmin() ? `<button class="btn-sm btn-sec" style="margin-left:auto" onclick="go('bestellen')">＋ Bestellen</button>` : ''}
    </div>
    ${shown.length ? shown.map(reportCard).join('') : '<div class="card muted">Keine Meldungen.</div>'}`;
  $$('[data-f]').forEach((b) => (b.onclick = () => { viewReports.filter = b.dataset.f; viewReports(); }));
  bindReportCards();
  updateBadge();
}

async function viewReportForm() {
  let type = 'defekt';
  const files = [];
  main.innerHTML = `
    <h1>Kaputt / Melden</h1>
    <p class="muted">Etwas ist kaputt oder nicht in Ordnung? Mach am besten gleich ein Foto – es wird automatisch mit Datum und Uhrzeit dokumentiert.<br>Material brauchst du? → <a href="#bestellen" onclick="go('bestellen');return false">Bestellen</a></p>
    <form id="rf" class="card">
      <div class="choice" style="grid-template-columns:1fr 1fr">
        <button type="button" data-t="defekt" class="on"><span class="ic">🔧</span>Etwas kaputt</button>
        <button type="button" data-t="sonstiges"><span class="ic">💬</span>Sonstiges</button>
      </div>
      <label>Objekt / Ort</label><input name="location" placeholder="z. B. Praxis Müller, 2. OG, Damen-WC">
      <label>Beschreibung</label><textarea name="text" placeholder="Was ist los?"></textarea>
      <label>Fotos</label>
      <label class="photo-pick">📷 Foto aufnehmen oder auswählen<input type="file" accept="image/*" capture="environment" multiple id="ph"></label>
      <div class="photos" id="prev"></div>
      <div class="actions" style="grid-template-columns:1fr"><button id="send">Meldung senden</button></div>
    </form>`;
  $$('[data-t]').forEach((b) => (b.onclick = () => {
    type = b.dataset.t;
    $$('[data-t]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('#ph').onchange = async (e) => {
    for (const f of [...e.target.files].slice(0, 4 - files.length)) {
      const blob = await shrinkImage(f);
      files.push(blob);
      $('#prev').insertAdjacentHTML('beforeend', `<img src="${URL.createObjectURL(blob)}" alt="">`);
    }
    e.target.value = '';
  };
  $('#rf').onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      const fd = new FormData(e.target);
      fd.set('type', type);
      files.forEach((b, i) => fd.append('photos', b, `foto${i + 1}.jpg`));
      $('#send').disabled = true;
      try {
        await api('/reports', { method: 'POST', body: fd });
      } finally {
        $('#send').disabled = false;
      }
      toast('Danke! Meldung ist beim Chef.');
      go('meldungen');
    });
  };
}

/* ---------------- Bestellen (Mitarbeiterinnen) ---------------- */
async function viewOrder() {
  const mats = await api('/materials');
  const qty = {}; // name -> Anzahl
  const extra = []; // freie Artikel
  main.innerHTML = `
    <h1>Bestellen</h1>
    <p class="muted">Etwas wird leer? Einfach antippen, Menge wählen und abschicken. Der Chef bekommt die Bestellung sofort.</p>
    <div class="card">
      ${mats.map((m, i) => `<div class="list-item row">
        <div class="grow"><b>${esc(m.name)}</b></div>
        <button type="button" class="btn-light btn-sm" data-minus="${i}">−</button>
        <span id="q${i}" style="min-width:28px;text-align:center;font-weight:700">0</span>
        <button type="button" class="btn-sm" data-plus="${i}">＋</button>
      </div>`).join('')}
    </div>
    <div class="card">
      <h3>Etwas anderes?</h3>
      <div class="row"><input id="exName" class="grow" placeholder="z. B. Staubsaugerbeutel Typ XY" style="flex:3"><input id="exQty" placeholder="Menge" style="flex:1"><button type="button" class="btn-sec" id="exAdd">＋</button></div>
      <div id="exList"></div>
    </div>
    <form id="of" class="card">
      <label>Für welches Objekt? (optional)</label><input name="location" placeholder="z. B. Büro Schmidt">
      <label>Bemerkung (optional)</label><textarea name="text" style="min-height:60px" placeholder="z. B. bis Freitag"></textarea>
      <label class="check"><input type="checkbox" name="urgent" value="true"> ❗ Dringend – fehlt schon / wird heute leer</label>
      <div class="hint small" id="sum">Noch nichts ausgewählt.</div>
      <div class="actions" style="grid-template-columns:1fr"><button id="osend">Bestellung abschicken</button></div>
    </form>`;
  const items = () => [...mats.filter((m) => qty[m.name] > 0).map((m) => ({ name: m.name, qty: String(qty[m.name]) })), ...extra];
  const refresh = () => {
    mats.forEach((m, i) => ($('#q' + i).textContent = qty[m.name] || 0));
    $('#exList').innerHTML = extra.map((x, i) => `<div class="list-item row"><div class="grow">${x.qty ? esc(x.qty) + ' × ' : ''}${esc(x.name)}</div><button type="button" class="btn-light btn-sm" data-exdel="${i}">✕</button></div>`).join('');
    $$('[data-exdel]').forEach((b) => (b.onclick = () => { extra.splice(+b.dataset.exdel, 1); refresh(); }));
    const it = items();
    $('#sum').innerHTML = it.length ? '<b>Deine Bestellung:</b><br>' + it.map((x) => `${x.qty ? esc(x.qty) + ' × ' : ''}${esc(x.name)}`).join('<br>') : 'Noch nichts ausgewählt.';
  };
  $$('[data-plus]').forEach((b) => (b.onclick = () => { const n = mats[b.dataset.plus].name; qty[n] = (qty[n] || 0) + 1; refresh(); }));
  $$('[data-minus]').forEach((b) => (b.onclick = () => { const n = mats[b.dataset.minus].name; qty[n] = Math.max(0, (qty[n] || 0) - 1); refresh(); }));
  $('#exAdd').onclick = () => {
    const name = $('#exName').value.trim();
    if (!name) return toast('Bitte eintragen, was du brauchst.', true);
    extra.push({ name, qty: $('#exQty').value.trim() });
    $('#exName').value = $('#exQty').value = '';
    refresh();
  };
  $('#of').onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      if ($('#exName').value.trim()) $('#exAdd').click();
      const it = items();
      if (!it.length) throw new Error('Bitte mindestens einen Artikel auswählen.');
      const fd = new FormData(e.target);
      fd.set('type', 'bestellung');
      fd.set('items', JSON.stringify(it));
      $('#osend').disabled = true;
      try {
        await api('/reports', { method: 'POST', body: fd });
      } finally {
        $('#osend').disabled = false;
      }
      toast('Danke! Bestellung ist beim Chef. 🛒');
      go('meldungen');
    });
  };
}

// Fotos vor dem Hochladen verkleinern (schneller, spart Datenvolumen)
function shrinkImage(file, max = 1600) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/* ---------------- Stundenzettel ---------------- */
async function viewHours() {
  const m = S.month;
  const sh = await api('/timesheet/' + m);
  const [y, mo] = m.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const locked = !!sh.signoff;
  const today = todayIso();
  let html = `
    <h1>Mein Stundenzettel</h1>
    <div class="monthbar"><button class="btn-light" id="prev">‹</button><div class="m">${esc(monthLabel(m))}</div><button class="btn-light" id="next">›</button></div>
    <div class="grid3" style="margin-bottom:12px">
      <div class="stat"><div class="v">${hours(sh.totalMinutes)}</div><div class="l">Stunden</div></div>
      <div class="stat"><div class="v">${sh.workDays}</div><div class="l">Arbeitstage</div></div>
      <div class="stat"><div class="v" style="font-size:16px;padding-top:4px">${locked ? '✅ unterschrieben' : '✏️ offen'}</div><div class="l">${locked ? new Date(sh.signoff.signedAt).toLocaleDateString('de-DE') : 'Status'}</div></div>
    </div>
    ${locked ? `<div class="locked">Dieser Monat ist unterschrieben und abgeschlossen${sh.signoff.sentAt ? ' und wurde am ' + dt(sh.signoff.sentAt) + ' gesendet' : ''}. Änderungen nur über den Chef.</div>` : '<p class="muted small">Tippe auf einen Tag und trage ein, von wann bis wann du gearbeitet hast.</p>'}
    <div class="days">`;
  for (let d = 1; d <= days; d++) {
    const iso = `${m}-${String(d).padStart(2, '0')}`;
    const wd = new Date(y, mo - 1, d).getDay();
    const es = sh.entries.filter((e) => e.date === iso);
    const mins = es.reduce((s, e) => s + e.minutes, 0);
    html += `<div class="day ${wd === 0 || wd === 6 ? 'we' : ''} ${iso === today ? 'today' : ''} ${es.length ? 'has' : ''}" data-day="${iso}">
      <div class="dnum">${d}<small>${WD[wd]}</small></div>
      <div class="dinfo">${es.length ? es.map((e) => `<div class="e">${e.start}–${e.end}${e.pause ? ` <span class="muted">(${e.pause} min Pause)</span>` : ''}${e.object ? ' · ' + esc(e.object) : ''}</div>`).join('') : '<span class="muted">–</span>'}</div>
      ${es.length ? `<div class="dh">${hours(mins)} h</div>` : locked ? '' : '<div class="dplus">＋</div>'}
    </div>`;
  }
  html += `</div>
    <div class="actions">
      ${locked ? '' : '<button id="sign">✍️ Monat unterschreiben</button>'}
      <button class="btn-sec" id="pdf">🖨️ Ansehen / Drucken</button>
      <button class="${locked ? '' : 'btn-sec'}" id="mail">📧 An Chef senden</button>
    </div>
    <p class="muted small">Deine Stunden sieht nur der Chef – keine Kollegin kann sie sehen.</p>
    <h2>📁 Meine früheren Stundenzettel</h2>
    <div class="card" id="archive">Lädt …</div>`;
  if (isAdmin()) html += `<h2>Stunden des Teams – ${esc(monthLabel(m))}</h2><div class="card" id="team">Lädt …</div>`;
  main.innerHTML = html;

  $('#prev').onclick = () => { S.month = shiftMonth(m, -1); viewHours(); };
  $('#next').onclick = () => { S.month = shiftMonth(m, 1); viewHours(); };
  $$('[data-day]').forEach((el) => (el.onclick = () => dayModal(el.dataset.day, sh, locked)));
  if (!locked) $('#sign').onclick = () => signModal(m, sh);
  $('#pdf').onclick = () => window.open(`/api/timesheet/${m}/pdf`, '_blank');
  $('#mail').onclick = () => sendTimesheet(m, sh);
  const arch = await api('/timesheet-months');
  $('#archive').innerHTML = arch.length
    ? arch.map((a) => `<div class="list-item row"><div class="grow" data-goto="${a.month}" style="cursor:pointer"><b>${esc(monthLabel(a.month))}</b>${a.month === m ? ' <span class="pill gray">angezeigt</span>' : ''}<div class="muted small">${hours(a.totalMinutes)} h · ${a.workDays} Tage · ${a.approvedAt ? '✓ gegengezeichnet' : a.signedAt ? '✍️ unterschrieben' : 'offen'}</div></div><button class="btn-sm btn-light" data-apdf="${a.month}">🖨️ PDF</button></div>`).join('')
    : '<span class="muted">Noch keine Stundenzettel.</span>';
  $$('[data-goto]').forEach((el) => (el.onclick = () => { S.month = el.dataset.goto; viewHours(); }));
  $$('[data-apdf]').forEach((b) => (b.onclick = () => window.open(`/api/timesheet/${b.dataset.apdf}/pdf`, '_blank')));
  if (isAdmin()) {
    const ov = await api('/hours-overview/' + m);
    $('#team').innerHTML = hoursTable(ov, m);
    bindHoursTable(m);
  }
}

function hoursTable(ov, m) {
  return `<div class="tablewrap"><table><thead><tr><th>Name</th><th class="num">Std.</th><th class="num">Tage</th><th>Status</th><th></th></tr></thead><tbody>${ov
    .filter((o) => o.user.active || o.totalMinutes)
    .map(
      (o) => `<tr><td><b>${esc(o.user.name)}</b></td><td class="num">${hours(o.totalMinutes)}</td><td class="num">${o.workDays}</td>
      <td>${o.approvedAt ? '<span class="pill">✓ gegengezeichnet</span>' : o.signedAt ? '<span class="pill orange">unterschrieben</span>' : '<span class="pill gray">offen</span>'}</td>
      <td class="num"><button class="btn-sm btn-light" data-pdf="${o.user.id}" data-m="${m}">PDF</button>
      ${o.signedAt && !o.approvedAt ? `<button class="btn-sm" data-appr="${o.user.id}" data-m="${m}">Gegenzeichnen</button>` : ''}
      ${o.signedAt ? `<button class="btn-sm btn-light" data-unl="${o.user.id}" data-m="${m}" title="Sperre aufheben">🔓</button>` : ''}</td></tr>`
    )
    .join('')}</tbody></table></div>`;
}
function bindHoursTable() {
  $$('[data-pdf]').forEach((b) => (b.onclick = () => window.open(`/api/timesheet/${b.dataset.m}/pdf?userId=${b.dataset.pdf}`, '_blank')));
  $$('[data-unl]').forEach((b) => (b.onclick = () => confirm('Monat wieder freigeben? Die Unterschrift wird entfernt und die Person kann wieder ändern.') && run(async () => { await api(`/timesheet/${b.dataset.m}/unlock?userId=${b.dataset.unl}`, { method: 'POST' }); go(S.tab); })));
  $$('[data-appr]').forEach((b) => (b.onclick = () => sigPad('Gegenzeichnen (Arbeitgeber)', async (sig) => { await api(`/timesheet/${b.dataset.m}/approve?userId=${b.dataset.appr}`, { method: 'POST', body: { signature: sig } }); toast('Gegengezeichnet.'); go(S.tab); })));
}

function dayModal(iso, sh, locked) {
  const es = sh.entries.filter((e) => e.date === iso);
  const [y, mo, d] = iso.split('-').map(Number);
  const title = new Date(y, mo - 1, d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
  const last = sh.entries[sh.entries.length - 1] || JSON.parse(localStorage.getItem('kb_last') || 'null') || { start: '07:00', end: '11:00', pause: 0, object: '' };
  const form = (e) => `
    <form id="ef">
      <input type="hidden" name="id" value="${e?.id || ''}">
      <div class="grid2">
        <div><label>Von</label><input type="time" name="start" value="${e?.start || last.start}" required></div>
        <div><label>Bis</label><input type="time" name="end" value="${e?.end || last.end}" required></div>
      </div>
      <label>Pause (Minuten)</label><select name="pause">${[0, 15, 30, 45, 60, 90].map((p) => `<option ${Number(e ? e.pause : last.pause) === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <label>Objekt / Kunde (optional)</label><input name="object" value="${esc(e ? e.object : last.object)}" placeholder="z. B. Büro Schmidt">
      <label>Bemerkung (optional)</label><input name="note" value="${esc(e?.note || '')}">
      <div class="actions"><button>Speichern</button>${e ? '<button type="button" class="btn-danger" id="delE">Löschen</button>' : ''}<button type="button" class="btn-light" onclick="closeModal()">Abbrechen</button></div>
    </form>`;
  openModal(`
    <h2>${esc(title)}</h2>
    ${es.map((e) => `<div class="card row" data-eid="${e.id}" style="cursor:${locked ? 'default' : 'pointer'}"><div class="grow"><b>${e.start}–${e.end}</b>${e.pause ? ` · ${e.pause} min Pause` : ''}<div class="muted small">${esc([e.object, e.note].filter(Boolean).join(' · '))}</div></div><b>${hours(e.minutes)} h</b></div>`).join('')}
    ${locked ? '<div class="locked">Monat ist unterschrieben – keine Änderungen möglich.</div><button class="btn-light btn-block" onclick="closeModal()">Schließen</button>' : `<div id="fbox">${es.length ? '<button class="btn-sec btn-block" id="more">＋ Weiteren Einsatz an diesem Tag</button>' : form(null)}</div>`}`, (box) => {
    if (locked) return;
    const bind = (e) => {
      $('#ef', box).onsubmit = (ev) => {
        ev.preventDefault();
        run(async () => {
          const data = { ...formData(ev.target), date: iso };
          if (data.end === data.start) throw new Error('Beginn und Ende sind gleich.');
          await api('/entries', { method: 'POST', body: data });
          localStorage.setItem('kb_last', JSON.stringify({ start: data.start, end: data.end, pause: data.pause, object: data.object }));
          closeModal();
          viewHours();
        });
      };
      if (e) $('#delE', box).onclick = () => run(async () => { await api('/entries/' + e.id, { method: 'DELETE' }); closeModal(); viewHours(); });
    };
    if (!es.length) bind(null);
    $('#more', box) && ($('#more', box).onclick = () => { $('#fbox', box).innerHTML = form(null); bind(null); });
    $$('[data-eid]', box).forEach((c) => (c.onclick = () => { const e = es.find((x) => x.id === c.dataset.eid); $('#fbox', box).innerHTML = form(e); bind(e); }));
  });
}

function sigPad(title, onSave, intro = '') {
  openModal(`
    <h2>${esc(title)}</h2>
    ${intro}
    <p class="muted small">Mit dem Finger unterschreiben:</p>
    <canvas class="sigpad" id="pad"></canvas>
    <div class="actions"><button id="ok">Unterschrift speichern</button><button class="btn-light" id="clr">Löschen</button><button class="btn-light" onclick="closeModal()">Abbrechen</button></div>`, (box) => {
    const c = $('#pad', box);
    const r = c.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    c.width = r.width * ratio;
    c.height = r.height * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b2a6b';
    let drawing = false, used = false;
    const pos = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    c.onpointerdown = (e) => { drawing = true; used = true; c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
    c.onpointermove = (e) => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); };
    c.onpointerup = c.onpointercancel = () => (drawing = false);
    $('#clr', box).onclick = () => { ctx.clearRect(0, 0, c.width, c.height); used = false; };
    $('#ok', box).onclick = () => {
      if (!used) return toast('Bitte zuerst unterschreiben.', true);
      run(async () => { await onSave(c.toDataURL('image/png')); closeModal(); });
    };
  });
}

function signModal(m, sh) {
  sigPad(
    'Stundenzettel unterschreiben',
    async (sig) => {
      await api(`/timesheet/${m}/sign`, { method: 'POST', body: { signature: sig } });
      toast('Unterschrieben. Jetzt noch an den Chef senden.');
      viewHours();
    },
    `<div class="hint">${esc(monthLabel(m))}: <b>${hours(sh.totalMinutes)} Stunden</b> an ${sh.workDays} Tagen.<br>Nach dem Unterschreiben ist der Monat abgeschlossen.</div>`
  );
}

async function sendTimesheet(m, sh) {
  if (!sh.signoff && !confirm('Der Monat ist noch nicht unterschrieben. Trotzdem senden?')) return;
  await run(async () => {
    const r = await api(`/timesheet/${m}/send`, { method: 'POST' });
    if (r.sent) {
      toast('Stundenzettel wurde per E-Mail an den Chef gesendet. ✅');
      return viewHours();
    }
    // Kein Mailserver eingerichtet → über die Mail-App des Handys teilen
    const blob = await fetch(`/api/timesheet/${m}/pdf`, { credentials: 'same-origin' }).then((x) => x.blob());
    const name = `Stundenzettel_${m}_${S.me.name.replace(/\s+/g, '_')}.pdf`;
    const file = new File([blob], name, { type: 'application/pdf' });
    const subject = `Stundenzettel ${monthLabel(m)} – ${S.me.name}`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: subject, text: `Hallo, anbei mein Stundenzettel für ${monthLabel(m)} (${hours(sh.totalMinutes)} h).` });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    const body = `Hallo,\n\nanbei mein Stundenzettel für ${monthLabel(m)}: ${hours(sh.totalMinutes)} Stunden an ${sh.workDays} Tagen.\n(Die PDF-Datei wurde gerade heruntergeladen – bitte anhängen.)\n\nViele Grüße\n${S.me.name}`;
    location.href = `mailto:${encodeURIComponent(r.ownerEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (r.reason === 'error') toast('Automatischer Versand fehlgeschlagen – bitte über die Mail-App senden.', true);
  });
}

/* ---------------- Konto / Mehr ---------------- */
function accountHtml() {
  return `
    <div class="card">
      <h3>${esc(S.me.name)}</h3><div class="muted small">Benutzername: ${esc(S.me.username)}</div>
      <form id="pw">
        <label>Altes Passwort</label><input type="password" name="oldPassword" required autocomplete="current-password">
        <label>Neues Passwort</label><input type="password" name="newPassword" minlength="6" required autocomplete="new-password">
        <div class="actions"><button>Passwort ändern</button><button type="button" class="btn-light" id="logout">Abmelden</button></div>
      </form>
    </div>`;
}
function bindAccount() {
  $('#pw').onsubmit = (e) => { e.preventDefault(); run(async () => { await api('/me/password', { method: 'POST', body: formData(e.target) }); e.target.reset(); toast('Passwort geändert.'); }); };
  $('#logout').onclick = () => run(async () => { await api('/logout', { method: 'POST' }); S.me = null; location.hash = ''; renderLogin(); });
}
async function viewAccount() {
  main.innerHTML = `<h1>Konto</h1>
    <div class="hint">🔒 Deine Stunden und Meldungen sieht nur der Chef. Kolleginnen haben keinen Zugriff darauf.</div>
    ${accountHtml()}
    <div class="card small muted">Tipp: Im Browser-Menü „Zum Startbildschirm hinzufügen“ wählen – dann ist die App wie eine normale App auf dem Handy.</div>`;
  bindAccount();
}

async function viewMore() {
  const [users, st] = await Promise.all([api('/users'), api('/settings')]);
  main.innerHTML = `
    <h1>Team & Einstellungen</h1>
    <h2>Team</h2>
    <div class="card">
      ${users.map((u) => `<div class="list-item row" data-uid="${u.id}" style="cursor:pointer"><div class="grow"><b>${esc(u.name)}</b> ${u.role === 'admin' ? '<span class="pill">Chef</span>' : ''} ${u.active ? '' : '<span class="pill gray">deaktiviert</span>'}<div class="muted small">${esc(u.username)}${u.email ? ' · ' + esc(u.email) : ''}</div></div><span class="muted">›</span></div>`).join('')}
      <button class="btn-sec btn-block" id="addU" style="margin-top:10px">＋ Mitarbeiter/in anlegen</button>
    </div>
    <h2>E-Mail</h2>
    <form class="card" id="sf">
      <label>Firmenname</label><input name="companyName" value="${esc(st.companyName)}">
      <label>Deine E-Mail (Empfänger für Stundenzettel & Meldungen)</label><input name="ownerEmail" type="email" value="${esc(st.ownerEmail)}">
      <label class="check"><input type="checkbox" name="notifyOnReport" ${st.notifyOnReport ? 'checked' : ''}> Bei jeder neuen Meldung eine E-Mail mit Foto bekommen</label>
      <p class="muted small">Damit „An Chef senden“ automatisch mailt, hier den Postausgang (SMTP) deines E-Mail-Anbieters eintragen. Ohne SMTP öffnet sich auf dem Handy die Mail-App mit dem PDF.
      Beispiele: Gmail <b>smtp.gmail.com</b> Port 465 (SSL, App-Passwort nötig) · GMX <b>mail.gmx.net</b> 587 · Web.de <b>smtp.web.de</b> 587 · IONOS <b>smtp.ionos.de</b> 587</p>
      <div class="grid2">
        <div><label>SMTP-Server</label><input name="host" value="${esc(st.smtp.host)}" placeholder="smtp.gmail.com"></div>
        <div><label>Port</label><input name="port" inputmode="numeric" value="${esc(st.smtp.port)}"></div>
        <div><label>Benutzer</label><input name="user" value="${esc(st.smtp.user)}" autocomplete="off"></div>
        <div><label>Passwort</label><input name="pass" type="password" value="${esc(st.smtp.pass)}" autocomplete="new-password"></div>
      </div>
      <label>Absender (optional)</label><input name="from" value="${esc(st.smtp.from)}" placeholder="Königbauer App &lt;info@...&gt;">
      <label class="check"><input type="checkbox" name="secure" ${st.smtp.secure ? 'checked' : ''}> SSL (bei Port 465 anhaken)</label>
      <p class="small">${st.smtpOk ? '✅ E-Mail-Versand eingerichtet' : '⚠️ E-Mail-Versand noch nicht eingerichtet'}</p>
      <div class="actions"><button>Speichern</button><button type="button" class="btn-sec" id="test">Test-Mail senden</button><a class="btn btn-light" href="/api/backup">💾 Datensicherung</a></div>
    </form>
    <h2>Mein Konto</h2>
    ${accountHtml()}`;
  bindAccount();
  $('#addU').onclick = () => userModal(null);
  $$('[data-uid]').forEach((el) => (el.onclick = () => userModal(users.find((u) => u.id === el.dataset.uid))));
  $('#sf').onsubmit = (e) => {
    e.preventDefault();
    const f = formData(e.target);
    run(async () => {
      await api('/settings', { method: 'PUT', body: { companyName: f.companyName, ownerEmail: f.ownerEmail, notifyOnReport: !!f.notifyOnReport, smtp: { host: f.host, port: f.port, user: f.user, pass: f.pass, from: f.from, secure: !!f.secure } } });
      toast('Gespeichert.');
      viewMore();
    });
  };
  $('#test').onclick = () => run(async () => { await api('/settings/testmail', { method: 'POST' }); toast('Test-Mail gesendet – Posteingang prüfen.'); });
}

function userModal(u) {
  openModal(`
    <h2>${u ? esc(u.name) : 'Neue/r Mitarbeiter/in'}</h2>
    <form id="uf">
      <label>Name</label><input name="name" value="${esc(u?.name || '')}" required>
      ${u ? '' : '<label>Benutzername (zum Anmelden)</label><input name="username" required autocapitalize="none" placeholder="z. B. anna">'}
      <label>E-Mail (optional – bekommt eine Kopie vom Stundenzettel)</label><input name="email" type="email" value="${esc(u?.email || '')}">
      <label>${u ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort (mind. 6 Zeichen)'}</label><input name="password" ${u ? '' : 'required'} minlength="6" autocomplete="new-password">
      ${u && u.id !== S.me.id ? `<label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> Zugang aktiv</label>` : ''}
      <div class="hint small">Die Person sieht nur ihre eigenen Stunden und Meldungen – keine Daten von Kolleginnen, keine Preise.</div>
      <div class="actions"><button>Speichern</button><button type="button" class="btn-light" onclick="closeModal()">Abbrechen</button></div>
    </form>`, (box) => {
    $('#uf', box).onsubmit = (e) => {
      e.preventDefault();
      const f = formData(e.target);
      if (u) {
        if (!f.password) delete f.password;
        if (u.id !== S.me.id) f.active = !!f.active;
      }
      run(async () => {
        await api('/users' + (u ? '/' + u.id : ''), { method: u ? 'PUT' : 'POST', body: f });
        closeModal();
        toast(u ? 'Gespeichert.' : 'Angelegt. Benutzername & Passwort der Person geben.');
        viewMore();
      });
    };
  });
}

window.go = go;
window.closeModal = closeModal;
boot();
