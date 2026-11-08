import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';
import { formatTimeWib, validateTimeRange } from '../utils/time.js';

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
    console.error('[SesiController.getAll] Error fetching sessions:', error?.message);
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
    console.error(`[SesiController.getById] Error fetching session ${req.params.id}:`, error?.message);
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

    const start = new Date(waktu_mulai);
    const end = new Date(waktu_selesai);

    // 1. Validate time range (end > start)
    const timeVal = validateTimeRange(start, end);
    if (!timeVal.isValid) {
      return res.status(400).json({ success: false, message: timeVal.error });
    }

    // 2. Validate quota
    const parsedKuota = parseInt(kuota, 10);
    if (isNaN(parsedKuota) || parsedKuota < 1) {
      return res.status(400).json({ success: false, message: 'Target kuota peserta harus bernilai minimal 1.' });
    }

    // 3. Concurrency-safe overlap check and creation inside transaction
    // Business rule: startA < endB AND startB < endA
    const created = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.sesiWisuda.findFirst({
        where: {
          event_id,
          AND: [
            { waktu_mulai: { lt: end } },
            { waktu_selesai: { gt: start } },
          ],
        },
      });

      if (overlapping) {
        const errorMsg = `Jadwal sesi bertabrakan dengan ${overlapping.nama_sesi} (${formatTimeWib(overlapping.waktu_mulai)}–${formatTimeWib(overlapping.waktu_selesai)}). Silakan pilih waktu lain.`;
        throw new Error(`OVERLAP:${errorMsg}`);
      }

      return tx.sesiWisuda.create({
        data: {
          event_id,
          nama_sesi: nama_sesi.trim(),
          waktu_mulai: start,
          waktu_selesai: end,
          kuota: parsedKuota,
          is_open: is_open ?? true,
        },
        include: { event: true },
      });
    });

    console.info(`[SesiController.create] Sesi '${created.nama_sesi}' created successfully (ID: ${created.id}) for Event: '${event.nama_event}'`);

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
    if (error?.message?.startsWith('OVERLAP:')) {
      const msg = error.message.replace('OVERLAP:', '');
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('[SesiController.create] Error creating session:', error?.message);
    return res.status(500).json({ success: false, message: error?.message || 'Gagal membuat sesi wisuda' });
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

    const targetStart = waktu_mulai ? new Date(waktu_mulai) : existing.waktu_mulai;
    const targetEnd = waktu_selesai ? new Date(waktu_selesai) : existing.waktu_selesai;

    // 1. Validate time range (end > start)
    const timeVal = validateTimeRange(targetStart, targetEnd);
    if (!timeVal.isValid) {
      return res.status(400).json({ success: false, message: timeVal.error });
    }

    // 2. Validate quota if provided
    let parsedKuota: number | undefined = undefined;
    if (kuota !== undefined) {
      parsedKuota = parseInt(kuota, 10);
      if (isNaN(parsedKuota) || parsedKuota < 1) {
        return res.status(400).json({ success: false, message: 'Target kuota peserta harus bernilai minimal 1.' });
      }
    }

    // 3. Concurrency-safe overlap check excluding self
    const updated = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.sesiWisuda.findFirst({
        where: {
          event_id: existing.event_id,
          id: { not: id }, // Exclude self!
          AND: [
            { waktu_mulai: { lt: targetEnd } },
            { waktu_selesai: { gt: targetStart } },
          ],
        },
      });

      if (overlapping) {
        const errorMsg = `Jadwal sesi bertabrakan dengan ${overlapping.nama_sesi} (${formatTimeWib(overlapping.waktu_mulai)}–${formatTimeWib(overlapping.waktu_selesai)}). Silakan pilih waktu lain.`;
        throw new Error(`OVERLAP:${errorMsg}`);
      }

      return tx.sesiWisuda.update({
        where: { id },
        data: {
          ...(nama_sesi ? { nama_sesi: nama_sesi.trim() } : {}),
          ...(waktu_mulai ? { waktu_mulai: targetStart } : {}),
          ...(waktu_selesai ? { waktu_selesai: targetEnd } : {}),
          ...(parsedKuota !== undefined ? { kuota: parsedKuota } : {}),
          ...(is_open !== undefined ? { is_open: Boolean(is_open) } : {}),
        },
        include: { event: true },
      });
    });

    console.info(`[SesiController.update] Sesi '${updated.nama_sesi}' updated successfully (ID: ${id})`);

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
    if (error?.message?.startsWith('OVERLAP:')) {
      const msg = error.message.replace('OVERLAP:', '');
      return res.status(400).json({ success: false, message: msg });
    }
    console.error(`[SesiController.update] Error updating session ${req.params.id}:`, error?.message);
    return res.status(500).json({ success: false, message: error?.message || 'Gagal memperbarui sesi wisuda' });
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
    console.error(`[SesiController.toggleOpen] Error toggling session ${req.params.id}:`, error?.message);
    return res.status(500).json({ success: false, message: 'Gagal mengubah status sesi' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.sesiWisuda.findUnique({
      where: { id },
      include: {
        _count: {
          select: { absensi: true, qr_codes: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    // Business rule: Prevent deleting session if attendance records exist
    if (existing._count.absensi > 0) {
      return res.status(400).json({
        success: false,
        message: `Sesi wisuda "${existing.nama_sesi}" tidak dapat dihapus karena sudah memiliki ${existing._count.absensi} riwayat presensi. Batalkan atau koreksi absensi terlebih dahulu bila diperlukan untuk menjaga integritas data.`,
      });
    }

    await prisma.sesiWisuda.delete({ where: { id } });

    console.info(`[SesiController.remove] Sesi '${existing.nama_sesi}' deleted (ID: ${id})`);

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
    console.error(`[SesiController.remove] Error removing session ${req.params.id}:`, error?.message);
    return res.status(500).json({ success: false, message: 'Gagal menghapus sesi wisuda' });
  }
}
