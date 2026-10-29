import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';

export async function getAll(req: Request, res: Response) {
  try {
    const events = await prisma.event.findMany({
      include: {
        sesi: {
          include: {
            _count: {
              select: { absensi: true, qr_codes: true },
            },
          },
          orderBy: { waktu_mulai: 'asc' },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    return res.json({ success: true, data: events });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data acara wisuda' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        sesi: {
          include: {
            _count: {
              select: { absensi: true, qr_codes: true },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Acara tidak ditemukan' });
    }

    return res.json({ success: true, data: event });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail acara' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const { nama_event, deskripsi, tanggal, lokasi, is_active } = req.body;

    const created = await prisma.event.create({
      data: {
        nama_event,
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        lokasi,
        is_active: is_active ?? true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Event',
      entityId: created.id,
      newValue: created,
      reason: `Membuat acara wisuda baru: ${created.nama_event}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: 'Acara berhasil dibuat', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat acara wisuda' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nama_event, deskripsi, tanggal, lokasi, is_active } = req.body;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Acara tidak ditemukan' });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(nama_event ? { nama_event } : {}),
        ...(deskripsi !== undefined ? { deskripsi } : {}),
        ...(tanggal ? { tanggal: new Date(tanggal) } : {}),
        ...(lokasi ? { lokasi } : {}),
        ...(is_active !== undefined ? { is_active } : {}),
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Event',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      reason: `Memperbarui acara wisuda ${updated.nama_event}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Acara berhasil diperbarui', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui acara' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Acara tidak ditemukan' });
    }

    await prisma.event.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Event',
      entityId: id,
      oldValue: existing,
      reason: `Menghapus acara wisuda ${existing.nama_event}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Acara wisuda berhasil dihapus' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus acara' });
  }
}
