const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads', 'attests');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/vacation', requireAuth, (req, res) => {
  const { startDate, endDate } = req.body || {};
  if (!startDate || !endDate) return res.status(400).json({ error: 'Start- und Enddatum nötig' });
  db.prepare('INSERT INTO absences (user_id, type, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)').run(req.session.userId, 'urlaub', startDate, endDate, 'offen');
  const row = db.prepare('SELECT id, start_date, end_date, status FROM absences ORDER BY id DESC LIMIT 1').get();
  res.status(201).json(row);
});

router.post('/sick', requireAuth, upload.single('attest'), (req, res) => {
  const { startDate, endDate, reason } = req.body || {};
  if (!startDate || !endDate) return res.status(400).json({ error: 'Start- und Enddatum nötig' });
  const attestPath = req.file ? path.relative(path.join(__dirname, '..'), req.file.path) : null;
  db.prepare('INSERT INTO absences (user_id, type, start_date, end_date, status, reason, attest_path) VALUES (?, ?, ?, ?, ?, ?, ?)').run(req.session.userId, 'krank', startDate, endDate, 'genehmigt', reason || null, attestPath);
  const row = db.prepare('SELECT id, start_date, end_date, status, attest_path FROM absences ORDER BY id DESC LIMIT 1').get();
  res.status(201).json({ ...row, attestPath: row.attest_path });
});

router.get('/my', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT id, type, start_date, end_date, status, admin_comment, reason, attest_path, created_at FROM absences WHERE user_id = ? ORDER BY start_date DESC').all(req.session.userId));
});

router.get('/all', requireAdmin, (req, res) => {
  const list = db.prepare(`
    SELECT a.id, a.user_id, a.type, a.start_date, a.end_date, a.status, a.admin_comment, a.reason, a.attest_path, a.created_at, u.first_name, u.last_name, u.email
    FROM absences a JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC
  `).all();
  res.json(list);
});

router.get('/:id/attest', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db.prepare('SELECT user_id, attest_path FROM absences WHERE id = ?').get(id);
  if (!row || !row.attest_path) return res.status(404).json({ error: 'Attest nicht vorhanden' });
  const isOwner = row.user_id === req.session.userId;
  const isAdmin = req.session.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });
  const fullPath = path.join(__dirname, '..', row.attest_path);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
  res.sendFile(row.attest_path, { root: path.join(__dirname, '..') }, (err) => { if (err) res.status(500).json({ error: 'Download fehlgeschlagen' }); });
});

router.put('/:id/status', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, adminComment } = req.body || {};
  if (!['genehmigt', 'abgelehnt'].includes(status)) return res.status(400).json({ error: 'Status genehmigt oder abgelehnt' });
  const r = db.prepare('UPDATE absences SET status = ?, admin_comment = ?, updated_at = datetime("now") WHERE id = ? AND type = ?').run(status, adminComment || null, id, 'urlaub');
  if (r.changes === 0) return res.status(404).json({ error: 'Antrag nicht gefunden' });
  res.json({ success: true });
});

module.exports = router;
