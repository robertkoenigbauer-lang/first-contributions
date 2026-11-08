const nodemailer = require('nodemailer');

function smtpConfigured(s) {
  return !!(s && s.host && s.user && s.pass);
}
async function sendMail(s, msg) {
  if (!smtpConfigured(s)) throw new Error('E-Mail-Versand ist nicht eingerichtet.');
  const t = nodemailer.createTransport({
    host: s.host,
    port: Number(s.port) || 587,
    secure: !!s.secure,
    auth: { user: s.user, pass: s.pass },
  });
  return t.sendMail({ from: s.from || s.user, ...msg });
}
module.exports = { sendMail, smtpConfigured };
