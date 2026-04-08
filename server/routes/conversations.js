import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import { isDBConnected } from '../db/connection.js';

const router = Router();

// Middleware: check DB connection
const requireDB = (req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({ error: 'Database not connected. Data will not persist.' });
  }
  next();
};

// GET /api/conversations?sessionId=xxx — List all conversations for a session
router.get('/', requireDB, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const conversations = await Conversation.find({ sessionId })
      .sort({ updatedAt: -1 })
      .select('title mode isActive createdAt updatedAt messages')
      .lean();

    // Add message count and last message preview
    const result = conversations.map(conv => ({
      _id: conv._id,
      title: conv.title,
      mode: conv.mode,
      isActive: conv.isActive,
      messageCount: conv.messages.length,
      lastMessage: conv.messages.length > 0
        ? conv.messages[conv.messages.length - 1].content.substring(0, 80)
        : '',
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:id — Get a single conversation with all messages
router.get('/:id', requireDB, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /api/conversations — Create a new conversation
router.post('/', requireDB, async (req, res) => {
  try {
    const { sessionId, mode, messages } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const conversation = new Conversation({
      sessionId,
      mode: mode || 'general',
      messages: messages || [],
    });

    if (messages && messages.length > 0) {
      conversation.autoTitle();
    }

    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// PUT /api/conversations/:id — Update a conversation (add messages, rename, etc.)
router.put('/:id', requireDB, async (req, res) => {
  try {
    const { messages, title, isActive } = req.body;
    const update = {};

    if (messages) update.messages = messages;
    if (title) update.title = title;
    if (typeof isActive === 'boolean') update.isActive = isActive;

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // Auto-title if still default and has messages
    if (conversation.title === 'New Conversation' && conversation.messages.length > 0) {
      conversation.autoTitle();
      await conversation.save();
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// POST /api/conversations/:id/messages — Append a single message
router.post('/:id/messages', requireDB, async (req, res) => {
  try {
    const { role, content, voice } = req.body;
    if (!role || !content) return res.status(400).json({ error: 'role and content are required' });

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          messages: { role, content, voice, timestamp: new Date() }
        }
      },
      { new: true }
    );

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    // Auto-title on first user message
    if (conversation.title === 'New Conversation') {
      conversation.autoTitle();
      await conversation.save();
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// DELETE /api/conversations/:id — Delete a conversation
router.delete('/:id', requireDB, async (req, res) => {
  try {
    const result = await Conversation.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// DELETE /api/conversations?sessionId=xxx — Delete all conversations for a session
router.delete('/', requireDB, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const result = await Conversation.deleteMany({ sessionId });
    res.json({ message: `Deleted ${result.deletedCount} conversations` });
  } catch (error) {
    console.error('Error deleting conversations:', error);
    res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

export default router;
