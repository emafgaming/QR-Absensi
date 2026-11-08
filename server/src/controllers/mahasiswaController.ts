import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';
import { MahasiswaSchema, PRODI_OPTIONS } from '../types/index.js';
import { STUDENTS_2024 } from '../data/students2024.js';

let isSyncing = false;

export async function doSyncMahasiswa2024(userId?: string, ip?: string) {
  if (isSyncing) {
    const totalInDb = await prisma.mahasiswa.count();
    return { insertedCount: 0, qrCreatedCount: 0, totalInDb, alreadySyncing: true };
  }

  isSyncing = true;
  try {
    const ALLOWED_PRODIS = [
      'Manajemen Informatika',
      'Hubungan Masyarakat',
      'Komputerisasi Akuntansi',
      'Administrasi Bisnis',
    ];

    // 1. Ensure Active Event & Session exist
    let event = await prisma.event.findFirst({
      where: { is_active: true },
    });
    if (!event) {
      event = await prisma.event.create({
        data: {
          nama_event: 'Wisuda Angkatan 2024 - Politeknik LP3I Kampus Pekanbaru',
          deskripsi: 'Prosesi Wisuda dan Pelantikan Lulusan Politeknik LP3I Pekanbaru',
          tanggal: new Date(),
          lokasi: 'Auditorium Utama Politeknik LP3I',
          is_active: true,
        },
      });
    }

    let sesi = await prisma.sesiWisuda.findFirst({
      where: { event_id: event.id, is_open: true },
    });
    if (!sesi) {
      sesi = await prisma.sesiWisuda.create({
        data: {
          event_id: event.id,
          nama_sesi: 'Absensi Wisudawan Pagi',
          waktu_mulai: new Date(),
          waktu_selesai: new Date(Date.now() + 8 * 3600 * 1000),
          kuota: 500,
          is_open: true,
        },
      });
    }

    // 2. Remove any dummy student outside the 4 prodis or dummy NIMs
    await prisma.mahasiswa.deleteMany({
      where: {
        OR: [
          { prodi: { notIn: ALLOWED_PRODIS } },
          { nim: { in: ['202201001', '202201002', '202201003', '202201004', '202201005', '202201006', '202201007', '202201008'] } },
        ],
      },
    });

    // 3. Batch check existing students to minimize queries on pooled databases
    const existingMhs = await prisma.mahasiswa.findMany({
      select: { id: true, nim: true },
    });
    const existingMap = new Map(existingMhs.map((m) => [m.nim, m.id]));

    let insertedCount = 0;
    let qrCreatedCount = 0;

    for (const s of STUDENTS_2024) {
      const existingId = existingMap.get(s.nim);
      let mhsId = existingId;

      if (!existingId) {
        const created = await prisma.mahasiswa.create({
          data: {
            nim: s.nim,
            nama: s.nama,
            prodi: s.prodi,
            angkatan: s.angkatan || '2024',
            fakultas: s.fakultas || '-',
            status_kelayakan: s.status_kelayakan || 'ELIGIBLE',
          },
        });
        mhsId = created.id;
        existingMap.set(created.nim, created.id);
        insertedCount++;
      } else {
        await prisma.mahasiswa.update({
          where: { id: existingId },
          data: {
            nama: s.nama,
            prodi: s.prodi,
            angkatan: s.angkatan || '2024',
          },
        });
        insertedCount++;
      }

      // Check QR for active session
      const existingQr = await prisma.qrCode.findFirst({
        where: { mahasiswa_id: mhsId, sesi_id: sesi.id, status: 'ACTIVE' },
      });
      if (!existingQr && mhsId) {
        await prisma.qrCode.create({
          data: {
            mahasiswa_id: mhsId,
            sesi_id: sesi.id,
            token: `WATT-${crypto.randomBytes(32).toString('hex')}`,
            status: 'ACTIVE',
          },
        });
        qrCreatedCount++;
      }
    }

    const totalInDb = await prisma.mahasiswa.count();

    if (userId) {
      await createAuditLog({
        userId,
        action: 'SYNC_MAHASISWA_2024',
        entity: 'Mahasiswa',
        reason: `Sinkronisasi resmi 77 mahasiswa Angkatan 2024 (${insertedCount} diproses, ${qrCreatedCount} QR baru)`,
        newValue: { insertedCount, qrCreatedCount, totalInDb },
        ipAddress: ip,
      });
    }

    return { insertedCount, qrCreatedCount, totalInDb };
  } finally {
    isSyncing = false;
  }
}

