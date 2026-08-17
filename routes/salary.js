const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

const HOURS_PER_MONTH_DEFAULT = 160;
const NETTO_FACTOR = { 1: 0.62, 2: 0.64, 3: 0.66, 4: 0.62, 5: 0.52, 6: 0.50 };

router.get('/', (req, res) => {
  try {
    const row = db.prepare('SELECT hourly_rate, tax_class FROM salary_info WHERE user_id = ?').get(req.session.userId);
    const hourlyRate = row ? (row.hourly_rate != null ? row.hourly_rate : null) : null;
    const taxClass = row && row.tax_class != null ? row.tax_class : 1;
    const hoursPerMonth = HOURS_PER_MONTH_DEFAULT;
    const gross = hourlyRate != null ? hourlyRate * hoursPerMonth : null;
    const net = (gross != null && gross > 0) ? Math.round(gross * (NETTO_FACTOR[taxClass] ?? 0.62) * 100) / 100 : null;
    res.json({
      hourlyRate: hourlyRate != null ? Number(hourlyRate) : null,
      taxClass: Number(taxClass),
      hoursPerMonth,
      gross: gross != null ? Math.round(gross * 100) / 100 : null,
      net: net,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', (req, res) => {
  const { tax_class: taxClass, hourly_rate: hourlyRate, hours_per_month: hoursPerMonth } = req.body || {};
  const userId = req.session.userId;
  const tc = Math.min(6, Math.max(1, parseInt(taxClass, 10) || 1));
  const rate = hourlyRate != null ? parseFloat(hourlyRate) : null;
  try {
    const existing = db.prepare('SELECT id FROM salary_info WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare('UPDATE salary_info SET hourly_rate = ?, tax_class = ?, updated_at = datetime("now") WHERE user_id = ?').run(rate, tc, userId);
    } else {
      db.prepare('INSERT INTO salary_info (user_id, hourly_rate, tax_class) VALUES (?, ?, ?)').run(userId, rate, tc);
    }
    const row = db.prepare('SELECT hourly_rate, tax_class FROM salary_info WHERE user_id = ?').get(userId);
    const h = row ? (row.hourly_rate != null ? row.hourly_rate : null) : null;
    const hours = hoursPerMonth != null ? parseFloat(hoursPerMonth) : HOURS_PER_MONTH_DEFAULT;
    const gross = h != null ? h * hours : null;
    const net = (gross != null && gross > 0) ? Math.round(gross * (NETTO_FACTOR[tc] ?? 0.62) * 100) / 100 : null;
    res.json({
      hourlyRate: h != null ? Number(h) : null,
      taxClass: tc,
      hoursPerMonth: hours,
      gross: gross != null ? Math.round(gross * 100) / 100 : null,
      net: net,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
