const REST_MINUTES = 11 * 60;
const MAX_WEEK_HOURS = 48;

function toMinutes(dateStr, timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  return d.getTime() / 60000 + (h || 0) * 60 + (m || 0);
}

function overlaps(date1, start1, end1, date2, start2, end2) {
  if (date1 !== date2) return false;
  return start1 < end2 && end1 > start2;
}

function restViolation(date1, end1, date2, start2) {
  const endMin = toMinutes(date1, end1);
  const startMin = toMinutes(date2, start2);
  return (startMin - endMin) < REST_MINUTES;
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const mon = d.toISOString().slice(0, 10);
  d.setDate(d.getDate() + 6);
  const sun = d.toISOString().slice(0, 10);
  return { mon, sun };
}

function weekMinutesForUser(db, userId, weekMon, weekSun, excludeShiftId = null) {
  let sql = `
    SELECT s.shift_date, s.start_time, s.end_time FROM shift_assignments sa
    JOIN shifts s ON s.id = sa.shift_id WHERE sa.user_id = ? AND s.shift_date >= ? AND s.shift_date <= ?
  `;
  const params = [userId, weekMon, weekSun];
  if (excludeShiftId) { sql += ' AND sa.shift_id != ?'; params.push(excludeShiftId); }
  const rows = db.prepare(sql).all(...params);
  let total = 0;
  for (const r of rows) {
    const [sh, sm] = (r.start_time || '0:0').split(':').map(Number);
    const [eh, em] = (r.end_time || '0:0').split(':').map(Number);
    total += (eh * 60 + em) - (sh * 60 + sm);
  }
  return total;
}

/**
 * Gibt ersten Konflikt zurück (für API 409) oder null.
 */
function checkUserConflicts(db, userId, shiftDate, startTime, endTime, excludeShiftId) {
  const other = db.prepare(`
    SELECT s.id, s.shift_date, s.start_time, s.end_time FROM shift_assignments sa
    JOIN shifts s ON s.id = sa.shift_id WHERE sa.user_id = ? AND sa.shift_id != ?
  `).all(userId, excludeShiftId || 0);
  for (const o of other) {
    if (overlaps(shiftDate, startTime, endTime, o.shift_date, o.start_time, o.end_time))
      return { error: 'Doppelbelegung: Mitarbeiter hat bereits eine überlappende Schicht.', conflict: 'overlap' };
    if (restViolation(o.shift_date, o.end_time, shiftDate, startTime))
      return { error: 'Ruhezeit verletzt: Mindestens 11 Stunden zwischen Schichtende und nächstem Schichtbeginn.', conflict: 'rest' };
    if (restViolation(shiftDate, endTime, o.shift_date, o.start_time))
      return { error: 'Ruhezeit verletzt: Mindestens 11 Stunden zwischen Schichtende und nächstem Schichtbeginn.', conflict: 'rest' };
  }
  const { mon, sun } = getWeekRange(shiftDate);
  const existingMin = weekMinutesForUser(db, userId, mon, sun, excludeShiftId);
  const [sh, sm] = (startTime || '0:0').split(':').map(Number);
  const [eh, em] = (endTime || '0:0').split(':').map(Number);
  const addMin = (eh * 60 + em) - (sh * 60 + sm);
  if (existingMin + addMin > MAX_WEEK_HOURS * 60)
    return { error: 'Max. 48 Stunden pro Woche überschritten.', conflict: 'max_hours' };
  return null;
}

/**
 * Vollständiger Konflikt-Report für Kalender/UI.
 * @returns { overlaps, restViolation, weeklyHoursViolation }
 */
function getConflictReport(db, userId, shiftDate, startTime, endTime, excludeShiftId) {
  const other = db.prepare(`
    SELECT s.id, s.shift_date, s.start_time, s.end_time FROM shift_assignments sa
    JOIN shifts s ON s.id = sa.shift_id WHERE sa.user_id = ? AND sa.shift_id != ?
  `).all(userId, excludeShiftId || 0);
  let overlapsFlag = false;
  let restViolationFlag = false;
  for (const o of other) {
    if (overlaps(shiftDate, startTime, endTime, o.shift_date, o.start_time, o.end_time)) overlapsFlag = true;
    if (restViolation(o.shift_date, o.end_time, shiftDate, startTime)) restViolationFlag = true;
    if (restViolation(shiftDate, endTime, o.shift_date, o.start_time)) restViolationFlag = true;
  }
  const { mon, sun } = getWeekRange(shiftDate);
  const existingMin = weekMinutesForUser(db, userId, mon, sun, excludeShiftId);
  const [sh, sm] = (startTime || '0:0').split(':').map(Number);
  const [eh, em] = (endTime || '0:0').split(':').map(Number);
  const addMin = (eh * 60 + em) - (sh * 60 + sm);
  const weeklyHoursViolation = existingMin + addMin > MAX_WEEK_HOURS * 60;
  return { overlaps: overlapsFlag, restViolation: restViolationFlag, weeklyHoursViolation };
}

module.exports = { checkUserConflicts, getConflictReport, getWeekRange, weekMinutesForUser, REST_MINUTES, MAX_WEEK_HOURS };
