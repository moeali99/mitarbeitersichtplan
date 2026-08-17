const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { getConflictReport } = require('../lib/shift-conflicts');
const { validateQuery } = require('../lib/validators');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/conflicts
 * Query: userId, shiftId, newDate?, newStart?, newEnd?
 * Liefert Konflikt-Report für Kalender/UI: overlaps, restViolation, weeklyHoursViolation, underStaffing.
 */
router.get('/', (req, res) => {
  const errQ = validateQuery(req.query, { userId: 'integer!', shiftId: 'integer!' });
  if (errQ) return res.status(400).json(errQ);
  const userId = parseInt(req.query.userId, 10);
  const shiftId = parseInt(req.query.shiftId, 10);
  const shift = db.prepare('SELECT id, shift_date, start_time, end_time, required_count FROM shifts WHERE id = ?').get(shiftId);
  if (!shift) return res.status(404).json({ error: 'Schicht nicht gefunden' });
  const newDate = req.query.newDate || shift.shift_date;
  const newStart = req.query.newStart || shift.start_time;
  const newEnd = req.query.newEnd || shift.end_time;
  const report = getConflictReport(db, userId, newDate, newStart, newEnd, shiftId);
  const assignments = db.prepare('SELECT COUNT(*) AS c FROM shift_assignments WHERE shift_id = ?').get(shiftId);
  const assignmentCount = assignments?.c ?? 0;
  const underStaffing = assignmentCount < (shift.required_count || 1);
  res.json({
    overlaps: report.overlaps,
    restViolation: report.restViolation,
    weeklyHoursViolation: report.weeklyHoursViolation,
    underStaffing,
    assignmentCount,
    requiredCount: shift.required_count || 1,
  });
});

module.exports = router;
