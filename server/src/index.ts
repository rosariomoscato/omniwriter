import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import passport from 'passport';
import session from 'express-session';
import { initializeDatabase } from './db/database';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import humanModelsRouter from './routes/human-models';
import chaptersRouter from './routes/chapters';
import sourcesRouter from './routes/sources';
import charactersRouter from './routes/characters';
import exportRouter from './routes/export';
import sagasRouter from './routes/sagas';
import adminRouter from './routes/admin';
import usersRouter from './routes/users';
import citationsRouter from './routes/citations';
import locationsRouter from './routes/locations';
import plotEventsRouter from './routes/plot-events';
import generationLogsRouter from './routes/generation-logs';
import aiRouter from './routes/ai';
import chapterCommentsRouter from './routes/chapter-comments';
import llmProvidersRouter from './routes/llm-providers';
import marketplaceRouter, { marketplaceAdminStatsHandler } from './routes/marketplace';
import { authenticateToken } from './middleware/auth';
import { requireAdmin } from './middleware/roles';
import path, { resolve } from 'path';
import fs from 'fs';

const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin) return callback(null, true);

    // Allow any localhost port for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // In production, use the configured CLIENT_URL
    const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:3000'].filter(Boolean);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Passport and session middleware for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'omniwriter-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware - logs all API requests
app.use('/api', (req, _res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// Initialize database
const db = initializeDatabase();
console.log('[Database] SQLite database connected successfully');

// Middleware to attach database to request
app.use('/api/admin', (req, res, next) => {
  (req as any).db = db;
  next();
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/human-models', humanModelsRouter);
app.use('/api/sagas', sagasRouter);
app.use('/api', chaptersRouter);
app.use('/api', sourcesRouter);
app.use('/api', charactersRouter);
app.use('/api', locationsRouter);
app.use('/api', plotEventsRouter);
app.use('/api', citationsRouter);
app.use('/api', exportRouter);
app.use('/api', generationLogsRouter);
app.use('/api', aiRouter);
app.use('/api', chapterCommentsRouter);
app.use('/api', llmProvidersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/marketplace', marketplaceRouter);

// Admin marketplace stats endpoint (under /api/admin/marketplace/stats)
app.get('/api/admin/marketplace/stats', authenticateToken as any, requireAdmin as any, marketplaceAdminStatsHandler as any);

// --- Production: serve frontend static files ---
const publicDir = path.join(__dirname, '..', 'public');
if (process.env.NODE_ENV === 'production' && fs.existsSync(publicDir)) {
  console.log(`[Server] Serving static frontend from ${publicDir}`);

  // Serve static assets with proper caching
  app.use(express.static(publicDir, {
    maxAge: '1y',
    immutable: true,
    index: false, // Don't auto-serve index.html for directory requests
  }));

  // SPA fallback: any non-API route gets index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  // 404 handler (development mode or no frontend build)
  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

const serverHost = HOST || '0.0.0.0';
app.listen(PORT, serverHost, () => {
  console.log(`[Server] OmniWriter API running on ${serverHost}:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
