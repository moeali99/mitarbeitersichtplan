let currentUser = null;
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function $(s, el = document) { return el.querySelector(s); }
function $$(s, el = document) { return [...el.querySelectorAll(s)]; }

let toastTimeout = null;
function showToast(message, type = 'error') {
  const container = $('#toast-container');
  if (!container) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  container.innerHTML = '<div class="toast toast-' + type + '"><span class="toast-icon">' + (type === 'error' ? '✕' : '✓') + '</span><span class="toast-msg">' + (message || '').replace(/</g, '&lt;') + '</span><button type="button" class="toast-close" aria-label="Schließen">×</button></div>';
  container.classList.remove('hidden');
  const toast = container.querySelector('.toast');
  const close = () => { container.classList.add('hidden'); container.innerHTML = ''; };
  container.querySelector('.toast-close')?.addEventListener('click', close);
  toastTimeout = setTimeout(close, 5000);
}

const VIEW_IDS = {
  dashboard: 'dashboard-view',
  kalender: 'kalender-view',
  'meine-schichten': 'meine-schichten-view',
  zeiterfassung: 'zeiterfassung-view',
  schichttausch: 'schichttausch-view',
  chat: 'chat-view',
  verfuegbarkeit: 'verfuegbarkeit-view',
  urlaub: 'urlaub-view',
  aufgaben: 'aufgaben-view',
  team: 'team-view',
  finanzen: 'finanzen-view',
  benutzer: 'benutzer-view',
  schichten: 'schichten-view',
  abteilungen: 'abteilungen-view',
  standorte: 'standorte-view',
  antraege: 'antraege-view',
};

function showView(id) {
  $$('.view').forEach(v => v.classList.add('hidden'));
  const v = $('#' + id);
  if (v) v.classList.remove('hidden');
  $$('.nav-link').forEach(a => a.classList.remove('active'));
  const link = $(`a[href="#${id.replace('-view','')}"]`);
  if (link) link.classList.add('active');
}

function route() {
  const hash = (location.hash || '#dashboard').slice(1);
  const viewId = VIEW_IDS[hash] || 'dashboard-view';
  if (['benutzer','schichten','abteilungen','standorte','antraege'].includes(hash) && currentUser?.role !== 'admin') return showView('dashboard-view');
  showView(viewId);
  if (viewId === 'dashboard-view') loadDashboard();
  if (viewId === 'kalender-view') loadCalendar();
  if (viewId === 'meine-schichten-view') loadMyShifts();
  if (viewId === 'zeiterfassung-view') loadZeiterfassung();
  if (viewId === 'chat-view') loadChat();
  if (viewId === 'verfuegbarkeit-view') loadAvailability();
  if (viewId === 'urlaub-view') loadMyAbsences();
  if (viewId === 'aufgaben-view') loadTasks();
  if (viewId === 'team-view') loadTeam();
  if (viewId === 'benutzer-view') loadUsers();
  if (viewId === 'schichten-view') loadShiftsAdmin();
  if (viewId === 'abteilungen-view') loadAbteilungen();
  if (viewId === 'standorte-view') loadLocations();
  if (viewId === 'antraege-view') loadAbsencesAdmin();
  if (viewId === 'schichttausch-view') loadShiftSwap();
  if (viewId === 'finanzen-view') loadFinanzen();
  if (viewId === 'chat-view') {
    loadChat();
    if (window._chatPoll) clearInterval(window._chatPoll);
    window._chatPoll = setInterval(loadChat, 5000);
  } else {
    if (window._chatPoll) { clearInterval(window._chatPoll); window._chatPoll = null; }
  }
}

function showPortWarningIfWrong() {
  // Die API liegt immer auf demselben Origin wie die Seite; falsch ist nur file://.
  const el = $('#port-warning');
  if (el && window.location.protocol === 'file:') el.classList.remove('hidden');
}

async function checkAuth() {
  // Nach Login: Server hat User in die Seite eingebettet – sofort App anzeigen
  const initial = typeof window !== 'undefined' && window.__INITIAL_USER__;
  if (initial) {
    currentUser = window.__INITIAL_USER__;
    const me = currentUser;
    $('#header-user').textContent = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email;
    if (me.role === 'admin') { const an = $('#admin-nav'); if (an) an.style.display = ''; }
    $('#auth-page').classList.add('hidden');
    $('#main-app').classList.remove('hidden');
    showPortWarningIfWrong();
    route();
    return true;
  }
  try {
    const me = await auth.me();
    currentUser = me;
    $('#header-user').textContent = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email;
    if (me.role === 'admin') $('#admin-nav').style.display = '';
    $('#auth-page').classList.add('hidden');
    $('#main-app').classList.remove('hidden');
    showPortWarningIfWrong();
    route();
    return true;
  } catch (e) {
    currentUser = null;
    const an = $('#admin-nav'); if (an) an.style.display = 'none';
    showToast(e?.data?.error || 'Session nicht aktiv. Bitte erneut anmelden.', 'error');
    window.location.replace('/?error=' + encodeURIComponent(e?.data?.error || 'Bitte erneut anmelden'));
    return false;
  }
}

