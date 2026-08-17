require('dotenv').config();
const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { loadDb } = require('./lib/db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const shiftsRoutes = require('./routes/shifts');
const absencesRoutes = require('./routes/absences');
const availabilityRoutes = require('./routes/availability');
const dashboardRoutes = require('./routes/dashboard');
const tasksRoutes = require('./routes/tasks');
const teamRoutes = require('./routes/team');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const locationsRoutes = require('./routes/locations');
const departmentsRoutes = require('./routes/departments');
const shiftSwapRoutes = require('./routes/shift-swap');
const timeRoutes = require('./routes/time');
const conflictsRoutes = require('./routes/conflicts');
const salaryRoutes = require('./routes/salary');

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_TIMEOUT_MS = (process.env.SESSION_TIMEOUT_MIN || 30) * 60 * 1000;
const isLocalhost = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
app.use(session({
  secret: process.env.SESSION_SECRET || 'schicht-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: SESSION_TIMEOUT_MS,
    sameSite: 'lax',
    secure: isLocalhost ? false : true,
    path: '/',
  },
}));

app.use((req, res, next) => {
  if (req.session && req.session.userId) {
    const last = req.session.lastActivity || Date.now();
    if (Date.now() - last > SESSION_TIMEOUT_MS) {
      req.session.destroy(() => {});
      if (req.xhr || req.headers.accept?.includes('application/json'))
        return res.status(401).json({ error: 'Session abgelaufen. Bitte erneut anmelden.' });
      return res.redirect('/');
    }
    req.session.lastActivity = Date.now();
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/absences', absencesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/shift-swap', shiftSwapRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/conflicts', conflictsRoutes);
app.use('/api/salary', salaryRoutes);

function authShellHtml({ mode, errorMsg }) {
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Konto erstellen' : 'Anmelden';
  const safeErr = errorMsg ? String(errorMsg).replace(/</g, '&lt;') : '';
  const errBlock = safeErr ? `<div class="form-err" role="alert">${safeErr}</div>` : '';

  const loginForm = `
    <form id="auth-form" method="post" action="/api/auth/login" autocomplete="on">
      ${errBlock}
      <div class="field-wrap">
        <input type="email" name="email" id="email" placeholder="E-Mail" required autocomplete="email">
        <span class="input-err" id="err-email"></span>
      </div>
      <div class="field-wrap">
        <div class="input-with-toggle">
          <input type="password" name="password" id="password" placeholder="Passwort" required autocomplete="current-password">
          <button type="button" class="pw-toggle" aria-label="Passwort anzeigen" title="Passwort anzeigen">👁</button>
        </div>
        <span class="input-err" id="err-password"></span>
        <a href="#" class="forgot-link" id="forgot-link">Passwort vergessen?</a>
      </div>
      <label class="checkbox-wrap">
        <input type="checkbox" name="remember" checked>
        <span>Angemeldet bleiben</span>
      </label>
      <button type="submit" class="btn btn-primary" id="submit-btn">Anmelden</button>
      <p class="form-footer">Noch kein Konto? <a href="/signup">Jetzt registrieren</a></p>
    </form>`;

  const signupForm = `
    <form id="auth-form" method="post" action="/api/auth/register" autocomplete="on">
      ${errBlock}
      <div class="field-wrap">
        <input type="email" name="email" id="email" placeholder="E-Mail" required autocomplete="email">
        <span class="input-err" id="err-email"></span>
      </div>
      <div class="field-wrap">
        <input type="text" name="firstName" id="firstName" placeholder="Vorname" autocomplete="given-name">
        <span class="input-err" id="err-firstName"></span>
      </div>
      <div class="field-wrap">
        <input type="text" name="lastName" id="lastName" placeholder="Nachname" autocomplete="family-name">
        <span class="input-err" id="err-lastName"></span>
      </div>
      <div class="field-wrap">
        <div class="input-with-toggle">
          <input type="password" name="password" id="password" placeholder="Passwort (min. 8 Zeichen)" required minlength="8" autocomplete="new-password">
          <button type="button" class="pw-toggle" aria-label="Passwort anzeigen" title="Passwort anzeigen">👁</button>
        </div>
        <p class="pass-hint" id="pass-hint">Mindestens 8 Zeichen erforderlich</p>
        <span class="input-err" id="err-password"></span>
      </div>
      <button type="submit" class="btn btn-primary" id="submit-btn">Konto erstellen</button>
      <p class="form-footer">Bereits ein Konto? <a href="/">Zum Login</a></p>
    </form>`;

  const rightLogin = `
    <div class="right-logo">Schichtplanung</div>
    <p class="right-desc">Melde dich an, um Dienstpläne, Abwesenheiten, Zeiterfassung und Kommunikation zu verwalten.</p>
    <ul class="right-features">
      <li>Dienstpläne verwalten</li>
      <li>Abwesenheiten organisieren</li>
      <li>Teamkommunikation</li>
    </ul>
    <p class="right-version">Version 1.0 – © 2026</p>`;

  const rightSignup = `
    <div class="right-logo">Schichtplanung</div>
    <p class="right-desc">Erstelle dein Konto, um Dienstpläne zu verwalten, Verfügbarkeiten anzugeben und mit deinem Team zu kommunizieren.</p>
    <ul class="right-features">
      <li>Dienstpläne verwalten</li>
      <li>Abwesenheiten organisieren</li>
      <li>Teamkommunikation</li>
    </ul>
    <p class="right-version">Version 1.0 – © 2026</p>`;

  const form = isSignup ? signupForm : loginForm;
  const rightContent = isSignup ? rightSignup : rightLogin;
  const submitLabel = isSignup ? 'Konto wird erstellt…' : 'Anmelden…';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – Schichtplanung</title>
  <style>
    :root{
      --bg:#0b0f14;
      --card:#121720;
      --input-bg:#1a2332;
      --text:#e5e7eb;
      --muted:#94a3b8;
      --primary:#F97316;
      --primary-hover:#EA580C;
      --focus-glow:0 0 0 3px rgba(249,115,22,.35);
      --radius-card:18px;
      --radius-btn:14px;
      --radius-input:12px;
      --shadow:0 20px 40px rgba(0,0,0,.35);
      --shadow-hover:0 25px 50px rgba(0,0,0,.45);
      --err:#EF4444;
      --ok:#22C55E;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
      background:linear-gradient(180deg,#05070a 0%,#0b0f14 100%);
      color:var(--text);
      padding:24px;
    }
    .auth-card{
      width:min(800px,100%);
      min-height:min(480px,85vh);
      max-height:92vh;
      display:flex;
      background:var(--card);
      border-radius:var(--radius-card);
      overflow:hidden;
      box-shadow:var(--shadow);
      opacity:0;
      transform:translateY(20px);
      animation:authIn .4s ease forwards;
    }
    @keyframes authIn{
      to{ opacity:1; transform:translateY(0) }
    }
    .auth-card:hover{ box-shadow:var(--shadow-hover) }
    .pane{ flex:1; display:flex; min-height:0 }
    .left{
      flex:1;
      min-width:0;
      padding:40px 48px 48px;
      display:flex;
      flex-direction:column;
      overflow-y:auto;
    }
    .left h1{
      margin:0 0 32px;
      font-size:24px;
      font-weight:700;
      letter-spacing:.02em;
    }
    .field-wrap{ margin-bottom:24px }
    .field-wrap .input-err,
    .field-wrap .pass-hint,
    .field-wrap .forgot-link{ display:block; margin-top:8px; font-size:13px }
    .field-wrap .input-err{ color:var(--err) }
    .field-wrap .pass-hint{ color:var(--muted) }
    .field-wrap .pass-hint.valid{ color:var(--ok) }
    .forgot-link{ color:var(--primary); text-decoration:none }
    .forgot-link:hover{ text-decoration:underline }
    .input-with-toggle{
      position:relative;
      display:flex;
      align-items:center;
    }
    .input-with-toggle input{
      flex:1;
      height:48px;
      padding:0 48px 0 16px;
      background:var(--input-bg);
      border:1px solid rgba(255,255,255,.12);
      border-radius:var(--radius-input);
      color:var(--text);
      font-size:16px;
      outline:none;
      transition:border-color .2s ease, box-shadow .2s ease;
    }
    .input-with-toggle input::placeholder{ color:var(--muted) }
    .input-with-toggle input:focus{
      border-color:var(--primary);
      box-shadow:var(--focus-glow);
    }
    .field-wrap input:not([type="checkbox"]){
      width:100%;
      height:48px;
      padding:0 16px;
      background:var(--input-bg);
      border:1px solid rgba(255,255,255,.12);
      border-radius:var(--radius-input);
      color:var(--text);
      font-size:16px;
      outline:none;
      transition:border-color .2s ease, box-shadow .2s ease;
    }
    .field-wrap input:focus{ border-color:var(--primary); box-shadow:var(--focus-glow) }
    .field-wrap input.error{ border-color:var(--err) }
    .pw-toggle{
      position:absolute;
      right:12px;
      background:none;
      border:none;
      cursor:pointer;
      font-size:18px;
      opacity:.8;
      padding:4px;
      transition:opacity .2s ease;
    }
    .pw-toggle:hover{ opacity:1 }
    .checkbox-wrap{
      display:flex;
      align-items:center;
      gap:8px;
      margin-bottom:32px;
      cursor:pointer;
      font-size:14px;
      color:var(--muted);
    }
    .checkbox-wrap input{ accent-color:var(--primary) }
    .form-err{
      margin-bottom:24px;
      padding:12px 16px;
      border-radius:var(--radius-input);
      background:rgba(239,68,68,.12);
      border:1px solid rgba(239,68,68,.3);
      color:#fecaca;
      font-size:14px;
    }
    .btn{
      width:100%;
      max-width:280px;
      height:48px;
      border:none;
      border-radius:var(--radius-btn);
      font-size:16px;
      font-weight:600;
      cursor:pointer;
      transition:all .2s ease;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:8px;
    }
    .btn-primary{
      background:var(--primary);
      color:#fff;
      box-shadow:0 4px 14px rgba(249,115,22,.35);
    }
    .btn-primary:hover:not(:disabled){
      background:var(--primary-hover);
      transform:translateY(-2px);
      box-shadow:0 8px 20px rgba(249,115,22,.4);
    }
    .btn-primary:disabled{ opacity:.85; cursor:not-allowed }
    .btn .spinner{
      width:20px;
      height:20px;
      border:2px solid rgba(255,255,255,.3);
      border-top-color:#fff;
      border-radius:50%;
      animation:spin .7s linear infinite;
    }
    @keyframes spin{ to{ transform:rotate(360deg) } }
    .form-footer{
      margin:24px 0 0;
      font-size:14px;
      color:var(--muted);
    }
    .form-footer a{ color:var(--primary); text-decoration:none; font-weight:500 }
    .form-footer a:hover{ text-decoration:underline }
    .right{
      flex:0 0 40%;
      padding:48px 40px;
      background:linear-gradient(160deg,#EA580C 0%,#F97316 50%,#fb923c 100%);
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      color:#fff;
    }
    .right-logo{
      font-size:22px;
      font-weight:700;
      letter-spacing:.02em;
      margin-bottom:16px;
    }
    .right-desc{
      margin:0 0 24px;
      font-size:15px;
      line-height:1.5;
      opacity:.95;
      max-width:280px;
    }
    .right-features{
      margin:0;
      padding:0;
      list-style:none;
      font-size:14px;
      line-height:2;
    }
    .right-features li::before{ content:"✓ "; font-weight:700; margin-right:8px }
    .right-version{
      margin:24px 0 0;
      font-size:12px;
      opacity:.8;
    }
    @media (max-width:768px){
      .auth-card{ flex-direction:column; max-height:none; min-height:auto }
      .pane{ flex-direction:column }
      .left{ padding:32px 24px 40px }
      .right{ flex:0 0 auto; padding:32px 24px }
      .btn{ max-width:none }
    }
  </style>
</head>
<body>
  <div id="toast" class="toast" aria-live="polite"></div>
  <div class="auth-card" role="main">
    <div class="pane">
      <section class="left">
        <h1>${isSignup ? 'Konto erstellen' : 'Willkommen zurück'}</h1>
        ${form}
      </section>
      <section class="right">
        ${rightContent}
      </section>
    </div>
  </div>
  <script>
(function(){
  var isSignup = ${isSignup ? 'true' : 'false'};
  var submitLabel = ${JSON.stringify(submitLabel)};
  var form = document.getElementById('auth-form');
  var submitBtn = document.getElementById('submit-btn');
  var defaultBtnText = submitBtn ? submitBtn.textContent : '';

  function showToast(msg, type){
    var el = document.getElementById('toast');
    if(!el) return;
    el.textContent = msg;
    el.className = 'toast toast-' + (type || 'error');
    el.style.display = 'block';
    setTimeout(function(){ el.style.display = 'none'; }, 4000);
  }
  function setLoading(loading){
    if(!submitBtn) return;
    submitBtn.disabled = loading;
    if(loading){
      submitBtn.innerHTML = '<span class="spinner"></span> ' + submitLabel;
    } else {
      submitBtn.textContent = defaultBtnText;
    }
  }
  function clearFieldErrors(){
    [].forEach.call(document.querySelectorAll('.input-err'), function(e){ e.textContent = ''; });
    [].forEach.call(document.querySelectorAll('.input'), function(e){ e.classList.remove('error'); });
    [].forEach.call(document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]'), function(e){ e.classList.remove('error'); });
  }
  function setFieldError(id, msg){
    var el = document.getElementById(id);
    var err = document.getElementById('err-' + id);
    if(el){ el.classList.add('error'); }
    if(err){ err.textContent = msg; }
  }

  document.querySelectorAll('.pw-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var wrap = btn.closest('.input-with-toggle');
      var input = wrap && wrap.querySelector('input');
      if(!input) return;
      var isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.textContent = isPw ? '🙈' : '👁';
      btn.setAttribute('aria-label', isPw ? 'Passwort verbergen' : 'Passwort anzeigen');
    });
  });

  var forgot = document.getElementById('forgot-link');
  if(forgot){
    forgot.addEventListener('click', function(e){ e.preventDefault(); showToast('Bitte wenden Sie sich an Ihren Administrator.', 'info'); });
  }
  if(isSignup){
    var pw = document.getElementById('password');
    var passHint = document.getElementById('pass-hint');
    if(pw && passHint){
      pw.addEventListener('input', function(){
        var len = this.value.length;
        passHint.textContent = len >= 8 ? '✓ Mindestens 8 Zeichen erfüllt' : 'Mindestens 8 Zeichen erforderlich';
        passHint.classList.toggle('valid', len >= 8);
      });
    }
  }

  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var formErr = document.querySelector('.form-err');
      if(formErr) formErr.style.display = 'none';
      clearFieldErrors();
      var fd = new FormData(form);
      var body = {};
      fd.forEach(function(v,k){ body[k] = v; });
      var valid = true;
      if(!body.email || !String(body.email).trim()){
        setFieldError('email', 'E-Mail ist erforderlich');
        valid = false;
      }
      if(!body.password){
        setFieldError('password', 'Passwort ist erforderlich');
        valid = false;
      }
      if(isSignup && body.password && body.password.length < 8){
        setFieldError('password', 'Mindestens 8 Zeichen erforderlich');
        valid = false;
      }
      if(!valid){ showToast('Bitte alle Pflichtfelder korrekt ausfüllen.', 'error'); return; }
      setLoading(true);
      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (body.email || '').trim(), password: body.password, firstName: (body.firstName || '').trim() || undefined, lastName: (body.lastName || '').trim() || undefined })
      })
      .then(function(r){ return r.json().then(function(data){ return { ok: r.ok, status: r.status, data: data }; }).catch(function(){ return { ok: r.ok, status: r.status, data: {} }; }); })
      .then(function(res){
        setLoading(false);
        if(res.ok){
          window.location.href = '/';
        } else {
          var msg = (res.data && res.data.error) ? res.data.error : 'Anmeldung fehlgeschlagen';
          if(isSignup && msg.indexOf('E-Mail') !== -1){ setFieldError('email', msg); }
          showToast(msg, 'error');
        }
      })
      .catch(function(err){
        setLoading(false);
        showToast('Verbindungsfehler. Bitte erneut versuchen.', 'error');
      });
    });
  }
})();
  </script>
  <style>
  .toast{
    display:none;
    position:fixed;
    top:24px;
    left:50%;
    transform:translateX(-50%);
    padding:16px 24px;
    border-radius:12px;
    font-size:14px;
    font-weight:500;
    max-width:90%;
    z-index:9999;
    box-shadow:0 10px 40px rgba(0,0,0,.4);
  }
  .toast-error{ background:#EF4444; color:#fff }
  .toast-success{ background:#22C55E; color:#fff }
  .toast-info{ background:#3B82F6; color:#fff }
  </style>
</body>
</html>`;
}

app.get('/', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (req.session && req.session.userId) {
    const user = req.session.user || { id: req.session.userId, email: '', role: 'mitarbeiter', firstName: '', lastName: '' };
    const userJson = JSON.stringify(user).replace(/</g, '\\u003c');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('</head>', '<script>window.__INITIAL_USER__=' + userJson + ';</script><style id="auth-fix">#auth-page{pointer-events:none !important;}</style><script>if(window.__INITIAL_USER__){function show(){var m=document.getElementById("main-app"),a=document.getElementById("auth-page");if(m)m.classList.remove("hidden");if(a)a.classList.add("hidden");}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show);else show();}</script></head>');
    html = html.replace('id="main-app" class="page hidden"', 'id="main-app" class="page"');
    return res.type('html').send(html);
  }
  res.send(authShellHtml({ mode: 'login', errorMsg: req.query.error ? decodeURIComponent(String(req.query.error).replace(/\+/g, ' ')) : '' }));
});

app.get('/signup', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/');
  res.send(authShellHtml({ mode: 'signup', errorMsg: req.query.error ? decodeURIComponent(String(req.query.error).replace(/\+/g, ' ')) : '' }));
});

// Static erst NACH der "/"-Route, sonst liefert static direkt index.html aus
app.use(express.static(path.join(__dirname, 'public')));

// Alle anderen Pfade: nur SPA liefern wenn eingeloggt, sonst zur Login-Seite
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path === '/signup') return next();
  if (!req.session || !req.session.userId) return res.redirect('/');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const user = req.session.user || { id: req.session.userId, email: '', role: 'mitarbeiter', firstName: '', lastName: '' };
  const userJson = JSON.stringify(user).replace(/</g, '\\u003c');
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace('</head>', '<script>window.__INITIAL_USER__=' + userJson + ';</script><style id="auth-fix">#auth-page{pointer-events:none !important;}</style><script>if(window.__INITIAL_USER__){function show(){var m=document.getElementById("main-app"),a=document.getElementById("auth-page");if(m)m.classList.remove("hidden");if(a)a.classList.add("hidden");}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",show);else show();}</script></head>');
  html = html.replace('id="main-app" class="page hidden"', 'id="main-app" class="page"');
  res.type('html').send(html);
});

function createRedirectServer(port, targetUrl) {
  const s = http.createServer((req, res) => {
    res.writeHead(302, { Location: targetUrl });
    res.end();
  });
  s.listen(port, () => console.log('Weiterleitung: http://localhost:' + port + ' → ' + targetUrl)).on('error', () => {});
}

async function start() {
  await loadDb();
  const basePort = Number(PORT) || 3001;
  const maxTries = 10;

  for (let i = 0; i < maxTries; i++) {
    const p = basePort + i;
    const server = http.createServer(app);
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(p, resolve);
      });
      const appUrl = 'http://localhost:' + p;
      console.log('Mitarbeiterschichtplanung: ' + appUrl);
      if (p === 3001) createRedirectServer(3000, appUrl);
      return;
    } catch (err) {
      try { server.close(); } catch (_) {}
      if (err && err.code === 'EADDRINUSE') {
        console.error('Port ' + p + ' belegt. Versuche ' + (p + 1) + ' …');
        continue;
      }
      console.error('Start fehlgeschlagen:', err);
      process.exit(1);
    }
  }

  console.error('Kein freier Port zwischen ' + basePort + ' und ' + (basePort + maxTries - 1) + '.');
  console.error('Ports freigeben mit z.B.: kill $(lsof -t -i:' + basePort + ')');
  process.exit(1);
}
start().catch((err) => {
  console.error('Start fehlgeschlagen:', err);
  process.exit(1);
});
