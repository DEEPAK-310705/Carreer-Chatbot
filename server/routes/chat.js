import { Router } from 'express';

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

const modePrompts = {
  general: 'You are an experienced career guidance advisor and professional coach. Provide clear, actionable advice about career development, job searching, interviews, salary negotiations, and professional growth. Be supportive and encouraging.',
  interview: 'You are an expert interview coach. Help prepare for interviews by providing tips on answering common questions, behavioral questions, technical preparation, and post-interview follow-up. Use the STAR method when explaining.',
  resume: 'You are a professional resume and cover letter expert. Provide detailed advice on structuring resumes, optimizing for ATS, highlighting achievements, and writing compelling cover letters.',
  salary: 'You are a salary negotiation specialist. Help research fair compensation, understand salary bands, negotiate offers, and understand benefits packages. Be data-driven in your advice.',
  skills: 'You are a professional development mentor. Help identify in-demand skills, create learning paths, recommend courses, and track career growth. Focus on practical skill-building strategies.'
};

const truncate = (text = '', max = 400) => {
  if (typeof text !== 'string') return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const getLatestUserMessage = (messages = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return messages[i]?.content || '';
  }
  return '';
};

const buildQuotaFallbackReply = ({ mode = 'general', userMessage = '' }) => {
  const safeUserMessage = truncate(userMessage, 300) || 'your request';

  const modeAdvice = {
    interview: [
      '1) Clarify the role and required skills from the job description.',
      '2) Prepare 3 STAR stories: challenge, action, measurable result.',
      '3) Practice a 60-second self-introduction tied to business impact.',
      '4) Prepare 5 smart questions about team goals and success metrics.'
    ],
    resume: [
      '1) Put role-targeted keywords in your summary and top bullets.',
      '2) Rewrite bullets as Action + Impact + Metric.',
      '3) Keep formatting ATS-friendly (simple headings, no tables).',
      '4) Prioritize recent, relevant experience on the first page.'
    ],
    salary: [
      '1) Research market range using role, location, and experience level.',
      '2) Define your target, walk-away number, and ideal benefits mix.',
      '3) Negotiate total compensation, not only base salary.',
      '4) Use evidence-based language: impact, benchmarks, competing demand.'
    ],
    skills: [
      '1) Pick one target role and map its top 6 required skills.',
      '2) Build a 30-day plan: daily practice + one weekly project.',
      '3) Create portfolio proof for each skill (demo, case study, repo).',
      '4) Track progress weekly and adjust based on results.'
    ],
    general: [
      '1) Define a specific career goal for the next 90 days.',
      '2) Focus on high-leverage actions: networking, portfolio, interview prep.',
      '3) Measure outcomes weekly (applications, callbacks, interviews).',
      '4) Iterate your strategy every two weeks based on response quality.'
    ]
  };

  const tips = modeAdvice[mode] || modeAdvice.general;

  return [
    "I hit a temporary AI quota limit, so here is practical guidance right away:",
    '',
    `Based on your request about \"${safeUserMessage}\", use this plan:`,
    ...tips,
    '',
    'If you want, send your exact situation (role, experience, location), and I will tailor this into a step-by-step strategy.'
  ].join('\n');
};

