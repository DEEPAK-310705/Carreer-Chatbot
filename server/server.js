import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB, { isDBConnected } from './db/connection.js';
import chatRouter from './routes/chat.js';
import resumeRouter from './routes/resume.js';
import conversationsRouter from './routes/conversations.js';
import usersRouter from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------
// Database Connection
// ---------------------
await connectDB();

// ---------------------
// Middleware
// ---------------------

// CORS — allow frontend dev server
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false  // same-origin in production (served from same server)
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Parse JSON bodies (limit 2MB for resume text)
app.use(express.json({ limit: '2mb' }));

// Rate limiting — 30 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);

// ---------------------
// API Routes
// ---------------------

app.use('/api/chat', chatRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/users', usersRouter);

// Health check
app.get('/api/health', (req, res) => {
  const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
  const hasOpenRouterKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here';
  const hasGroqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here';
  const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
  const keyConfigured = Boolean(hasGeminiKey || hasOpenRouterKey || hasGroqKey || hasOpenAIKey);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: keyConfigured,
    databaseConnected: isDBConnected()
  });
});

// ---------------------
// Serve Frontend (production)
// ---------------------

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // Catch-all — serve index.html for SPA routes
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ---------------------
// Start Server
// ---------------------

if (!process.env.VERCEL) {
  const serverInstance = app.listen(PORT, () => {
    console.log(`\n🚀 CareerBot Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST /api/chat              — AI chat`);
    console.log(`   POST /api/resume/analyze     — Resume analysis`);
    console.log(`   GET  /api/conversations      — List conversations`);
    console.log(`   POST /api/conversations      — Create conversation`);
    console.log(`   POST /api/users/session       — User session`);
    console.log(`   GET  /api/health             — Health check`);
    const hasAnyKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);
    console.log(`\n🔑 API Key: ${hasAnyKey ? '✓ Configured' : '✗ NOT SET — add GEMINI_API_KEY / OPENROUTER_API_KEY / GROQ_API_KEY / OPENAI_API_KEY to .env'}`);
    console.log(`🗄️  Database: ${isDBConnected() ? '✓ Connected' : '✗ NOT CONNECTED — add MONGODB_URI to .env'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });

  serverInstance.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use. Another server instance is already running.`);
      console.error('   Stop the existing process or run with a different PORT in server/.env.\n');
      process.exit(1);
      return;
    }

    console.error('\n❌ Server failed to start:', error);
    process.exit(1);
  });
}

export default app;