function initAuth() {
  const authToggle = document.getElementById('auth-toggle');
  const authToLogin = document.getElementById('auth-to-login');
  const authCardFlip = document.getElementById('authCardFlip');
  const authForgot = document.getElementById('auth-forgot');
  if (authToggle) authToggle.addEventListener('click', () => {
    if (authCardFlip) authCardFlip.classList.add('flipped');
    const le = document.getElementById('login-error'); if (le) le.textContent = '';
    const re = document.getElementById('register-error'); if (re) re.textContent = '';
    const wc = document.getElementById('auth-welcome-content'); if (wc) wc.classList.add('hidden');
    const wb = document.getElementById('auth-welcome-back'); if (wb) wb.classList.remove('hidden');
  });
  if (authToLogin) authToLogin.addEventListener('click', () => {
    if (authCardFlip) authCardFlip.classList.remove('flipped');
    const le = document.getElementById('login-error'); if (le) le.textContent = '';
    const re = document.getElementById('register-error'); if (re) re.textContent = '';
    const wc = document.getElementById('auth-welcome-content'); if (wc) wc.classList.remove('hidden');
    const wb = document.getElementById('auth-welcome-back'); if (wb) wb.classList.add('hidden');
  });
  if (authForgot) authForgot.addEventListener('click', (e) => { e.preventDefault(); showToast('Passwort zurücksetzen: Bitte Admin kontaktieren oder E-Mail-Funktion einrichten.'); });

  document.querySelectorAll('.auth-social-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = icon.getAttribute('title') || icon.getAttribute('aria-label') || 'Social Login';
      showToast('Anmeldung mit ' + provider + ' ist derzeit nicht eingerichtet. Bitte E-Mail und Passwort verwenden.');
    });
  });

  function doLogin(form) {
    if (!form) return;
    try {
      if (typeof auth === 'undefined') { throw new Error('App nicht geladen. Bitte Seite neu laden (F5).'); }
      var fd = new FormData(form);
      var email = (fd.get('email') || '').toString().trim();
      var password = (fd.get('password') || '').toString();
      var errEl = document.getElementById('login-error');
      if (errEl) errEl.textContent = '';
      if (!email || !password) {
        if (errEl) errEl.textContent = 'Bitte E-Mail und Passwort eingeben.';
        return;
      }
      var btn = form.querySelector('button[type="button"], button.btn-auth');
      var origLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Wird angemeldet…'; }
      auth.login(email, password).then(function(data) {
        if (data && data.user) currentUser = data.user;
        // Vollständiger Reload, damit das Session-Cookie sicher mitgeschickt wird
        window.location.replace(window.location.pathname || '/');
        return;
      }).catch(function(err) {
        var msg = (err && err.data && err.data.error) ? err.data.error : (err && err.message) ? err.message : '';
        var isNetwork = !msg || err.status === 0 || (err.message && err.message.indexOf('fetch') !== -1);
        if (errEl) errEl.textContent = msg || (isNetwork ? 'Server nicht erreichbar. Bitte unter http://localhost:3001 öffnen und Server starten (npm start).' : 'Anmeldung fehlgeschlagen.');
      }).finally(function() {
        if (btn) { btn.disabled = false; btn.textContent = origLabel || 'LOG IN'; }
      });
    } catch (e) {
      var errEl = document.getElementById('login-error');
      if (errEl) errEl.textContent = e && e.message ? e.message : 'Fehler beim Anmelden.';
    }
  }

  function doRegister(form) {
    if (!form) return;
    var errEl = document.getElementById('register-error');
    try {
      if (typeof auth === 'undefined') { throw new Error('App nicht geladen. Bitte Seite neu laden (F5).'); }
      var fd = new FormData(form);
      var email = (fd.get('email') || '').toString().trim();
      var password = fd.get('password');
      if (errEl) errEl.textContent = '';
      if (!email || !password) {
        if (errEl) errEl.textContent = 'Bitte E-Mail und Passwort eingeben.';
        return;
      }
      var btn = form.querySelector('button[type="button"], button[type="submit"], button.btn-auth');
      var origLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Wird registriert…'; }
      auth.register({
        email: email,
        password: password,
        firstName: fd.get('firstName') || undefined,
        lastName: fd.get('lastName') || undefined
      }).then(function() {
        return auth.login(email, password);
      }).then(function() {
        if (errEl) errEl.textContent = '';
        window.location.replace(window.location.pathname || '/');
        return;
      }).catch(function(err) {
        var msg = (err && err.data && err.data.error) ? err.data.error : (err && err.message) ? err.message : 'Registrierung fehlgeschlagen';
        if (errEl) errEl.textContent = msg;
        showToast(msg, 'error');
      }).finally(function() {
        if (btn) { btn.disabled = false; btn.textContent = origLabel || 'REGISTRIEREN'; }
      });
    } catch (e) {
      if (errEl) errEl.textContent = e && e.message ? e.message : 'Fehler bei der Registrierung.';
    }
  }

  // Login: Formular-POST durchlassen (kein JS) → Server setzt Session und redirectet zu /
  // Register: per JS (fetch), danach Redirect
  var authPage = document.getElementById('auth-page');
  if (authPage) {
    authPage.addEventListener('submit', function(e) {
      var form = e.target;
      if (!form || !form.id) return;
      if (form.id === 'login-form') return; // nicht abfangen → normales POST zu /api/auth/login
      if (form.id === 'register-form') {
        e.preventDefault();
        doRegister(form);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

window.addEventListener('hashchange', route);
// Abmelden: direkt auf document (Bubble), damit es nicht von anderem Script blockiert wird
document.body.addEventListener('click', function doLogout(e) {
  if (!e.target.closest('#logout-btn')) return;
  e.preventDefault();
  e.stopPropagation();
  auth.logout().then(function() { window.location.href = '/'; }).catch(function() { window.location.href = '/'; });
}, false);
// Nav, Theme, Profil (Benutzername) per Klick-Delegation
const mainApp = $('#main-app');
if (mainApp) {
  mainApp.addEventListener('click', function(e) {
    const link = e.target.closest('a.nav-link[href^="#"]');
    if (link) {
      e.preventDefault();
      const hash = (link.getAttribute('href') || '#dashboard').slice(1);
      location.hash = hash;
      route();
      return;
    }
    if (e.target.closest('#theme-toggle')) {
      e.preventDefault();
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(cur === 'light' ? 'dark' : 'light');
      return;
    }
    if (e.target.closest('#header-user')) {
      e.preventDefault();
      openProfileModal();
      return;
    }
  });
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    const icon = $('#theme-icon'); if (icon) icon.textContent = '🌙';
  } else {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
    const icon = $('#theme-icon'); if (icon) icon.textContent = '☀️';
  }
}
function initThemeIcon() {
  const icon = $('#theme-icon');
  if (!icon) return;
  const theme = document.documentElement.getAttribute('data-theme');
  icon.textContent = theme === 'light' ? '🌙' : '☀️';
}
$('#theme-toggle')?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});
initThemeIcon();

async function loadDashboard() {
  const box = $('#stats-box');
  const next = $('#next-shifts');
  const vacationEl = $('#vacation-balance');
  const todayEl = $('#today-shifts');
  if (!box) return;
  try {
    const [stats, my, balance, todayList] = await Promise.all([
      dashboard.stats(),
      shifts.my(),
      dashboard.vacationBalance().catch(() => null),
      dashboard.today().catch(() => [])
    ]);
    const s = stats && typeof stats === 'object' ? stats : { totalHours: 0, year: new Date().getFullYear(), shiftCount: 0 };
    box.innerHTML = `<div class="dashboard-kpi-row"><div class="kpi-card kpi-primary"><span class="kpi-icon">⏱</span><p class="kpi-value">${s.totalHours}</p><p class="kpi-label">Stunden (${s.year})</p></div><div class="kpi-card kpi-info"><span class="kpi-icon">📅</span><p class="kpi-value">${s.shiftCount}</p><p class="kpi-label">Schichten</p></div></div>`;
    const nextEmpty = '<div class="empty-state empty-state--compact"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">📅</p><p class="empty-state-title">Keine anstehenden Schichten</p><p class="empty-state-desc">Sobald dir Schichten zugewiesen werden, erscheinen sie hier.</p></div></div>';
    next.innerHTML = (my && Array.isArray(my) && my.length) ? my.slice(0, 8).map(s => `<div class="list-item">${s.shift_date} ${s.start_time}–${s.end_time} ${s.title || ''} (${s.department_name})</div>`).join('') : nextEmpty;
    if (vacationEl) {
      vacationEl.innerHTML = balance
        ? `<p class="vacation-remaining"><strong>${balance.daysRemaining}</strong> Tage Resturlaub (${balance.year})</p><p class="muted small">${balance.daysUsed} von ${balance.daysTotal} genutzt</p>`
        : '<div class="empty-state empty-state--compact"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">🏖</p><p class="empty-state-title">Noch kein Urlaubskontingent hinterlegt</p><p class="empty-state-desc">Dein Resturlaub wird hier angezeigt, sobald er erfasst wurde.</p></div></div>';
    }
    if (todayEl) {
      const byPerson = {};
      (todayList || []).forEach(t => {
        const key = t.userName;
        if (!byPerson[key]) byPerson[key] = [];
        byPerson[key].push(t);
      });
      const lines = Object.entries(byPerson).map(([name, arr]) => {
        const slots = arr.map(a => `${a.startTime}–${a.endTime} ${a.departmentName}`).join(' · ');
        return `<div class="list-item">${name}: ${slots}</div>`;
      });
      const todayEmpty = '<div class="empty-state empty-state--compact"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">👥</p><p class="empty-state-title">Heute keine Schichten eingetragen</p><p class="empty-state-desc">Sobald Schichten für heute geplant sind, erscheinen sie hier.</p></div></div>';
      todayEl.innerHTML = lines.length ? lines.join('') : todayEmpty;
    }
  } catch (e) {
    const msg = (e.data?.error || e.message || 'Verbindung fehlgeschlagen') + '';
    const tip = ' Öffnen Sie die App unter <a href="http://localhost:3001" target="_blank" rel="noopener">http://localhost:3001</a> und starten Sie den Server im Projektordner mit <code>npm start</code>.';
    box.innerHTML = '<p class="error-msg"><strong>Keine Verbindung zum Server.</strong><br>' + msg + '</p><p class="muted small">' + tip + '</p>';
    next.innerHTML = '<div class="empty-state empty-state--compact"><div class="empty-state-card"><p class="empty-state-icon">⚠️</p><p class="empty-state-title">Daten konnten nicht geladen werden</p><p class="empty-state-desc">Bitte die Verbindung prüfen und die Seite neu laden.</p></div></div>';
    if (vacationEl) vacationEl.innerHTML = '<p class="muted">—</p>';
    if (todayEl) todayEl.innerHTML = '<div class="empty-state empty-state--compact"><div class="empty-state-card"><p class="empty-state-icon">⚠️</p><p class="empty-state-title">Daten konnten nicht geladen werden</p></div></div>';
  }
}

let calYear, calMonth;
let calViewMode = 'month';
let calWeekStart = null;
let calendarEventsByDate = {};
let calendarEventById = {};
let calendarUndo = null;
const todayStr = () => new Date().toISOString().slice(0, 10);

function getMonday(d) {
  const d2 = new Date(d);
  const day = d2.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d2.setDate(d2.getDate() + diff);
  return d2;
}

function dayStatus(dateStr, evs) {
  if (!evs || evs.length === 0) return 'free';
  if (dateStr < todayStr()) return 'past';
  if (dateStr === todayStr()) return 'today';
  return 'upcoming';
}

function timeToMinutes(t) {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

async function openDayModal(dateStr) {
  const evs = calendarEventsByDate[dateStr] || [];
  const d = new Date(dateStr + 'T12:00:00');
  const dateLabel = d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  let timeStatus = { checkedIn: false };
  try { timeStatus = await time.status(); } catch (_) {}

  let body = '<h3>Schichten am ' + dateLabel + '</h3>';
  if (evs.length === 0) {
    body += '<p class="muted">Keine Schichten an diesem Tag.</p>';
  } else {
    body += '<div class="day-shifts-list">';
    evs.forEach(ev => {
      const names = (ev.assignedUsers || []).map(u => (u.firstName || '') + ' ' + (u.lastName || '')).filter(Boolean).join(', ') || '—';
      const understaff = ev.assignmentCount < ev.requiredCount;
      const isMyShift = (ev.assignedUsers || []).some(u => u.id === currentUser?.id);
      const isCheckedInHere = timeStatus.checkedIn && timeStatus.shiftId === ev.id;
      const checkInTime = (isCheckedInHere && timeStatus.checkInAt) ? timeStatus.checkInAt.slice(11, 16) : '';

      body += '<div class="day-shift-item" data-shift-id="' + ev.id + '">';
      body += '<div class="day-shift-main"><span class="day-shift-time">🕒 ' + ev.startTime + '–' + ev.endTime + '</span>';
      body += '<span class="day-shift-dept">📍 ' + (ev.departmentName || '') + '</span>';
      if (currentUser?.role === 'admin') body += '<span class="day-shift-users">👤 ' + names + (understaff ? ' <strong class="text-warn">(Unterbesetzt)</strong>' : '') + '</span>';
      else body += '<span class="day-shift-users">👤 ' + names + '</span>';
      if (isCheckedInHere && checkInTime) body += '<span class="day-shift-time-status">Eingecheckt seit ' + checkInTime + '</span>';
      body += '</div>';
      if (currentUser?.role === 'admin') {
        body += '<button type="button" class="btn btn-sm btn-primary day-shift-edit">Bearbeiten</button>';
      } else if (isMyShift) {
        if (isCheckedInHere) body += '<button type="button" class="btn btn-sm btn-ghost day-shift-checkout">Check-Out</button>';
        else if (!timeStatus.checkedIn) body += '<button type="button" class="btn btn-sm btn-primary day-shift-checkin">Check-In</button>';
        body += '<button type="button" class="btn btn-sm btn-primary day-shift-swap">Tauschen</button>';
      }
      body += '</div>';
    });
    body += '</div>';
  }
  $('#modal-body').innerHTML = body;
  $('#modal').classList.remove('hidden');
  $('#modal-body').querySelectorAll('.day-shift-edit').forEach(btn => {
    btn.addEventListener('click', () => { $('#modal').classList.add('hidden'); location.hash = 'schichten'; loadShiftsAdmin(); });
  });
  $('#modal-body').querySelectorAll('.day-shift-checkin').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.closest('.day-shift-item').dataset.shiftId, 10);
      try {
        await time.checkIn(id);
        showToast('Check-In erfolgreich.', 'success');
        openDayModal(dateStr);
      } catch (e) { showToast(e.data?.error || e.message || 'Schicht nicht gefunden / nicht zugewiesen.'); }
    });
  });
  $('#modal-body').querySelectorAll('.day-shift-checkout').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.closest('.day-shift-item').dataset.shiftId, 10);
      try {
        const r = await time.checkOut(id);
        showToast('Check-Out. Dauer: ' + (r.durationMinutes || 0) + ' Min.', 'success');
        openDayModal(dateStr);
      } catch (e) { showToast(e.data?.error || e.message || 'Kein offener Check-In.'); }
    });
  });
  $('#modal-body').querySelectorAll('.day-shift-swap').forEach(btn => {
    btn.addEventListener('click', () => { const id = parseInt(btn.closest('.day-shift-item').dataset.shiftId, 10); $('#modal').classList.add('hidden'); location.hash = 'schichttausch'; loadShiftSwap(); if (id) shiftSwap.createOffer(id).then(() => loadShiftSwap()).catch(e => showToast(e.data?.error || e.message)); });
  });
}

const CAL_HOUR_START = 6;
const CAL_HOUR_END = 22;
const CAL_DAY_MINUTES = (CAL_HOUR_END - CAL_HOUR_START) * 60;

