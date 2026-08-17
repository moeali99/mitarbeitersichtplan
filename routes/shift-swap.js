const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { notify } = require('./notifications');

const router = express.Router();
router.use(requireAuth);

router.get('/offers', (req, res) => {
  const list = db.prepare(`
    SELECT o.id, o.shift_id, o.user_id, o.status, o.created_at,
           s.shift_date, s.start_time, s.end_time, s.title, d.name AS department_name,
           u.first_name AS user_first_name, u.last_name AS user_last_name
    FROM shift_swap_offers o
    JOIN shifts s ON s.id = o.shift_id
    JOIN departments d ON d.id = s.department_id
    JOIN users u ON u.id = o.user_id
    WHERE o.status = 'offen' AND o.user_id != ?
    ORDER BY o.created_at DESC
  `).all(req.session.userId);
  res.json(list.map(o => ({
    id: o.id, shiftId: o.shift_id, userId: o.user_id, status: o.status, createdAt: o.created_at,
    shift: { date: o.shift_date, startTime: o.start_time, endTime: o.end_time, title: o.title, departmentName: o.department_name },
    offeredBy: o.user_first_name + ' ' + o.user_last_name
  })));
});

router.get('/my-offers', (req, res) => {
  const list = db.prepare(`
    SELECT o.id, o.shift_id, o.status, s.shift_date, s.start_time, s.end_time, d.name AS department_name
    FROM shift_swap_offers o JOIN shifts s ON s.id = o.shift_id JOIN departments d ON d.id = s.department_id
    WHERE o.user_id = ? ORDER BY o.created_at DESC
  `).all(req.session.userId);
  res.json(list);
});

router.post('/offer', (req, res) => {
  const { shiftId } = req.body || {};
  const sid = parseInt(shiftId, 10);
  if (!sid) return res.status(400).json({ error: 'shiftId nötig' });
  const asn = db.prepare('SELECT id FROM shift_assignments WHERE shift_id = ? AND user_id = ?').get(sid, req.session.userId);
  if (!asn) return res.status(400).json({ error: 'Sie sind dieser Schicht nicht zugewiesen' });
  const existing = db.prepare('SELECT id FROM shift_swap_offers WHERE shift_id = ? AND user_id = ? AND status = ?').get(sid, req.session.userId, 'offen');
  if (existing) return res.status(400).json({ error: 'Schicht bereits zum Tausch angeboten' });
  db.prepare('INSERT INTO shift_swap_offers (shift_id, user_id, status) VALUES (?, ?, ?)').run(sid, req.session.userId, 'offen');
  const row = db.prepare('SELECT id, shift_id, status FROM shift_swap_offers ORDER BY id DESC LIMIT 1').get();
  res.status(201).json({ id: row.id, shiftId: row.shift_id, status: row.status });
});

router.delete('/offer/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const o = db.prepare('SELECT id, user_id FROM shift_swap_offers WHERE id = ?').get(id);
  if (!o) return res.status(404).json({ error: 'Angebot nicht gefunden' });
  if (o.user_id !== req.session.userId) return res.status(403).json({ error: 'Nur eigenes Angebot änderbar' });
  db.prepare('UPDATE shift_swap_offers SET status = ? WHERE id = ?').run('zurueckgezogen', id);
  res.json({ success: true });
});

