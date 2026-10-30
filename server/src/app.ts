import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const rawOrigins = [
  process.env.CORS_ORIGIN,
  process.env.APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'http://localhost:5173',
]
  .filter(Boolean)
  .join(',');

const allowedOrigins = rawOrigins
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing with safe limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for auth and scanner
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per 15 min
  message: {
    success: false,
    message: 'Terlalu banyak permintaan login dari IP ini. Silakan coba lagi nanti.',
  },
});

app.use('/api/v1/auth/login', authLimiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WisudaAttend API',
    version: '1.0.0',
  });
});

// Mount API routes under /api/v1
app.use('/api/v1', routes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan di server.`,
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
