const bcrypt = require('bcryptjs');

const MIN_PASSWORD_LENGTH = 8;
const REQUIRE_NUMBER = true;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function comparePassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function validatePassword(plain) {
  if (!plain || plain.length < MIN_PASSWORD_LENGTH)
    return { ok: false, error: `Passwort mindestens ${MIN_PASSWORD_LENGTH} Zeichen` };
  if (REQUIRE_NUMBER && !/\d/.test(plain))
    return { ok: false, error: 'Passwort muss mindestens eine Zahl enthalten' };
  return { ok: true };
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    if (req.xhr || req.headers.accept?.includes('application/json'))
      return res.status(401).json({ error: 'Nicht angemeldet' });
    return res.redirect('/');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId)
    return res.status(401).json({ error: 'Nicht angemeldet' });
  if (req.session.role !== 'admin')
    return res.status(403).json({ error: 'Keine Berechtigung' });
  next();
}

module.exports = { hashPassword, comparePassword, validatePassword, requireAuth, requireAdmin };