router.post('/request', (req, res) => {
  const { offerId } = req.body || {};
  const oid = parseInt(offerId, 10);
  if (!oid) return res.status(400).json({ error: 'offerId nötig' });
  const offer = db.prepare('SELECT id, shift_id, user_id FROM shift_swap_offers WHERE id = ? AND status = ?').get(oid, 'offen');
  if (!offer) return res.status(400).json({ error: 'Angebot nicht verfügbar' });
  if (offer.user_id === req.session.userId) return res.status(400).json({ error: 'Eigenes Angebot nicht anfragbar' });
  const existing = db.prepare('SELECT id FROM shift_swap_requests WHERE offer_id = ? AND from_user_id = ? AND status = ?').get(oid, req.session.userId, 'ausstehend');
  if (existing) return res.status(400).json({ error: 'Anfrage bereits gestellt' });
  db.prepare('INSERT INTO shift_swap_requests (offer_id, from_user_id, to_user_id, status) VALUES (?, ?, ?, ?)')
    .run(oid, req.session.userId, offer.user_id, 'ausstehend');
  const reqRow = db.prepare('SELECT id, offer_id, status FROM shift_swap_requests ORDER BY id DESC LIMIT 1').get();
  const toUser = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(req.session.userId);
  notify(offer.user_id, 'info', 'Schichttausch-Anfrage', (toUser?.first_name || '') + ' ' + (toUser?.last_name || '') + ' möchte Ihre Schicht übernehmen.');
  res.status(201).json({ id: reqRow.id, offerId: reqRow.offer_id, status: reqRow.status });
});

router.get('/requests', (req, res) => {
  const list = db.prepare(`
    SELECT r.id, r.offer_id, r.from_user_id, r.to_user_id, r.status, r.created_at,
           o.shift_id, s.shift_date, s.start_time, s.end_time, d.name AS department_name,
           u.first_name AS from_first_name, u.last_name AS from_last_name
    FROM shift_swap_requests r
    JOIN shift_swap_offers o ON o.id = r.offer_id
    JOIN shifts s ON s.id = o.shift_id
    JOIN departments d ON d.id = s.department_id
    JOIN users u ON u.id = r.from_user_id
    WHERE r.to_user_id = ? AND r.status = 'ausstehend'
    ORDER BY r.created_at DESC
  `).all(req.session.userId);
  res.json(list.map(r => ({
    id: r.id, offerId: r.offer_id, fromUserId: r.from_user_id, status: r.status, createdAt: r.created_at,
    shift: { id: r.shift_id, date: r.shift_date, startTime: r.start_time, endTime: r.end_time, departmentName: r.department_name },
    fromUser: r.from_first_name + ' ' + r.from_last_name
  })));
});

router.post('/request/:id/accept', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = db.prepare('SELECT id, offer_id, from_user_id, to_user_id FROM shift_swap_requests WHERE id = ? AND status = ?').get(id, 'ausstehend');
  if (!r) return res.status(404).json({ error: 'Anfrage nicht gefunden oder bereits bearbeitet' });
  if (r.to_user_id !== req.session.userId) return res.status(403).json({ error: 'Nur eigene Anfragen annehmbar' });
  const offer = db.prepare('SELECT shift_id, user_id FROM shift_swap_offers WHERE id = ?').get(r.offer_id);
  if (!offer || offer.user_id !== req.session.userId) return res.status(400).json({ error: 'Angebot ungültig' });
  db.prepare('DELETE FROM shift_assignments WHERE shift_id = ? AND user_id = ?').run(offer.shift_id, offer.user_id);
  db.prepare('INSERT OR IGNORE INTO shift_assignments (shift_id, user_id) VALUES (?, ?)').run(offer.shift_id, r.from_user_id);
  db.prepare('UPDATE shift_swap_requests SET status = ? WHERE id = ?').run('angenommen', id);
  db.prepare('UPDATE shift_swap_offers SET status = ? WHERE id = ?').run('getauscht', r.offer_id);
  notify(r.from_user_id, 'success', 'Schichttausch angenommen', 'Ihre Tauschanfrage wurde angenommen.');
  res.json({ success: true });
});

router.post('/request/:id/reject', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const r = db.prepare('SELECT id, to_user_id FROM shift_swap_requests WHERE id = ? AND status = ?').get(id, 'ausstehend');
  if (!r) return res.status(404).json({ error: 'Anfrage nicht gefunden oder bereits bearbeitet' });
  if (r.to_user_id !== req.session.userId) return res.status(403).json({ error: 'Nur eigene Anfragen ablehnbar' });
  db.prepare('UPDATE shift_swap_requests SET status = ? WHERE id = ?').run('abgelehnt', id);
  res.json({ success: true });
});

module.exports = router;
