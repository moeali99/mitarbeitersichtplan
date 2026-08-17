const express = require('express');
const db = require('../lib/db');
const { requireAuth, requireAdmin } = require('../lib/auth');
const { checkUserConflicts } = require('../lib/shift-conflicts');

const router = express.Router();

router.get('/departments', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT id, name FROM departments ORDER BY name').all());
});

router.get('/calendar', requireAuth, (req, res) => {
  const { start, end, departmentId } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start und end nötig' });
  let sql = 'SELECT s.id, s.shift_date, s.start_time, s.end_time, s.required_count, s.title, s.department_id, d.name AS department_name FROM shifts s JOIN departments d ON d.id = s.department_id WHERE s.shift_date >= ? AND s.shift_date <= ?';
  const params = [start, end];
  if (departmentId) { sql += ' AND s.department_id = ?'; params.push(parseInt(departmentId, 10)); }
  sql += ' ORDER BY s.shift_date, s.start_time';
  const shifts = db.prepare(sql).all(...params);
  const ids = shifts.map(s => s.id);
  const assignments = ids.length ? db.prepare(`SELECT shift_id, user_id FROM shift_assignments WHERE shift_id IN (${ids.map(() => '?').join(',')})`).all(...ids) : [];
  const byShift = {};
  assignments.forEach(a => { byShift[a.shift_id] = byShift[a.shift_id] || []; byShift[a.shift_id].push(a.user_id); });
  const allUserIds = [...new Set(assignments.map(a => a.user_id))];
  const userRows = allUserIds.length ? db.prepare(`SELECT id, first_name, last_name FROM users WHERE id IN (${allUserIds.map(() => '?').join(',')})`).all(...allUserIds) : [];
  const userMap = {};
  userRows.forEach(u => { userMap[u.id] = { id: u.id, firstName: u.first_name, lastName: u.last_name }; });
  res.json(shifts.map(s => {
    const userIds = byShift[s.id] || [];
    return {
      id: s.id, date: s.shift_date, startTime: s.start_time, endTime: s.end_time, requiredCount: s.required_count, title: s.title,
      departmentId: s.department_id, departmentName: s.department_name, assignmentCount: userIds.length,
      assignedUsers: userIds.map(uid => userMap[uid] ? { id: userMap[uid].id, firstName: userMap[uid].firstName, lastName: userMap[uid].lastName } : { id: uid, firstName: null, lastName: null })
    };
  }));
});

router.get('/my', requireAuth, (req, res) => {
  const list = db.prepare(`
    SELECT s.id, s.shift_date, s.start_time, s.end_time, s.title, d.name AS department_name
    FROM shift_assignments sa JOIN shifts s ON s.id = sa.shift_id JOIN departments d ON d.id = s.department_id
    WHERE sa.user_id = ? AND s.shift_date >= date('now') ORDER BY s.shift_date, s.start_time
  `).all(req.session.userId);
  res.json(list);
});

router.post('/', requireAdmin, (req, res) => {
  const { shiftDate, startTime, endTime, departmentId, requiredCount, title, assignedUserIds } = req.body || {};
  if (!shiftDate || !startTime || !endTime || !departmentId) return res.status(400).json({ error: 'Datum, Zeiten und Abteilung nötig' });
  const userIds = Array.isArray(assignedUserIds)
    ? assignedUserIds.map(id => parseInt(id, 10)).filter(id => id > 0)
    : [];
  const deptId = parseInt(departmentId, 10);
  const reqCount = Math.max(1, parseInt(requiredCount, 10) || 1);
  for (const uid of userIds) {
    const err = checkUserConflicts(db, uid, shiftDate, startTime, endTime, 0);
    if (err) return res.status(409).json(err);
  }
  db.prepare('INSERT INTO shifts (shift_date, start_time, end_time, department_id, required_count, title) VALUES (?, ?, ?, ?, ?, ?)')
    .run(shiftDate, startTime, endTime, deptId, reqCount, title || null);
  const row = db.prepare('SELECT id, shift_date, start_time, end_time, department_id, required_count, title FROM shifts ORDER BY id DESC LIMIT 1').get();
  for (const uid of userIds) {
    try {
      db.prepare('INSERT INTO shift_assignments (shift_id, user_id) VALUES (?, ?)').run(row.id, uid);
    } catch (e) {
      if (!e.message || !e.message.includes('UNIQUE')) throw e;
    }
  }
  res.status(201).json({ ...row, assignedCount: userIds.length });
});

router.get('/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id) || id < 1) return res.status(400).json({ error: 'Ungültige Schicht-ID' });
  const s = db.prepare('SELECT s.*, d.name AS department_name FROM shifts s JOIN departments d ON d.id = s.department_id WHERE s.id = ?').get(id);
  if (!s) return res.status(404).json({ error: 'Schicht nicht gefunden' });
  const asn = db.prepare('SELECT user_id FROM shift_assignments WHERE shift_id = ?').all(id);
  res.json({ id: s.id, date: s.shift_date, startTime: s.start_time, endTime: s.end_time, requiredCount: s.required_count, title: s.title, departmentId: s.department_id, departmentName: s.department_name, assignments: asn });
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { shiftDate, startTime, endTime, departmentId, requiredCount, title } = req.body || {};
  const ex = db.prepare('SELECT id, shift_date, start_time, end_time, department_id, required_count, title FROM shifts WHERE id = ?').get(id);
  if (!ex) return res.status(404).json({ error: 'Schicht nicht gefunden' });
  const newDate = shiftDate ?? ex.shift_date;
  const newStart = startTime ?? ex.start_time;
  const newEnd = endTime ?? ex.end_time;
  const userIds = db.prepare('SELECT user_id FROM shift_assignments WHERE shift_id = ?').all(id).map(r => r.user_id);
  for (const uid of userIds) {
    const err = checkUserConflicts(db, uid, newDate, newStart, newEnd, id);
    if (err) return res.status(409).json(err);
  }
  db.prepare('UPDATE shifts SET shift_date = ?, start_time = ?, end_time = ?, department_id = ?, required_count = ?, title = ?, updated_at = datetime("now") WHERE id = ?')
    .run(newDate, newStart, newEnd, parseInt(departmentId ?? ex.department_id, 10), Math.max(1, parseInt(requiredCount ?? ex.required_count, 10) || 1), title ?? ex.title ?? null, id);
  res.json({ success: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM shifts WHERE id = ?').run(parseInt(req.params.id, 10));
  if (r.changes === 0) return res.status(404).json({ error: 'Schicht nicht gefunden' });
  res.json({ success: true });
});

router.post('/:id/assign', requireAdmin, (req, res) => {
  const shiftId = parseInt(req.params.id, 10);
  const userId = parseInt(req.body?.userId, 10);
  if (!userId) return res.status(400).json({ error: 'userId nötig' });
  const shift = db.prepare('SELECT id, shift_date, start_time, end_time FROM shifts WHERE id = ?').get(shiftId);
  if (!shift) return res.status(404).json({ error: 'Schicht nicht gefunden' });
  const err = checkUserConflicts(db, userId, shift.shift_date, shift.start_time, shift.end_time, shiftId);
  if (err) return res.status(409).json(err);
  try {
    db.prepare('INSERT INTO shift_assignments (shift_id, user_id) VALUES (?, ?)').run(shiftId, userId);
    res.status(201).json({ success: true });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Bereits zugewiesen' });
    throw e;
  }
});

router.delete('/:id/assign/:userId', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM shift_assignments WHERE shift_id = ? AND user_id = ?').run(parseInt(req.params.id, 10), parseInt(req.params.userId, 10));
  res.json({ success: true });
});

module.exports = router;
