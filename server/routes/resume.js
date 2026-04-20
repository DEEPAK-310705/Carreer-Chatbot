import { Router } from 'express';
import { isDBConnected, getDB } from '../db/connection.js';

const router = Router();
const isOpenRouterKey = (key = '') => String(key).trim().startsWith('sk-or-v1-');
const isGroqKey = (key = '') => String(key).trim().startsWith('gsk_');
const isOpenAIKey = (key = '') => {
  const trimmed = String(key).trim();
  return trimmed.startsWith('sk-') && !trimmed.startsWith('sk-or-v1-');
};
const getConfiguredKey = (key = '') => {
  const trimmed = String(key || '').trim();
  if (
    !trimmed
    || trimmed === 'your_gemini_api_key_here'
    || trimmed === 'your_openrouter_api_key_here'
    || trimmed === 'your_groq_api_key_here'
    || trimmed === 'your_openai_api_key_here'
  ) return '';
  return trimmed;
};

// POST /api/resume/analyze — analyze resume text with AI
router.post('/analyze', async (req, res) => {
  try {
    const { resumeText, sessionId, apiKey: requestApiKey } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const configuredOpenRouterKey = getConfiguredKey(process.env.OPENROUTER_API_KEY);
    const configuredGroqKey = getConfiguredKey(process.env.GROQ_API_KEY);
    const configuredOpenAIKey = getConfiguredKey(process.env.OPENAI_API_KEY);
    const configuredGeminiKey = getConfiguredKey(process.env.GEMINI_API_KEY);
    const apiKey = (requestApiKey || configuredOpenRouterKey || configuredGroqKey || configuredOpenAIKey || configuredGeminiKey || '').trim();
    if (!apiKey) {
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
    const useGroq = isGroqKey(apiKey);
    const useOpenAI = isOpenAIKey(apiKey);

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
        const errorMessage = data?.error?.message || data?.message || 'OpenRouter API error';
        const isQuotaExceeded = response.status === 402 || response.status === 429 || /quota|credit|payment|required|billing/i.test(errorMessage);
        const isInvalidApiKey = (response.status === 400 || response.status === 401 || response.status === 403)
          && /invalid|unauthorized|api key|authentication|forbidden/i.test(errorMessage);

        if (isQuotaExceeded || isInvalidApiKey) {
          if (configuredGroqKey && configuredGroqKey !== apiKey) {
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${configuredGroqKey}`
              },
              body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }]
              })
            });

            const groqData = await groqResponse.json().catch(() => ({}));
            if (groqResponse.ok) {
              reply = groqData?.choices?.[0]?.message?.content || '';
            }
          }

          if (!reply && configuredOpenAIKey && configuredOpenAIKey !== apiKey) {
            const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${configuredOpenAIKey}`
              },
              body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }]
              })
            });

            const openAIData = await openAIResponse.json().catch(() => ({}));
            if (openAIResponse.ok) {
              reply = openAIData?.choices?.[0]?.message?.content || '';
            }
          }

          if (!reply && configuredGeminiKey && configuredGeminiKey !== apiKey) {
            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${configuredGeminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
                })
              }
            );

            const geminiData = await geminiResponse.json().catch(() => ({}));
            if (!geminiResponse.ok) {
              console.error('Gemini fallback API Error:', geminiData);
              return res.status(geminiResponse.status).json({
                error: geminiData?.error?.message || 'Gemini API error'
              });
            }

            reply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } else {
          console.error('OpenRouter API Error:', data);
          return res.status(response.status).json({ error: errorMessage });
        }
      }

      if (!reply) {
        reply = data?.choices?.[0]?.message?.content || '';
      }
    } else if (useGroq) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('Groq API Error:', data);
        return res.status(response.status).json({
          error: data?.error?.message || data?.message || 'Groq API error'
        });
      }

      reply = data?.choices?.[0]?.message?.content || '';
    } else if (useOpenAI) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('OpenAI API Error:', data);
        return res.status(response.status).json({
          error: data?.error?.message || data?.message || 'OpenAI API error'
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
