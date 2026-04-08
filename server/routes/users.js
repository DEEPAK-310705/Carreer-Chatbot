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

// POST /api/users/session — Get or create a user session
router.post('/session', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const user = await db.get('SELECT * FROM users WHERE sessionId = ?', [sessionId]);

    if (!user) {
      await db.run('INSERT INTO users (sessionId) VALUES (?)', [sessionId]);
      res.json({ sessionId, preferences: null });
    } else {
      await db.run('UPDATE users SET lastActive = CURRENT_TIMESTAMP WHERE sessionId = ?', [sessionId]);
      res.json({ sessionId: user.sessionId, preferences: user.preferences ? JSON.parse(user.preferences) : null });
    }
  } catch (error) {
    console.error('Error with user session:', error);
    res.status(500).json({ error: 'Failed to manage user session' });
  }
});

// PUT /api/users/preferences — Update user preferences
router.put('/preferences', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { sessionId, preferences } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const prefStr = JSON.stringify(preferences);
    
    // SQLite upsert
    await db.run(
      'INSERT INTO users (sessionId, preferences) VALUES (?, ?) ON CONFLICT(sessionId) DO UPDATE SET preferences = ?, lastActive = CURRENT_TIMESTAMP',
      [sessionId, prefStr, prefStr]
    );

    res.json({ sessionId, preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/users/preferences?sessionId=xxx — Get user preferences
router.get('/preferences', requireDB, async (req, res) => {
  try {
    const db = getDB();
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const user = await db.get('SELECT * FROM users WHERE sessionId = ?', [sessionId]);
    if (!user) return res.json({ preferences: null });

    res.json({ preferences: user.preferences ? JSON.parse(user.preferences) : null });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

export default router;
