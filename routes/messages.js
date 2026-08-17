const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

// 1) Conversation list with unread counts (from conversations + conversation_members + chat_messages)
router.get('/conversations', (req, res) => {
  const userId = req.session.userId;
  const rows = db.prepare(`
    SELECT
      c.id, c.type, c.title, c.created_at,
      (SELECT m.body FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastBody,
      (SELECT m.created_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastAt,
      (SELECT m.sender_id FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastSenderId,
      (SELECT COUNT(*) FROM chat_messages m
       JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = ?
       WHERE m.conversation_id = c.id AND m.id > COALESCE(cm.last_read_message_id, 0) AND m.sender_id != ?) AS unreadCount
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY COALESCE(lastAt, c.created_at) DESC
  `).all(userId, userId, userId);
  const out = rows.map(r => ({
    id: r.id,
    conversationId: r.id,
    type: r.type,
    title: r.title,
    createdAt: r.created_at,
    lastBody: r.lastBody,
    lastMessageSnippet: (r.lastBody || '').slice(0, 80),
    lastAt: r.lastAt,
    lastMessageAt: r.lastAt,
    lastSenderId: r.lastSenderId || null,
    unreadCount: r.unreadCount || 0
  }));
  out.forEach(c => {
    if (c.type === 'dm' && !c.title) {
      const other = db.prepare('SELECT u.first_name, u.last_name, u.email FROM conversation_members cm JOIN users u ON u.id = cm.user_id WHERE cm.conversation_id = ? AND cm.user_id != ?').get(c.id, userId);
      c.title = other ? [other.first_name, other.last_name].filter(Boolean).join(' ') || other.email : 'DM';
    }
  });
  res.json(out);
});

// 2) Create conversation (dm or team); return existing if DM/Team already exists
router.post('/conversations', (req, res) => {
  try {
    const userId = req.session.userId;
    const { type, title, userIds } = req.body || {};
    if (!type || !Array.isArray(userIds)) return res.status(400).json({ error: 'invalid_body' });
    if (!['dm', 'team', 'shift'].includes(type)) return res.status(400).json({ error: 'invalid_type' });

    if (type === 'dm' && userIds.length === 1) {
      const otherId = parseInt(userIds[0], 10);
      const existing = db.prepare(`
        SELECT c.id FROM conversations c
        WHERE c.type = 'dm'
        AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) = 2
        AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = ?)
        AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = ?)
      `).get(userId, otherId);
      if (existing) return res.status(200).json({ id: existing.id });
    }

    if (type === 'team') {
      const existing = db.prepare(`
        SELECT c.id FROM conversations c
        JOIN conversation_members cm ON cm.conversation_id = c.id
        WHERE c.type = 'team' AND cm.user_id = ?
        ORDER BY c.id ASC LIMIT 1
      `).get(userId);
      if (existing) return res.status(200).json({ id: existing.id });
    }

    const memberIds = [...new Set([userId, ...userIds.map(id => parseInt(id, 10)).filter(Boolean)])];
    db.prepare('INSERT INTO conversations (type, title, created_by) VALUES (?, ?, ?)').run(type, title || null, userId);
    const lastRow = db.prepare('SELECT id FROM conversations ORDER BY id DESC LIMIT 1').get();
    const convId = lastRow ? lastRow.id : null;
    if (convId == null) return res.status(500).json({ error: 'Konversation konnte nicht angelegt werden.' });
    const ins = db.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id, user_id) VALUES (?, ?)');
    memberIds.forEach(uid => ins.run(convId, uid));
    res.status(201).json({ id: convId });
  } catch (e) {
    console.error('POST /conversations', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

// 3) Get messages in conversation (with membership check)
router.get('/conversations/:id', (req, res) => {
  const userId = req.session.userId;
  const convId = parseInt(req.params.id, 10);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const beforeId = parseInt(req.query.beforeId, 10) || 0;
  const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(convId, userId);
  if (!member) return res.status(403).json({ error: 'not_member' });
  let sql = 'SELECT m.id, m.conversation_id, m.sender_id, m.subject, m.body, m.created_at, u.first_name, u.last_name FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ?';
  const params = [convId];
  if (beforeId) { sql += ' AND m.id < ?'; params.push(beforeId); }
  sql += ' ORDER BY m.id DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  res.json(rows.reverse().map(m => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderName: [m.first_name, m.last_name].filter(Boolean).join(' ') || null,
    subject: m.subject || null,
    body: m.body,
    createdAt: m.created_at,
    fromMe: m.sender_id === userId
  })));
});

