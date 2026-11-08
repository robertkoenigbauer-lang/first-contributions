const PDFDocument = require('pdfkit');

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function fmtH(min) {
  return (min / 60).toFixed(2).replace('.', ',');
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WD[dt.getDay()]}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}
function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}
function imgFromDataUrl(d) {
  return d ? Buffer.from(d.split(',')[1], 'base64') : null;
}

/** Erstellt einen druckbaren Stundenzettel (A4) mit Unterschriftsfeldern. */
function buildTimesheetPdf(sheet, companyName) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Stundenzettel ${sheet.month} ${sheet.user.name}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 40;
    const W = doc.page.width - 80;
    const green = '#1f6f5c';

    doc.fillColor(green).font('Helvetica-Bold').fontSize(16).text(companyName, L, 40);
    doc.fillColor('#000').fontSize(13).text('Stundenzettel', L, 62);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Mitarbeiter/in: ${sheet.user.name}`, L, 86);
    doc.text(`Monat: ${monthLabel(sheet.month)}`, L, 100);
    doc.text(`Erstellt: ${new Date().toLocaleString('de-DE')}`, L, 86, { width: W, align: 'right' });

    // Tabelle
    const cols = [
      { t: 'Datum', w: 95 },
      { t: 'Von', w: 45 },
      { t: 'Bis', w: 45 },
      { t: 'Pause', w: 45 },
      { t: 'Stunden', w: 55 },
      { t: 'Objekt / Bemerkung', w: W - 285 },
    ];
    let y = 125;
    const rowH = 17;
    function header() {
      doc.rect(L, y, W, rowH).fill(green);
      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
      let x = L;
      cols.forEach((c) => {
        doc.text(c.t, x + 4, y + 5, { width: c.w - 8 });
        x += c.w;
      });
      doc.fillColor('#000').font('Helvetica');
      y += rowH;
    }
    header();
    if (sheet.entries.length === 0) {
      doc.fontSize(9).text('Keine Einträge in diesem Monat.', L + 4, y + 5);
      y += rowH;
    }
    sheet.entries.forEach((e, i) => {
      if (y > doc.page.height - 200) {
        doc.addPage();
        y = 40;
        header();
      }
      if (i % 2 === 1) doc.rect(L, y, W, rowH).fill('#eef5f2').fillColor('#000');
      const vals = [fmtDate(e.date), e.start, e.end, e.pause ? `${e.pause} min` : '–', fmtH(e.minutes), [e.object, e.note].filter(Boolean).join(' – ')];
      let x = L;
      doc.fontSize(9);
      cols.forEach((c, ci) => {
        doc.text(vals[ci], x + 4, y + 5, { width: c.w - 8, height: rowH - 4, ellipsis: true, lineBreak: false });
        x += c.w;
      });
      y += rowH;
    });
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor('#999').stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(11).text(`Arbeitstage: ${sheet.workDays}     Stunden gesamt: ${fmtH(sheet.totalMinutes)} h`, L, y, { width: W, align: 'right' });

    // Unterschriften
    if (y > doc.page.height - 170) {
      doc.addPage();
      y = 40;
    }
    y = Math.max(y + 50, doc.page.height - 160);
    const half = (W - 40) / 2;
    const so = sheet.signoff;
    doc.font('Helvetica').fontSize(9).fillColor('#000');
    doc.text('Ich bestätige die Richtigkeit der Angaben.', L, y - 30);
    const sig = so && imgFromDataUrl(so.signature);
    if (sig) doc.image(sig, L, y - 10, { fit: [half, 55] });
    const sig2 = so && imgFromDataUrl(so.approvedSignature);
    if (sig2) doc.image(sig2, L + half + 40, y - 10, { fit: [half, 55] });
    y += 50;
    doc.moveTo(L, y).lineTo(L + half, y).stroke();
    doc.moveTo(L + half + 40, y).lineTo(L + W, y).stroke();
    doc.text(`Datum, Unterschrift Mitarbeiter/in${so ? ' (' + new Date(so.signedAt).toLocaleDateString('de-DE') + ')' : ''}`, L, y + 4, { width: half });
    doc.text(`Datum, Unterschrift Arbeitgeber${so && so.approvedAt ? ' (' + new Date(so.approvedAt).toLocaleDateString('de-DE') + ')' : ''}`, L + half + 40, y + 4, { width: half });

    doc.end();
  });
}

module.exports = { buildTimesheetPdf };