function renderMonthGrid(events, first, last, deptSel) {
  const startPad = first.getDay();
  const days = last.getDate();
  let html = '';
  ['So','Mo','Di','Mi','Do','Fr','Sa'].forEach(d => html += `<div class="cal-day cal-day-head" style="background:var(--input);text-align:center;font-weight:600">${d}</div>`);
  for (let i = 0; i < startPad; i++) html += '<div class="cal-day cal-day-empty"></div>';
  for (let d = 1; d <= days; d++) {
    const dateStr = first.getFullYear() + '-' + String(first.getMonth() + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const evs = events.filter(e => e.date === dateStr);
    const status = dayStatus(dateStr, evs);
    const isToday = dateStr === todayStr();
    html += '<div class="cal-day cal-day-cell cal-day--' + status + (isToday ? ' cal-day--today-cell' : '') + '" data-date="' + dateStr + '" role="button" tabindex="0">';
    html += '<div class="day-num">' + d + '</div>';
    evs.forEach(ev => {
      const evStatus = ev.date < todayStr() ? 'past' : ev.date === todayStr() ? 'today' : 'upcoming';
      const names = currentUser?.role === 'admin' && (ev.assignedUsers || []).length ? (ev.assignedUsers.map(u => (u.firstName || '') + ' ' + (u.lastName || '')).filter(Boolean).join(', ')) : '';
      const understaff = ev.assignmentCount < ev.requiredCount;
      html += '<div class="cal-event cal-event--' + evStatus + (understaff ? ' cal-event--understaff' : '') + '" title="' + (ev.startTime + '–' + ev.endTime + ' ' + (ev.departmentName || '') + (names ? ' · ' + names : '') + (understaff ? ' · Unterbesetzt' : '')) + '">';
      html += '🕒 ' + ev.startTime + '–' + ev.endTime + '<br><span class="cal-event-dept">📍 ' + (ev.departmentName || '') + '</span>';
      if (names) html += '<br><span class="cal-event-users">👤 ' + names + '</span>';
      if (understaff) html += ' <span class="cal-event-warn">⚠</span>';
      html += '</div>';
    });
    html += '</div>';
  }
  return html;
}

function renderWeekGrid(eventsByDate, weekStart) {
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const baseMinutes = CAL_HOUR_START * 60;
  const canDrag = currentUser?.role === 'admin';
  let html = '<div class="cal-week-grid">';
  html += '<div class="cal-week-time-col"><div class="cal-week-time-head"></div>';
  for (let h = CAL_HOUR_START; h < CAL_HOUR_END; h++) {
    html += '<div class="cal-week-time-slot">' + String(h).padStart(2, '0') + ':00</div>';
  }
  html += '</div>';
  for (let d = 0; d < 7; d++) {
    const dDate = new Date(weekStart);
    dDate.setDate(weekStart.getDate() + d);
    const dateStr = dDate.toISOString().slice(0, 10);
    const evs = eventsByDate[dateStr] || [];
    const isToday = dateStr === todayStr();
    html += '<div class="cal-week-day-col' + (isToday ? ' cal-week-day--today' : '') + '" data-date="' + dateStr + '" role="button" tabindex="0">';
    html += '<div class="cal-week-day-head">' + dayNames[d] + ' ' + dDate.getDate() + '.</div>';
    html += '<div class="cal-week-day-body" data-date="' + dateStr + '">';
    evs.forEach(ev => {
      const startMin = timeToMinutes(ev.startTime) - baseMinutes;
      const endMin = timeToMinutes(ev.endTime) - baseMinutes;
      const top = Math.max(0, (startMin / CAL_DAY_MINUTES) * 100);
      const h = Math.min(100 - top, ((endMin - startMin) / CAL_DAY_MINUTES) * 100);
      const evStatus = ev.date < todayStr() ? 'past' : ev.date === todayStr() ? 'today' : 'upcoming';
      const understaff = ev.assignmentCount < ev.requiredCount;
      const names = currentUser?.role === 'admin' && (ev.assignedUsers || []).length ? (ev.assignedUsers.map(u => (u.firstName || '') + ' ' + (u.lastName || '')).filter(Boolean).join(', ')) : '';
      const dragAttr = canDrag ? ' draggable="true"' : '';
      html += '<div class="cal-week-bar cal-event--' + evStatus + (understaff ? ' cal-event--understaff' : '') + '" style="top:' + top + '%;height:' + h + '%" data-shift-id="' + ev.id + '" data-date="' + dateStr + '"' + dragAttr + ' title="' + (ev.startTime + '–' + ev.endTime + ' ' + (ev.departmentName || '') + (names ? ' · ' + names : '') + (understaff ? ' · Unterbesetzt' : '') + (canDrag ? ' — Ziehen zum Verschieben' : '')) + '">';
      html += '<span class="cal-week-bar-time">' + ev.startTime + '–' + ev.endTime + '</span>';
      html += '<span class="cal-week-bar-dept">' + (ev.departmentName || '') + '</span>';
      html += '</div>';
    });
    html += '</div></div>';
  }
  html += '</div>';
  return html;
}

async function loadCalendar() {
  const now = new Date();
  calYear = calYear ?? now.getFullYear();
  calMonth = calMonth ?? now.getMonth();
  if (calViewMode === 'week' && !calWeekStart) calWeekStart = getMonday(now);

  const isWeek = calViewMode === 'week';
  let start, end, titleStr;
  if (isWeek) {
    const weekEnd = new Date(calWeekStart);
    weekEnd.setDate(calWeekStart.getDate() + 6);
    start = calWeekStart.toISOString().slice(0, 10);
    end = weekEnd.toISOString().slice(0, 10);
    titleStr = 'KW ' + getWeekNumber(calWeekStart) + ' · ' + calWeekStart.getDate() + '. ' + MONTHS[calWeekStart.getMonth()] + ' – ' + weekEnd.getDate() + '. ' + MONTHS[weekEnd.getMonth()] + ' ' + calWeekStart.getFullYear();
  } else {
    const first = new Date(calYear, calMonth, 1);
    const last = new Date(calYear, calMonth + 1, 0);
    start = first.toISOString().slice(0, 10);
    end = last.toISOString().slice(0, 10);
    titleStr = MONTHS[calMonth] + ' ' + calYear;
  }

  $('#cal-title').textContent = titleStr;
  const grid = $('#cal-grid');
  if (grid) grid.innerHTML = '<p class="muted" style="padding:2rem;text-align:center;">Laden …</p>';
  try {
    const depts = await shifts.departments();
    const sel = $('#cal-dept');
    if (sel && sel.options.length <= 1) {
      sel.innerHTML = '<option value="">Alle</option>' + depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
      sel.onchange = () => loadCalendar();
    }
    let events = await shifts.calendar(start, end, $('#cal-dept')?.value || '');
    if (currentUser && currentUser.role !== 'admin') events = events.filter(e => (e.assignedUsers || []).some(u => u.id === currentUser.id));
    calendarEventsByDate = {};
    calendarEventById = {};
    events.forEach(e => {
      if (!calendarEventsByDate[e.date]) calendarEventsByDate[e.date] = [];
      calendarEventsByDate[e.date].push(e);
      calendarEventById[e.id] = e;
    });

    if (!grid) return;
    if (isWeek) {
      grid.innerHTML = renderWeekGrid(calendarEventsByDate, calWeekStart);
      grid.classList.add('cal-grid--week');
      grid.querySelectorAll('.cal-week-day-col').forEach(col => {
        const dateStr = col.dataset.date;
        col.addEventListener('click', (e) => { if (e.target.closest('.cal-week-bar')) return; if (calDragHappened) return; openDayModal(dateStr); });
        col.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDayModal(dateStr); } });
      });
      grid.querySelectorAll('.cal-week-bar').forEach(bar => {
        bar.addEventListener('click', (e) => { e.stopPropagation(); if (calDragHappened) return; openDayModal(bar.dataset.date); });
      });
      if (currentUser?.role === 'admin') setupCalendarDragDrop(grid);
      updateCalendarUndoButton();
      if (events.length === 0) {
        const hint = document.createElement('p');
        hint.className = 'muted cal-empty-hint';
        hint.style.cssText = 'text-align:center;padding:1rem;';
        hint.textContent = 'Keine Schichten in dieser Woche.';
        grid.appendChild(hint);
      }
    } else {
      grid.classList.remove('cal-grid--week');
      const first = new Date(calYear, calMonth, 1);
      const last = new Date(calYear, calMonth + 1, 0);
      grid.innerHTML = renderMonthGrid(events, first, last, sel);
      grid.querySelectorAll('.cal-day-cell').forEach(cell => {
        cell.addEventListener('click', () => openDayModal(cell.dataset.date));
        cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDayModal(cell.dataset.date); } });
      });
      updateCalendarUndoButton();
      if (events.length === 0) {
        const hint = document.createElement('p');
        hint.className = 'muted cal-empty-hint';
        hint.style.cssText = 'text-align:center;padding:1rem;margin-top:0.5rem;';
        hint.textContent = 'Keine Schichten in diesem Zeitraum.';
        grid.appendChild(hint);
      }
    }
  } catch (e) {
    const calGrid = $('#cal-grid');
    if (calGrid) {
      const msg = (e.data?.error || e.message || 'Verbindung fehlgeschlagen') + '';
      calGrid.innerHTML = '<div class="card" style="padding:1.5rem;text-align:center;"><p class="error-msg"><strong>Kalender konnte nicht geladen werden.</strong></p><p class="muted small">' + (msg.indexOf('fetch') !== -1 || msg.indexOf('Failed') !== -1 ? 'Server nicht erreichbar – bitte Backend mit <code>npm start</code> starten und <strong>http://localhost:3001</strong> öffnen.' : msg) + '</p><button type="button" class="btn btn-primary" id="cal-reload-btn">Neu laden</button></div>';
      $('#cal-reload-btn')?.addEventListener('click', () => loadCalendar());
    }
  }
}

function getWeekNumber(d) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const day = Math.ceil((d - oneJan) / 86400000);
  return Math.ceil((day + oneJan.getDay() + 1) / 7);
}

let calDragHappened = false;

function updateCalendarUndoButton() {
  const btn = $('#cal-undo');
  if (!btn) return;
  if (calendarUndo) {
    btn.classList.remove('hidden');
    btn.onclick = async () => {
      if (!calendarUndo) return;
      const u = calendarUndo;
      calendarUndo = null;
      updateCalendarUndoButton();
      try {
        await shifts.update(u.shiftId, { shiftDate: u.shiftDate, startTime: u.startTime, endTime: u.endTime, departmentId: u.departmentId, requiredCount: u.requiredCount, title: u.title });
        showToast('Rückgängig gemacht.', 'success');
        loadCalendar();
      } catch (e) { showToast(e.data?.error || e.message); calendarUndo = u; updateCalendarUndoButton(); }
    };
  } else {
    btn.classList.add('hidden');
    btn.onclick = null;
  }
}

function setupCalendarDragDrop(grid) {
  const dayBodies = grid.querySelectorAll('.cal-week-day-body');
  grid.querySelectorAll('.cal-week-bar[draggable="true"]').forEach(bar => {
    bar.addEventListener('dragstart', (e) => {
      calDragHappened = true;
      e.dataTransfer.setData('text/plain', bar.dataset.shiftId);
      e.dataTransfer.effectAllowed = 'move';
      bar.classList.add('cal-week-bar--dragging');
      setTimeout(() => bar.classList.remove('cal-week-bar--dragging'), 0);
    });
    bar.addEventListener('dragend', (e) => {
      calDragHappened = false;
      dayBodies.forEach(b => b.classList.remove('cal-week-day-body--drop', 'cal-week-day-body--drop-invalid'));
    });
  });
  dayBodies.forEach(body => {
    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      body.classList.add('cal-week-day-body--drop');
    });
    body.addEventListener('dragleave', (e) => {
      if (!body.contains(e.relatedTarget)) body.classList.remove('cal-week-day-body--drop', 'cal-week-day-body--drop-invalid');
    });
    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      body.classList.remove('cal-week-day-body--drop');
      const shiftId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const newDate = body.dataset.date;
      const ev = calendarEventById[shiftId];
      if (!ev || !newDate) return;
      if (ev.date === newDate) return;
      const payload = { shiftDate: newDate, startTime: ev.startTime, endTime: ev.endTime, departmentId: ev.departmentId, requiredCount: ev.requiredCount, title: ev.title ?? '' };
      const undo = { shiftId, shiftDate: ev.date, startTime: ev.startTime, endTime: ev.endTime, departmentId: ev.departmentId, requiredCount: ev.requiredCount, title: ev.title ?? '' };
      try {
        await shifts.update(shiftId, payload);
        calendarUndo = undo;
        updateCalendarUndoButton();
        showToast('Schicht verschoben.', 'success');
        loadCalendar();
      } catch (err) {
        body.classList.add('cal-week-day-body--drop-invalid');
        setTimeout(() => body.classList.remove('cal-week-day-body--drop-invalid'), 2000);
        showToast(err.data?.error || err.message || 'Verschieben fehlgeschlagen.');
      }
    });
  });
}

