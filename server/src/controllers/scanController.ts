import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { createAuditLog } from '../utils/audit.js';

/**
 * Primary Attendance Scanner Endpoint
 * Validates QR Token, verifies eligibility & session status, prevents duplicate attendance
 */
export async function processScan(req: Request, res: Response) {
  try {
    const { token, sesi_id } = req.body;

    if (!token || !sesi_id) {
      return res.status(400).json({
        success: false,
        status: 'INVALID_REQUEST',
        message: 'Token QR dan ID Sesi wajib dikirimkan.',
      });
    }

    // 1. Verify Sesi Wisuda
    const sesi = await prisma.sesiWisuda.findUnique({
      where: { id: sesi_id },
      include: { event: true },
    });

    if (!sesi) {
      return res.status(404).json({
        success: false,
        status: 'SESSION_NOT_FOUND',
        message: 'Sesi wisuda yang dipilih tidak ditemukan dalam sistem.',
      });
    }

    if (!sesi.is_open) {
      return res.status(400).json({
        success: false,
        status: 'SESSION_CLOSED',
        message: `Sesi wisuda "${sesi.nama_sesi}" sedang ditutup untuk absensi. Aktifkan sesi terlebih dahulu.`,
      });
    }

    // 2. Find QR Code by Token
    // Business Rule: QR contains random token, not raw NIM
    const qrCode = await prisma.qrCode.findUnique({
      where: { token },
      include: {
        mahasiswa: true,
        sesi: true,
      },
    });

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        status: 'TOKEN_UNKNOWN',
        message: 'Token QR tidak dikenali oleh sistem. Pastikan QR dicetak dari aplikasi WisudaAttend.',
      });
    }

    if (qrCode.status === 'REVOKED') {
      return res.status(400).json({
        success: false,
        status: 'TOKEN_REVOKED',
        message: 'QR Code ini telah dicabut (Revoked) dan tidak lagi berlaku.',
        mahasiswa: {
          nim: qrCode.mahasiswa.nim,
          nama: qrCode.mahasiswa.nama,
          prodi: qrCode.mahasiswa.prodi,
        },
      });
    }

    if (qrCode.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        status: 'TOKEN_EXPIRED',
        message: 'QR Code telah kedaluwarsa.',
      });
    }

    // Check if QR matches selected session
    if (qrCode.sesi_id !== sesi_id) {
      return res.status(400).json({
        success: false,
        status: 'SESSION_MISMATCH',
        message: `QR Code ini terdaftar untuk "${qrCode.sesi.nama_sesi}", bukan untuk sesi yang sedang aktif.`,
        mahasiswa: {
          nim: qrCode.mahasiswa.nim,
          nama: qrCode.mahasiswa.nama,
          prodi: qrCode.mahasiswa.prodi,
        },
      });
    }

    const mahasiswa = qrCode.mahasiswa;

    // 3. Verify Mahasiswa Eligibility
    if (mahasiswa.status_kelayakan !== 'ELIGIBLE') {
      return res.status(403).json({
        success: false,
        status: 'NOT_ELIGIBLE',
        message: `Mahasiswa ${mahasiswa.nama} (${mahasiswa.nim}) berstatus TIDAK LAYAK mengikuti wisuda. Arahkan ke meja panitia.`,
        mahasiswa: {
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          prodi: mahasiswa.prodi,
          fakultas: mahasiswa.fakultas,
          status_kelayakan: mahasiswa.status_kelayakan,
        },
      });
    }

    // 4. Check Duplicate Attendance
    const existingAbsensi = await prisma.absensi.findUnique({
      where: {
        mahasiswa_id_sesi_id: {
          mahasiswa_id: mahasiswa.id,
          sesi_id: sesi.id,
        },
      },
      include: {
        scanned_by: {
          select: { id: true, nama: true, username: true },
        },
      },
    });

    if (existingAbsensi) {
      // Prompt Rule: "Scan ulang menampilkan status sudah hadir tanpa membuat catatan baru."
      await createAuditLog({
        userId: req.user?.id,
        action: 'SCAN_DUPLICATE',
        entity: 'Absensi',
        entityId: existingAbsensi.id,
        reason: `Scan ulang: Mahasiswa ${mahasiswa.nama} (${mahasiswa.nim}) sudah hadir sebelumnya pada ${existingAbsensi.waktu_absen.toISOString()}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        status: 'ALREADY_RECORDED',
        message: `Mahasiswa sudah terdaftar hadir sebelumnya pada ${new Date(existingAbsensi.waktu_absen).toLocaleTimeString('id-ID')}.`,
        data: {
          absensi: existingAbsensi,
          mahasiswa: {
            id: mahasiswa.id,
            nim: mahasiswa.nim,
            nama: mahasiswa.nama,
            prodi: mahasiswa.prodi,
            fakultas: mahasiswa.fakultas,
            angkatan: mahasiswa.angkatan,
          },
          sesi: {
            id: sesi.id,
            nama_sesi: sesi.nama_sesi,
          },
        },
      });
    }

    // 5. Atomic Attendance Recording inside DB Transaction
    // Prompt Rule: "Waktu absensi berasal dari server. Jangan menampilkan status berhasil sebelum transaksi tersimpan."
    const serverTimestamp = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Re-check inside transaction to eliminate race condition
      const doubleCheck = await tx.absensi.findUnique({
        where: {
          mahasiswa_id_sesi_id: {
            mahasiswa_id: mahasiswa.id,
            sesi_id: sesi.id,
          },
        },
      });

      if (doubleCheck) {
        return { isDuplicate: true, absensi: doubleCheck };
      }

      const newAbsensi = await tx.absensi.create({
        data: {
          mahasiswa_id: mahasiswa.id,
          sesi_id: sesi.id,
          qr_code_id: qrCode.id,
          scanned_by_id: req.user?.id || null,
          status: 'HADIR',
          waktu_absen: serverTimestamp, // Server-generated timestamp
          metode: 'QR_SCAN',
        },
        include: {
          scanned_by: {
            select: { id: true, nama: true, username: true },
          },
        },
      });

      return { isDuplicate: false, absensi: newAbsensi };
    });

    if (result.isDuplicate) {
      return res.status(200).json({
        success: true,
        status: 'ALREADY_RECORDED',
        message: 'Mahasiswa sudah tercatat hadir sesaat lalu.',
        data: {
          absensi: result.absensi,
          mahasiswa,
          sesi,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      action: 'SCAN_SUCCESS',
      entity: 'Absensi',
      entityId: result.absensi.id,
      reason: `Absensi berhasil via QR Scan: ${mahasiswa.nama} (${mahasiswa.nim}) di sesi ${sesi.nama_sesi}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      status: 'SUCCESS',
      message: `Presensi Berhasil: ${mahasiswa.nama} (${mahasiswa.nim})`,
      data: {
        absensi: result.absensi,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          prodi: mahasiswa.prodi,
          fakultas: mahasiswa.fakultas,
          angkatan: mahasiswa.angkatan,
        },
        sesi: {
          id: sesi.id,
          nama_sesi: sesi.nama_sesi,
        },
      },
    });
  } catch (error: any) {
    console.error('Scan processing error:', error);
    if (error.code === 'P2002') {
      // Race condition caught by unique constraint
      return res.status(200).json({
        success: true,
        status: 'ALREADY_RECORDED',
        message: 'Mahasiswa sudah tercatat hadir pada sesi ini.',
      });
    }
    return res.status(500).json({
      success: false,
      status: 'SERVER_ERROR',
      message: 'Terjadi kesalahan sistem saat memproses pemindaian absensi.',
    });
  }
}

