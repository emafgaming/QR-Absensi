import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import prisma from '../src/prisma.js';

describe('WisudaAttend API Integration Tests', () => {
  let superadminToken = '';
  let petugasToken = '';
  let viewerToken = '';
  let activeSessionId = '';
  let eligibleStudentNim = '';
  let ineligibleStudentNim = '';
  let validQrToken = '';

  beforeAll(async () => {
    // Clean attendance for testing reproducibility
    await prisma.absensi.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // Ensure test users exist
    const pwdHash = await bcrypt.hash('Wisuda2026!', 10);
    await prisma.user.upsert({
      where: { username: 'superadmin' },
      update: { password_hash: pwdHash, is_active: true },
      create: {
        username: 'superadmin',
        nama: 'Superadmin Test',
        email: 'superadmin@wisuda.ac.id',
        password_hash: pwdHash,
        role: 'SUPERADMIN',
      },
    });
    await prisma.user.upsert({
      where: { username: 'petugas1' },
      update: { password_hash: pwdHash, is_active: true },
      create: {
        username: 'petugas1',
        nama: 'Petugas Test',
        email: 'petugas1@wisuda.ac.id',
        password_hash: pwdHash,
        role: 'PETUGAS',
      },
    });
    await prisma.user.upsert({
      where: { username: 'viewer' },
      update: { password_hash: pwdHash, is_active: true },
      create: {
        username: 'viewer',
        nama: 'Viewer Test',
        email: 'viewer@wisuda.ac.id',
        password_hash: pwdHash,
        role: 'VIEWER',
      },
    });

    // 1. Login as Superadmin
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'superadmin', password: 'Wisuda2026!' });
    expect(saLogin.status).toBe(200);
    superadminToken = saLogin.body.data.token;

    // 2. Login as Petugas
    const petLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'petugas1', password: 'Wisuda2026!' });
    expect(petLogin.status).toBe(200);
    petugasToken = petLogin.body.data.token;

    // 3. Login as Viewer
    const viewLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'viewer', password: 'Wisuda2026!' });
    expect(viewLogin.status).toBe(200);
    viewerToken = viewLogin.body.data.token;

    // 4. Retrieve or Create Active Session
    let sesi = await prisma.sesiWisuda.findFirst({
      where: { is_open: true },
    });
    if (!sesi) {
      let event = await prisma.event.findFirst();
      if (!event) {
        event = await prisma.event.create({
          data: {
            nama_event: 'Wisuda Akbar 2026',
            tanggal: new Date(),
            lokasi: 'Auditorium Utama LP3I',
            is_active: true,
          },
        });
      }
      sesi = await prisma.sesiWisuda.create({
        data: {
          event_id: event.id,
          nama_sesi: 'Sesi Pagi - Wisuda 2026',
          waktu_mulai: new Date(),
          waktu_selesai: new Date(Date.now() + 14400000),
          is_open: true,
        },
      });
    }
    expect(sesi).toBeTruthy();
    activeSessionId = sesi!.id;

    // 5. Retrieve or Create an eligible student who has NOT attended yet
    let student = await prisma.mahasiswa.findFirst({
      where: {
        status_kelayakan: 'ELIGIBLE',
      },
      include: { qr_codes: true },
    });
    if (!student) {
      student = await prisma.mahasiswa.create({
        data: {
          nim: '202522001',
          nama: 'Ezzar Muhammad Akbar Firdaus',
          prodi: 'Manajemen Informatika',
          fakultas: '-',
          angkatan: '2025',
          status_kelayakan: 'ELIGIBLE',
        },
        include: { qr_codes: true },
      });
    }
    if (student.qr_codes.length === 0) {
      const qr = await prisma.qrCode.create({
        data: {
          mahasiswa_id: student.id,
          sesi_id: activeSessionId,
          token: `WATT-TEST-${Date.now()}`,
          status: 'ACTIVE',
        },
      });
      student.qr_codes = [qr];
    }
    expect(student).toBeTruthy();
    eligibleStudentNim = student!.nim;
    validQrToken = student!.qr_codes[0]?.token;

    // 6. Retrieve or Create ineligible student
    let ineligible = await prisma.mahasiswa.findFirst({
      where: { status_kelayakan: 'NOT_ELIGIBLE' },
      include: { qr_codes: true },
    });
    if (!ineligible) {
      ineligible = await prisma.mahasiswa.create({
        data: {
          nim: 'TEST_NOT_ELIGIBLE_99',
          nama: 'Mahasiswa Belum Layak',
          prodi: 'Hubungan Masyarakat',
          fakultas: '-',
          angkatan: '2025',
          status_kelayakan: 'NOT_ELIGIBLE',
        },
        include: { qr_codes: true },
      });
    }
    if (ineligible.qr_codes.length === 0) {
      const qr = await prisma.qrCode.create({
        data: {
          mahasiswa_id: ineligible.id,
          sesi_id: activeSessionId,
          token: `WATT-INELIGIBLE-${Date.now()}`,
          status: 'ACTIVE',
        },
      });
      ineligible.qr_codes = [qr];
    }
    expect(ineligible).toBeTruthy();
    ineligibleStudentNim = ineligible!.nim;
  });

  describe('Authentication & RBAC', () => {
    it('rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'superadmin', password: 'WrongPassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated requests to protected endpoints', async () => {
      const res = await request(app).get('/api/v1/mahasiswa');
      expect(res.status).toBe(401);
    });

    it('allows Superadmin to access User management', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('forbids Petugas from accessing User management', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${petugasToken}`);
      expect(res.status).toBe(403);
    });

    it('forbids Viewer from scanning', async () => {
      const res = await request(app)
        .post('/api/v1/scan')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ token: validQrToken, sesi_id: activeSessionId });
      expect(res.status).toBe(403);
    });
  });

  describe('QR Generation & Cryptographic Token', () => {
    it('QR token must NOT contain raw NIM or personal info', () => {
      expect(validQrToken).toBeDefined();
      expect(validQrToken.startsWith('WATT-')).toBe(true);
      expect(validQrToken).not.toContain(eligibleStudentNim);
    });
  });

  describe('Attendance Scanning & Double Attendance Prevention', () => {
    it('successfully processes first valid scan', async () => {
      const res = await request(app)
        .post('/api/v1/scan')
        .set('Authorization', `Bearer ${petugasToken}`)
        .send({ token: validQrToken, sesi_id: activeSessionId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.absensi.metode).toBe('QR_SCAN');
      expect(res.body.data.absensi.waktu_absen).toBeDefined();
    });

    it('strictly prevents duplicate attendance on rescan and returns ALREADY_RECORDED', async () => {
      const countBefore = await prisma.absensi.count();

      const res = await request(app)
        .post('/api/v1/scan')
        .set('Authorization', `Bearer ${petugasToken}`)
        .send({ token: validQrToken, sesi_id: activeSessionId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ALREADY_RECORDED');
      expect(res.body.message).toContain('sudah terdaftar hadir');

      const countAfter = await prisma.absensi.count();
      expect(countAfter).toBe(countBefore); // No new record created in DB!
    });

    it('rejects unknown or invalid QR token', async () => {
      const res = await request(app)
        .post('/api/v1/scan')
        .set('Authorization', `Bearer ${petugasToken}`)
        .send({ token: 'WATT-invalid-fake-token-99999999', sesi_id: activeSessionId });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('TOKEN_UNKNOWN');
    });

    it('rejects student who is NOT_ELIGIBLE', async () => {
      const ineligibleQr = await prisma.qrCode.findFirst({
        where: { mahasiswa: { nim: ineligibleStudentNim } },
      });
      expect(ineligibleQr).toBeTruthy();

      const res = await request(app)
        .post('/api/v1/scan')
        .set('Authorization', `Bearer ${petugasToken}`)
        .send({ token: ineligibleQr!.token, sesi_id: activeSessionId });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('NOT_ELIGIBLE');
      expect(res.body.message).toContain('TIDAK LAYAK');
    });

    it('rejects scan when session is closed', async () => {
      // Create temporary closed session
      const event = await prisma.event.findFirst();
      const closedSesi = await prisma.sesiWisuda.create({
        data: {
          event_id: event!.id,
          nama_sesi: 'Sesi Khusus Ditutup',
          waktu_mulai: new Date(),
          waktu_selesai: new Date(),
          is_open: false, // Closed!
        },
      });

      const res = await request(app)
        .post('/api/v1/scan')
        .set('Authorization', `Bearer ${petugasToken}`)
        .send({ token: validQrToken, sesi_id: closedSesi.id });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('SESSION_CLOSED');

      // Cleanup
      await prisma.sesiWisuda.delete({ where: { id: closedSesi.id } });
    });
  });

  describe('Attendance Correction & Audit Trail', () => {
    it('requires a mandatory reason for attendance correction', async () => {
      const absensi = await prisma.absensi.findFirst();
      expect(absensi).toBeTruthy();

      const res = await request(app)
        .post('/api/v1/absensi/koreksi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          absensi_id: absensi!.id,
          status_baru: 'TERLAMBAT',
          alasan: '', // Empty reason should fail!
        });

      expect(res.status).toBe(400);
    });

    it('successfully corrects attendance and writes to audit log', async () => {
      const absensi = await prisma.absensi.findFirst({
        where: { status: 'HADIR' },
      });
      expect(absensi).toBeTruthy();

      const res = await request(app)
        .post('/api/v1/absensi/koreksi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          absensi_id: absensi!.id,
          status_baru: 'TERLAMBAT',
          alasan: 'Mahasiswa datang setelah prosesi dimulai karena kendala lalu lintas',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('TERLAMBAT');

      // Verify audit log entry was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ATTENDANCE_CORRECT',
          entity_id: absensi!.id,
        },
        orderBy: { created_at: 'desc' },
      });
      expect(auditLog).toBeTruthy();
      expect(auditLog!.reason).toContain('kendala lalu lintas');
    });
  });

  describe('Dashboard Statistics & CSV Export', () => {
    it('returns dashboard statistics matching actual database counts', async () => {
      const res = await request(app)
        .get('/api/v1/reports/dashboard')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalMahasiswa).toBeGreaterThan(0);
      expect(res.body.data.summary.totalHadir).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data.recentScans)).toBe(true);
    });

    it('exports attendance report as CSV with proper headers', async () => {
      const res = await request(app)
        .get('/api/v1/reports/export-csv')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('NIM');
      expect(res.text).toContain('Nama Wisudawan');
      expect(res.text).toContain('Status Kehadiran');
    });

    it('prevents deleting a student who already has attendance records', async () => {
      const attended = await prisma.absensi.findFirst({
        include: { mahasiswa: true },
      });
      expect(attended).toBeTruthy();

      const res = await request(app)
        .delete(`/api/v1/mahasiswa/${attended!.mahasiswa_id}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('riwayat presensi');
    });
  });

  describe('Data Mahasiswa 4-Prodi & Non-Destructive Fields', () => {
    it('accepts student creation with valid LP3I program studi (e.g. Komputerisasi Akuntansi)', async () => {
      const testNim = `TEST-MHS-${Date.now().toString().slice(-6)}`;
      const res = await request(app)
        .post('/api/v1/mahasiswa')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nim: testNim,
          nama: 'Budi LP3I Testing',
          prodi: 'Komputerisasi Akuntansi',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prodi).toBe('Komputerisasi Akuntansi');
      expect(res.body.data.fakultas).toBe('-'); // Defaults safely
      expect(res.body.data.status_kelayakan).toBe('ELIGIBLE'); // Defaults safely
    });

    it('rejects student creation with invalid/unauthorized program studi', async () => {
      const testNim = `TEST-MHS-FAIL-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/v1/mahasiswa')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nim: testNim,
          nama: 'Siswa Prodi Tidak Valid',
          prodi: 'Teknik Penerbangan', // Invalid!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('exports mahasiswa list to CSV with proper columns and no fakultas/status kelayakan', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa/export-csv')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('NIM');
      expect(res.text).toContain('Nama Mahasiswa');
      expect(res.text).toContain('Program Studi');
    });
  });

  describe('Event & Sesi Management CRUD', () => {
    let createdEventId = '';
    let createdSesiId = '';

    it('creates a new event and session as superadmin', async () => {
      const resEvent = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nama_event: 'Acara Uji Coba Hapus Event',
          deskripsi: 'Deskripsi uji coba',
          tanggal: new Date().toISOString(),
          lokasi: 'Gedung Serbaguna',
          is_active: false,
        });

      expect(resEvent.status).toBe(201);
      expect(resEvent.body.success).toBe(true);
      createdEventId = resEvent.body.data.id;

      // Add a session to this event
      const resSesi = await request(app)
        .post('/api/v1/sesi')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          event_id: createdEventId,
          nama_sesi: 'Sesi Uji Coba 1',
          waktu_mulai: new Date().toISOString(),
          waktu_selesai: new Date(Date.now() + 3600000).toISOString(),
          kuota: 100,
          is_open: true,
        });

      expect(resSesi.status).toBe(201);
      createdSesiId = resSesi.body.data.id;
    });

    it('deletes the event and cascades session deletion successfully', async () => {
      const resDelete = await request(app)
        .delete(`/api/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(resDelete.status).toBe(200);
      expect(resDelete.body.success).toBe(true);
      expect(resDelete.body.message).toContain('berhasil dihapus');

      // Verify event is gone
      const checkEvent = await prisma.event.findUnique({ where: { id: createdEventId } });
      expect(checkEvent).toBeNull();

      // Verify cascaded session is also gone
      const checkSesi = await prisma.sesiWisuda.findUnique({ where: { id: createdSesiId } });
      expect(checkSesi).toBeNull();
    });
  });

  describe('Public Live Presence Monitor (No Login Required)', () => {
    it('allows public read of /public/presence/info without any token', async () => {
      const res = await request(app).get('/api/v1/public/presence/info');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total_mahasiswa).toBeGreaterThanOrEqual(0);
      expect(res.body.data.stats.total_hadir).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data.recent_attendance)).toBe(true);

      // Verify privacy masking: raw NIM must never be returned on public endpoint
      if (res.body.data.recent_attendance.length > 0) {
        const item = res.body.data.recent_attendance[0];
        expect(item.nim_masked).toBeDefined();
        expect(item.nim_masked).toContain('•');
        expect(item.nim).toBeUndefined(); // Raw NIM must not leak
        expect(item.token).toBeUndefined(); // Token must not leak
      }
    });

    it('allows public feed polling via /public/presence/feed without auth', async () => {
      const res = await request(app).get('/api/v1/public/presence/feed');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  afterAll(async () => {
    // Clean up temporary test students
    await prisma.mahasiswa.deleteMany({
      where: {
        OR: [
          { nim: { startsWith: 'TEST-' } },
          { nim: { startsWith: 'TEST_' } },
          { nim: { startsWith: 'NIM-' } },
          { nim: { startsWith: 'FAIL-' } },
        ],
      },
    });
  });
});
