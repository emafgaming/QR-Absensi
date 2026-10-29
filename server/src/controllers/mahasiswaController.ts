import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';
import { MahasiswaSchema } from '../types/index.js';

export async function getAll(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      prodi = '',
      fakultas = '',
      status_kelayakan = '',
      sesi_id = '',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { nim: { contains: search } },
        { nama: { contains: search } },
      ];
    }

    if (prodi) {
      where.prodi = prodi;
    }

    if (fakultas) {
      where.fakultas = fakultas;
    }

    if (status_kelayakan) {
      where.status_kelayakan = status_kelayakan;
    }

    const [total, data] = await Promise.all([
      prisma.mahasiswa.count({ where }),
      prisma.mahasiswa.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { nim: 'asc' },
        include: {
          qr_codes: {
            where: sesi_id ? { sesi_id, status: 'ACTIVE' } : { status: 'ACTIVE' },
            select: { id: true, token: true, status: true, sesi_id: true },
          },
          absensi: {
            where: sesi_id ? { sesi_id } : undefined,
            select: { id: true, status: true, waktu_absen: true, sesi_id: true, metode: true },
          },
        },
      }),
    ]);

    // Distinct prodi and fakultas for filter dropdowns
    const [prodiList, fakultasList] = await Promise.all([
      prisma.mahasiswa.findMany({ select: { prodi: true }, distinct: ['prodi'], orderBy: { prodi: 'asc' } }),
      prisma.mahasiswa.findMany({ select: { fakultas: true }, distinct: ['fakultas'], orderBy: { fakultas: 'asc' } }),
    ]);

    return res.json({
      success: true,
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        filterOptions: {
          prodi: prodiList.map(p => p.prodi),
          fakultas: fakultasList.map(f => f.fakultas),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching mahasiswa:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data mahasiswa' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { id },
      include: {
        qr_codes: {
          include: { sesi: true },
          orderBy: { generated_at: 'desc' },
        },
        absensi: {
          include: {
            sesi: true,
            scanned_by: { select: { id: true, nama: true, username: true } },
          },
          orderBy: { waktu_absen: 'desc' },
        },
      },
    });

    if (!mahasiswa) {
      return res.status(404).json({ success: false, message: 'Data mahasiswa tidak ditemukan' });
    }

    return res.json({ success: true, data: mahasiswa });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail mahasiswa' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const payload = req.body;

    // Check unique NIM
    const existing = await prisma.mahasiswa.findUnique({ where: { nim: payload.nim } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `NIM ${payload.nim} sudah terdaftar dalam sistem. NIM harus unik.`,
      });
    }

    const created = await prisma.mahasiswa.create({
      data: {
        nim: payload.nim.trim(),
        nama: payload.nama.trim(),
        prodi: payload.prodi.trim(),
        fakultas: payload.fakultas.trim(),
        angkatan: payload.angkatan.trim(),
        status_kelayakan: payload.status_kelayakan || 'ELIGIBLE',
        email: payload.email?.trim() || null,
        no_hp: payload.no_hp?.trim() || null,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'Mahasiswa',
      entityId: created.id,
      newValue: created,
      reason: `Menambahkan mahasiswa baru: ${created.nama} (${created.nim})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Data mahasiswa berhasil ditambahkan.',
      data: created,
    });
  } catch (error: any) {
    console.error('Create mahasiswa error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan mahasiswa' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payload = req.body;

    const existing = await prisma.mahasiswa.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data mahasiswa tidak ditemukan' });
    }

    if (payload.nim && payload.nim !== existing.nim) {
      const nimTaken = await prisma.mahasiswa.findUnique({ where: { nim: payload.nim } });
      if (nimTaken) {
        return res.status(400).json({
          success: false,
          message: `NIM ${payload.nim} sudah digunakan mahasiswa lain.`,
        });
      }
    }

    const updated = await prisma.mahasiswa.update({
      where: { id },
      data: payload,
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Mahasiswa',
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
      reason: `Memperbarui data mahasiswa ${updated.nim}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Data mahasiswa berhasil diperbarui.',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui mahasiswa' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.mahasiswa.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Data mahasiswa tidak ditemukan' });
    }

    // Business Integrity Rule: Prevent deleting student with existing attendance records
    const attendanceCount = await prisma.absensi.count({
      where: { mahasiswa_id: id },
    });
    if (attendanceCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mahasiswa tidak dapat dihapus karena sudah memiliki riwayat presensi. Batalkan atau koreksi absensi terlebih dahulu bila diperlukan untuk menjaga integritas data.',
      });
    }

    await prisma.mahasiswa.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'Mahasiswa',
      entityId: id,
      oldValue: existing,
      reason: `Menghapus mahasiswa ${existing.nama} (${existing.nim})`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Data mahasiswa berhasil dihapus.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus mahasiswa' });
  }
}

