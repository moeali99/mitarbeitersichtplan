const db = require('./db');

function log(userId, action, entityType, entityId, details) {
  try {
    db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(userId ?? null, action, entityType ?? null, entityId ?? null, details ? JSON.stringify(details) : null);
  } catch (_) {}
}

module.exports = { log };
