import { Router } from 'express';
import { isDBConnected, getDB } from '../db/connection.js';

const router = Router();

// Middleware: check DB connection
const requireDB = (req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  next();
};

const formatConv = (row) => ({
  _id: row.id,
  title: row.title,
  mode: row.mode,
  isActive: Boolean(row.isActive),
  messages: JSON.parse(row.messages || '[]'),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

// GET /api/conversations?sessionId=xxx
router.get('/', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const rows = await db.all('SELECT * FROM conversations WHERE sessionId = ? ORDER BY updatedAt DESC', [sessionId]);
    
    const result = rows.map(conv => {
      const parsed = formatConv(conv);
      return {
        _id: parsed._id,
        title: parsed.title,
        mode: parsed.mode,
        isActive: parsed.isActive,
        messageCount: parsed.messages.length,
        lastMessage: parsed.messages.length > 0
          ? parsed.messages[parsed.messages.length - 1].content.substring(0, 80)
          : '',
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// GET /api/conversations/:id
router.get('/:id', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const conv = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    res.json(formatConv(conv));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations
router.post('/', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { sessionId, mode, messages } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const msgs = messages || [];
    
    let title = 'New Conversation';
    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (firstUserMsg) {
      title = firstUserMsg.content.substring(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '');
    }

    await db.run(
      'INSERT INTO conversations (id, sessionId, title, mode, messages) VALUES (?, ?, ?, ?, ?)',
      [id, sessionId, mode || 'general', title, JSON.stringify(msgs)]
    );
    
    const newConv = await db.get('SELECT * FROM conversations WHERE id = ?', [id]);
    res.status(201).json(formatConv(newConv));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/conversations/:id
router.put('/:id', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { messages, title, isActive } = req.body;
    const conv = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    
    const parsed = formatConv(conv);
    if (messages) parsed.messages = messages;
    if (title) parsed.title = title;
    if (typeof isActive === 'boolean') parsed.isActive = isActive;
    
    if (parsed.title === 'New Conversation' && parsed.messages.length > 0) {
      const fMsg = parsed.messages.find(m => m.role === 'user');
      if (fMsg) parsed.title = fMsg.content.substring(0, 60) + (fMsg.content.length > 60 ? '...' : '');
    }
    
    await db.run(
      'UPDATE conversations SET title = ?, messages = ?, isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [parsed.title, JSON.stringify(parsed.messages), parsed.isActive ? 1 : 0, req.params.id]
    );
    
    const up = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    res.json(formatConv(up));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { role, content, voice } = req.body;
    const conv = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    if (!conv) return res.status(404).json({ error: 'Not found' });
    
    const parsed = formatConv(conv);
    parsed.messages.push({ role, content, voice, timestamp: new Date() });
    
    if (parsed.title === 'New Conversation' && role === 'user') {
      parsed.title = content.substring(0, 60) + (content.length > 60 ? '...' : '');
    }
    
    await db.run(
      'UPDATE conversations SET title = ?, messages = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [parsed.title, JSON.stringify(parsed.messages), req.params.id]
    );
    
    const up = await db.get('SELECT * FROM conversations WHERE id = ?', [req.params.id]);
    res.json(formatConv(up));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/conversations/:id
router.delete('/:id', requireDB, async (req, res) => {
  try {
    await getDB().run('DELETE FROM conversations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch(err) {
    res.status(500).json({error: err.message});
  }
});

// DELETE /api/conversations?sessionId=xxx
router.delete('/', requireDB, async (req, res) => {
  try {
    await getDB().run('DELETE FROM conversations WHERE sessionId = ?', [req.query.sessionId]);
    res.json({ message: 'Deleted' });
  } catch(err) {
    res.status(500).json({error: err.message});
  }
});

export default router;