/**
 * Fallback Manual Attendance by NIM (e.g. damaged card or camera failure)
 */
export async function processManual(req: Request, res: Response) {
  try {
    const { nim, sesi_id, catatan } = req.body;

    if (!nim || !sesi_id) {
      return res.status(400).json({
        success: false,
        message: 'NIM dan Sesi wajib diisi.',
      });
    }

    const sesi = await prisma.sesiWisuda.findUnique({ where: { id: sesi_id } });
    if (!sesi) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan.' });
    }
    if (!sesi.is_open) {
      return res.status(400).json({ success: false, message: 'Sesi wisuda sedang ditutup untuk absensi.' });
    }

    const mahasiswa = await prisma.mahasiswa.findUnique({
      where: { nim: String(nim).trim() },
    });

    if (!mahasiswa) {
      return res.status(404).json({
        success: false,
        status: 'NOT_FOUND',
        message: `Mahasiswa dengan NIM ${nim} tidak ditemukan dalam sistem.`,
      });
    }

    if (mahasiswa.status_kelayakan !== 'ELIGIBLE') {
      return res.status(403).json({
        success: false,
        status: 'NOT_ELIGIBLE',
        message: `Mahasiswa ${mahasiswa.nama} (${mahasiswa.nim}) berstatus TIDAK LAYAK mengikuti wisuda.`,
      });
    }

    // Check duplicate
    const existing = await prisma.absensi.findUnique({
      where: {
        mahasiswa_id_sesi_id: {
          mahasiswa_id: mahasiswa.id,
          sesi_id: sesi.id,
        },
      },
      include: { scanned_by: { select: { nama: true } } },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        status: 'ALREADY_RECORDED',
        message: `Mahasiswa sudah tercatat hadir sebelumnya (${new Date(existing.waktu_absen).toLocaleTimeString('id-ID')}).`,
        data: { absensi: existing, mahasiswa, sesi },
      });
    }

    const serverTimestamp = new Date();
    const newAbsensi = await prisma.absensi.create({
      data: {
        mahasiswa_id: mahasiswa.id,
        sesi_id: sesi.id,
        scanned_by_id: req.user?.id || null,
        status: 'HADIR',
        waktu_absen: serverTimestamp,
        metode: 'MANUAL',
        catatan: catatan || 'Absensi manual (Input NIM)',
      },
      include: {
        scanned_by: { select: { id: true, nama: true, username: true } },
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'ABSENSI_MANUAL',
      entity: 'Absensi',
      entityId: newAbsensi.id,
      reason: `Absensi manual oleh petugas untuk ${mahasiswa.nama} (${mahasiswa.nim}). Catatan: ${catatan || 'Input NIM'}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      status: 'SUCCESS',
      message: `Presensi Manual Berhasil: ${mahasiswa.nama} (${mahasiswa.nim})`,
      data: { absensi: newAbsensi, mahasiswa, sesi },
    });
  } catch (error: any) {
    console.error('Manual attendance error:', error);
    if (error.code === 'P2002') {
      return res.status(200).json({
        success: true,
        status: 'ALREADY_RECORDED',
        message: 'Mahasiswa sudah tercatat hadir pada sesi ini.',
      });
    }
    return res.status(500).json({ success: false, message: 'Gagal memproses absensi manual.' });
  }
}
