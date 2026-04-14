import { Router } from 'express';
import { isDBConnected, getDB } from '../db/connection.js';

const router = Router();
const isOpenRouterKey = (key = '') => String(key).trim().startsWith('sk-or-v1-');

// POST /api/resume/analyze — analyze resume text with AI
router.post('/analyze', async (req, res) => {
  try {
    const { resumeText, sessionId, apiKey: requestApiKey } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const apiKey = (requestApiKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ error: 'Server API key is not configured' });
    }

    const prompt = `Analyze this resume and provide a detailed evaluation. Return your response in EXACTLY this JSON format (no markdown, no code blocks, just pure JSON):
{
  "overallScore": <number 0-100>,
  "atsScore": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>", "<strength 4>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>", "<improvement 4>"],
  "keywords": ["<keyword 1>", "<keyword 2>", "<keyword 3>", "<keyword 4>", "<keyword 5>", "<keyword 6>"],
  "summary": "<2-3 sentence overall assessment>"
}

Resume to analyze:
${resumeText}`;

    const useOpenRouter = isOpenRouterKey(apiKey);

    let reply = '';

    if (useOpenRouter) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('OpenRouter API Error:', data);
        return res.status(response.status).json({
          error: data?.error?.message || data?.message || 'OpenRouter API error'
        });
      }

      reply = data?.choices?.[0]?.message?.content || '';
    } else {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Gemini API Error:', data);
        return res.status(response.status).json({
          error: data?.error?.message || 'Gemini API error'
        });
      }

      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    let parsed;
    try {
      const cleaned = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        overallScore: 72,
        atsScore: 68,
        strengths: ['Good structure', 'Relevant experience listed', 'Clear formatting', 'Skills section present'],
        improvements: ['Add more quantifiable achievements', 'Include more action verbs', 'Optimize for ATS keywords', 'Add a professional summary'],
        keywords: ['leadership', 'collaboration', 'analytics', 'project management', 'communication', 'strategy'],
        summary: reply.substring(0, 200)
      };
    }

    if (isDBConnected() && sessionId) {
      try {
        const db = getDB();
        const resObj = await db.run(
          'INSERT INTO resume_analyses (sessionId, resumeText, analysis) VALUES (?, ?, ?)',
          [sessionId, resumeText.substring(0, 10000), JSON.stringify(parsed)]
        );
        parsed._id = resObj.lastID; 
      } catch (dbErr) {
        console.error('Failed to save resume analysis to DB:', dbErr.message);
      }
    }

    res.json(parsed);
  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/resume/history?sessionId=xxx — Get past resume analyses
router.get('/history', async (req, res) => {
  try {
    if (!isDBConnected()) return res.status(503).json({ error: 'Database not connected' });

    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const db = getDB();
    const rows = await db.all('SELECT * FROM resume_analyses WHERE sessionId = ? ORDER BY createdAt DESC LIMIT 20', [sessionId]);

    const analyses = rows.map(r => {
      const p = JSON.parse(r.analysis || '{}');
      return {
        _id: r.id,
        analysis: {
          overallScore: p.overallScore,
          atsScore: p.atsScore,
          summary: p.summary
        },
        createdAt: r.createdAt
      }
    });

    res.json(analyses);
  } catch (error) {
    console.error('Error fetching resume history:', error);
    res.status(500).json({ error: 'Failed to fetch resume history' });
  }
});

export default router;