$('#cal-view-month')?.addEventListener('click', () => { calViewMode = 'month'; $('#cal-view-month')?.classList.add('active'); $('#cal-view-week')?.classList.remove('active'); loadCalendar(); });
$('#cal-view-week')?.addEventListener('click', () => { calViewMode = 'week'; calWeekStart = getMonday(new Date()); $('#cal-view-week')?.classList.add('active'); $('#cal-view-month')?.classList.remove('active'); loadCalendar(); });
$('#cal-prev')?.addEventListener('click', () => {
  if (calViewMode === 'week') { calWeekStart = new Date(calWeekStart); calWeekStart.setDate(calWeekStart.getDate() - 7); } else { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } }
  loadCalendar();
});
$('#cal-next')?.addEventListener('click', () => {
  if (calViewMode === 'week') { calWeekStart = new Date(calWeekStart); calWeekStart.setDate(calWeekStart.getDate() + 7); } else { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } }
  loadCalendar();
});
$('#cal-today')?.addEventListener('click', () => {
  const n = new Date();
  if (calViewMode === 'week') { calWeekStart = getMonday(n); } else { calYear = n.getFullYear(); calMonth = n.getMonth(); }
  loadCalendar();
});

function myShiftsEmptyHtml() {
  const isAdmin = currentUser?.role === 'admin';
  const action = isAdmin
    ? '<a href="#schichten" class="btn btn-primary">Schichten verwalten</a>'
    : '<p class="my-shifts-empty-hint">Bei Fragen wende dich an deinen Teamleiter.</p>';
  return '<div class="empty-state empty-state--my-shifts"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">📅</p><p class="empty-state-title">Dir sind aktuell keine Schichten zugewiesen.</p><p class="empty-state-desc">Sobald du einer Schicht zugeteilt wirst, erscheint sie hier.</p>' + action + '</div></div>';
}
async function loadMyShifts() {
  const el = $('#my-shifts-list');
  if (!el) return;
  try {
    const [list, myOffers] = await Promise.all([shifts.my(), shiftSwap.myOffers()]);
    const offeredIds = new Set((myOffers || []).filter(o => o.status === 'offen').map(o => o.shift_id));
    el.innerHTML = list.length ? list.map(s => {
      const offer = (myOffers || []).find(o => o.shift_id === s.id && o.status === 'offen');
      const offered = !!offer;
      return `<div class="list-item flex-between"><span>${s.shift_date} ${s.start_time}–${s.end_time} ${s.title || ''} (${s.department_name})</span><button type="button" class="btn btn-ghost btn-sm" data-shift-id="${s.id}" data-offer-id="${offer ? offer.id : ''}">${offered ? 'Angebot zurückziehen' : 'Tausch anbieten'}</button></div>`;
    }).join('') : myShiftsEmptyHtml();
    el.querySelectorAll('[data-shift-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const shiftId = parseInt(btn.dataset.shiftId, 10);
        const offerId = btn.dataset.offerId;
        try {
          if (offerId) {
            await shiftSwap.deleteOffer(parseInt(offerId, 10));
          } else {
            await shiftSwap.createOffer(shiftId);
          }
          loadMyShifts();
        } catch (err) { alert(err.data?.error || err.message); }
      });
    });
  } catch (e) {
    const msg = (e.data?.error || e.message) || 'Verbindung fehlgeschlagen';
    el.innerHTML = '<p class="error-msg">' + (msg + '').replace(/</g, '&lt;') + '</p><button type="button" class="btn btn-primary" id="my-shifts-reload">Neu laden</button>';
    $('#my-shifts-reload')?.addEventListener('click', () => loadMyShifts());
  }
}

let chatConvId = null, chatConvTitle = '';
let chatFilter = 'alle';
let chatConversationsList = [];

function formatChatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const today = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (today) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function renderChatList() {
  const convEl = $('#chat-conversations');
  if (!convEl) return;
  let list = chatConversationsList;
  if (chatFilter === 'posteingang') list = list.filter(c => (c.unreadCount || 0) > 0);
  if (chatFilter === 'team') list = list.filter(c => c.type === 'team');
  if (chatFilter === 'gesendet') list = list.filter(c => c.lastSenderId === currentUser?.id);
  const title = (c) => (c.title || 'Chat').replace(/</g, '&lt;');
  const snippet = (c) => (c.lastBody || c.lastMessageSnippet || '').replace(/</g, '&lt;').slice(0, 45) + ((c.lastBody || c.lastMessageSnippet || '').length > 45 ? '…' : '');
  const emptyConvHtml = '<div class="chat-conv-empty"><p class="chat-conv-empty-icon">💬</p><p class="chat-conv-empty-title">' + (chatFilter !== 'alle' ? 'Keine passenden Konversationen' : 'Keine Nachrichten vorhanden') + '</p><p class="chat-conv-empty-desc">' + (chatFilter === 'alle' ? 'Klicke oben auf <strong>Neue Nachricht</strong>, um zu starten.' : 'Wechsle den Filter oder starte eine neue Konversation.') + '</p></div>';
  convEl.innerHTML = list.length ? list.map(c => `<div class="chat-conv-item ${chatConvId === c.id ? 'active' : ''}" data-id="${c.id}" data-title="${(c.title || '').replace(/"/g, '&quot;')}"><div class="chat-conv-row"><span class="chat-conv-title">${title(c)}</span>${(c.unreadCount || 0) > 0 ? '<span class="chat-unread-badge">' + c.unreadCount + '</span>' : ''}</div><div class="chat-conv-snippet">${snippet(c) || '—'}</div><div class="chat-conv-date">${formatChatDate(c.lastAt || c.lastMessageAt)}</div></div>`).join('') : emptyConvHtml;
  convEl.querySelectorAll('.chat-conv-item').forEach(el => {
    el.addEventListener('click', () => openChatConversation(parseInt(el.dataset.id, 10)));
  });
}

async function loadChat() {
  const convEl = $('#chat-conversations');
  const empty = $('#chat-empty');
  const thread = $('#chat-thread');
  if (!convEl) return;
  try {
    chatConversationsList = await messages.conversations();
    renderChatList();
    if (!chatConvId) { empty.classList.remove('hidden'); thread.classList.add('hidden'); }
    else { empty.classList.add('hidden'); thread.classList.remove('hidden'); $('#chat-header').textContent = chatConvTitle; $('#chat-conv-id').value = chatConvId; loadChatMessages(); }
  } catch (e) {
    convEl.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message || 'Fehler beim Laden.') + '</p><p class="muted">Keine Nachrichten vorhanden. Klicke oben auf <strong>Neue Nachricht</strong>.</p>';
    showToast('Fehler: ' + (e.data?.error || e.message || 'Nachrichten konnten nicht geladen werden.'));
    if (!chatConvId) { empty.classList.remove('hidden'); thread.classList.add('hidden'); }
  }
}

document.querySelectorAll('.chat-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chat-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chatFilter = btn.dataset.filter || 'alle';
    renderChatList();
  });
});

async function openChatConversation(convId) {
  const empty = $('#chat-empty');
  const thread = $('#chat-thread');
  chatConvId = convId;
  $('#chat-conv-id').value = convId;
  empty.classList.add('hidden');
  thread.classList.remove('hidden');
  try {
    const info = await messages.getConversationInfo(convId);
    chatConvTitle = info.title || 'Chat';
    $('#chat-header').textContent = chatConvTitle;
  } catch (_) { chatConvTitle = 'Chat'; $('#chat-header').textContent = chatConvTitle; }
  $('#chat-body').value = '';
  loadChatMessages();
  renderChatList();
}

async function loadChatMessages() {
  const el = $('#chat-messages');
  if (!el || !chatConvId) return;
  try {
    const list = await messages.getConversation(chatConvId, { limit: 50 });
    const bodyHtml = (m) => {
      const subj = (m.subject || '').trim();
      const body = (m.body || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
      return subj ? '<div class="chat-msg-subject">' + subj.replace(/</g, '&lt;') + '</div>' + body : body;
    };
    el.innerHTML = list.length ? list.map(m => `<div class="chat-msg ${m.fromMe ? 'me' : 'them'}"><div class="chat-msg-meta">${m.fromMe ? 'Du' : (m.senderName || 'Nutzer')} · ${(m.createdAt || '').slice(0, 16)}</div>${bodyHtml(m)}</div>`).join('') : '<p class="muted">Noch keine Nachrichten.</p>';
    el.scrollTop = el.scrollHeight;
    const lastId = list.length ? list[list.length - 1].id : 0;
    if (lastId) {
      await messages.markRead(chatConvId, lastId);
      const conv = chatConversationsList.find(c => c.id === chatConvId);
      if (conv) conv.unreadCount = 0;
    }
    renderChatList();
  } catch (e) {
    el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message || 'Fehler beim Laden.') + '</p>';
    showToast(e.data?.error || e.message);
  }
}

$('#chat-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const convId = parseInt($('#chat-conv-id').value, 10);
  const body = $('#chat-body').value?.trim();
  if (!convId || !body) return;
  try {
    await messages.sendMessage(convId, body);
    $('#chat-body').value = '';
    loadChatMessages();
    showToast('Nachricht gesendet.', 'success');
  } catch (err) { showToast('Fehler: ' + (err.data?.error || err.message)); }
});

$('#chat-new-btn')?.addEventListener('click', async () => {
  const teamList = await team.list().catch(() => []);
  const others = teamList.filter(u => u.id !== currentUser?.id);
  const teamOpt = '<option value="team">Alle (Team)</option>';
  const userOpts = others.map(u => `<option value="${u.id}">${[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}${u.departmentName ? ' – ' + u.departmentName : ''}</option>`).join('');
  $('#modal-body').innerHTML = '<form id="compose-form"><h3>Neue Nachricht</h3><div class="input-wrap"><label>An *</label><select name="to" required><option value="">— Empfänger wählen —</option>' + teamOpt + userOpts + '</select></div><div class="input-wrap"><label>Betreff (optional)</label><input type="text" name="betreff" placeholder="Betreff"></div><div class="input-wrap"><label>Nachricht *</label><textarea name="body" rows="4" required placeholder="Nachricht eingeben…"></textarea></div><p id="compose-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Senden</button></form>';
  $('#modal').classList.remove('hidden');
  $('#compose-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const to = fd.get('to');
    const betreff = (fd.get('betreff') || '').trim();
    const body = (fd.get('body') || '').trim();
    $('#compose-error').textContent = '';
    if (!body) { $('#compose-error').textContent = 'Nachricht eingeben.'; return; }
    try {
      let convId;
      if (to === 'team') {
        const allIds = teamList.map(u => u.id).filter(Boolean);
        const r = await messages.createConversation({ type: 'team', title: 'Team', userIds: allIds });
        convId = r.id;
      } else {
        const r = await messages.createConversation({ type: 'dm', userIds: [parseInt(to, 10)] });
        convId = r.id;
      }
      await messages.sendMessage(convId, body, betreff || undefined);
      $('#modal').classList.add('hidden');
      openChatConversation(convId);
      loadChat();
      showToast('Nachricht gesendet.', 'success');
    } catch (err) { $('#compose-error').textContent = err.data?.error || err.message; showToast('Fehler: ' + (err.data?.error || err.message)); }
  });
});

