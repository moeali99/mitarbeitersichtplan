const express = require('express');
const db = require('../lib/db');
const { comparePassword, hashPassword, validatePassword, requireAuth } = require('../lib/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body || {};
  const isFormPost = req.is('urlencoded') || (req.get('content-type') || '').includes('application/x-www-form-urlencoded');
  if (!email || !password) {
    if (isFormPost) return res.redirect('/signup?error=' + encodeURIComponent('E-Mail und Passwort nötig'));
    return res.status(400).json({ error: 'E-Mail und Passwort nötig' });
  }
  const pv = validatePassword(password);
  if (!pv.ok) {
    if (isFormPost) return res.redirect('/signup?error=' + encodeURIComponent(pv.error));
    return res.status(400).json({ error: pv.error });
  }
  const emailNorm = email.toLowerCase().trim();
  try {
    db.prepare('INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)')
      .run(emailNorm, hashPassword(password), 'mitarbeiter', firstName || null, lastName || null);
    const row = db.prepare('SELECT id, email, role, first_name, last_name FROM users WHERE email = ?').get(emailNorm);
    const userObj = { id: row.id, email: row.email, role: row.role, firstName: row.first_name, lastName: row.last_name };
    // Bei Form-POST: direkt einloggen und zur App zurück
    if (isFormPost) {
      req.session.userId = row.id;
      req.session.role = row.role;
      req.session.lastActivity = Date.now();
      req.session.user = userObj;
      return req.session.save(function(err) {
        if (err) return res.redirect('/signup?error=' + encodeURIComponent('Fehler beim Speichern'));
        res.redirect('/');
      });
    }
    res.status(201).json({ success: true, user: userObj });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      if (isFormPost) return res.redirect('/signup?error=' + encodeURIComponent('E-Mail schon vergeben'));
      return res.status(400).json({ error: 'E-Mail schon vergeben' });
    }
    throw e;
  }
});

router.post('/login', (req, res) => {
  const email = (req.body && (req.body.email || req.body.Email)) || '';
  const password = (req.body && (req.body.password || req.body.Password)) || '';
  const isFormPost = req.is('urlencoded') || (req.get('content-type') || '').includes('application/x-www-form-urlencoded');
  if (!email || !password) {
    if (isFormPost) return res.redirect('/?error=' + encodeURIComponent('E-Mail und Passwort nötig'));
    return res.status(400).json({ error: 'E-Mail und Passwort nötig' });
  }
  const user = db.prepare('SELECT id, email, password_hash, role, active, first_name, last_name FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
  if (!user || !user.active || !comparePassword(String(password), user.password_hash)) {
    if (isFormPost) return res.redirect('/?error=' + encodeURIComponent('Anmeldung fehlgeschlagen'));
    return res.status(401).json({ error: 'Anmeldung fehlgeschlagen' });
  }
  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.lastActivity = Date.now();
  req.session.user = { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name };
  if (process.env.DEBUG_AUTH) console.log('[auth] Session set userId=%s email=%s', user.id, user.email);
  if (isFormPost) {
    return req.session.save(function(err) {
      if (err) return res.redirect('/?error=' + encodeURIComponent('Fehler beim Speichern der Sitzung'));
      res.redirect('/');
    });
  }
  res.json({ success: true, user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get('/me', requireAuth, (req, res) => {
  if (process.env.DEBUG_AUTH) console.log('[auth] /me called userId=%s', req.session.userId);
  if (req.get('Sec-Fetch-Mode') === 'navigate') return res.redirect('/');
  const u = db.prepare('SELECT id, email, role, first_name, last_name, phone, department_id FROM users WHERE id = ?').get(req.session.userId);
  if (!u) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json({ id: u.id, email: u.email, role: u.role, firstName: u.first_name, lastName: u.last_name, phone: u.phone, departmentId: u.department_id });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Aktuelles und neues Passwort nötig' });
  const pv = validatePassword(newPassword);
  if (!pv.ok) return res.status(400).json({ error: pv.error });
  const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId);
  if (!u || !comparePassword(currentPassword, u.password_hash)) return res.status(400).json({ error: 'Aktuelles Passwort falsch' });
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hashPassword(newPassword), req.session.userId);
  res.json({ success: true });
});

module.exports = router;
