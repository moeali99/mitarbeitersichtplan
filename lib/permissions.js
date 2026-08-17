const db = require('./db');

/**
 * Gibt alle Permission-Keys für einen User zurück (über user_roles -> role_permissions).
 * Admin-Rolle (users.role = 'admin') oder Rolle mit Permission '*' = alle Keys.
 */
function getPermissionsForUser(userId) {
  if (!userId) return [];
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!u) return [];
  if (u.role === 'admin') return ['*'];
  const roleId = db.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').get(userId)?.role_id;
  if (!roleId) return [];
  const perms = db.prepare(`
    SELECT p.key FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ?
  `).all(roleId);
  const keys = (perms || []).map(p => p.key);
  if (keys.includes('*')) return ['*'];
  return keys;
}

/**
 * Prüft ob User eine Permission hat. '*' = alle Permissions.
 */
function hasPermission(userId, permissionKey) {
  const keys = getPermissionsForUser(userId);
  if (keys.includes('*')) return true;
  return keys.includes(permissionKey);
}

/**
 * Middleware: Erlaubt Zugriff nur wenn User mindestens eine der angegebenen Permissions hat.
 * requirePermission('shifts.write', 'admin') => entweder shifts.write ODER admin.
 * Nach requireAuth verwenden (req.session.userId gesetzt).
 */
function requirePermission(...permissionKeys) {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    if (permissionKeys.length === 0) return next();
    const hasAny = permissionKeys.some(k => hasPermission(req.session.userId, k));
    if (!hasAny) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
    }
    next();
  };
}

/** Rolle des Users (aus user_roles + roles.name, Fallback users.role). */
function getRoleNameForUser(userId) {
  if (!userId) return null;
  const u = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!u) return null;
  if (u.role === 'admin') return 'Admin';
  const r = db.prepare('SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?').get(userId);
  return r?.name || (u.role === 'mitarbeiter' ? 'Mitarbeiter' : u.role);
}

module.exports = { getPermissionsForUser, hasPermission, requirePermission, getRoleNameForUser };
