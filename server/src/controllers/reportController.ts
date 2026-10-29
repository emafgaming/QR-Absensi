import { Request, Response } from 'express';
import prisma from '../prisma.js';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const { sesi_id } = req.query as Record<string, string>;

    const studentWhere: any = { status_kelayakan: 'ELIGIBLE' };
    const attendanceWhere: any = {};

    if (sesi_id) {
      attendanceWhere.sesi_id = sesi_id;
    }

    const [
      totalMahasiswa,
      totalEligible,
      totalHadir,
      totalTerlambat,
      totalIzin,
      recentScans,
      sesiList,
      allProdi,
    ] = await Promise.all([
      prisma.mahasiswa.count(),
      prisma.mahasiswa.count({ where: { status_kelayakan: 'ELIGIBLE' } }),
      prisma.absensi.count({ where: { ...attendanceWhere, status: 'HADIR' } }),
      prisma.absensi.count({ where: { ...attendanceWhere, status: 'TERLAMBAT' } }),
      prisma.absensi.count({ where: { ...attendanceWhere, status: 'IZIN' } }),
      prisma.absensi.findMany({
        where: attendanceWhere,
        take: 10,
        orderBy: { waktu_absen: 'desc' },
        include: {
          mahasiswa: true,
          sesi: true,
          scanned_by: { select: { nama: true } },
        },
      }),
      prisma.sesiWisuda.findMany({
        include: {
          event: true,
          _count: { select: { absensi: true, qr_codes: true } },
        },
        orderBy: { waktu_mulai: 'asc' },
      }),
      prisma.mahasiswa.groupBy({
        by: ['prodi', 'fakultas'],
        _count: { id: true },
        where: { status_kelayakan: 'ELIGIBLE' },
      }),
    ]);

    const totalRecorded = totalHadir + totalTerlambat + totalIzin;
    const belumHadir = Math.max(0, totalEligible - totalRecorded);
    const persentaseKehadiran = totalEligible > 0 ? ((totalRecorded / totalEligible) * 100).toFixed(1) : '0';

    // Per-prodi breakdown
    const prodiStats = await Promise.all(
      allProdi.map(async (group) => {
        const hadirCount = await prisma.absensi.count({
          where: {
            ...attendanceWhere,
            mahasiswa: { prodi: group.prodi },
          },
        });
        return {
          prodi: group.prodi,
          fakultas: group.fakultas,
          total: group._count.id,
          hadir: hadirCount,
          persen: group._count.id > 0 ? ((hadirCount / group._count.id) * 100).toFixed(1) : '0',
        };
      })
    );

    return res.json({
      success: true,
      data: {
        summary: {
          totalMahasiswa,
          totalEligible,
          totalHadir,
          totalTerlambat,
          totalIzin,
          totalRecorded,
          belumHadir,
          persentaseKehadiran: Number(persentaseKehadiran),
        },
        recentScans,
        sesiList,
        prodiStats,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memuat statistik dashboard' });
  }
}

/**
 * Export Attendance Report to CSV
 */
export async function exportCsv(req: Request, res: Response) {
  try {
    const { sesi_id, prodi, fakultas, status } = req.query as Record<string, string>;

    const where: any = {};
    if (sesi_id) where.sesi_id = sesi_id;
    if (status) where.status = status;

    if (prodi || fakultas) {
      where.mahasiswa = {};
      if (prodi) where.mahasiswa.prodi = prodi;
      if (fakultas) where.mahasiswa.fakultas = fakultas;
    }

    const records = await prisma.absensi.findMany({
      where,
      include: {
        mahasiswa: true,
        sesi: { include: { event: true } },
        scanned_by: { select: { nama: true } },
      },
      orderBy: { waktu_absen: 'asc' },
    });

    // Generate CSV string
    const headers = [
      'No',
      'NIM',
      'Nama Wisudawan',
      'Program Studi',
      'Fakultas',
      'Angkatan',
      'Acara Wisuda',
      'Sesi Wisuda',
      'Waktu Presensi (WIB)',
      'Status Kehadiran',
      'Metode Absensi',
      'Petugas Scanner',
      'Catatan',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const csvRows = [headers.join(',')];

    records.forEach((rec, idx) => {
      const row = [
        idx + 1,
        escapeCsv(rec.mahasiswa.nim),
        escapeCsv(rec.mahasiswa.nama),
        escapeCsv(rec.mahasiswa.prodi),
        escapeCsv(rec.mahasiswa.fakultas),
        escapeCsv(rec.mahasiswa.angkatan),
        escapeCsv(rec.sesi.event.nama_event),
        escapeCsv(rec.sesi.nama_sesi),
        escapeCsv(new Date(rec.waktu_absen).toLocaleString('id-ID')),
        escapeCsv(rec.status),
        escapeCsv(rec.metode),
        escapeCsv(rec.scanned_by?.nama || 'Sistem / Otomatis'),
        escapeCsv(rec.catatan || '-'),
      ];
      csvRows.push(row.join(','));
    });

    const csvString = '\uFEFF' + csvRows.join('\r\n'); // Add BOM for Excel compatibility

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan_Absensi_Wisuda_${new Date().toISOString().slice(0, 10)}.csv"`
    );

    return res.status(200).send(csvString);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengekspor laporan CSV' });
  }
}
