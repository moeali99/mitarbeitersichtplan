const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const list = db.prepare('SELECT id, name, address, created_at FROM locations ORDER BY name').all();
  res.json(list.map(l => ({ id: l.id, name: l.name, address: l.address, createdAt: l.created_at })));
});

router.post('/', requireAdmin, (req, res) => {
  const { name, address } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name nötig' });
  db.prepare('INSERT INTO locations (name, address) VALUES (?, ?)').run(name, address || null);
  const row = db.prepare('SELECT id, name, address FROM locations ORDER BY id DESC LIMIT 1').get();
  res.status(201).json(row);
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, address } = req.body || {};
  const row = db.prepare('SELECT id FROM locations WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Standort nicht gefunden' });
  if (name !== undefined) db.prepare('UPDATE locations SET name = ? WHERE id = ?').run(name, id);
  if (address !== undefined) db.prepare('UPDATE locations SET address = ? WHERE id = ?').run(address, id);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM locations WHERE id = ?').run(parseInt(req.params.id, 10));
  if (r.changes === 0) return res.status(404).json({ error: 'Standort nicht gefunden' });
  res.json({ success: true });
});

module.exports = router;
