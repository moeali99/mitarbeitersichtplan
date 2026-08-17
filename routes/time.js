const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Get assignment id for (shiftId, userId); admin may pass userId in body to override
function getAssignmentForShift(shiftId, userId, asAdmin = false) {
  const row = db.prepare(`
    SELECT sa.id, sa.user_id FROM shift_assignments sa
    WHERE sa.shift_id = ? AND sa.user_id = ?
  `).get(shiftId, userId);
  return row;
}

// Find open check-in for user (any shift)
function getOpenCheckIn(userId) {
  return db.prepare(`
    SELECT ci.id, ci.shift_assignment_id, ci.check_in_at, ci.check_out_at, sa.shift_id, sa.user_id
    FROM shift_check_ins ci
    JOIN shift_assignments sa ON sa.id = ci.shift_assignment_id
    WHERE sa.user_id = ? AND ci.check_out_at IS NULL
    ORDER BY ci.check_in_at DESC LIMIT 1
  `).get(userId);
}

// 2.1 POST /check-in
router.post('/check-in', (req, res) => {
  const userId = req.session.userId;
  const { shiftId } = req.body || {};
  const sid = parseInt(shiftId, 10);
  if (!shiftId || isNaN(sid)) return res.status(400).json({ error: 'shiftId nötig' });

  const shift = db.prepare('SELECT id FROM shifts WHERE id = ?').get(sid);
  if (!shift) return res.status(404).json({ error: 'Schicht nicht gefunden' });

  const assignment = getAssignmentForShift(sid, userId);
  if (!assignment) return res.status(403).json({ error: 'Schicht nicht zugewiesen' });

  const open = getOpenCheckIn(userId);
  if (open) return res.status(409).json({ error: 'Du hast bereits einen aktiven Check-In' });

  db.prepare(`
    INSERT INTO shift_check_ins (shift_assignment_id, check_in_at, source) VALUES (?, ?, ?)
  `).run(assignment.id, now(), req.body.source || 'web');
  const id = db.prepare('SELECT last_insert_rowid() AS id').get().id;
  const row = db.prepare('SELECT * FROM shift_check_ins WHERE id = ?').get(id);
  res.status(201).json({
    id: row.id,
    shiftId: sid,
    userId,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    source: row.source || 'web'
  });
});

// 2.2 POST /check-out
router.post('/check-out', (req, res) => {
  const userId = req.session.userId;
  const { shiftId } = req.body || {};
  const open = getOpenCheckIn(userId);
  if (!open) return res.status(404).json({ error: 'Kein offener Check-In.' });

  if (shiftId != null && shiftId !== '') {
    const sid = parseInt(shiftId, 10);
    if (open.shift_id !== sid) return res.status(404).json({ error: 'Kein offener Check-In.' });
  }

  const checkOutAt = now();
  const checkIn = new Date(open.check_in_at.replace(' ', 'T')).getTime();
  const checkOut = new Date(checkOutAt.replace(' ', 'T')).getTime();
  const durationMinutes = Math.floor((checkOut - checkIn) / 60000);

  db.prepare('UPDATE shift_check_ins SET check_out_at = ? WHERE id = ?').run(checkOutAt, open.id);

  res.json({
    checkOutAt,
    durationMinutes,
    shiftId: open.shift_id
  });
});