// 4) Send message (body required, subject optional)
router.post('/conversations/:id/messages', (req, res) => {
  try {
    const userId = req.session.userId;
    const convId = parseInt(req.params.id, 10);
    if (!Number.isInteger(convId) || convId < 1) return res.status(400).json({ error: 'invalid_conversation' });
    const body = String(req.body?.body || '').trim();
    const subject = req.body?.subject != null ? String(req.body.subject).trim() || null : null;
    if (!body) return res.status(400).json({ error: 'empty_message' });
    const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(convId, userId);
    if (!member) return res.status(403).json({ error: 'not_member' });
    db.prepare('INSERT INTO chat_messages (conversation_id, sender_id, subject, body) VALUES (?, ?, ?, ?)').run(convId, userId, subject, body);
    const row = db.prepare('SELECT id FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1').get(convId);
    const msgId = row ? row.id : null;
    if (msgId == null) return res.status(500).json({ error: 'Nachricht konnte nicht gespeichert werden.' });
    res.status(201).json({ id: msgId });
  } catch (e) {
    console.error('POST /conversations/:id/messages', e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

// 5) Mark as read
router.post('/conversations/:id/read', (req, res) => {
  const userId = req.session.userId;
  const convId = parseInt(req.params.id, 10);
  const lastReadMessageId = parseInt(req.body?.lastReadMessageId, 10) || 0;
  const cur = db.prepare('SELECT last_read_message_id FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(convId, userId);
  const newVal = Math.max(cur?.last_read_message_id || 0, lastReadMessageId);
  db.prepare('UPDATE conversation_members SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?').run(newVal, convId, userId);
  res.json({ ok: true });
});

// Helper: get conversation title and members (for display)
router.get('/conversations/:id/info', (req, res) => {
  const userId = req.session.userId;
  const convId = parseInt(req.params.id, 10);
  const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(convId, userId);
  if (!member) return res.status(403).json({ error: 'not_member' });
  const c = db.prepare('SELECT id, type, title FROM conversations WHERE id = ?').get(convId);
  if (!c) return res.status(404).json({ error: 'conversation_not_found' });
  const members = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.email FROM conversation_members cm
    JOIN users u ON u.id = cm.user_id WHERE cm.conversation_id = ?
  `).all(convId);
  let title = c.title;
  if (c.type === 'dm' && members.length === 2) {
    const other = members.find(m => m.id !== userId);
    title = other ? [other.first_name, other.last_name].filter(Boolean).join(' ') || other.email : 'DM';
  }
  res.json({ id: c.id, type: c.type, title: title || 'Chat', members: members.map(m => ({ id: m.id, firstName: m.first_name, lastName: m.last_name, email: m.email })) });
});

// 6) Mark all conversations as read
function markAllRead(req, res) {
  const userId = req.session.userId;
  const convs = db.prepare('SELECT conversation_id FROM conversation_members WHERE user_id = ?').all(userId);
  for (const row of convs) {
    const maxMsg = db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM chat_messages WHERE conversation_id = ?').get(row.conversation_id);
    if (maxMsg && maxMsg.id > 0) {
      db.prepare('UPDATE conversation_members SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?').run(maxMsg.id, row.conversation_id, userId);
    }
  }
  res.json({ ok: true });
}
router.post('/read-all', markAllRead);
router.post('/mark-all-read', markAllRead);

module.exports = router;
