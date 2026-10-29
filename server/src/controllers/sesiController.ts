import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';

export async function getAll(req: Request, res: Response) {
  try {
    const { event_id } = req.query as Record<string, string>;
    const where = event_id ? { event_id } : {};

    const sesiList = await prisma.sesiWisuda.findMany({
      where,
      include: {
        event: {
          select: { id: true, nama_event: true, tanggal: true, lokasi: true },
        },
        _count: {
          select: { absensi: true, qr_codes: true },
        },
      },
      orderBy: { waktu_mulai: 'asc' },
    });

    return res.json({ success: true, data: sesiList });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data sesi wisuda' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const sesi = await prisma.sesiWisuda.findUnique({
      where: { id },
      include: {
        event: true,
        _count: {
          select: { absensi: true, qr_codes: true },
        },
      },
    });

    if (!sesi) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    return res.json({ success: true, data: sesi });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail sesi' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const { event_id, nama_sesi, waktu_mulai, waktu_selesai, kuota, is_open } = req.body;

    const event = await prisma.event.findUnique({ where: { id: event_id } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Acara wisuda induk tidak ditemukan' });
    }

    const created = await prisma.sesiWisuda.create({
      data: {
        event_id,
        nama_sesi,
        waktu_mulai: new Date(waktu_mulai),
        waktu_selesai: new Date(waktu_selesai),
        kuota: parseInt(kuota) || 500,
        is_open: is_open ?? true,
      },
      include: { event: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'SesiWisuda',
      entityId: created.id,
      newValue: created,
      reason: `Menambahkan sesi wisuda baru: ${created.nama_sesi} pada acara ${event.nama_event}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, message: 'Sesi wisuda berhasil dibuat', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal membuat sesi wisuda' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nama_sesi, waktu_mulai, waktu_selesai, kuota, is_open } = req.body;

    const existing = await prisma.sesiWisuda.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    const updated = await prisma.sesiWisuda.update({
      where: { id },
      data: {
        ...(nama_sesi ? { nama_sesi } : {}),
        ...(waktu_mulai ? { waktu_mulai: new Date(waktu_mulai) } : {}),
        ...(waktu_selesai ? { waktu_selesai: new Date(waktu_selesai) } : {}),
        ...(kuota !== undefined ? { kuota: parseInt(kuota) } : {}),
        ...(is_open !== undefined ? { is_open } : {}),
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'SesiWisuda',
      entityId: id,
      oldValue: existing,
      newValue: updated,
      reason: `Memperbarui sesi wisuda ${updated.nama_sesi}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Sesi wisuda berhasil diperbarui', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui sesi wisuda' });
  }
}

export async function toggleOpen(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { is_open } = req.body;

    const existing = await prisma.sesiWisuda.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    const updated = await prisma.sesiWisuda.update({
      where: { id },
      data: { is_open: Boolean(is_open) },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'SesiWisuda',
      entityId: id,
      oldValue: { is_open: existing.is_open },
      newValue: { is_open: updated.is_open },
      reason: `Mengubah status absensi sesi ${updated.nama_sesi} menjadi ${updated.is_open ? 'DIBUKA' : 'DITUTUP'}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Status sesi wisuda diubah menjadi ${updated.is_open ? 'Dibuka' : 'Ditutup'}.`,
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengubah status sesi' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.sesiWisuda.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    await prisma.sesiWisuda.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'SesiWisuda',
      entityId: id,
      oldValue: existing,
      reason: `Menghapus sesi wisuda ${existing.nama_sesi}`,
      ipAddress: req.ip,
    });

    return res.json({ success: true, message: 'Sesi wisuda berhasil dihapus' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus sesi wisuda' });
  }
}
