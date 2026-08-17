const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const list = db.prepare('SELECT id, type, title, body, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.session.userId);
  res.json(list.map(n => ({ id: n.id, type: n.type, title: n.title, body: n.body, readAt: n.read_at, createdAt: n.created_at })));
});

router.get('/unread-count', (req, res) => {
  const r = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL').get(req.session.userId);
  res.json({ count: r?.c ?? 0 });
});

router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET read_at = datetime("now") WHERE id = ? AND user_id = ?')
    .run(parseInt(req.params.id, 10), req.session.userId);
  res.json({ success: true });
});

router.put('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET read_at = datetime("now") WHERE user_id = ? AND read_at IS NULL').run(req.session.userId);
  res.json({ success: true });
});

function notify(userId, type, title, body) {
  try {
    db.prepare('INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)').run(userId, type, title, body || null);
  } catch (_) {}
}
module.exports = router;
module.exports.notify = notify;
