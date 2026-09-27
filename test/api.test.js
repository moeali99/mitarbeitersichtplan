// Automatisierte API-Tests (node:test) – deckt die wichtigsten Punkte aus docs/SMOKE.md ab.
// Startet den echten Server mit einer temporaeren Datenbank; die Daten in data/ bleiben unberuehrt.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schichtplan-test-'));
let server;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), DB_PATH: path.join(tmpDir, 'test.db') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startet nicht')), 15000);
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes(`localhost:${PORT}`)) { clearTimeout(timer); resolve(); }
    });
    server.on('exit', (code) => reject(new Error('Server beendet mit Code ' + code)));
  });
});

after(() => {
  server.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Minimaler Client, der das Session-Cookie mitfuehrt.
function client() {
  let cookie = '';
  return async function call(method, url, body) {
    const res = await fetch(BASE + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  };
}

const admin = client();
const employee = client();
const state = {};

test('geschuetzte Endpunkte verlangen eine Anmeldung', async () => {
  const res = await client()('GET', '/api/shifts/my');
  assert.equal(res.status, 401);
});

test('Login mit falschem Passwort schlaegt fehl', async () => {
  const res = await client()('POST', '/api/auth/login', { email: 'admin@example.com', password: 'falsch123' });
  assert.equal(res.status, 401);
});

test('Admin kann sich anmelden', async () => {
  const res = await admin('POST', '/api/auth/login', { email: 'admin@example.com', password: 'admin123' });
  assert.equal(res.status, 200);
  assert.equal(res.data.user.role, 'admin');
});

test('Admin legt einen Standort an', async () => {
  const res = await admin('POST', '/api/locations', { name: 'Filiale Saarbrücken', address: 'Goebenstraße 40' });
  assert.equal(res.status, 201);
  assert.equal(res.data.name, 'Filiale Saarbrücken');
});

test('Standort ohne Namen wird abgelehnt', async () => {
  const res = await admin('POST', '/api/locations', { address: 'irgendwo' });
  assert.equal(res.status, 400);
});

test('Admin legt einen Mitarbeiter an; schwache Passwoerter werden abgelehnt', async () => {
  const weak = await admin('POST', '/api/users', { email: 'schwach@example.com', password: 'kurz' });
  assert.equal(weak.status, 400);

  const res = await admin('POST', '/api/users', {
    email: 'mitarbeiter@example.com', password: 'Sicher1234', firstName: 'Max', lastName: 'Muster',
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.role, 'mitarbeiter');
  state.employeeId = res.data.id;
});

test('Mitarbeiter hat keinen Zugriff auf Admin-Funktionen', async () => {
  const login = await employee('POST', '/api/auth/login', { email: 'mitarbeiter@example.com', password: 'Sicher1234' });
  assert.equal(login.status, 200);
  const res = await employee('POST', '/api/locations', { name: 'Nicht erlaubt' });
  assert.equal(res.status, 403);
});

test('Admin legt eine Schicht an und weist sie zu', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const res = await admin('POST', '/api/shifts', {
    shiftDate: today, startTime: '08:00', endTime: '16:00', departmentId: 1,
    requiredCount: 1, title: 'Frühschicht', assignedUserIds: [state.employeeId],
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.assignedCount, 1);
  state.shiftId = res.data.id;
});

test('Konfliktpruefung: ueberlappende Schicht wird erkannt', async () => {
  const today = new Date().toISOString().slice(0, 10);
  const res = await admin('POST', '/api/shifts', {
    shiftDate: today, startTime: '12:00', endTime: '20:00', departmentId: 1,
    assignedUserIds: [state.employeeId],
  });
  assert.equal(res.status, 409);
});

test('Konflikt-API liefert eine Auswertung', async () => {
  const res = await admin('GET', `/api/conflicts?userId=${state.employeeId}&shiftId=${state.shiftId}`);
  assert.equal(res.status, 200);
  assert.ok('overlaps' in res.data);
});

test('Zeiterfassung: Check-In, doppelter Check-In, Check-Out', async () => {
  const checkIn = await employee('POST', '/api/time/check-in', { shiftId: state.shiftId });
  assert.equal(checkIn.status, 201);

  const again = await employee('POST', '/api/time/check-in', { shiftId: state.shiftId });
  assert.equal(again.status, 409);

  const checkOut = await employee('POST', '/api/time/check-out', { shiftId: state.shiftId });
  assert.ok(checkOut.status === 200 || checkOut.status === 201, 'Check-Out erwartet 200/201, war ' + checkOut.status);
});

test('Nach dem Logout ist die Session beendet', async () => {
  await employee('POST', '/api/auth/logout');
  const res = await employee('GET', '/api/shifts/my');
  assert.equal(res.status, 401);
});
