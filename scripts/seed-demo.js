/**
 * Demo-Daten für Präsentation/Abgabe: Beispiel-Nutzer, Schichten für die nächsten 2 Wochen.
 * Ausführung: npm run seed-demo (oder node scripts/seed-demo.js)
 * Voraussetzung: Server war mindestens einmal gestartet (DB existiert).
 *
 * Zugangsdaten (alle Passwörter: Demo1234):
 *   Alaa Al Hasan      → alaa.alhasan@example.com
 *   Rouni Bairam       → rouni.bairam@example.com
 *   Yazan Damash       → yazan.damash@example.com
 *   Ahmad Gheibeh      → ahmad.gheibeh@example.com
 *   Mohamed Ali Aladani → mohamedali.aladani@example.com
 */

const { loadDb, prepare } = require('../lib/db');
const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'Demo1234';
const DEMO_USERS = [
  { email: 'maria@example.com', firstName: 'Maria', lastName: 'Muster', departmentId: 1 },
  { email: 'tom@example.com', firstName: 'Tom', lastName: 'Test', departmentId: 2 },
  { email: 'lena@example.com', firstName: 'Lena', lastName: 'Demo', departmentId: 3 },
  { email: 'alaa.alhasan@example.com', firstName: 'Alaa', lastName: 'Al Hasan', departmentId: 1 },
  { email: 'rouni.bairam@example.com', firstName: 'Rouni', lastName: 'Bairam', departmentId: 2 },
  { email: 'yazan.damash@example.com', firstName: 'Yazan', lastName: 'Damash', departmentId: 3 },
  { email: 'ahmad.gheibeh@example.com', firstName: 'Ahmad', lastName: 'Gheibeh', departmentId: 4 },
  { email: 'mohamedali.aladani@example.com', firstName: 'Mohamed Ali', lastName: 'Aladani', departmentId: 1 },
];

function dateStr(d, offsetDays = 0) {
  const x = new Date(d);
  x.setDate(x.getDate() + offsetDays);
  return x.toISOString().slice(0, 10);
}

async function seed() {
  await loadDb();
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const userIds = [];

  for (const u of DEMO_USERS) {
    const existing = prepare('SELECT id FROM users WHERE email = ?').get(u.email);
    if (existing) {
      prepare('UPDATE users SET password_hash = ?, first_name = ?, last_name = ?, department_id = ? WHERE id = ?')
        .run(hash, u.firstName, u.lastName, u.departmentId || 1, existing.id);
      userIds.push(existing.id);
      console.log('User aktualisiert (Passwort gesetzt):', u.email);
    } else {
      prepare(
        'INSERT INTO users (email, password_hash, role, first_name, last_name, department_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(u.email, hash, 'mitarbeiter', u.firstName, u.lastName, u.departmentId || 1);
      const row = prepare('SELECT id FROM users WHERE email = ?').get(u.email);
      if (row) userIds.push(row.id);
      console.log('User angelegt:', u.email);
    }
  }

  const admin = prepare('SELECT id FROM users WHERE role = ?').get('admin');
  const allUserIds = admin ? [admin.id, ...userIds] : userIds;
  if (allUserIds.length === 0) {
    console.log('Keine Nutzer vorhanden. Bitte zuerst Server starten (npm start), dann seed-demo erneut ausführen.');
    return;
  }

  const today = new Date();
  const shiftsToAdd = [];
  const slots = [
    { start: '08:00', end: '16:00', title: 'Vormittagsblock' },
    { start: '14:00', end: '22:00', title: 'Nachmittagsblock' },
    { start: '08:00', end: '12:00', title: 'Block 1' },
    { start: '12:00', end: '20:00', title: 'Block 2' },
  ];

  for (let d = 0; d < 14; d++) {
    const dt = dateStr(today, d);
    const day = new Date(dt).getDay();
    if (day === 0 || day === 6) continue;
    for (let i = 0; i < 2; i++) {
      const slot = slots[(d + i) % slots.length];
      shiftsToAdd.push({
        shift_date: dt,
        start_time: slot.start,
        end_time: slot.end,
        department_id: (d % 4) + 1,
        required_count: 1,
        title: slot.title,
      });
    }
  }

  let inserted = 0;
  for (const s of shiftsToAdd) {
    try {
      prepare(
        'INSERT INTO shifts (shift_date, start_time, end_time, department_id, required_count, title) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(s.shift_date, s.start_time, s.end_time, s.department_id, s.required_count, s.title);
      const row = prepare('SELECT id FROM shifts ORDER BY id DESC LIMIT 1').get();
      if (row) {
        const assignUserId = allUserIds[inserted % allUserIds.length];
        prepare('INSERT OR IGNORE INTO shift_assignments (shift_id, user_id) VALUES (?, ?)').run(row.id, assignUserId);
        inserted++;
      }
    } catch (e) {
      if (!e.message?.includes('UNIQUE')) console.warn('Shift insert:', e.message);
    }
  }

  for (const uid of [...userIds, admin?.id].filter(Boolean)) {
    const y = today.getFullYear();
    prepare('INSERT OR IGNORE INTO vacation_allowance (user_id, year, days_total, days_used) VALUES (?, ?, 20, 0)').run(uid, y);
  }

  console.log('Demo-Seed fertig. Schichten (mit Zuweisungen):', inserted);
  console.log('Demo-Logins: ' + DEMO_USERS.map((u) => u.email).join(', ') + ' / ' + DEMO_PASSWORD);
  console.log('Falls der Server läuft: einmal neu starten (Ctrl+C, dann npm start), damit die neuen Daten geladen werden.');
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
