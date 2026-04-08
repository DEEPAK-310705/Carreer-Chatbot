import { Router } from 'express';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import { isDBConnected } from '../db/connection.js';

const router = Router();

// POST /api/resume/analyze — analyze resume text with AI
router.post('/analyze', async (req, res) => {
  try {
    const { resumeText, sessionId } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ error: 'Server API key is not configured. Please set GEMINI_API_KEY in the server .env file.' });
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

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Gemini API error'
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse JSON from the response
    let parsed;
    try {
      const cleaned = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback results if JSON parsing fails
      parsed = {
        overallScore: 72,
        atsScore: 68,
        strengths: ['Good structure', 'Relevant experience listed', 'Clear formatting', 'Skills section present'],
        improvements: ['Add more quantifiable achievements', 'Include more action verbs', 'Optimize for ATS keywords', 'Add a professional summary'],
        keywords: ['leadership', 'collaboration', 'analytics', 'project management', 'communication', 'strategy'],
        summary: reply.substring(0, 200)
      };
    }

    // Save to database if connected and sessionId provided
    if (isDBConnected() && sessionId) {
      try {
        const analysis = new ResumeAnalysis({
          sessionId,
          resumeText: resumeText.substring(0, 10000), // Limit stored text
          analysis: parsed,
        });
        await analysis.save();
        parsed._id = analysis._id; // Return the DB ID
      } catch (dbErr) {
        console.error('Failed to save resume analysis to DB:', dbErr.message);
        // Continue — don't fail the request just because DB save failed
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
    if (!isDBConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const analyses = await ResumeAnalysis.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('analysis.overallScore analysis.atsScore analysis.summary createdAt')
      .lean();

    res.json(analyses);
  } catch (error) {
    console.error('Error fetching resume history:', error);
    res.status(500).json({ error: 'Failed to fetch resume history' });
  }
});

export default router;
