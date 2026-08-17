const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from und to nötig' });
  res.json(db.prepare('SELECT id, avail_date, start_time, end_time, available, note FROM availabilities WHERE user_id = ? AND avail_date >= ? AND avail_date <= ? ORDER BY avail_date').all(req.session.userId, from, to));
});

router.post('/', (req, res) => {
  const { availDate, startTime, endTime, available, note } = req.body || {};
  if (!availDate) return res.status(400).json({ error: 'Datum nötig' });
  db.prepare('INSERT INTO availabilities (user_id, avail_date, start_time, end_time, available, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.session.userId, availDate, startTime || null, endTime || null, available === false ? 0 : 1, note || null);
  const row = db.prepare('SELECT id, avail_date, start_time, end_time, available, note FROM availabilities ORDER BY id DESC LIMIT 1').get();
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM availabilities WHERE id = ? AND user_id = ?').run(parseInt(req.params.id, 10), req.session.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ success: true });
});

module.exports = router;
