import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled server error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal pada server.';

  // If Prisma duplicate key error (code P2002)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Data duplikat: data dengan nilai unik tersebut sudah ada dalam sistem.',
      fields: err.meta?.target,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