$('#chat-read-all-btn')?.addEventListener('click', async () => {
  try { await messages.readAll(); loadChat(); showToast('Alle als gelesen markiert.', 'success'); } catch (e) { showToast(e.data?.error || e.message); }
});
$('#chat-thread-read-all')?.addEventListener('click', async () => {
  if (!chatConvId) return;
  try {
    const list = await messages.getConversation(chatConvId, { limit: 50 });
    const lastId = list.length ? list[list.length - 1].id : 0;
    if (lastId) await messages.markRead(chatConvId, lastId);
    loadChat();
    showToast('Als gelesen markiert.', 'success');
  } catch (_) {}
});

$('#chat-body')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-form')?.requestSubmit(); }
});

async function loadZeiterfassung() {
  const listEl = $('#time-list');
  const summaryEl = $('#time-summary');
  const fromEl = $('#time-from');
  const toEl = $('#time-to');
  const userWrap = $('#time-user-wrap');
  const userSelect = $('#time-user');
  const exportBtn = $('#time-export-csv');
  if (!listEl) return;

  const setDefaultRange = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (fromEl && !fromEl.value) fromEl.value = first.toISOString().slice(0, 10);
    if (toEl && !toEl.value) toEl.value = last.toISOString().slice(0, 10);
  };
  setDefaultRange();

  const isAdmin = currentUser?.role === 'admin';
  if (userWrap) userWrap.classList.toggle('hidden', !isAdmin);
  if (exportBtn) exportBtn.classList.toggle('hidden', !isAdmin);

  if (isAdmin && userSelect && !userSelect.options.length) {
    try {
      const users = await users.list();
      userSelect.innerHTML = '<option value="">— Alle —</option>' + users.map(u => `<option value="${u.id}">${[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</option>`).join('');
    } catch (_) {}
  }

  const fetchAndRender = async () => {
    const from = (fromEl && fromEl.value) || new Date().toISOString().slice(0, 10);
    const to = (toEl && toEl.value) || from;
    const userId = (isAdmin && userSelect && userSelect.value) ? parseInt(userSelect.value, 10) : null;
    try {
      const data = isAdmin ? await time.admin(userId, from, to) : await time.me(from, to);
      const { entries, totalMinutes: totalMin } = timeResponseToEntriesAndTotal(data);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (summaryEl) summaryEl.textContent = 'Summe: ' + totalMin + ' Min. (' + hours + ' h ' + mins + ' Min.)';
      if (entries.length === 0) {
        listEl.innerHTML = '<div class="empty-state empty-state--time"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">⏱</p><p class="empty-state-title">Im ausgewählten Zeitraum wurden keine Arbeitszeiten erfasst.</p><p class="empty-state-desc">Sobald Check-ins erfolgen, werden sie hier angezeigt.</p></div></div>';
      } else {
        const date = (e) => e.date || e.shiftDate || e.shift_date || '';
        const dept = (e) => e.department || e.departmentName || e.department_name || '—';
        const emp = (e) => e.employeeName || e.userName || '';
        listEl.innerHTML = '<table class="time-table"><thead><tr><th>Datum</th><th>Schicht</th><th>Abteilung</th>' + (isAdmin && !userId ? '<th>Mitarbeiter</th>' : '') + '<th>Check-In</th><th>Check-Out</th><th>Dauer</th></tr></thead><tbody>' +
          entries.map(e => '<tr><td>' + date(e) + '</td><td>' + (e.startTime || '') + '–' + (e.endTime || '') + '</td><td>' + dept(e) + '</td>' + (isAdmin && !userId ? '<td>' + emp(e) + '</td>' : '') + '<td>' + (e.checkInAt || '').slice(11, 16) + '</td><td>' + (e.checkOutAt ? (e.checkOutAt || '').slice(11, 16) : '—') + '</td><td>' + (e.durationMinutes || 0) + ' Min.</td></tr>').join('') + '</tbody></table>';
      }
      window._timeExportData = { entries, totalMinutes: totalMin };
    } catch (e) {
      listEl.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>';
      if (summaryEl) summaryEl.textContent = '';
      showToast('Fehler: ' + (e.data?.error || e.message));
    }
  };

  if (!window._timeListenersAttached) {
    window._timeListenersAttached = true;
    $('#time-refresh')?.addEventListener('click', () => { if (window._timeRefresh) window._timeRefresh(); });
    userSelect?.addEventListener('change', () => { if (window._timeRefresh) window._timeRefresh(); });
    exportBtn?.addEventListener('click', () => {
      const d = window._timeExportData;
      if (!d || !d.entries || !d.entries.length) { showToast('Keine Daten zum Export.'); return; }
      const headers = ['Datum', 'Schicht', 'Abteilung', 'Mitarbeiter', 'Check-In', 'Check-Out', 'Dauer (Min.)'];
      const date = (e) => e.date || e.shiftDate || e.shift_date || '';
      const dept = (e) => e.department || e.departmentName || e.department_name || '';
      const emp = (e) => e.employeeName || e.userName || '';
      const rows = d.entries.map(e => [
        date(e),
        (e.startTime || '') + '–' + (e.endTime || ''),
        dept(e),
        emp(e),
        (e.checkInAt || '').slice(0, 19),
        (e.checkOutAt || '').slice(0, 19) || '',
        e.durationMinutes || 0
      ]);
      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'zeiterfassung_' + (fromEl?.value || '') + '_bis_' + (toEl?.value || '') + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('CSV exportiert.', 'success');
    });
  }
  window._timeRefresh = fetchAndRender;
  fetchAndRender();
}

const SALARY_NETTO_FACTOR = { 1: 0.62, 2: 0.64, 3: 0.66, 4: 0.62, 5: 0.52, 6: 0.50 };

/** Zeit-API liefert { entries: [], totalMinutes }. Stellt sicher, dass immer ein Array und eine Zahl genutzt werden. */
function timeResponseToEntriesAndTotal(response) {
  const raw = response && Array.isArray(response) ? response : (response && response.entries);
  const entries = Array.isArray(raw) ? raw : [];
  const totalMinutes = (response && typeof response.totalMinutes === 'number') ? response.totalMinutes : entries.reduce((sum, e) => sum + (Number(e && e.durationMinutes) || 0), 0);
  return { entries, totalMinutes };
}

function updateSalaryPreview() {
  const taxEl = $('#salary-tax-class');
  const hourlyEl = $('#salary-hourly');
  const hoursEl = $('#salary-hours-month');
  const resultEl = $('#salary-result');
  const grossEl = $('#salary-gross');
  const netEl = $('#salary-net');
  if (!taxEl || !hourlyEl || !hoursEl || !resultEl || !grossEl || !netEl) return;
  const hourly = parseFloat(hourlyEl.value) || 0;
  const hours = parseFloat(hoursEl.value) || 160;
  const taxClass = Math.min(6, Math.max(1, parseInt(taxEl.value, 10) || 1));
  const gross = hourly * hours;
  const factor = SALARY_NETTO_FACTOR[taxClass] ?? 0.62;
  const net = gross > 0 ? Math.round(gross * factor * 100) / 100 : 0;
  resultEl.style.display = 'block';
  grossEl.textContent = gross > 0 ? gross.toFixed(2) : '—';
  netEl.textContent = net > 0 ? net.toFixed(2) : '—';
}
async function loadFinanzen() {
  const form = $('#salary-form');
  const taxEl = $('#salary-tax-class');
  const hourlyEl = $('#salary-hourly');
  const hoursEl = $('#salary-hours-month');
  if (!form || !taxEl || !hourlyEl || !hoursEl) return;
  try {
    const data = await salary.get();
    taxEl.value = String(data.taxClass || 1);
    hourlyEl.value = data.hourlyRate != null ? data.hourlyRate : '';
    hoursEl.value = data.hoursPerMonth != null ? data.hoursPerMonth : 160;
    updateSalaryPreview();
  } catch (e) {
    updateSalaryPreview();
  }
  initSalaryFormListeners();
}
function initSalaryFormListeners() {
  ['#salary-tax-class', '#salary-hourly', '#salary-hours-month'].forEach(id => {
    const el = $(id);
    if (el && !el.dataset.salaryListener) {
      el.dataset.salaryListener = '1';
      ['change', 'input'].forEach(ev => el.addEventListener(ev, updateSalaryPreview));
    }
  });
}
$('#salary-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const taxEl = $('#salary-tax-class');
  const hourlyEl = $('#salary-hourly');
  const hoursEl = $('#salary-hours-month');
  const taxClass = Math.min(6, Math.max(1, parseInt(taxEl?.value, 10) || 1));
  const hourlyRate = hourlyEl?.value ? parseFloat(hourlyEl.value) : null;
  const hoursPerMonth = hoursEl?.value ? parseFloat(hoursEl.value) : 160;
  try {
    await salary.save({ tax_class: taxClass, hourly_rate: hourlyRate, hours_per_month: hoursPerMonth });
    updateSalaryPreview();
    showToast('Gehalt gespeichert.', 'success');
  } catch (err) {
    showToast(err.data?.error || err.message, 'error');
  }
});

function openAvailabilityModal() {
  $('#modal-body').innerHTML = '<form id="avail-add-form"><h3>Verfügbarkeit hinzufügen</h3><div class="input-wrap"><label>Datum *</label><input type="date" name="availDate" required></div><div class="input-wrap"><label>Von (Uhrzeit)</label><input type="time" name="startTime"></div><div class="input-wrap"><label>Bis (Uhrzeit)</label><input type="time" name="endTime"></div><div class="input-wrap"><label><input type="checkbox" name="available" value="1" checked> Verfügbar an diesem Tag</label></div><div class="input-wrap"><label>Notiz</label><input type="text" name="note" placeholder="Optional"></div><p id="avail-add-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Hinzufügen</button></form>';
  $('#modal').classList.remove('hidden');
  $('#avail-add-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    $('#avail-add-error').textContent = '';
    try {
      await availability.add({
        availDate: fd.get('availDate'),
        startTime: fd.get('startTime') || null,
        endTime: fd.get('endTime') || null,
        available: fd.get('available') === '1',
        note: fd.get('note') || null
      });
      $('#modal').classList.add('hidden');
      loadAvailability();
      showToast('Verfügbarkeit hinzugefügt.', 'success');
    } catch (err) { $('#avail-add-error').textContent = err.data?.error || err.message; }
  });
}

