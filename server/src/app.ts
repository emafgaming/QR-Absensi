import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Restore originalUrl if Vercel serverless rewrite mutated req.url
app.use((req, res, next) => {
  const vercelPath = (req.headers['x-matched-path'] as string) || (req.headers['x-forwarded-uri'] as string);
  if (vercelPath && (req.url === '/api' || req.url.startsWith('/dist/server'))) {
    req.url = vercelPath;
  } else if (req.originalUrl && req.url !== req.originalUrl && req.originalUrl !== '/dist/server.js') {
    req.url = req.originalUrl;
  }
  next();
});

// Security Headers (safely handle CommonJS / ESM dual export)
const helmetMiddleware = ((typeof helmet === 'function' ? helmet : (helmet as any).default) || helmet) as any;
app.use(
  helmetMiddleware({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration: Allow custom domains (qrabsensi.my.id), *.vercel.app, localhost, and API tools
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from any origin (reflection allows credentials with custom domains)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
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
const rateLimitMiddleware = ((typeof rateLimit === 'function' ? rateLimit : (rateLimit as any).default) || rateLimit) as any;
const authLimiter = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per 15 min
  message: {
    success: false,
    message: 'Terlalu banyak permintaan login dari IP ini. Silakan coba lagi nanti.',
  },
});

app.use('/api/v1/auth/login', authLimiter);

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  try {
    const prisma = (await import('./prisma.js')).default;
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbError = err?.message || String(err);
  }
  res.json({
    status: 'healthy',
    database: dbStatus,
    dbError,
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
