import { Router } from 'express';
import { isDBConnected, getDB } from '../db/connection.js';

const router = Router();

const isOpenRouterKey = (key = '') => String(key).trim().startsWith('sk-or-v1-');
const isGroqKey = (key = '') => String(key).trim().startsWith('gsk_');
const isOpenAIKey = (key = '') => {
  const trimmed = String(key).trim();
  return trimmed.startsWith('sk-') && !trimmed.startsWith('sk-or-v1-');
};
const isGeminiKey = (key = '') => String(key).trim().startsWith('AIza');

const classifyProviderError = (status, errorMessage = '') => {
  const message = String(errorMessage || '').toLowerCase();
  const isQuotaExceeded = status === 402
    || status === 429
    || /quota|insufficient_quota|resource_exhausted|billing|credit|payment|rate\s*limit/.test(message);
  const isInvalidApiKey = (status === 400 || status === 401 || status === 403)
    && /invalid|not valid|unauthorized|authentication|forbidden|api key|credentials|permission denied|unauthenticated/.test(message);

  if (isQuotaExceeded) {
    return { status: 429, body: { error: 'This API key has no remaining quota/credits.', code: 'QUOTA_EXCEEDED' } };
  }

  if (isInvalidApiKey) {
    return { status: 401, body: { error: 'The API key is invalid or unauthorized.', code: 'INVALID_API_KEY' } };
  }

  return { status: Math.max(400, status || 500), body: { error: errorMessage || 'Unable to validate API key.', code: 'KEY_TEST_FAILED' } };
};

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

// POST /api/users/validate-key — Validate API key and quota status
router.post('/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const key = String(apiKey || '').trim();

    if (!key) {
      return res.status(400).json({ error: 'API key is required', code: 'KEY_REQUIRED' });
    }

    if (!isGeminiKey(key) && !isOpenRouterKey(key) && !isGroqKey(key) && !isOpenAIKey(key)) {
      return res.status(400).json({
        error: 'Use a valid Gemini key (AIza...), OpenRouter key (sk-or-v1-...), Groq key (gsk_...), or OpenAI key (sk-...).',
        code: 'INVALID_FORMAT'
      });
    }

    if (isOpenRouterKey(key)) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Reply with: OK' }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.message || 'OpenRouter API error';
        const failure = classifyProviderError(response.status, errorMessage);
        return res.status(failure.status).json(failure.body);
      }

      return res.json({ valid: true, provider: 'openrouter', message: 'OpenRouter API key is valid and ready.' });
    }

    if (isOpenAIKey(key)) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Reply with: OK' }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.message || 'OpenAI API error';
        const failure = classifyProviderError(response.status, errorMessage);
        return res.status(failure.status).json(failure.body);
      }

      return res.json({ valid: true, provider: 'openai', message: 'OpenAI API key is valid and ready.' });
    }

    if (isGroqKey(key)) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Reply with: OK' }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error?.message || data?.message || 'Groq API error';
        const failure = classifyProviderError(response.status, errorMessage);
        return res.status(failure.status).json(failure.body);
      }

      return res.json({ valid: true, provider: 'groq', message: 'Groq API key is valid and ready.' });
    }

    const modelCandidates = [
      process.env.GEMINI_MODEL,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-8b'
    ].filter(Boolean);

    let lastStatus = 500;
    let lastErrorMessage = 'Gemini API error';

    for (const model of modelCandidates) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with: OK' }] }]
          })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return res.json({ valid: true, provider: 'gemini', message: 'Gemini API key is valid and ready.' });
      }

      lastStatus = response.status;
      lastErrorMessage = data?.error?.message || 'Gemini API error';
      const isUnsupportedModel = /not found for api version|not supported for generatecontent|not found/i.test(lastErrorMessage);
      if (isUnsupportedModel) continue;

      const failure = classifyProviderError(lastStatus, lastErrorMessage);
      return res.status(failure.status).json(failure.body);
    }

    const failure = classifyProviderError(lastStatus, lastErrorMessage);
    return res.status(failure.status).json(failure.body);
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ error: 'Unable to validate API key right now.', code: 'KEY_TEST_FAILED' });
  }
});

export default router;