async function loadAvailability() {
  const el = $('#avail-list');
  if (!el) return;
  el.innerHTML = '<p class="muted">Laden…</p>';
  const from = new Date(); from.setMonth(from.getMonth() - 1);
  const to = new Date(); to.setMonth(to.getMonth() + 2);
  try {
    const list = await availability.list(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    if (list.length > 0) {
      el.innerHTML = '<div class="avail-toolbar"><button type="button" id="avail-add-list-btn" class="btn btn-primary btn-sm">Verfügbarkeit hinzufügen</button></div>' + list.map(a => `<div class="list-item">${a.avail_date} ${a.start_time || ''}–${a.end_time || ''} ${a.available ? '✓' : '✗'}</div>`).join('');
      $('#avail-add-list-btn')?.addEventListener('click', () => openAvailabilityModal());
    } else {
      el.innerHTML = '<div class="empty-state empty-state--avail"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">🕐</p><p class="empty-state-title">Du hast noch keine Verfügbarkeiten hinterlegt.</p><p class="empty-state-desc">Trage deine Arbeitszeiten ein, damit sie bei der Planung berücksichtigt werden können.</p><button type="button" id="avail-add-empty-btn" class="btn btn-primary">Verfügbarkeit hinzufügen</button></div></div>';
      $('#avail-add-empty-btn')?.addEventListener('click', () => openAvailabilityModal());
    }
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}

$('#vacation-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try { await absences.vacation(fd.get('startDate'), fd.get('endDate')); e.target.reset(); loadMyAbsences(); } catch (err) { alert(err.data?.error || err.message); }
});
$('#sick-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const hasFile = fd.get('attest') && fd.get('attest').size > 0;
  try {
    if (hasFile) {
      await absences.sickWithAttest(fd);
    } else {
      await absences.sick(fd.get('startDate'), fd.get('endDate'), fd.get('reason'));
    }
    e.target.reset();
    loadMyAbsences();
    showToast('Krankmeldung gesendet.', 'success');
  } catch (err) { showToast(err.data?.error || err.message); }
});
async function loadMyAbsences() {
  const el = $('#my-absences');
  if (!el) return;
  try {
    const list = await absences.my();
    const items = Array.isArray(list) ? list : [];
    el.innerHTML = items.length ? items.map(a => {
      const attestLink = a.attest_path ? ' <a href="' + absences.attestUrl(a.id) + '" target="_blank" rel="noopener" class="link-btn small">Attest anzeigen</a>' : '';
      return `<div class="list-item">${a.type} ${a.start_date}–${a.end_date} <span class="badge">${a.status}</span>${attestLink}</div>`;
    }).join('') : '<div class="empty-state empty-state--absences"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">📄</p><p class="empty-state-title">Du hast aktuell keine offenen Urlaubs- oder Krankmeldungen.</p><p class="empty-state-desc">Gestellte Anträge werden hier übersichtlich angezeigt.</p></div></div>';
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}

async function loadTasks() {
  const el = $('#tasks-list');
  if (!el) return;
  try {
    const list = await tasks.list();
    el.innerHTML = list.length ? list.map(t => `<div class="list-item"><label><input type="checkbox" ${t.completed ? 'checked' : ''} data-id="${t.id}"> ${t.title}</label> <button type="button" class="btn btn-ghost" data-del="${t.id}">Löschen</button></div>`).join('') : '<div class="empty-state empty-state--tasks"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">✓</p><p class="empty-state-title">Es sind derzeit keine Aufgaben hinterlegt.</p><p class="empty-state-desc">Neue Aufgaben können hier erstellt und verwaltet werden.</p></div></div>';
    el.querySelectorAll('input[data-id]').forEach(cb => cb.addEventListener('change', async () => { try { await tasks.update(parseInt(cb.dataset.id, 10), { completed: cb.checked }); loadTasks(); } catch (_) {} }));
    el.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Löschen?')) return; try { await tasks.delete(parseInt(btn.dataset.del, 10)); loadTasks(); } catch (_) {} }));
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}
$('#task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try { await tasks.create({ title: fd.get('title'), dueDate: fd.get('dueDate') || null }); e.target.reset(); loadTasks(); } catch (err) { alert(err.data?.error || err.message); }
});

async function loadTeam() {
  const el = $('#team-list');
  if (!el) return;
  try {
    const list = await team.list();
    el.innerHTML = list.length ? list.map(u => `<div class="list-item">${u.firstName || ''} ${u.lastName || ''} ${u.email} ${u.role ? ' [' + u.role + ']' : ''}</div>`).join('') : '<div class="empty-state empty-state--team"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">👤</p><p class="empty-state-title">Es sind noch keine Teammitglieder angelegt.</p><p class="empty-state-desc">Füge neue Mitarbeitende hinzu, um die Planung zu starten.</p></div></div>';
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}

async function loadUsers() {
  const el = $('#users-table');
  if (!el) return;
  try {
    const list = await users.list();
    el.innerHTML = '<table><thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th></th></tr></thead><tbody>' + list.map(u => `<tr><td>${u.firstName || ''} ${u.lastName || ''}</td><td>${u.email}</td><td>${u.role}</td><td>${u.role !== 'admin' ? `<button type="button" class="btn btn-ghost" data-del-user="${u.id}">Löschen</button>` : ''}</td></tr>`).join('') + '</tbody></table>';
    el.querySelectorAll('[data-del-user]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Wirklich löschen?')) return; try { await users.delete(parseInt(btn.dataset.delUser, 10)); loadUsers(); } catch (err) { alert(err.data?.error); } }));
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}
$('#user-add')?.addEventListener('click', async () => {
  const depts = await users.departments().catch(() => []);
  const deptOpts = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  $('#modal-body').innerHTML = '<form id="user-add-form"><h3>Benutzer anlegen</h3><div class="input-wrap"><label>E-Mail *</label><input type="email" name="email" required placeholder="name@beispiel.de"></div><div class="input-wrap"><label>Passwort (min. 8 Zeichen, eine Zahl) *</label><input type="password" name="password" required minlength="8"></div><div class="input-wrap"><label>Vorname</label><input type="text" name="firstName" placeholder="Vorname"></div><div class="input-wrap"><label>Nachname</label><input type="text" name="lastName" placeholder="Nachname"></div><div class="input-wrap"><label>Rolle</label><select name="role"><option value="mitarbeiter">Mitarbeiter</option><option value="admin">Admin</option></select></div><div class="input-wrap"><label>Abteilung</label><select name="departmentId"><option value="">—</option>' + deptOpts + '</select></div><p id="user-add-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Anlegen</button></form>';
  $('#modal').classList.remove('hidden');
  $('#user-add-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    $('#user-add-error').textContent = '';
    try {
      await users.create({ email: fd.get('email'), password: fd.get('password'), firstName: fd.get('firstName') || undefined, lastName: fd.get('lastName') || undefined, role: fd.get('role'), departmentId: fd.get('departmentId') || undefined });
      $('#modal').classList.add('hidden');
      loadUsers();
    } catch (err) { $('#user-add-error').textContent = err.data?.error || err.message; }
  });
});

async function loadShiftsAdmin() {
  const el = $('#shifts-admin-list');
  if (!el) return;
  const start = new Date(); start.setDate(1);
  const end = new Date(start); end.setMonth(end.getMonth() + 2);
  try {
    const events = await shifts.calendar(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
    el.innerHTML = events.length ? events.map(s => `<div class="list-item">${s.date} ${s.startTime}–${s.endTime} ${s.departmentName} (${s.assignmentCount}/${s.requiredCount}) <button type="button" class="btn btn-ghost" data-del-shift="${s.id}">Löschen</button></div>`).join('') : '<div class="empty-state empty-state--shifts-admin"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">📅</p><p class="empty-state-title">Es wurden noch keine Schichten erstellt.</p><p class="empty-state-desc">Lege eine neue Schicht an, um mit der Planung zu beginnen.</p><button type="button" id="shift-add-empty" class="btn btn-primary">Schicht anlegen</button></div></div>';
    el.querySelectorAll('[data-del-shift]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Schicht löschen?')) return; try { await shifts.delete(parseInt(btn.dataset.delShift, 10)); loadShiftsAdmin(); } catch (err) { if (err.status === 404) { loadShiftsAdmin(); return; } showToast(err.data?.error || err.message); } }));
    $('#shift-add-empty')?.addEventListener('click', () => $('#shift-add')?.click());
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}
$('#shift-add')?.addEventListener('click', async () => {
  const [depts, userList] = await Promise.all([
    shifts.departments().catch(() => []),
    users.list().catch(() => [])
  ]);
  const deptOpts = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  const activeUsers = (userList || []).filter(u => u.active !== false);
  const userCheckboxes = activeUsers.length
    ? '<div class="input-wrap"><label>Mitarbeiter zuweisen</label><p class="muted small">Wer soll diese Schicht übernehmen? (optional)</p><div class="shift-assign-list">' +
      activeUsers.map(u => `<label class="shift-assign-item"><input type="checkbox" name="assignedUserId" value="${u.id}"> ${(u.firstName || '').trim()} ${(u.lastName || '').trim() || u.email}</label>`).join('') +
      '</div></div>'
    : '';
  $('#modal-body').innerHTML = '<form id="shift-add-form"><h3>Schicht anlegen</h3><div class="input-wrap"><label>Datum *</label><input type="date" name="shiftDate" required></div><div class="input-wrap"><label>Startzeit *</label><input type="time" name="startTime" required></div><div class="input-wrap"><label>Endzeit *</label><input type="time" name="endTime" required></div><div class="input-wrap"><label>Abteilung *</label><select name="departmentId" required>' + deptOpts + '</select></div><div class="input-wrap"><label>Benötigte Mitarbeiter</label><input type="number" name="requiredCount" value="1" min="1"></div><div class="input-wrap"><label>Titel (optional)</label><input type="text" name="title" placeholder="z.B. Vormittagsdienst, Schichtbezeichnung"></div>' + userCheckboxes + '<p id="shift-add-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Anlegen</button></form>';
  $('#modal').classList.remove('hidden');
  $('#shift-add-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const assignedUserIds = fd.getAll('assignedUserId').map(id => parseInt(id, 10)).filter(id => id > 0);
    $('#shift-add-error').textContent = '';
    try {
      await shifts.create({ shiftDate: fd.get('shiftDate'), startTime: fd.get('startTime'), endTime: fd.get('endTime'), departmentId: fd.get('departmentId'), requiredCount: fd.get('requiredCount') || 1, title: fd.get('title') || undefined, assignedUserIds });
      $('#modal').classList.add('hidden');
      loadShiftsAdmin();
      showToast(assignedUserIds.length ? 'Schicht angelegt und Mitarbeiter zugewiesen.' : 'Schicht angelegt.', 'success');
    } catch (err) { $('#shift-add-error').textContent = err.data?.error || err.message; }
  });
});