// POST /api/chat — send a message and get AI response
router.post('/', async (req, res) => {
  try {
    const { messages, mode, apiKey: requestApiKey } = req.body;
    const usingUserProvidedKey = Boolean(requestApiKey && String(requestApiKey).trim());
    const configuredOpenRouterKey = getConfiguredKey(process.env.OPENROUTER_API_KEY);
    const configuredGroqKey = getConfiguredKey(process.env.GROQ_API_KEY);
    const configuredOpenAIKey = getConfiguredKey(process.env.OPENAI_API_KEY);
    const configuredGeminiKey = getConfiguredKey(process.env.GEMINI_API_KEY);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const apiKey = (requestApiKey || configuredOpenRouterKey || configuredGroqKey || configuredOpenAIKey || configuredGeminiKey || '').trim();
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required. Enter a Gemini, OpenAI, OpenRouter, or Groq API key to continue.' });
    }

    const useOpenRouter = isOpenRouterKey(apiKey);
    const useGroq = isGroqKey(apiKey);
    const useOpenAI = isOpenAIKey(apiKey);

    // Build system prompt based on mode
    const systemPrompt = `${modePrompts[mode] || modePrompts.general} Additionally, answer ANY question the user asks helpfully and thoroughly, even if it's not directly about career topics. Be friendly, knowledgeable, and provide practical advice.`;

    // Take last 10 messages for context
    const recent = messages.slice(-10);

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...recent.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    const requestGeminiReply = async (geminiApiKey, { isUserKey = false } = {}) => {
      const modelCandidates = [
        process.env.GEMINI_MODEL,
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash-8b'
      ].filter(Boolean);

      let lastErrorMessage = 'Gemini API error';
      let lastStatus = 503;

      for (const model of modelCandidates) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
          return { ok: true, status: 200, body: { reply } };
        }

        lastStatus = response.status;
        lastErrorMessage = data.error?.message || 'Gemini API error';

        const isUnsupportedModel = /not found for api version|not supported for generateContent|not found/i.test(lastErrorMessage);
        const isTemporaryCapacity = /high demand|overloaded|unavailable|try again later/i.test(lastErrorMessage);
        const isQuotaExceeded = response.status === 429 || /quota exceeded|resource_exhausted|billing/i.test(lastErrorMessage);
        const isInvalidApiKey = (response.status === 400 || response.status === 401 || response.status === 403)
          && /api key not valid|invalid api key|permission denied|unauthenticated|credentials/i.test(lastErrorMessage);

        // Retry with the next candidate model for model/version mismatch or temporary capacity issues.
        if (isUnsupportedModel || isTemporaryCapacity) {
          continue;
        }

        if (isQuotaExceeded) {
          console.error(`Gemini API quota error (${model}):`, data);

          if (isUserKey) {
            return {
              ok: false,
              status: 429,
              body: {
                error: 'This API key has no remaining quota. Enter a different Gemini API key.',
                code: 'QUOTA_EXCEEDED'
              }
            };
          }

          const fallbackReply = buildQuotaFallbackReply({
            mode,
            userMessage: getLatestUserMessage(messages)
          });

          return {
            ok: false,
            status: 200,
            body: {
              reply: fallbackReply,
              fallback: true,
              provider: 'local',
              warning: 'Gemini API quota exceeded for this key. Showing local fallback guidance.'
            }
          };
        }

        if (isInvalidApiKey && isUserKey) {
          return {
            ok: false,
            status: 401,
            body: {
              error: 'The API key is invalid or unauthorized. Please enter a valid Gemini API key.',
              code: 'INVALID_API_KEY'
            }
          };
        }

        console.error(`Gemini API Error (${model}):`, data);
        return { ok: false, status: response.status, body: { error: lastErrorMessage } };
      }

      console.error('Gemini API Error (all fallback models failed):', lastErrorMessage);
      return { ok: false, status: lastStatus, body: { error: lastErrorMessage } };
    };

    const requestOpenAIReply = async (openAiApiKey, { isUserKey = false } = {}) => {
      const openAIModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: openAIModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...recent.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          ]
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const reply = data?.choices?.[0]?.message?.content || "I couldn't generate a response.";
        return { ok: true, status: 200, body: { reply } };
      }

      const errorMessage = data?.error?.message || data?.message || 'OpenAI API error';
      const isQuotaExceeded = response.status === 429 || /quota|insufficient_quota|billing|rate\s*limit/i.test(errorMessage);
      const isInvalidApiKey = (response.status === 400 || response.status === 401 || response.status === 403)
        && /invalid|incorrect api key|unauthorized|authentication|forbidden|api key/i.test(errorMessage);

      if (isQuotaExceeded) {
        if (isUserKey) {
          return {
            ok: false,
            status: 429,
            body: {
              error: 'This OpenAI API key has no remaining quota. Enter a different API key.',
              code: 'QUOTA_EXCEEDED'
            }
          };
        }

        const fallbackReply = buildQuotaFallbackReply({
          mode,
          userMessage: getLatestUserMessage(messages)
        });

        return {
          ok: false,
          status: 200,
          body: {
            reply: fallbackReply,
            fallback: true,
            provider: 'local',
            warning: 'OpenAI quota exceeded for this key. Showing local fallback guidance.'
          }
        };
      }

      if (isInvalidApiKey && isUserKey) {
        return {
          ok: false,
          status: 401,
          body: {
            error: 'The API key is invalid or unauthorized. Please enter a valid OpenAI API key.',
            code: 'INVALID_API_KEY'
          }
        };
      }

      console.error('OpenAI API Error:', data);
      return { ok: false, status: response.status, body: { error: errorMessage } };
    };

    const requestGroqReply = async (groqApiKey, { isUserKey = false } = {}) => {
      const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...recent.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          ]
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const reply = data?.choices?.[0]?.message?.content || "I couldn't generate a response.";
        return { ok: true, status: 200, body: { reply } };
      }

      const errorMessage = data?.error?.message || data?.message || 'Groq API error';
      const isQuotaExceeded = response.status === 402 || response.status === 429 || /quota|credit|payment|required|billing|rate\s*limit/i.test(errorMessage);
      const isInvalidApiKey = (response.status === 400 || response.status === 401 || response.status === 403)
        && /invalid|incorrect api key|unauthorized|authentication|forbidden|api key/i.test(errorMessage);

      if (isQuotaExceeded) {
        if (isUserKey) {
          return {
            ok: false,
            status: 429,
            body: {
              error: 'This Groq API key has no remaining quota/credits. Enter a different API key.',
              code: 'QUOTA_EXCEEDED'
            }
          };
        }

        const fallbackReply = buildQuotaFallbackReply({
          mode,
          userMessage: getLatestUserMessage(messages)
        });

        return {
          ok: false,
          status: 200,
          body: {
            reply: fallbackReply,
            fallback: true,
            provider: 'local',
            warning: 'Groq quota exceeded for this key. Showing local fallback guidance.'
          }
        };
      }

      if (isInvalidApiKey && isUserKey) {
        return {
          ok: false,
          status: 401,
          body: {
            error: 'The API key is invalid or unauthorized. Please enter a valid Groq API key.',
            code: 'INVALID_API_KEY'
          }
        };
      }

      console.error('Groq API Error:', data);
      return { ok: false, status: response.status, body: { error: errorMessage } };
    };

    if (useOpenRouter) {
      const openRouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            { role: 'system', content: systemPrompt },
            ...recent.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          ]
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const reply = data?.choices?.[0]?.message?.content || "I couldn't generate a response.";
        return res.json({ reply });
      }

      const errorMessage = data?.error?.message || data?.message || 'OpenRouter API error';
      const isQuotaExceeded = response.status === 402 || response.status === 429 || /quota|credit|payment|required|billing/i.test(errorMessage);
      const isInvalidApiKey = (response.status === 400 || response.status === 401 || response.status === 403)
        && /invalid|unauthorized|api key|authentication|forbidden/i.test(errorMessage);

      // If server OpenRouter key is exhausted/invalid, try configured fallbacks before failing.
      if (!usingUserProvidedKey && (isQuotaExceeded || isInvalidApiKey)) {
        if (configuredGroqKey && configuredGroqKey !== apiKey) {
          const groqResult = await requestGroqReply(configuredGroqKey, { isUserKey: false });
          if (groqResult.ok || !groqResult.body?.fallback) {
            return res.status(groqResult.status).json(groqResult.body);
          }
        }

        if (configuredOpenAIKey && configuredOpenAIKey !== apiKey) {
          const openAIResult = await requestOpenAIReply(configuredOpenAIKey, { isUserKey: false });
          if (openAIResult.ok || !openAIResult.body?.fallback) {
            return res.status(openAIResult.status).json(openAIResult.body);
          }
        }

        if (configuredGeminiKey && configuredGeminiKey !== apiKey) {
          const geminiResult = await requestGeminiReply(configuredGeminiKey, { isUserKey: false });
          return res.status(geminiResult.status).json(geminiResult.body);
        }
      }

      if (isQuotaExceeded) {
        if (usingUserProvidedKey) {
          return res.status(429).json({
            error: 'This API key has no remaining OpenRouter credits or quota. Enter a different API key.',
            code: 'QUOTA_EXCEEDED'
          });
        }

        const fallbackReply = buildQuotaFallbackReply({
          mode,
          userMessage: getLatestUserMessage(messages)
        });

        return res.status(200).json({
          reply: fallbackReply,
          fallback: true,
          provider: 'local',
          warning: 'OpenRouter quota exceeded for this key. Showing local fallback guidance.'
        });
      }

      if (isInvalidApiKey && usingUserProvidedKey) {
        return res.status(401).json({
          error: 'The API key is invalid or unauthorized. Please enter a valid OpenRouter API key.',
          code: 'INVALID_API_KEY'
        });
      }

      console.error('OpenRouter API Error:', data);
      return res.status(response.status).json({ error: errorMessage });
    }

    if (useGroq) {
      const groqResult = await requestGroqReply(apiKey, { isUserKey: usingUserProvidedKey });

      if (!usingUserProvidedKey && !groqResult.ok && configuredOpenAIKey && configuredOpenAIKey !== apiKey) {
        const isFallback = Boolean(groqResult.body?.fallback);
        const isKeyError = groqResult.body?.code === 'QUOTA_EXCEEDED' || groqResult.body?.code === 'INVALID_API_KEY';
        if (isFallback || isKeyError) {
          const openAIResult = await requestOpenAIReply(configuredOpenAIKey, { isUserKey: false });
          if (openAIResult.ok || !openAIResult.body?.fallback) {
            return res.status(openAIResult.status).json(openAIResult.body);
          }
        }
      }

      if (!usingUserProvidedKey && !groqResult.ok && configuredGeminiKey && configuredGeminiKey !== apiKey) {
        const isFallback = Boolean(groqResult.body?.fallback);
        const isKeyError = groqResult.body?.code === 'QUOTA_EXCEEDED' || groqResult.body?.code === 'INVALID_API_KEY';
        if (isFallback || isKeyError) {
          const geminiResult = await requestGeminiReply(configuredGeminiKey, { isUserKey: false });
          return res.status(geminiResult.status).json(geminiResult.body);
        }
      }

      return res.status(groqResult.status).json(groqResult.body);
    }

    if (useOpenAI) {
      const openAIResult = await requestOpenAIReply(apiKey, { isUserKey: usingUserProvidedKey });

      if (!usingUserProvidedKey && !openAIResult.ok && configuredGroqKey && configuredGroqKey !== apiKey) {
        const isFallback = Boolean(openAIResult.body?.fallback);
        const isKeyError = openAIResult.body?.code === 'QUOTA_EXCEEDED' || openAIResult.body?.code === 'INVALID_API_KEY';
        if (isFallback || isKeyError) {
          const groqResult = await requestGroqReply(configuredGroqKey, { isUserKey: false });
          if (groqResult.ok || !groqResult.body?.fallback) {
            return res.status(groqResult.status).json(groqResult.body);
          }
        }
      }

      if (!usingUserProvidedKey && !openAIResult.ok && configuredGeminiKey && configuredGeminiKey !== apiKey) {
        const isFallback = Boolean(openAIResult.body?.fallback);
        const isKeyError = openAIResult.body?.code === 'QUOTA_EXCEEDED' || openAIResult.body?.code === 'INVALID_API_KEY';
        if (isFallback || isKeyError) {
          const geminiResult = await requestGeminiReply(configuredGeminiKey, { isUserKey: false });
          return res.status(geminiResult.status).json(geminiResult.body);
        }
      }

      return res.status(openAIResult.status).json(openAIResult.body);
    }

    const geminiResult = await requestGeminiReply(apiKey, { isUserKey: usingUserProvidedKey });

    if (!usingUserProvidedKey && !geminiResult.ok && configuredGroqKey && configuredGroqKey !== apiKey) {
      const isKeyError = geminiResult.body?.code === 'QUOTA_EXCEEDED' || geminiResult.body?.code === 'INVALID_API_KEY';
      if (isKeyError) {
        const groqResult = await requestGroqReply(configuredGroqKey, { isUserKey: false });
        if (groqResult.ok || !groqResult.body?.fallback) {
          return res.status(groqResult.status).json(groqResult.body);
        }
      }
    }

    if (!usingUserProvidedKey && !geminiResult.ok && configuredOpenAIKey && configuredOpenAIKey !== apiKey) {
      const isKeyError = geminiResult.body?.code === 'QUOTA_EXCEEDED' || geminiResult.body?.code === 'INVALID_API_KEY';
      if (isKeyError) {
        const openAIResult = await requestOpenAIReply(configuredOpenAIKey, { isUserKey: false });
        return res.status(openAIResult.status).json(openAIResult.body);
      }
    }

    return res.status(geminiResult.status).json(geminiResult.body);
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
