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
import { resolve } from 'path';

const envPath = resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '127.0.0.1';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/admin', adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`[Server] OmniWriter API running on ${HOST}:${PORT}`);
  console.log(`[Server] Health check: http://${HOST}:${PORT}/api/health`);
});

export default app;