async function loadLocations() {
  const el = $('#locations-list');
  if (!el) return;
  el.innerHTML = '<p class="muted">Laden…</p>';
  try {
    const list = await locations.list();
    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state empty-state--locations"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">📍</p><p class="empty-state-title">Es wurden noch keine Standorte definiert.</p><p class="empty-state-desc">Lege einen Standort an (z. B. Büro, Filiale oder Projektort).</p><button type="button" id="location-add-empty" class="btn btn-primary">Standort anlegen</button></div></div>';
      $('#location-add-empty')?.addEventListener('click', () => openLocationModal(null, '', ''));
    } else {
      el.innerHTML = list.map(l => `<div class="list-item flex-between"><span><strong>${(l.name || '').replace(/</g, '&lt;')}</strong>${l.address ? '<br><small class="muted">' + (l.address || '').replace(/</g, '&lt;') + '</small>' : ''}</span><span><button type="button" class="btn btn-ghost btn-sm" data-loc-edit="${l.id}" data-loc-name="${(l.name || '').replace(/"/g, '&quot;')}" data-loc-address="${(l.address || '').replace(/"/g, '&quot;')}">Bearbeiten</button> <button type="button" class="btn btn-ghost btn-sm" data-loc-del="${l.id}">Löschen</button></span></div>`).join('');
      el.querySelectorAll('[data-loc-del]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Standort löschen?')) return; try { await locations.delete(parseInt(btn.dataset.locDel, 10)); loadLocations(); showToast('Standort gelöscht.', 'success'); } catch (e) { showToast(e.data?.error || e.message); } }));
      el.querySelectorAll('[data-loc-edit]').forEach(btn => btn.addEventListener('click', () => { openLocationModal(parseInt(btn.dataset.locEdit, 10), btn.dataset.locName || '', btn.dataset.locAddress || ''); }));
    }
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; showToast(e.data?.error || e.message); }
}
function openLocationModal(id, name, address) {
  $('#modal-body').innerHTML = '<form id="location-form"><h3>' + (id ? 'Standort bearbeiten' : 'Standort anlegen') + '</h3><input type="hidden" name="id" value="' + (id || '') + '"><div class="input-wrap"><label>Name *</label><input type="text" name="name" value="' + (name || '').replace(/"/g, '&quot;') + '" required></div><div class="input-wrap"><label>Adresse</label><input type="text" name="address" value="' + (address || '').replace(/"/g, '&quot;') + '"></div><p id="location-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Speichern</button></form>';
  $('#modal').classList.remove('hidden');
  $('#location-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get('id') ? parseInt(fd.get('id'), 10) : null;
    $('#location-error').textContent = '';
    try {
      if (id) { await locations.update(id, { name: fd.get('name'), address: fd.get('address') }); }
      else { await locations.create({ name: fd.get('name'), address: fd.get('address') }); }
      $('#modal').classList.add('hidden');
      loadLocations();
      showToast(id ? 'Standort aktualisiert.' : 'Standort angelegt.', 'success');
    } catch (err) { $('#location-error').textContent = err.data?.error || err.message; showToast(err.data?.error || err.message, 'error'); }
  });
}
$('#location-add')?.addEventListener('click', () => openLocationModal(null, '', ''));

async function loadAbteilungen() {
  const el = $('#departments-list');
  if (!el) return;
  el.innerHTML = '<p class="muted">Laden…</p>';
  try {
    const list = await departments.list();
    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state empty-state--departments"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">🏢</p><p class="empty-state-title">Es wurden noch keine Abteilungen angelegt.</p><p class="empty-state-desc">Erstelle Abteilungen, um Mitarbeitende strukturiert zu organisieren.</p><button type="button" id="department-add-empty" class="btn btn-primary">Abteilung anlegen</button></div></div>';
      $('#department-add-empty')?.addEventListener('click', () => openDepartmentModal(null, ''));
    } else {
      el.innerHTML = list.map(d => `<div class="list-item flex-between"><span><strong>${(d.name || '').replace(/</g, '&lt;')}</strong></span><span><button type="button" class="btn btn-ghost btn-sm" data-dept-edit="${d.id}" data-dept-name="${(d.name || '').replace(/"/g, '&quot;')}">Bearbeiten</button> <button type="button" class="btn btn-ghost btn-sm" data-dept-del="${d.id}">Löschen</button></span></div>`).join('');
      el.querySelectorAll('[data-dept-del]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Abteilung löschen?')) return; try { await departments.delete(parseInt(btn.dataset.deptDel, 10)); loadAbteilungen(); showToast('Abteilung gelöscht.', 'success'); } catch (e) { showToast(e.data?.error || e.message); } }));
      el.querySelectorAll('[data-dept-edit]').forEach(btn => btn.addEventListener('click', () => openDepartmentModal(parseInt(btn.dataset.deptEdit, 10), btn.dataset.deptName || ''))); }
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; showToast(e.data?.error || e.message); }
}
function openDepartmentModal(id, name) {
  $('#modal-body').innerHTML = '<form id="department-form"><h3>' + (id ? 'Abteilung bearbeiten' : 'Abteilung anlegen') + '</h3><input type="hidden" name="id" value="' + (id || '') + '"><div class="input-wrap"><label>Name *</label><input type="text" name="name" value="' + (name || '').replace(/"/g, '&quot;') + '" required></div><p id="department-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Speichern</button></form>';
  $('#modal').classList.remove('hidden');
  $('#department-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get('id') ? parseInt(fd.get('id'), 10) : null;
    $('#department-error').textContent = '';
    try {
      if (id) { await departments.update(id, { name: fd.get('name') }); }
      else { await departments.create({ name: fd.get('name') }); }
      $('#modal').classList.add('hidden');
      loadAbteilungen();
      showToast(id ? 'Abteilung aktualisiert.' : 'Abteilung angelegt.', 'success');
    } catch (err) { $('#department-error').textContent = err.data?.error || err.message; showToast(err.data?.error || err.message, 'error'); }
  });
}
$('#department-add')?.addEventListener('click', () => openDepartmentModal(null, ''));

async function loadAbsencesAdmin() {
  const el = $('#absences-admin');
  if (!el) return;
  try {
    const list = await absences.all();
    const offen = list.filter(a => a.type === 'urlaub' && a.status === 'offen');
    el.innerHTML = offen.length ? offen.map(a => {
      const attestLink = a.attest_path ? ' <a href="' + absences.attestUrl(a.id) + '" target="_blank" rel="noopener" class="link-btn small">Attest</a>' : '';
      return `<div class="list-item">${a.first_name} ${a.last_name} ${a.start_date}–${a.end_date}${attestLink} <button type="button" class="btn btn-primary" data-ok="${a.id}">Genehmigen</button> <button type="button" class="btn btn-ghost" data-no="${a.id}">Ablehnen</button></div>`;
    }).join('') : '<div class="empty-state empty-state--antraege"><div class="empty-state-card"><p class="empty-state-icon" aria-hidden="true">📋</p><p class="empty-state-title">Derzeit liegen keine offenen Urlaubsanträge vor.</p><p class="empty-state-desc">Neue Anträge erscheinen hier zur Genehmigung oder Ablehnung.</p><p class="empty-state-hint">Krankmeldungen werden automatisch erfasst und sind hier nicht manuell freizugeben.</p></div></div>';
    el.querySelectorAll('[data-ok]').forEach(btn => btn.addEventListener('click', async () => { try { await absences.setStatus(parseInt(btn.dataset.ok, 10), 'genehmigt'); loadAbsencesAdmin(); } catch (_) {} }));
    el.querySelectorAll('[data-no]').forEach(btn => btn.addEventListener('click', async () => { try { await absences.setStatus(parseInt(btn.dataset.no, 10), 'abgelehnt'); loadAbsencesAdmin(); } catch (_) {} }));
  } catch (e) { el.innerHTML = '<p class="error-msg">' + (e.data?.error || e.message) + '</p>'; }
}

function swapEmptyCard(icon, text, subtext) {
  return '<div class="swap-empty"><p class="swap-empty-icon" aria-hidden="true">' + icon + '</p><p class="swap-empty-text">' + text + '</p>' + (subtext ? '<p class="swap-empty-sub">' + subtext + '</p>' : '') + '</div>';
}
async function loadShiftSwap() {
  const reqEl = $('#swap-requests-list');
  const offEl = $('#swap-offers-list');
  const myEl = $('#swap-my-offers-list');
  if (!reqEl) return;
  try {
    const [requests, offers, myOffers] = await Promise.all([shiftSwap.myRequests(), shiftSwap.offers(), shiftSwap.myOffers()]);
    reqEl.innerHTML = requests.length ? requests.map(r => `<div class="list-item flex-between"><span>${r.fromUser}: ${r.shift.date} ${r.shift.startTime}–${r.shift.endTime} (${r.shift.departmentName})</span><span><button type="button" class="btn btn-primary btn-sm" data-req-accept="${r.id}">Annehmen</button> <button type="button" class="btn btn-ghost btn-sm" data-req-reject="${r.id}">Ablehnen</button></span></div>`).join('') : swapEmptyCard('⇄', 'Aktuell liegen keine Tauschanfragen für dich vor.', 'Sobald eine Anfrage gestellt wird, erscheint sie hier.');
    offEl.innerHTML = offers.length ? offers.map(o => `<div class="list-item flex-between"><span>${o.shift.date} ${o.shift.startTime}–${o.shift.endTime} ${o.shift.departmentName} (von ${o.offeredBy})</span><button type="button" class="btn btn-primary btn-sm" data-offer-request="${o.id}">Anfrage senden</button></div>`).join('') : swapEmptyCard('⇄', 'Zurzeit sind keine Schichten zum Tausch verfügbar.', '');
    myEl.innerHTML = myOffers.length ? myOffers.map(o => `<div class="list-item">${o.shift_date} ${o.start_time}–${o.end_time} ${o.department_name} <span class="badge">${o.status}</span></div>`).join('') : swapEmptyCard('⇄', 'Du hast aktuell keine Schichten zum Tausch freigegeben.', '');
    reqEl.querySelectorAll('[data-req-accept]').forEach(btn => btn.addEventListener('click', async () => { try { await shiftSwap.acceptRequest(parseInt(btn.dataset.reqAccept, 10)); loadShiftSwap(); } catch (e) { alert(e.data?.error || e.message); } }));
    reqEl.querySelectorAll('[data-req-reject]').forEach(btn => btn.addEventListener('click', async () => { try { await shiftSwap.rejectRequest(parseInt(btn.dataset.reqReject, 10)); loadShiftSwap(); } catch (e) { alert(e.data?.error || e.message); } }));
    offEl.querySelectorAll('[data-offer-request]').forEach(btn => btn.addEventListener('click', async () => { try { await shiftSwap.request(parseInt(btn.dataset.offerRequest, 10)); loadShiftSwap(); alert('Anfrage gesendet.'); } catch (e) { alert(e.data?.error || e.message); } }));
  } catch (e) {
    const msg = (e.data?.error || e.message) || 'Verbindung fehlgeschlagen';
    if (reqEl) reqEl.innerHTML = '<p class="error-msg">' + (msg + '').replace(/</g, '&lt;') + '</p><button type="button" class="btn btn-primary" id="swap-reload">Neu laden</button>';
    if (offEl) offEl.innerHTML = '';
    if (myEl) myEl.innerHTML = '';
    $('#swap-reload')?.addEventListener('click', () => loadShiftSwap());
  }
}

