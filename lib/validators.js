/**
 * Zentrale Body/Query-Validierung. Gibt bei Fehler { error: string } zurück, sonst null.
 * Nutzung: const err = validateBody(req.body, { email: 'string!', role: 'string?' });
 *          if (err) return res.status(400).json(err);
 */

function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

function validateBody(body, schema) {
  if (!body || typeof body !== 'object') body = {};
  for (const [key, rule] of Object.entries(schema)) {
    const val = body[key];
    const required = rule.endsWith('!');
    const optional = rule.endsWith('?');
    const type = rule.replace(/[!?]$/, '');
    if (!isPresent(val)) {
      if (required) return { error: `"${key}" ist erforderlich` };
      continue;
    }
    switch (type) {
      case 'string':
        if (typeof val !== 'string') return { error: `"${key}" muss ein Text sein` };
        if (required && !val.trim()) return { error: `"${key}" darf nicht leer sein` };
        break;
      case 'number':
      case 'integer': {
        const n = Number(val);
        if (Number.isNaN(n)) return { error: `"${key}" muss eine Zahl sein` };
        if (type === 'integer' && !Number.isInteger(n)) return { error: `"${key}" muss eine ganze Zahl sein` };
        break;
      }
      case 'date':
        if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val))
          return { error: `"${key}" muss ein Datum (YYYY-MM-DD) sein` };
        break;
      case 'time':
        if (typeof val !== 'string' || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(val))
          return { error: `"${key}" muss eine Uhrzeit (HH:MM) sein` };
        break;
      case 'email':
        if (typeof val !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
          return { error: `"${key}" muss eine gültige E-Mail sein` };
        break;
      case 'array':
        if (!Array.isArray(val)) return { error: `"${key}" muss eine Liste sein` };
        break;
      default:
        break;
    }
  }
  return null;
}

function validateQuery(query, schema) {
  return validateBody(query, schema);
}

/** Id-Parameter prüfen (positive Integer). */
function validateIdParam(id, name = 'id') {
  const n = parseInt(id, 10);
  if (Number.isNaN(n) || n < 1) return { error: `Ungültige ${name}` };
  return null;
}

module.exports = { validateBody, validateQuery, validateIdParam, isPresent };
