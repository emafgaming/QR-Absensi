import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';

export async function getRiwayat(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      sesi_id = '',
      status = '',
      prodi = '',
      fakultas = '',
      metode = '',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (sesi_id) {
      where.sesi_id = sesi_id;
    }

    if (status) {
      where.status = status;
    }

    if (metode) {
      where.metode = metode;
    }

    if (search || prodi || fakultas) {
      where.mahasiswa = {};
      if (search) {
        where.mahasiswa.OR = [
          { nim: { contains: search } },
          { nama: { contains: search } },
        ];
      }
      if (prodi) {
        where.mahasiswa.prodi = prodi;
      }
      if (fakultas) {
        where.mahasiswa.fakultas = fakultas;
      }
    }

    const [total, data] = await Promise.all([
      prisma.absensi.count({ where }),
      prisma.absensi.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { waktu_absen: 'desc' },
        include: {
          mahasiswa: true,
          sesi: { include: { event: true } },
          scanned_by: {
            select: { id: true, nama: true, username: true, role: true },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching riwayat absensi:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil riwayat absensi' });
  }
}

/**
 * Attendance Correction with mandatory reason & audit logging
 */
export async function koreksiAbsensi(req: Request, res: Response) {
  try {
    const { absensi_id, status_baru, alasan, catatan } = req.body;

    if (!alasan || alasan.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Alasan koreksi absensi minimal 5 karakter wajib disertakan demi kepatuhan audit.',
      });
    }

    const existing = await prisma.absensi.findUnique({
      where: { id: absensi_id },
      include: { mahasiswa: true, sesi: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Catatan absensi tidak ditemukan.' });
    }

    const updated = await prisma.absensi.update({
      where: { id: absensi_id },
      data: {
        status: status_baru,
        catatan: catatan
          ? `${existing.catatan ? existing.catatan + ' | ' : ''}Koreksi: ${catatan} (${alasan})`
          : existing.catatan,
      },
      include: {
        mahasiswa: true,
        sesi: true,
        scanned_by: { select: { id: true, nama: true } },
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'ATTENDANCE_CORRECT',
      entity: 'Absensi',
      entityId: absensi_id,
      oldValue: { status: existing.status, catatan: existing.catatan },
      newValue: { status: status_baru, catatan: updated.catatan },
      reason: `Koreksi status absensi ${existing.mahasiswa.nama} (${existing.mahasiswa.nim}) dari ${existing.status} ke ${status_baru}. Alasan: ${alasan}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Status absensi berhasil dikoreksi menjadi ${status_baru}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Koreksi absensi error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses koreksi absensi.' });
  }
}

/**
 * Delete / Invalidate Attendance Record with mandatory reason & audit log
 */
export async function batalkanAbsensi(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { alasan } = req.body;

    if (!alasan || alasan.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Alasan pembatalan absensi minimal 5 karakter wajib disertakan.',
      });
    }

    const existing = await prisma.absensi.findUnique({
      where: { id },
      include: { mahasiswa: true, sesi: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Catatan absensi tidak ditemukan.' });
    }

    await prisma.absensi.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'ATTENDANCE_DELETE',
      entity: 'Absensi',
      entityId: id,
      oldValue: existing,
      reason: `Pembatalan absensi untuk ${existing.mahasiswa.nama} (${existing.mahasiswa.nim}) pada sesi ${existing.sesi.nama_sesi}. Alasan: ${alasan}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Catatan absensi berhasil dibatalkan dan dicatat dalam audit log.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal membatalkan absensi.' });
  }
}
