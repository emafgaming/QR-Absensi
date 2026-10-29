import { Request, Response } from 'express';
import prisma from '../prisma.js';

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '30',
      action = '',
      entity = '',
      user_id = '',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 30));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (user_id) where.user_id = user_id;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: { id: true, nama: true, username: true, role: true },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat log audit' });
  }
}