export async function toggleKelayakan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status_kelayakan, alasan } = req.body;

    if (!['ELIGIBLE', 'NOT_ELIGIBLE'].includes(status_kelayakan)) {
      return res.status(400).json({ success: false, message: 'Status kelayakan tidak valid' });
    }

    const existing = await prisma.mahasiswa.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
    }

    const updated = await prisma.mahasiswa.update({
      where: { id },
      data: { status_kelayakan },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'Mahasiswa',
      entityId: id,
      oldValue: { status_kelayakan: existing.status_kelayakan },
      newValue: { status_kelayakan },
      reason: alasan || `Mengubah status kelayakan wisuda mahasiswa ${existing.nim} menjadi ${status_kelayakan}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Status kelayakan mahasiswa berhasil diubah ke ${status_kelayakan}.`,
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengubah status kelayakan' });
  }
}

/**
 * Import Mahasiswa from parsed JSON rows (from CSV file uploaded on frontend)
 */
export async function importCsv(req: Request, res: Response) {
  try {
    const { rows } = req.body; // Array of objects
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data CSV kosong atau tidak dalam format yang benar.',
      });
    }

    const validRows: any[] = [];
    const errors: Array<{ row: number; nim?: string; error: string }> = [];

    // Check all existing NIMs in one query for fast lookup
    const allNims = rows.map((r: any) => String(r.nim || r.NIM || '').trim()).filter(Boolean);
    const existingMahasiswa = await prisma.mahasiswa.findMany({
      where: { nim: { in: allNims } },
      select: { nim: true },
    });
    const existingNimSet = new Set(existingMahasiswa.map(m => m.nim));
    const processedNimSet = new Set<string>();

    rows.forEach((rawRow: any, index: number) => {
      const rowNum = index + 1;
      const normalizedRow = {
        nim: String(rawRow.nim || rawRow.NIM || '').trim(),
        nama: String(rawRow.nama || rawRow.Nama || rawRow.NAMA || '').trim(),
        prodi: String(rawRow.prodi || rawRow.Prodi || rawRow.PRODI || rawRow['Program Studi'] || '').trim(),
        fakultas: String(rawRow.fakultas || rawRow.Fakultas || rawRow.FAKULTAS || '').trim(),
        angkatan: String(rawRow.angkatan || rawRow.Angkatan || rawRow.ANGKATAN || '').trim(),
        status_kelayakan: String(rawRow.status_kelayakan || rawRow.status || 'ELIGIBLE').toUpperCase().trim(),
        email: rawRow.email ? String(rawRow.email).trim() : null,
        no_hp: rawRow.no_hp || rawRow.telepon ? String(rawRow.no_hp || rawRow.telepon).trim() : null,
      };

      if (!normalizedRow.nim) {
        errors.push({ row: rowNum, error: 'NIM wajib diisi' });
        return;
      }
      if (!normalizedRow.nama) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'Nama wajib diisi' });
        return;
      }
      if (!normalizedRow.prodi) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'Program Studi wajib diisi' });
        return;
      }
      if (!normalizedRow.fakultas) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'Fakultas wajib diisi' });
        return;
      }
      if (!normalizedRow.angkatan) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'Angkatan wajib diisi' });
        return;
      }

      if (existingNimSet.has(normalizedRow.nim)) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'NIM sudah terdaftar di database' });
        return;
      }

      if (processedNimSet.has(normalizedRow.nim)) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'NIM duplikat di dalam file CSV' });
        return;
      }

      processedNimSet.add(normalizedRow.nim);
      validRows.push({
        ...normalizedRow,
        status_kelayakan: normalizedRow.status_kelayakan === 'NOT_ELIGIBLE' ? 'NOT_ELIGIBLE' : 'ELIGIBLE',
      });
    });

    let insertedCount = 0;
    if (validRows.length > 0) {
      // Use transaction to insert all valid records
      await prisma.$transaction(
        validRows.map(row => prisma.mahasiswa.create({ data: row }))
      );
      insertedCount = validRows.length;
    }

    await createAuditLog({
      userId: req.user?.id,
      action: 'CSV_IMPORT',
      entity: 'Mahasiswa',
      reason: `Impor CSV mahasiswa: ${insertedCount} berhasil, ${errors.length} gagal/dilewati`,
      newValue: { totalProcessed: rows.length, insertedCount, errorsCount: errors.length },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Impor CSV selesai. ${insertedCount} data berhasil diimpor, ${errors.length} data ditolak.`,
      data: {
        total: rows.length,
        inserted: insertedCount,
        failed: errors.length,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Import CSV error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses file CSV' });
  }
}