// 2.3 GET /me?from=&to=
router.get('/me', (req, res) => {
  try {
  const userId = req.session.userId;
  let from = (req.query.from || '').toString().slice(0, 10);
  let to = (req.query.to || '').toString().slice(0, 10);
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'from und to nötig' });
  }

  const rows = db.prepare(`
    SELECT ci.id, ci.check_in_at, ci.check_out_at, sa.shift_id, s.shift_date, s.start_time, s.end_time, d.name AS department_name
    FROM shift_check_ins ci
    JOIN shift_assignments sa ON sa.id = ci.shift_assignment_id
    JOIN shifts s ON s.id = sa.shift_id
    LEFT JOIN departments d ON d.id = s.department_id
    WHERE sa.user_id = ? AND date(ci.check_in_at) >= ? AND date(ci.check_in_at) <= ?
    ORDER BY ci.check_in_at DESC
  `).all(userId, from, to);

  const out = rows.map(r => {
    let minutes = 0;
    if (r.check_out_at) {
      const a = new Date(r.check_in_at.replace(' ', 'T')).getTime();
      const b = new Date(r.check_out_at.replace(' ', 'T')).getTime();
      minutes = Math.floor((b - a) / 60000);
    }
    return {
      id: r.id,
      date: r.shift_date,
      shiftId: r.shift_id,
      department: r.department_name || null,
      checkInAt: r.check_in_at,
      checkOutAt: r.check_out_at,
      durationMinutes: minutes,
      startTime: r.start_time,
      endTime: r.end_time
    };
  });
  const totalMinutes = out.reduce((s, x) => s + x.durationMinutes, 0);
  res.json({ entries: out, totalMinutes });
  } catch (err) {
    console.error('GET /time/me', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2.4 GET /admin?userId=&from=&to=
router.get('/admin', (req, res) => {
  try {
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
  let from = (req.query.from || '').toString().slice(0, 10);
  let to = (req.query.to || '').toString().slice(0, 10);
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'from und to nötig' });
  }

  let rows;
  if (userId) {
    rows = db.prepare(`
      SELECT ci.id, ci.check_in_at, ci.check_out_at, sa.user_id, sa.shift_id, s.shift_date, s.start_time, s.end_time, d.name AS department_name,
        u.first_name, u.last_name, u.email
      FROM shift_check_ins ci
      JOIN shift_assignments sa ON sa.id = ci.shift_assignment_id
      JOIN shifts s ON s.id = sa.shift_id
      LEFT JOIN departments d ON d.id = s.department_id
      JOIN users u ON u.id = sa.user_id
      WHERE sa.user_id = ? AND date(ci.check_in_at) >= ? AND date(ci.check_in_at) <= ?
      ORDER BY ci.check_in_at DESC
    `).all(userId, from, to);
  } else {
    rows = db.prepare(`
      SELECT ci.id, ci.check_in_at, ci.check_out_at, sa.user_id, sa.shift_id, s.shift_date, s.start_time, s.end_time, d.name AS department_name,
        u.first_name, u.last_name, u.email
      FROM shift_check_ins ci
      JOIN shift_assignments sa ON sa.id = ci.shift_assignment_id
      JOIN shifts s ON s.id = sa.shift_id
      LEFT JOIN departments d ON d.id = s.department_id
      JOIN users u ON u.id = sa.user_id
      WHERE date(ci.check_in_at) >= ? AND date(ci.check_in_at) <= ?
      ORDER BY ci.check_in_at DESC
    `).all(from, to);
  }

  const out = rows.map(r => {
    let minutes = 0;
    if (r.check_out_at) {
      const a = new Date(r.check_in_at.replace(' ', 'T')).getTime();
      const b = new Date(r.check_out_at.replace(' ', 'T')).getTime();
      minutes = Math.floor((b - a) / 60000);
    }
    return {
      id: r.id,
      employeeId: r.user_id,
      employeeName: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
      date: r.shift_date,
      shiftId: r.shift_id,
      department: r.department_name || null,
      startTime: r.start_time,
      endTime: r.end_time,
      checkInAt: r.check_in_at,
      checkOutAt: r.check_out_at,
      durationMinutes: minutes
    };
  });
  const totalMinutes = out.reduce((s, x) => s + x.durationMinutes, 0);
  res.json({ entries: out, totalMinutes });
  } catch (err) {
    console.error('GET /time/admin', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2.5 GET /status
router.get('/status', (req, res) => {
  const userId = req.session.userId;
  const open = getOpenCheckIn(userId);
  if (!open) return res.json({ checkedIn: false });
  res.json({
    checkedIn: true,
    shiftId: open.shift_id,
    checkInAt: open.check_in_at,
    since: open.check_in_at
  });
});

module.exports = router;