async function refreshNotifCount() {
  try {
    const r = await notifications.unreadCount();
    const badge = $('#notif-badge');
    if (badge) { badge.textContent = r.count; badge.classList.toggle('hidden', !r.count); }
  } catch (_) {}
}

async function loadNotifList() {
  const listEl = $('#notif-list');
  if (!listEl) return;
  try {
    const list = await notifications.list();
    listEl.innerHTML = list.length ? list.map(n => `<div class="dropdown-item ${n.readAt ? '' : 'unread'}"><button type="button" data-id="${n.id}">${n.title}</button><small>${(n.createdAt || '').slice(0, 16)}</small></div>`).join('') : '<p class="muted">Keine Benachrichtigungen.</p>';
    listEl.querySelectorAll('.dropdown-item button').forEach(btn => btn.addEventListener('click', async () => { try { await notifications.markRead(parseInt(btn.dataset.id, 10)); refreshNotifCount(); loadNotifList(); } catch (_) {} }));
  } catch (err) {
    listEl.innerHTML = '<p class="muted" style="margin:0.5rem 0;">Benachrichtigungen konnten nicht geladen werden.</p><button type="button" class="btn btn-ghost btn-sm" id="notif-retry-btn">Erneut versuchen</button>';
    $('#notif-retry-btn')?.addEventListener('click', () => loadNotifList());
  }
}
$('#notif-btn')?.addEventListener('click', async (e) => {
  e.stopPropagation();
  const dd = $('#notif-dropdown');
  dd.classList.toggle('hidden');
  if (!dd.classList.contains('hidden')) loadNotifList();
});
document.addEventListener('click', (e) => { if (!$('#notif-wrap')?.contains(e.target)) $('#notif-dropdown')?.classList.add('hidden'); });
$('#notif-read-all')?.addEventListener('click', async () => { try { await notifications.readAll(); refreshNotifCount(); loadNotifList(); } catch (_) {} });

function openProfileModal() {
  $('#modal-body').innerHTML = '<form id="change-pw-form"><h3>Passwort ändern</h3><div class="input-wrap"><label>Aktuelles Passwort</label><input type="password" name="currentPassword" required></div><div class="input-wrap"><label>Neues Passwort (min. 8 Zeichen, eine Zahl)</label><input type="password" name="newPassword" required minlength="8"></div><div class="input-wrap"><label>Neues Passwort wiederholen</label><input type="password" name="newPassword2" required></div><p id="change-pw-error" class="error-msg"></p><button type="submit" class="btn btn-primary">Ändern</button></form>';
  $('#modal').classList.remove('hidden');
  $('#change-pw-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newPw = fd.get('newPassword');
    if (newPw !== fd.get('newPassword2')) { $('#change-pw-error').textContent = 'Neue Passwörter stimmen nicht überein.'; return; }
    $('#change-pw-error').textContent = '';
    try {
      await auth.changePassword(fd.get('currentPassword'), newPw);
      $('#modal').classList.add('hidden');
      showToast('Passwort geändert.', 'success');
    } catch (err) { $('#change-pw-error').textContent = err.data?.error || err.message; }
  });
}
$('#header-user')?.addEventListener('click', (e) => { e.preventDefault(); openProfileModal(); });
$('#header-user')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfileModal(); } });

$('#modal-close')?.addEventListener('click', () => $('#modal').classList.add('hidden'));
$('#modal')?.addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.classList.add('hidden'); });

var fab = $('#fab');
if (fab) {
  async function exportDienstplan() {
    var w = window.open('', '_blank');
    if (!w) { showToast('Pop-up blockiert. Bitte erlauben Sie Pop-ups für diese Seite.', 'error'); return; }
    w.document.write('<html><head><meta charset="utf-8"><title>Dienstplan</title></head><body style="font-family:sans-serif;padding:2rem;">Dienstplan wird geladen …</body></html>');
    w.document.close();
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const start = y + '-' + m + '-01';
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      const end = y + '-' + m + '-' + String(lastDay).padStart(2, '0');
      const events = await shifts.calendar(start, end);
      const monthName = MONTHS[now.getMonth()] + ' ' + y;
      const rows = (events || []).map(ev => {
        const names = (ev.assignedUsers || []).map(u => (u.firstName || '') + ' ' + (u.lastName || '')).filter(Boolean).join(', ') || '—';
        return '<tr><td>' + (ev.date || '') + '</td><td>' + (ev.startTime || '') + '–' + (ev.endTime || '') + '</td><td>' + (ev.departmentName || '') + '</td><td>' + (ev.title || '') + '</td><td>' + names + '</td></tr>';
      }).join('');
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dienstplan ' + monthName + '</title><style>body{font-family:Inter,sans-serif;padding:1.5rem;color:#1e293b;} h1{font-size:1.25rem;margin-bottom:1rem;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #e2e8f0;padding:0.5rem 0.75rem;text-align:left;} th{background:#f1f5f9;font-weight:600;} .hint{font-size:0.85rem;color:#64748b;margin-top:1rem;}</style></head><body><h1>Dienstplan ' + monthName + '</h1><table><thead><tr><th>Datum</th><th>Uhrzeit</th><th>Abteilung</th><th>Titel</th><th>Zugewiesen</th></tr></thead><tbody>' + rows + '</tbody></table><p class="hint">Erstellt am ' + new Date().toLocaleDateString('de-DE') + '. Zum Speichern als PDF: Drucken → Ziel „Als PDF speichern“ wählen.</p></body></html>';
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.onafterprint = () => w.close();
      w.print();
      showToast('Dienstplan geöffnet. Im Druckdialog „Als PDF speichern“ wählen.', 'success');
    } catch (err) {
      w.document.open();
      w.document.write('<html><body style="font-family:sans-serif;padding:2rem;">Fehler: ' + (err.message || '').replace(/</g, '&lt;') + '</body></html>');
      w.document.close();
      showToast(err.data?.error || err.message || 'Export fehlgeschlagen.', 'error');
    }
  }

  async function exportLohnzettel() {
    var w = window.open('', '_blank');
    if (!w) { showToast('Pop-up blockiert. Bitte erlauben Sie Pop-ups für diese Seite.', 'error'); return; }
    w.document.write('<html><head><meta charset="utf-8"><title>Lohnzettel</title></head><body style="font-family:sans-serif;padding:2rem;">Lohnzettel wird geladen …</body></html>');
    w.document.close();
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const start = y + '-' + String(m).padStart(2, '0') + '-01';
      const lastDay = new Date(y, m, 0).getDate();
      const end = y + '-' + String(m).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
      const [salaryData, timeData] = await Promise.all([
        salary.get().catch(() => ({ hourlyRate: null, taxClass: 1, hoursPerMonth: 160 })),
        time.me(start, end).catch(() => ({}))
      ]);
      const { totalMinutes: totalMin } = timeResponseToEntriesAndTotal(timeData);
      const userName = (currentUser && (currentUser.firstName || currentUser.lastName)) ? ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim() : (currentUser?.email || 'Mitarbeiter');
      const hourly = parseFloat(salaryData.hourlyRate) || 0;
      const taxClass = Math.min(6, Math.max(1, parseInt(salaryData.taxClass, 10) || 1));
      const hoursWorked = Math.round(totalMin / 60 * 100) / 100;
      const gross = Math.round(hoursWorked * hourly * 100) / 100;
      const factor = SALARY_NETTO_FACTOR[taxClass] ?? 0.62;
      const net = Math.round(gross * factor * 100) / 100;
      const monthName = MONTHS[m - 1] + ' ' + y;
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lohnzettel ' + monthName + '</title><style>body{font-family:Inter,sans-serif;padding:1.5rem;color:#1e293b;max-width:480px;} h1{font-size:1.25rem;margin-bottom:1rem;} .row{display:flex;justify-content:space-between;margin:0.5rem 0;} .label{color:#64748b;} .hint{font-size:0.85rem;color:#64748b;margin-top:1.5rem;}</style></head><body><h1>Lohnzettel ' + monthName + '</h1><p><strong>' + (userName.replace(/</g, '&lt;')) + '</strong></p><div class="row"><span class="label">Stunden (erfasst)</span><span>' + hoursWorked + ' h</span></div><div class="row"><span class="label">Stundenlohn</span><span>' + hourly.toFixed(2) + ' €</span></div><div class="row"><span class="label">Brutto</span><span><strong>' + gross.toFixed(2) + ' €</strong></span></div><div class="row"><span class="label">Netto (Schätzung, Steuerkl. ' + taxClass + ')</span><span>' + net.toFixed(2) + ' €</span></div><p class="hint">Erstellt am ' + new Date().toLocaleDateString('de-DE') + '. Vereinfachte Berechnung. Zum Speichern als PDF: Drucken → Ziel „Als PDF speichern“ wählen.</p></body></html>';
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.onafterprint = () => w.close();
      w.print();
      showToast('Lohnzettel geöffnet. Im Druckdialog „Als PDF speichern“ wählen.', 'success');
    } catch (err) {
      w.document.open();
      w.document.write('<html><body style="font-family:sans-serif;padding:2rem;">Fehler: ' + (err.message || '').replace(/</g, '&lt;') + '</body></html>');
      w.document.close();
      showToast(err.data?.error || err.message || 'Export fehlgeschlagen.', 'error');
    }
  }

  fab.querySelector('.fab-main')?.addEventListener('click', (e) => { e.stopPropagation(); fab.classList.toggle('open'); });
  fab.querySelectorAll('.fab-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
      fab.classList.remove('open');
      var a = btn.dataset.action;
      if (a === 'newShift') { location.hash = 'schichten'; route(); showToast('Schicht über "Schicht anlegen" erstellen.', 'success'); }
      if (a === 'vacation') { location.hash = 'urlaub'; route(); }
      if (a === 'message') { location.hash = 'chat'; route(); }
      if (a === 'export') {
      $('#modal-body').innerHTML = '<h3>Export</h3><p class="muted">Dokument öffnet sich zum Drucken. Im Druckdialog „Als PDF speichern“ wählen, um eine PDF-Datei zu erstellen.</p><div class="export-actions"><button type="button" class="btn btn-primary export-btn" data-type="dienstplan">Dienstplan drucken / als PDF</button><button type="button" class="btn btn-primary export-btn" data-type="lohnzettel">Lohnzettel drucken / als PDF</button></div>';
      $('#modal').classList.remove('hidden');
      $('#modal-body').querySelectorAll('.export-btn').forEach(b => b.addEventListener('click', async () => {
        const type = b.dataset.type;
        $('#modal').classList.add('hidden');
        try {
          if (type === 'dienstplan') await exportDienstplan();
          if (type === 'lohnzettel') await exportLohnzettel();
        } catch (err) {
          showToast(err.data?.error || err.message || 'Export fehlgeschlagen.', 'error');
        }
      }));
    }
    });
  });
  document.addEventListener('click', function(e) { if (!fab.contains(e.target)) fab.classList.remove('open'); });
}

checkAuth().then(() => { if (currentUser) refreshNotifCount(); });
