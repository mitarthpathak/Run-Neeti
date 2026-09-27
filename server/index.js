import './env.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { connectDB, dbStatus, dbLastError } from './lib/db.js';
import { optionalAuth } from './lib/auth.js';
import { isAiConfigured } from './lib/ai.js';
import uploadRouter, { MAX_UPLOAD_BYTES } from './routes/upload.js';
import graphsRouter from './routes/graphs.js';
import authRouter from './routes/auth.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }));
}
app.use(express.json({ limit: '100kb' }));

app.get(['/health', '/api/health'], async (_req, res) => {
  await connectDB();
  res.json({
    status: 'online',
    ai: isAiConfigured() ? 'configured' : 'missing GEMINI_API_KEY',
    mongodb: dbStatus(),
    ...(dbStatus() === 'disconnected' && dbLastError() ? { mongodbError: dbLastError() } : {}),
    storage: dbStatus() === 'connected' ? 'mongodb' : 'memory (data is lost on restart)',
    uptime: Math.round(process.uptime()) + 's',
  });
});

// Make sure the database connection is attempted before handling API calls.
app.use('/api', async (_req, _res, next) => {
  await connectDB();
  next();
});
app.use('/api', optionalAuth);
app.use('/api', authRouter);
app.use('/api', uploadRouter);
app.use('/api', graphsRouter);

app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// Errors (Express 5 forwards rejected promises from async handlers here).
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      success: false,
      error: tooBig ? `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` : err.message,
    });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid request body.' });
  }
  const status = err?.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('[Server] Unhandled error:', err);
  res.status(status).json({ success: false, error: status === 500 ? 'Something went wrong on the server. Please try again.' : err.message });
});

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:', reason);
});

const PORT = process.env.PORT || 3001;
if (!process.env.VERCEL) {
  connectDB();
  app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
}

export default app;
