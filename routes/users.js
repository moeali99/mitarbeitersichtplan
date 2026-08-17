const express = require('express');
const db = require('../lib/db');
const { requireAdmin, hashPassword, validatePassword } = require('../lib/auth');
const audit = require('../lib/audit');

const router = express.Router();
router.use(requireAdmin);

router.get('/', (req, res) => {
  const list = db.prepare(`
    SELECT u.id, u.email, u.role, u.active, u.first_name, u.last_name, u.phone, u.department_id, d.name AS department_name
    FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.last_name, u.first_name
  `).all();
  res.json(list.map(r => ({ id: r.id, email: r.email, role: r.role, active: !!r.active, firstName: r.first_name, lastName: r.last_name, phone: r.phone, departmentId: r.department_id, departmentName: r.department_name })));
});

router.get('/departments', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM departments ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { email, password, role, firstName, lastName, phone, departmentId } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort nötig' });
  const pv = validatePassword(password);
  if (!pv.ok) return res.status(400).json({ error: pv.error });
  try {
    db.prepare('INSERT INTO users (email, password_hash, role, first_name, last_name, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(email.toLowerCase().trim(), hashPassword(password), role === 'admin' ? 'admin' : 'mitarbeiter', firstName || null, lastName || null, phone || null, departmentId ? parseInt(departmentId, 10) : null);
    const row = db.prepare('SELECT id, email, role, first_name, last_name FROM users WHERE email = ?').get(email.toLowerCase().trim());
    audit.log(req.session.userId, 'user_create', 'user', row.id, { email: row.email, role: row.role });
    res.status(201).json({ id: row.id, email: row.email, role: row.role, firstName: row.first_name, lastName: row.last_name });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'E-Mail schon vergeben' });
    throw e;
  }
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, active, firstName, lastName, phone, departmentId } = req.body || {};
  const cur = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
  if (!cur) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (cur.role === 'admin' && req.session.userId === id && active === false)
    return res.status(400).json({ error: 'Admin kann sich nicht deaktivieren' });
  db.prepare('UPDATE users SET role = ?, active = ?, first_name = ?, last_name = ?, phone = ?, department_id = ?, updated_at = datetime("now") WHERE id = ?')
    .run(role === 'admin' ? 'admin' : 'mitarbeiter', active === false ? 0 : 1, firstName ?? null, lastName ?? null, phone ?? null, departmentId ? parseInt(departmentId, 10) : null, id);
  audit.log(req.session.userId, 'user_update', 'user', id, { role, active, firstName, lastName });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.session.userId) return res.status(400).json({ error: 'Nicht sich selbst löschen' });
  const row = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  if (row.role === 'admin') return res.status(400).json({ error: 'Admin nicht löschbar' });
  audit.log(req.session.userId, 'user_delete', 'user', id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

router.put('/:id/password', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { newPassword } = req.body || {};
  const pv = validatePassword(newPassword);
  if (!pv.ok) return res.status(400).json({ error: pv.error });
  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(hashPassword(newPassword), id);
  audit.log(req.session.userId, 'user_password_reset', 'user', id);
  res.json({ success: true });
});

module.exports = router;
