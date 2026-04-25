import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import uploadRouter, { getRateLimitStatus } from './routes/upload.js';
import graphsRouter from './routes/graphs.js';

dotenv.config();
const app = express();

// Step 7: Health Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    groq_rate_limited: getRateLimitStatus(),
    uptime: Math.round(process.uptime()) + 's'
  });
});

// MongoDB Connection
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('WARNING: MONGO_URI not found in .env. Persistence disabled.');
}

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', uploadRouter);
app.use('/api', graphsRouter);

// Global Error Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
