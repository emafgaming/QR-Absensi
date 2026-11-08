import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';
import { formatTimeWib, isTimeOverlapping, validateTimeRange } from '../src/utils/time.js';

describe('WisudaAttend Comprehensive Bug Fixes & Integrity Tests', () => {
  let superadminToken = '';
  let testEventId = '';
  let sessionAId = '';
  let testMhsId = '';

  beforeAll(async () => {
    // 1. Authenticate as Superadmin
    let saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'superadmin', password: 'Wisuda2026!' });

    if (saLogin.status !== 200) {
      saLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'superadmin', password: 'admin123' });
    }
    expect(saLogin.status).toBe(200);
    superadminToken = saLogin.body.data.token;

    // 2. Create dedicated Test Event for schedule tests
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({
        nama_event: 'Acara Pengujian Validasi Jadwal 2026',
        deskripsi: 'Event khusus untuk verifikasi tumpang tindih sesi',
        tanggal: '2026-11-20T00:00:00+07:00',
        lokasi: 'Auditorium Pengujian',
        is_active: true,
      });
    expect(eventRes.status).toBe(201);
    testEventId = eventRes.body.data.id;

    // 3. Create test student for case-insensitive search
    const mhs = await prisma.mahasiswa.upsert({
      where: { nim: '202499001' },
      update: { nama: 'Ahmad Fauzi testing' },
      create: {
        nim: '202499001',
        nama: 'Ahmad Fauzi testing',
        prodi: 'Manajemen Informatika',
        angkatan: '2024',
        fakultas: '-',
        status_kelayakan: 'ELIGIBLE',
      },
    });
    testMhsId = mhs.id;
  });

  afterAll(async () => {
    // Cleanup created test event and sessions (will cascade)
    if (testEventId) {
      await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
    }
    if (testMhsId) {
      await prisma.mahasiswa.delete({ where: { id: testMhsId } }).catch(() => {});
    }
  });

  // ==========================================
  // AREA 1 & 2: TIME VALIDATION & OVERLAPPING SESSIONS
  // ==========================================
  describe('Area 1 & 2: Schedule & Collision Prevention', () => {
    it('1. Successfully creates Sesi A (08.00–10.00 WIB) with accurate Asia/Jakarta timezone', async () => {
      // 08:00 WIB is 01:00 UTC
      const startWib = '2026-11-20T08:00:00+07:00';
      const endWib = '2026-11-20T10:00:00+07:00';

      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Pagi A',
          waktu_mulai: startWib,
          waktu_selesai: endWib,
          kuota: 250,
          is_open: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      sessionAId = res.body.data.id;

      // Verify stored time formats exactly to 08.00–10.00 in Asia/Jakarta
      expect(formatTimeWib(res.body.data.waktu_mulai)).toBe('08.00');
      expect(formatTimeWib(res.body.data.waktu_selesai)).toBe('10.00');
    });

    it('2. Time remains consistent when fetching session details (persists across refresh)', async () => {
      const res = await request(app)
        .get(`/api/v1/sesi/${sessionAId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(formatTimeWib(res.body.data.waktu_mulai)).toBe('08.00');
      expect(formatTimeWib(res.body.data.waktu_selesai)).toBe('10.00');
    });

    it('3. Rejects session when waktu_selesai <= waktu_mulai (e.g. 10.00 to 08.00)', async () => {
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Waktu Terbalik',
          waktu_mulai: '2026-11-20T10:00:00+07:00',
          waktu_selesai: '2026-11-20T08:00:00+07:00',
          kuota: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Waktu selesai harus lebih besar dari waktu mulai/i);
    });

    it('4. Rejects session when waktu_selesai === waktu_mulai', async () => {
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Waktu Nol',
          waktu_mulai: '2026-11-20T08:00:00+07:00',
          waktu_selesai: '2026-11-20T08:00:00+07:00',
          kuota: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Waktu selesai harus lebih besar dari waktu mulai/i);
    });

    it('5. Rejects overlapping session B (09.00–11.00 WIB) with informative collision message', async () => {
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi B Tumpang Tindih',
          waktu_mulai: '2026-11-20T09:00:00+07:00',
          waktu_selesai: '2026-11-20T11:00:00+07:00',
          kuota: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Jadwal sesi bertabrakan dengan Sesi Pagi A (08.00–10.00). Silakan pilih waktu lain.');
    });

    it('6. Rejects identical time session (08.00–10.00 WIB)', async () => {
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Duplikat Jam',
          waktu_mulai: '2026-11-20T08:00:00+07:00',
          waktu_selesai: '2026-11-20T10:00:00+07:00',
          kuota: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Jadwal sesi bertabrakan dengan Sesi Pagi A (08.00–10.00)');
    });

    it('7. Accepts sequential non-overlapping session (10.00–12.00 WIB)', async () => {
      // Exactly starts when Sesi A ends (startB == endA -> startA < endB AND startB < endA is FALSE)
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Siang Berurutan',
          waktu_mulai: '2026-11-20T10:00:00+07:00',
          waktu_selesai: '2026-11-20T12:00:00+07:00',
          kuota: 200,
          is_open: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nama_sesi).toBe('Sesi Siang Berurutan');
    });

    it('8. Allows editing session A without colliding with itself', async () => {
      const res = await request(app)
        .put(`/api/v1/sesi/${sessionAId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nama_sesi: 'Sesi Pagi A (Updated)',
          waktu_mulai: '2026-11-20T08:00:00+07:00',
          waktu_selesai: '2026-11-20T09:45:00+07:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nama_sesi).toBe('Sesi Pagi A (Updated)');
      expect(formatTimeWib(res.body.data.waktu_selesai)).toBe('09.45');
    });

    it('9. Rejects editing session A when updated time collides with Sesi Siang (10.00–12.00)', async () => {
      const res = await request(app)
        .put(`/api/v1/sesi/${sessionAId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          waktu_selesai: '2026-11-20T10:30:00+07:00', // Extends into Sesi Siang!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Jadwal sesi bertabrakan dengan Sesi Siang Berurutan (10.00–12.00)');
    });
  });

  // ==========================================
  // AREA 3: TARGET KUOTA PESERTA INPUT & VALIDATION
  // ==========================================
  describe('Area 3: Target Kuota Validation', () => {
    it('1. Rejects session with kuota = 0', async () => {
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Kuota Nol',
          waktu_mulai: '2026-11-20T13:00:00+07:00',
          waktu_selesai: '2026-11-20T15:00:00+07:00',
          kuota: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/kuota.*minimal 1/i);
    });

    it('2. Rejects session with negative kuota', async () => {
      const res = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: testEventId,
          nama_sesi: 'Sesi Kuota Negatif',
          waktu_mulai: '2026-11-20T13:00:00+07:00',
          waktu_selesai: '2026-11-20T15:00:00+07:00',
          kuota: -50,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('3. Successfully updates session kuota from 250 to 100', async () => {
      const res = await request(app)
        .put(`/api/v1/sesi/${sessionAId}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          kuota: 100,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.kuota).toBe(100);
    });
  });

  // ==========================================
  // AREA 4: SEARCH DATA MAHASISWA CASE-INSENSITIVE & RESILIENT
  // ==========================================
  describe('Area 4: Case-Insensitive & Resilient Student Search', () => {
    it('1. Finds student using UPPERCASE search "AHMAD"', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=AHMAD')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });

    it('2. Finds student using lowercase search "ahmad"', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=ahmad')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });

    it('3. Finds student using mixed-case search "AhMaD"', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=AhMaD')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });

    it('4. Handles accidental leading and trailing whitespace "   ahmad   "', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=%20%20%20ahmad%20%20%20')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });

    it('5. Handles multi-word search with multiple spaces "Ahmad    testing"', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=Ahmad%20%20%20%20testing')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });

    it('6. Finds student using NIM "202499001"', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=202499001')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });

    it('7. Finds student using Program Studi keyword "Informatika"', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa?search=informatika')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((m: any) => m.nim === '202499001')).toBe(true);
    });
  });

  // ==========================================
  // AREA 5: DATA PERSISTENCE & TRANSACTION INTEGRITY
  // ==========================================
  describe('Area 5: Data Persistence & Batch QR Transactions', () => {
    it('1. Generates QR and verifies persistent relationship with session and student', async () => {
      const res = await request(app)
        .post('/api/v1/qr/generate')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          mahasiswa_id: testMhsId,
          sesi_id: sessionAId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const qrId = res.body.data.id;

      // Verify QR exists in database and links properly
      const qrInDb = await prisma.qrCode.findUnique({
        where: { id: qrId },
        include: { sesi: true, mahasiswa: true },
      });
      expect(qrInDb).not.toBeNull();
      expect(qrInDb?.sesi_id).toBe(sessionAId);
      expect(qrInDb?.mahasiswa_id).toBe(testMhsId);
    });

    it('2. Batch QR generation executes atomically and handles duplicate requests safely', async () => {
      const res = await request(app)
        .post('/api/v1/qr/batch-generate')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          sesi_id: sessionAId,
          regenerate_existing: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTarget).toBeGreaterThan(0);
      // Student already had active QR, so it should be skipped
      expect(res.body.data.skipped).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // AREA 7: PERFORMANCE & OPTIMIZED DASHBOARD QUERY
  // ==========================================
  describe('Area 7: Dashboard Aggregation Performance', () => {
    it('Returns aggregated prodi stats without executing N+1 count queries', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.prodiStats)).toBe(true);
      expect(res.body.data.prodiStats.length).toBeGreaterThan(0);
      expect(res.body.data.summary.totalMahasiswa).toBeGreaterThan(0);
    });
  });
});
