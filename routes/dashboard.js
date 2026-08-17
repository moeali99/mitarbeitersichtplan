const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/stats', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const shifts = db.prepare(`
    SELECT s.shift_date, s.start_time, s.end_time FROM shift_assignments sa JOIN shifts s ON s.id = sa.shift_id
    WHERE sa.user_id = ? AND s.shift_date >= ? AND s.shift_date <= ?
  `).all(req.session.userId, start, end);
  let min = 0;
  shifts.forEach(s => {
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    min += (eh * 60 + em) - (sh * 60 + sm);
  });
  res.json({ year: parseInt(year, 10), totalHours: Math.round(min / 60 * 100) / 100, shiftCount: shifts.length });
});

router.get('/vacation-balance', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const row = db.prepare('SELECT days_total, days_used FROM vacation_allowance WHERE user_id = ? AND year = ?').get(req.session.userId, parseInt(year, 10));
  if (!row) return res.json({ year: parseInt(year, 10), daysTotal: 20, daysUsed: 0, daysRemaining: 20 });
  const remaining = Math.max(0, (row.days_total || 0) - (row.days_used || 0));
  res.json({ year: parseInt(year, 10), daysTotal: row.days_total, daysUsed: row.days_used, daysRemaining: remaining });
});

router.get('/today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT s.shift_date, s.start_time, s.end_time, d.name AS department_name, u.first_name, u.last_name, u.email
    FROM shift_assignments sa
    JOIN shifts s ON s.id = sa.shift_id
    JOIN departments d ON d.id = s.department_id
    JOIN users u ON u.id = sa.user_id
    WHERE s.shift_date = ?
    ORDER BY s.start_time, u.last_name
  `).all(today);
  res.json(rows.map(r => ({
    shiftDate: r.shift_date,
    startTime: r.start_time,
    endTime: r.end_time,
    departmentName: r.department_name,
    userName: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email
  })));
});

module.exports = router;
