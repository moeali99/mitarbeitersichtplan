const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { SCHEMA, SCHEMA_EXTRA, SCHEMA_CHAT, SCHEMA_ROLES } = require('../scripts/init-db');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'schichtplanung.db');

let _db = null;

function runStmt(sql, params = []) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.run();
  stmt.free();
}

function ensureInitialized() {
  let hasUsers = false;
  try {
    const stmt = _db.prepare("SELECT COUNT(*) as c FROM users");
    if (stmt.step()) hasUsers = (stmt.getAsObject().c || 0) > 0;
    stmt.free();
  } catch (_) {}
  if (hasUsers) {
    try { _db.exec(SCHEMA_EXTRA); } catch (_) {}
    try { const s = _db.prepare('SELECT 1 FROM conversations LIMIT 1'); s.step(); s.free(); } catch (_) { _db.exec(SCHEMA_CHAT); }
    try { _db.run('ALTER TABLE chat_messages ADD COLUMN subject TEXT'); } catch (_) {}
    try { _db.run('CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_id ON chat_messages(conversation_id, id)'); } catch (_) {}
    try { _db.run('ALTER TABLE shift_check_ins ADD COLUMN source TEXT'); } catch (_) {}
    try { _db.run('CREATE INDEX IF NOT EXISTS idx_shift_check_ins_assignment ON shift_check_ins(shift_assignment_id)'); } catch (_) {}
    ensureRolesAndPermissions();
    backfillUserRoles();
    return;
  }
  _db.exec(SCHEMA);
  try { _db.exec(SCHEMA_EXTRA); } catch (_) {}
  try { _db.exec(SCHEMA_ROLES); } catch (_) {}
  try { _db.run('ALTER TABLE shifts ADD COLUMN location_id INTEGER'); } catch (_) {}
  try { _db.run('ALTER TABLE departments ADD COLUMN location_id INTEGER'); } catch (_) {}
  ensureRolesAndPermissions();
  const check = _db.prepare('SELECT COUNT(*) as c FROM users');
  check.step();
  const r = check.getAsObject();
  check.free();
  if (r && r.c === 0) {
    const dCount = _db.prepare('SELECT COUNT(*) as c FROM departments');
    const dc = dCount.step() ? dCount.getAsObject().c : 0;
    dCount.free();
    if (dc === 0) {
      runStmt('INSERT INTO departments (name) VALUES (?)', ['IT Support']);
      runStmt('INSERT INTO departments (name) VALUES (?)', ['Entwicklung']);
      runStmt('INSERT INTO departments (name) VALUES (?)', ['DevOps']);
      runStmt('INSERT INTO departments (name) VALUES (?)', ['QA']);
    }
    const hash = bcrypt.hashSync('admin123', 10);
    runStmt("INSERT INTO users (email, password_hash, role, first_name, last_name, department_id) VALUES (?, ?, 'admin', 'Admin', 'System', 1)", ['admin@example.com', hash]);
    console.log('DB auto-init. Login: admin@example.com / admin123');
  }
  backfillUserRoles();
  save();
}