export async function syncMahasiswa2024(req: Request, res: Response) {
  try {
    const result = await doSyncMahasiswa2024(req.user?.id, req.ip);
    if ((result as any).alreadySyncing) {
      return res.json({
        success: true,
        message: 'Proses sinkronisasi sedang berjalan di latar belakang, silakan refresh halaman dalam beberapa detik.',
        data: result,
      });
    }
    return res.json({
      success: true,
      message: `Berhasil menyinkronkan ${result.insertedCount} data mahasiswa Angkatan 2024 ke database. Total mahasiswa sekarang: ${result.totalInDb}.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error syncing 2024 mahasiswa:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Gagal menyinkronkan data mahasiswa 2024.' });
  }
}

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
      if (prodi === 'PERLU_DIPERIKSA' || prodi === 'REVIEW_NEEDED') {
        where.prodi = { notIn: [...PRODI_OPTIONS] };
      } else {
        where.prodi = prodi;
      }
    }

    if (fakultas) {
      where.fakultas = fakultas;
    }

    if (status_kelayakan) {
      where.status_kelayakan = status_kelayakan;
    }

    const [total, rawData] = await Promise.all([
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

    const data = rawData.map((m) => ({
      ...m,
      is_prodi_valid: PRODI_OPTIONS.includes(m.prodi as any),
    }));

    // Distinct prodi for filter dropdowns
    const dbProdiList = await prisma.mahasiswa.findMany({
      select: { prodi: true },
      distinct: ['prodi'],
      orderBy: { prodi: 'asc' },
    });

    const allProdis = Array.from(
      new Set([...PRODI_OPTIONS, ...dbProdiList.map((p) => p.prodi)])
    );

    return res.json({
      success: true,
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        filterOptions: {
          prodi: allProdis,
          standardProdi: PRODI_OPTIONS,
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
        fakultas: payload.fakultas ? payload.fakultas.trim() : '-',
        angkatan: payload.angkatan ? payload.angkatan.trim() : new Date().getFullYear().toString(),
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
      const rawNim = String(rawRow.nim || rawRow.NIM || '').trim();
      let rawProdi = String(rawRow.prodi || rawRow.Prodi || rawRow.PRODI || rawRow['Program Studi'] || '').trim();
      let rawAngkatan = String(rawRow.angkatan || rawRow.Angkatan || rawRow.ANGKATAN || '').trim();

      // Auto-infer prodi and angkatan from standard 2024 NIM prefix if omitted
      if (!rawProdi && rawNim) {
        if (rawNim.startsWith('202421')) rawProdi = 'Administrasi Bisnis';
        else if (rawNim.startsWith('202422')) rawProdi = 'Manajemen Informatika';
        else if (rawNim.startsWith('202423')) rawProdi = 'Komputerisasi Akuntansi';
        else if (rawNim.startsWith('202424')) rawProdi = 'Hubungan Masyarakat';
      }
      if (!rawAngkatan) {
        rawAngkatan = rawNim.startsWith('2024') ? '2024' : new Date().getFullYear().toString();
      }

      const normalizedRow = {
        nim: rawNim,
        nama: String(rawRow.nama || rawRow.Nama || rawRow.NAMA || '').trim(),
        prodi: rawProdi,
        fakultas: String(rawRow.fakultas || rawRow.Fakultas || rawRow.FAKULTAS || '-').trim() || '-',
        angkatan: rawAngkatan,
        status_kelayakan: 'ELIGIBLE',
        email: rawRow.email ? String(rawRow.email).trim() : null,
        no_hp: rawRow.no_hp || rawRow.telepon ? String(rawRow.no_hp || rawRow.telepon).trim() : null,
      };

      if (!normalizedRow.nim) {
        errors.push({ row: rowNum, error: 'NIM wajib diisi' });
        return;
      }
      if (!normalizedRow.nama) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'Nama Mahasiswa wajib diisi' });
        return;
      }
      if (!normalizedRow.prodi) {
        errors.push({ row: rowNum, nim: normalizedRow.nim, error: 'Program Studi wajib diisi' });
        return;
      }
      // Strict validation for 4 allowed prodis
      if (!PRODI_OPTIONS.includes(normalizedRow.prodi as any)) {
        errors.push({
          row: rowNum,
          nim: normalizedRow.nim,
          error: `Program studi "${normalizedRow.prodi}" tidak valid. Harus salah satu dari 4 pilihan resmi: ${PRODI_OPTIONS.join(', ')}`,
        });
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
      validRows.push(normalizedRow);
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

/**
 * Export Mahasiswa Data to CSV
 */
export async function exportCsv(req: Request, res: Response) {
  try {
    const { search = '', prodi = '' } = req.query as Record<string, string>;
    const where: any = {};
    if (search) {
      where.OR = [
        { nim: { contains: search } },
        { nama: { contains: search } },
      ];
    }
    if (prodi === 'PERLU_DIPERIKSA' || prodi === 'REVIEW_NEEDED') {
      where.prodi = { notIn: [...PRODI_OPTIONS] };
    } else if (prodi) {
      where.prodi = prodi;
    }

    const list = await prisma.mahasiswa.findMany({
      where,
      orderBy: { nim: 'asc' },
      include: {
        qr_codes: { where: { status: 'ACTIVE' }, select: { id: true } },
        absensi: { select: { id: true, waktu_absen: true, status: true } },
      },
    });

    const headers = ['No', 'NIM', 'Nama Mahasiswa', 'Program Studi', 'Angkatan', 'Status QR', 'Status Absensi'];
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = [headers.join(',')];
    list.forEach((m, idx) => {
      const hasQr = m.qr_codes && m.qr_codes.length > 0 ? 'Sudah Ada QR' : 'Belum Terbit';
      const absensiStatus = m.absensi && m.absensi.length > 0 ? m.absensi[0].status : 'Belum Hadir';
      rows.push(
        [
          idx + 1,
          escapeCsv(m.nim),
          escapeCsv(m.nama),
          escapeCsv(m.prodi),
          escapeCsv(m.angkatan),
          escapeCsv(hasQr),
          escapeCsv(absensiStatus),
        ].join(',')
      );
    });

    const csvString = '\uFEFF' + rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Data_Mahasiswa_Wisuda_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(csvString);
  } catch (err: any) {
    console.error('Export mahasiswa error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengekspor data mahasiswa' });
  }
}
