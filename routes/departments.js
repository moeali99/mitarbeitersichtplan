const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id, name, created_at FROM departments ORDER BY name').all();
  res.json(list.map(d => ({ id: d.id, name: d.name, createdAt: d.created_at })));
});

router.post('/', requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name nötig' });
  db.prepare('INSERT INTO departments (name) VALUES (?)').run(String(name).trim());
  const row = db.prepare('SELECT id, name FROM departments ORDER BY id DESC LIMIT 1').get();
  res.status(201).json(row);
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name } = req.body || {};
  const row = db.prepare('SELECT id FROM departments WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Abteilung nicht gefunden' });
  if (name !== undefined && String(name).trim()) db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(String(name).trim(), id);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const shifts = db.prepare('SELECT COUNT(*) AS c FROM shifts WHERE department_id = ?').get(id);
  if (shifts && shifts.c > 0) return res.status(400).json({ error: 'Abteilung wird noch von Schichten verwendet und kann nicht gelöscht werden.' });
  const r = db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  if (r.changes === 0) return res.status(404).json({ error: 'Abteilung nicht gefunden' });
  res.json({ success: true });
});

module.exports = router;
