import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { generateSecureToken, generateQrDataUrl } from '../utils/qr.js';
import { createAuditLog } from '../utils/audit.js';

export async function generateForMahasiswa(req: Request, res: Response) {
  try {
    const { mahasiswa_id, sesi_id } = req.body;

    // Verify mahasiswa
    const mahasiswa = await prisma.mahasiswa.findUnique({ where: { id: mahasiswa_id } });
    if (!mahasiswa) {
      return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });
    }

    // Verify session
    const sesi = await prisma.sesiWisuda.findUnique({
      where: { id: sesi_id },
      include: { event: true },
    });
    if (!sesi) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    // Check if active QR already exists for this student & session
    const existingQr = await prisma.qrCode.findFirst({
      where: { mahasiswa_id, sesi_id, status: 'ACTIVE' },
    });

    if (existingQr) {
      const qrDataUrl = await generateQrDataUrl(existingQr.token);
      return res.json({
        success: true,
        message: 'QR Code aktif sudah tersedia.',
        data: {
          ...existingQr,
          qr_data_url: qrDataUrl,
          mahasiswa,
          sesi,
        },
      });
    }

    // Generate new random cryptographic token
    const token = generateSecureToken();

    const newQr = await prisma.qrCode.create({
      data: {
        mahasiswa_id,
        sesi_id,
        token,
        status: 'ACTIVE',
      },
    });

    const qrDataUrl = await generateQrDataUrl(token);

    await createAuditLog({
      userId: req.user?.id,
      action: 'QR_GENERATE',
      entity: 'QrCode',
      entityId: newQr.id,
      reason: `Generate QR code untuk ${mahasiswa.nama} (${mahasiswa.nim}) pada sesi ${sesi.nama_sesi}`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'QR Code berhasil dibuat.',
      data: {
        ...newQr,
        qr_data_url: qrDataUrl,
        mahasiswa,
        sesi,
      },
    });
  } catch (error: any) {
    console.error('Error generating QR:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat QR Code' });
  }
}

/**
 * Batch generate QR codes for a session with optional prodi/fakultas filters
 */
export async function batchGenerate(req: Request, res: Response) {
  try {
    const { sesi_id, filter_prodi, filter_fakultas, regenerate_existing } = req.body;

    const sesi = await prisma.sesiWisuda.findUnique({
      where: { id: sesi_id },
      include: { event: true },
    });
    if (!sesi) {
      return res.status(404).json({ success: false, message: 'Sesi wisuda tidak ditemukan' });
    }

    // Build filter for eligible students
    const where: any = {
      status_kelayakan: 'ELIGIBLE',
    };
    if (filter_prodi) where.prodi = filter_prodi;
    if (filter_fakultas) where.fakultas = filter_fakultas;

    const students = await prisma.mahasiswa.findMany({ where });

    let generatedCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const activeQr = await prisma.qrCode.findFirst({
        where: { mahasiswa_id: student.id, sesi_id, status: 'ACTIVE' },
      });

      if (activeQr) {
        if (regenerate_existing) {
          // Revoke old and create new
          await prisma.qrCode.update({
            where: { id: activeQr.id },
            data: { status: 'REVOKED', revoked_at: new Date() },
          });
          const token = generateSecureToken();
          await prisma.qrCode.create({
            data: {
              mahasiswa_id: student.id,
              sesi_id,
              token,
              status: 'ACTIVE',
            },
          });
          generatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const token = generateSecureToken();
        await prisma.qrCode.create({
          data: {
            mahasiswa_id: student.id,
            sesi_id,
            token,
            status: 'ACTIVE',
          },
        });
        generatedCount++;
      }
    }

    await createAuditLog({
      userId: req.user?.id,
      action: 'QR_BATCH_GENERATE',
      entity: 'QrCode',
      reason: `Batch generate QR pada sesi ${sesi.nama_sesi}: ${generatedCount} dibuat, ${skippedCount} dilewati`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: `Batch QR berhasil diproses. ${generatedCount} QR baru dibuat, ${skippedCount} mahasiswa sudah memiliki QR.`,
      data: {
        totalTarget: students.length,
        generated: generatedCount,
        skipped: skippedCount,
      },
    });
  } catch (error: any) {
    console.error('Batch QR error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memproses batch QR' });
  }
}

/**
 * Revoke a QR code
 */
export async function revokeQr(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { alasan } = req.body;

    const qr = await prisma.qrCode.findUnique({
      where: { id },
      include: { mahasiswa: true, sesi: true },
    });

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Code tidak ditemukan' });
    }

    const updated = await prisma.qrCode.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revoked_at: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'QR_REVOKE',
      entity: 'QrCode',
      entityId: id,
      oldValue: { status: qr.status },
      newValue: { status: 'REVOKED' },
      reason: alasan || `Mencabut QR Code mahasiswa ${qr.mahasiswa.nama} (${qr.mahasiswa.nim})`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'QR Code berhasil dicabut.',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mencabut QR Code' });
  }
}

/**
 * Get all active QR cards for printing / download
 */
export async function getCardsForSession(req: Request, res: Response) {
  try {
    const { sesi_id } = req.params;
    const { prodi, fakultas } = req.query as Record<string, string>;

    const where: any = {
      sesi_id,
      status: 'ACTIVE',
    };

    if (prodi || fakultas) {
      where.mahasiswa = {};
      if (prodi) where.mahasiswa.prodi = prodi;
      if (fakultas) where.mahasiswa.fakultas = fakultas;
    }

    const qrCodes = await prisma.qrCode.findMany({
      where,
      include: {
        mahasiswa: true,
        sesi: { include: { event: true } },
      },
      orderBy: { mahasiswa: { nim: 'asc' } },
    });

    // Generate QR images
    const cards = await Promise.all(
      qrCodes.map(async qr => {
        const qrDataUrl = await generateQrDataUrl(qr.token);
        return {
          id: qr.id,
          token: qr.token,
          status: qr.status,
          generated_at: qr.generated_at,
          qr_data_url: qrDataUrl,
          mahasiswa: qr.mahasiswa,
          sesi: qr.sesi,
        };
      })
    );

    return res.json({
      success: true,
      data: cards,
    });
  } catch (error: any) {
    console.error('Error getting cards:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data kartu QR' });
  }
}
