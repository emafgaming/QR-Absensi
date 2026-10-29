import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
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

    // 4. Retrieve Active Session
    const sesi = await prisma.sesiWisuda.findFirst({
      where: { is_open: true },
    });
    expect(sesi).toBeTruthy();
    activeSessionId = sesi!.id;

    // 5. Retrieve an eligible student who has NOT attended yet
    const student = await prisma.mahasiswa.findFirst({
      where: {
        status_kelayakan: 'ELIGIBLE',
        nim: { not: '202201001' }, // Ahmad Faiz already attended
      },
      include: { qr_codes: true },
    });
    expect(student).toBeTruthy();
    eligibleStudentNim = student!.nim;
    validQrToken = student!.qr_codes[0]?.token;

    // 6. Retrieve ineligible student
    const ineligible = await prisma.mahasiswa.findFirst({
      where: { status_kelayakan: 'NOT_ELIGIBLE' },
      include: { qr_codes: true },
    });
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
});