function ensureRolesAndPermissions() {
  try { _db.exec(SCHEMA_ROLES); } catch (_) {}
  const roleNames = ['Admin', 'Manager', 'HR', 'Finanz', 'Standortleiter', 'ReadOnly', 'Mitarbeiter'];
  roleNames.forEach(name => runStmt('INSERT OR IGNORE INTO roles (name) VALUES (?)', [name]));
  const permKeys = ['*', 'shifts.read', 'shifts.write', 'assignments.write', 'calendar.read', 'absences.read', 'absences.write', 'users.read', 'users.write', 'documents.read', 'documents.write', 'salary.read', 'salary.write', 'payslips.read', 'payslips.write', 'exports.read', 'messages.read', 'messages.write', 'locations.read', 'locations.write', 'time.read', 'time.write', 'dashboard.read', 'tasks.read', 'tasks.write'];
  permKeys.forEach(k => runStmt('INSERT OR IGNORE INTO permissions (key) VALUES (?)', [k]));
  const roles = prepare('SELECT id, name FROM roles').all();
  const perms = prepare('SELECT id, key FROM permissions').all();
  const byRole = {};
  const byPerm = {};
  roles.forEach(r => { byRole[r.name] = r.id; });
  perms.forEach(p => { byPerm[p.key] = p.id; });
  const adminId = byRole.Admin;
  const starId = byPerm['*'];
  if (adminId != null && starId != null) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminId, starId]);
  const managerPerms = ['shifts.read', 'shifts.write', 'assignments.write', 'calendar.read', 'absences.read', 'absences.write', 'messages.read', 'messages.write', 'dashboard.read', 'time.read', 'locations.read'];
  (byRole.Manager != null && managerPerms.forEach(k => { const pid = byPerm[k]; if (pid) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.Manager, pid]); }));
  const hrPerms = ['users.read', 'absences.read', 'absences.write', 'documents.read', 'documents.write', 'dashboard.read', 'messages.read', 'messages.write'];
  (byRole.HR != null && hrPerms.forEach(k => { const pid = byPerm[k]; if (pid) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.HR, pid]); }));
  const finanzPerms = ['salary.read', 'salary.write', 'payslips.read', 'payslips.write', 'exports.read', 'dashboard.read'];
  (byRole.Finanz != null && finanzPerms.forEach(k => { const pid = byPerm[k]; if (pid) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.Finanz, pid]); }));
  (byRole.Standortleiter != null && managerPerms.forEach(k => { const pid = byPerm[k]; if (pid) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.Standortleiter, pid]); }));
  const readOnlyPerms = ['shifts.read', 'calendar.read', 'absences.read', 'users.read', 'dashboard.read', 'messages.read', 'time.read', 'locations.read', 'tasks.read'];
  (byRole.ReadOnly != null && readOnlyPerms.forEach(k => { const pid = byPerm[k]; if (pid) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.ReadOnly, pid]); }));
  const mitarbeiterPerms = ['calendar.read', 'absences.read', 'dashboard.read', 'messages.read', 'time.read', 'tasks.read'];
  (byRole.Mitarbeiter != null && mitarbeiterPerms.forEach(k => { const pid = byPerm[k]; if (pid) runStmt('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [byRole.Mitarbeiter, pid]); }));
}

function backfillUserRoles() {
  try {
    const users = prepare('SELECT id, role FROM users').all();
    const adminRoleId = prepare('SELECT id FROM roles WHERE name = ?').get('Admin')?.id;
    const mitarbeiterRoleId = prepare('SELECT id FROM roles WHERE name = ?').get('Mitarbeiter')?.id;
    if (!adminRoleId || !mitarbeiterRoleId) return;
    users.forEach(u => {
      const roleId = (u.role === 'admin' ? adminRoleId : mitarbeiterRoleId);
      runStmt('INSERT OR REPLACE INTO user_roles (user_id, role_id) VALUES (?, ?)', [u.id, roleId]);
    });
  } catch (_) {}
}

function save() {
  if (!_db) return;
  try {
    fs.writeFileSync(dbPath, Buffer.from(_db.export()));
  } catch (e) {
    console.error('DB save:', e.message);
  }
}

function prepare(sql) {
  if (!_db) throw new Error('DB nicht geladen.');
  return {
    run(...args) {
      const stmt = _db.prepare(sql);
      if (args.length) stmt.bind(args);
      stmt.run();
      stmt.free();
      const c = _db.prepare('SELECT changes() AS changes');
      c.step();
      const out = { changes: (c.getAsObject().changes) || 0 };
      c.free();
      save();
      return out;
    },
    get(...args) {
      const stmt = _db.prepare(sql);
      if (args.length) stmt.bind(args);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row;
    },
    all(...args) {
      const stmt = _db.prepare(sql);
      if (args.length) stmt.bind(args);
      const out = [];
      while (stmt.step()) out.push(stmt.getAsObject());
      stmt.free();
      return out;
    },
  };
}

async function loadDb() {
  if (_db) return _db;
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  _db = fs.existsSync(dbPath)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)))
    : new SQL.Database();
  _db.run('PRAGMA foreign_keys = ON;');
  ensureInitialized();
  setInterval(save, 30000);
  process.on('beforeExit', save);
  return _db;
}

module.exports = { prepare, loadDb };
