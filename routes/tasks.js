const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  let sql = 'SELECT id, title, description, priority, due_date, completed, created_at FROM tasks WHERE user_id = ?';
  const params = [req.session.userId];
  if (req.query.completed === '1') sql += ' AND completed = 1';
  else if (req.query.completed === '0') sql += ' AND completed = 0';
  sql += ' ORDER BY completed ASC, due_date ASC, priority DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { title, description, priority, dueDate } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titel nötig' });
  db.prepare('INSERT INTO tasks (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)')
    .run(req.session.userId, title, description || null, Math.max(1, Math.min(3, parseInt(priority, 10) || 2)), dueDate || null);
  const row = db.prepare('SELECT id, title, description, priority, due_date, completed FROM tasks ORDER BY id DESC LIMIT 1').get();
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, description, priority, dueDate, completed } = req.body || {};
  const r = db.prepare('UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), priority = COALESCE(?, priority), due_date = COALESCE(?, due_date), completed = COALESCE(?, completed), updated_at = datetime("now") WHERE id = ? AND user_id = ?')
    .run(title ?? null, description ?? null, priority ?? null, dueDate ?? null, completed != null ? (completed ? 1 : 0) : null, id, req.session.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(parseInt(req.params.id, 10), req.session.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ success: true });
});

module.exports = router;
