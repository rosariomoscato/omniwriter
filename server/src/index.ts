import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api', exportRouter);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] OmniWriter API running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
