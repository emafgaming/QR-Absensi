import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { presenceEmitter, maskNim, PresenceScanEvent } from '../services/presenceService.js';

/**
 * Public Endpoint: Fetch Live Presence Information & Summary Stats
 * No login required, minimal privacy-safe attributes
 */
export async function getPresenceInfo(req: Request, res: Response) {
  try {
    const { sesi_id } = req.query as Record<string, string>;

    // 1. Resolve Active Session
    let activeSesi = null;
    if (sesi_id) {
      activeSesi = await prisma.sesiWisuda.findUnique({
        where: { id: sesi_id },
        include: { event: true },
      });
    }

    if (!activeSesi) {
      // Find open session or latest session
      activeSesi = await prisma.sesiWisuda.findFirst({
        where: { is_open: true },
        include: { event: true },
        orderBy: { waktu_mulai: 'asc' },
      });

      if (!activeSesi) {
        activeSesi = await prisma.sesiWisuda.findFirst({
          include: { event: true },
          orderBy: { created_at: 'desc' },
        });
      }
    }

    // 2. Retrieve All Available Sessions for Monitor Session Switcher
    const allSessions = await prisma.sesiWisuda.findMany({
      include: {
        event: { select: { id: true, nama_event: true, tanggal: true, lokasi: true } },
        _count: { select: { absensi: true } },
      },
      orderBy: { waktu_mulai: 'asc' },
    });

    if (!activeSesi) {
      return res.json({
        success: true,
        data: {
          session: null,
          available_sessions: [],
          stats: {
            total_mahasiswa: 0,
            total_hadir: 0,
            persentase_kehadiran: 0,
            last_updated: new Date().toISOString(),
          },
          recent_attendance: [],
        },
      });
    }

    // 3. Compute Attendance Statistics
    // Total eligible students in system (or for this session)
    const [totalEligible, totalHadir, recentAbsensi] = await Promise.all([
      prisma.mahasiswa.count({
        where: { status_kelayakan: 'ELIGIBLE' },
      }),
      prisma.absensi.count({
        where: {
          sesi_id: activeSesi.id,
          status: 'HADIR',
        },
      }),
      prisma.absensi.findMany({
        where: {
          sesi_id: activeSesi.id,
          status: 'HADIR',
        },
        take: 50,
        orderBy: { waktu_absen: 'desc' },
        include: {
          mahasiswa: {
            select: {
              id: true,
              nama: true,
              nim: true,
              prodi: true,
            },
          },
        },
      }),
    ]);

    const percentage =
      totalEligible > 0 ? Number(((totalHadir / totalEligible) * 100).toFixed(1)) : 0;

    // Sanitize records with privacy masking
    const sanitizedHistory = recentAbsensi.map((rec, index) => ({
      no: index + 1,
      id: rec.id,
      nama: rec.mahasiswa.nama,
      nim_masked: maskNim(rec.mahasiswa.nim),
      prodi: rec.mahasiswa.prodi,
      waktu_absen: rec.waktu_absen,
      status: rec.status,
    }));

    return res.json({
      success: true,
      data: {
        session: {
          id: activeSesi.id,
          nama_sesi: activeSesi.nama_sesi,
          waktu_mulai: activeSesi.waktu_mulai,
          waktu_selesai: activeSesi.waktu_selesai,
          is_open: activeSesi.is_open,
          event: {
            id: activeSesi.event.id,
            nama_event: activeSesi.event.nama_event,
            tanggal: activeSesi.event.tanggal,
            lokasi: activeSesi.event.lokasi,
          },
        },
        available_sessions: allSessions.map((s) => ({
          id: s.id,
          nama_sesi: s.nama_sesi,
          is_open: s.is_open,
          nama_event: s.event.nama_event,
          waktu_mulai: s.waktu_mulai,
          total_absen: s._count.absensi,
        })),
        stats: {
          total_mahasiswa: totalEligible,
          total_hadir: totalHadir,
          persentase_kehadiran: percentage,
          last_updated: new Date().toISOString(),
        },
        recent_attendance: sanitizedHistory,
      },
    });
  } catch (error: any) {
    console.error('Error fetching presence info:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat informasi kehadiran publik',
    });
  }
}

/**
 * Public Endpoint: Server-Sent Events (SSE) Stream
 * Pushes real-time scan events immediately as cards are validated
 */
export async function streamPresence(req: Request, res: Response) {
  const sesiId = (req.query.sesi_id as string) || '';

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  // Initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat ping every 15 seconds to prevent gateway timeouts
  const heartbeatTimer = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 15000);

  // Scan Event Listener
  const onScan = async (event: PresenceScanEvent) => {
    try {
      if (sesiId && event.sesi_id !== sesiId) {
        return; // Filter to selected session
      }

      // Query latest stats so monitor stays accurately synced
      const [totalEligible, totalHadir] = await Promise.all([
        prisma.mahasiswa.count({ where: { status_kelayakan: 'ELIGIBLE' } }),
        prisma.absensi.count({ where: { sesi_id: event.sesi_id, status: 'HADIR' } }),
      ]);

      const percentage =
        totalEligible > 0 ? Number(((totalHadir / totalEligible) * 100).toFixed(1)) : 0;

      const payload = {
        type: 'SCAN_SUCCESS',
        data: event,
        stats: {
          total_mahasiswa: totalEligible,
          total_hadir: totalHadir,
          persentase_kehadiran: percentage,
          last_updated: new Date().toISOString(),
        },
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      console.error('Error sending SSE message:', err);
    }
  };

  presenceEmitter.on('scan', onScan);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatTimer);
    presenceEmitter.off('scan', onScan);
    res.end();
  });
}

/**
 * Public Fallback Endpoint: Polling Feed
 */
export async function getPresenceFeed(req: Request, res: Response) {
  try {
    const { sesi_id, since } = req.query as Record<string, string>;

    const where: any = { status: 'HADIR' };
    if (sesi_id) where.sesi_id = sesi_id;
    if (since) where.waktu_absen = { gt: new Date(since) };

    const records = await prisma.absensi.findMany({
      where,
      take: 20,
      orderBy: { waktu_absen: 'desc' },
      include: {
        mahasiswa: {
          select: {
            id: true,
            nama: true,
            nim: true,
            prodi: true,
          },
        },
      },
    });

    const feed = records.map((rec) => ({
      id: rec.id,
      nama: rec.mahasiswa.nama,
      nim_masked: maskNim(rec.mahasiswa.nim),
      prodi: rec.mahasiswa.prodi,
      waktu_absen: rec.waktu_absen,
      status: rec.status,
    }));

    return res.json({
      success: true,
      data: feed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memuat feed kehadiran' });
  }
}
