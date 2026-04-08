import { Router } from 'express';
import User from '../models/User.js';
import { isDBConnected } from '../db/connection.js';

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
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    let user = await User.findOne({ sessionId });

    if (!user) {
      user = new User({ sessionId });
      await user.save();
    } else {
      await user.touch();
    }

    res.json(user);
  } catch (error) {
    console.error('Error with user session:', error);
    res.status(500).json({ error: 'Failed to manage user session' });
  }
});

// PUT /api/users/preferences — Update user preferences
router.put('/preferences', requireDB, async (req, res) => {
  try {
    const { sessionId, preferences } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const user = await User.findOneAndUpdate(
      { sessionId },
      { $set: { preferences, lastActive: new Date() } },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/users/preferences?sessionId=xxx — Get user preferences
router.get('/preferences', requireDB, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const user = await User.findOne({ sessionId }).lean();
    if (!user) return res.json({ preferences: null });

    res.json({ preferences: user.preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

export default router;
