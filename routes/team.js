const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const list = db.prepare('SELECT id, first_name, last_name, email, phone, department_id, role FROM users WHERE active = 1 ORDER BY last_name, first_name').all();
  const deptIds = [...new Set(list.map(u => u.department_id).filter(Boolean))];
  const depts = deptIds.length ? db.prepare(`SELECT id, name FROM departments WHERE id IN (${deptIds.map(() => '?').join(',')})`).all(...deptIds) : [];
  const deptMap = Object.fromEntries(depts.map(d => [d.id, d.name]));
  const isAdmin = req.session.role === 'admin';
  res.json(list.map(u => ({
    id: u.id,
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    phone: u.phone,
    departmentName: u.department_id ? deptMap[u.department_id] : null,
    ...(isAdmin ? { role: u.role } : {}),
  })));
});

module.exports = router;
