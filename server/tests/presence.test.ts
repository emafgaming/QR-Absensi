import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';
import { maskNim, presenceEmitter, broadcastAttendanceScan } from '../src/services/presenceService.js';
import { PRODI_OPTIONS } from '../src/types/index.js';

describe('Wisuda Presence & Data Mahasiswa Comprehensive Tests', () => {
  let superadminToken = '';
  let activeSessionId = '';

  beforeAll(async () => {
    // 1. Superadmin Login
    const saLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'superadmin', password: 'Wisuda2026!' });
    expect(saLogin.status).toBe(200);
    superadminToken = saLogin.body.data.token;

    // 2. Active Session
    let sesi = await prisma.sesiWisuda.findFirst({ where: { is_open: true } });
    if (!sesi) {
      let event = await prisma.event.findFirst();
      if (!event) {
        event = await prisma.event.create({
          data: {
            nama_event: 'Wisuda Angkatan 2024',
            tanggal: new Date(),
            lokasi: 'Auditorium Utama LP3I',
            is_active: true,
          },
        });
      }
      sesi = await prisma.sesiWisuda.create({
        data: {
          event_id: event.id,
          nama_sesi: 'Sesi 1 (Pagi)',
          waktu_mulai: new Date(),
          waktu_selesai: new Date(Date.now() + 8 * 3600 * 1000),
          kuota: 500,
          is_open: true,
        },
      });
    }
    expect(sesi).toBeTruthy();
    activeSessionId = sesi!.id;
  });

  describe('NIM Privacy Masking', () => {
    it('masks NIM correctly for privacy on public screen', () => {
      expect(maskNim('202522001')).toBe('2025 •••• 001');
      expect(maskNim('1234567890')).toBe('1234 •••• 890');
      expect(maskNim('123456')).toBe('12 ••• 56');
      expect(maskNim('')).toBe('');
    });
  });

  describe('Public Presence Info Endpoint (No Login Required)', () => {
    it('allows anyone to access /api/v1/public/presence/info without token', async () => {
      const res = await request(app).get('/api/v1/public/presence/info');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total_mahasiswa).toBeGreaterThanOrEqual(0);
      expect(res.body.data.stats.total_hadir).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.data.stats.persentase_kehadiran).toBe('number');
      expect(Array.isArray(res.body.data.recent_attendance)).toBe(true);
    });

    it('ensures no sensitive student secrets (raw NIM, token, email, passwords) leak into public info', async () => {
      const res = await request(app).get('/api/v1/public/presence/info');
      expect(res.status).toBe(200);
      for (const item of res.body.data.recent_attendance) {
        expect(item.nim_masked).toBeDefined();
        expect(item.nim).toBeUndefined();
        expect(item.token).toBeUndefined();
        expect(item.email).toBeUndefined();
        expect(item.no_hp).toBeUndefined();
      }
    });

    it('allows anyone to query /api/v1/public/presence/feed for fallback polling', async () => {
      const res = await request(app).get('/api/v1/public/presence/feed');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Live Broadcast Event Emitter', () => {
    it('broadcasts attendance events to active monitor subscribers', async () => {
      const testEvent = {
        id: 'test-absensi-123',
        nama: 'Ahmad Rizky Pratama',
        nim_masked: '2025 •••• 001',
        prodi: 'Manajemen Informatika',
        waktu_absen: new Date(),
        sesi_id: activeSessionId,
        status: 'HADIR',
        timestamp: new Date().toISOString(),
      };

      await new Promise<void>((resolve) => {
        const listener = (event: any) => {
          expect(event.id).toBe(testEvent.id);
          expect(event.nama).toBe(testEvent.nama);
          expect(event.nim_masked).toBe(testEvent.nim_masked);
          expect(event.prodi).toBe(testEvent.prodi);
          presenceEmitter.off('scan', listener);
          resolve();
        };

        presenceEmitter.on('scan', listener);
        broadcastAttendanceScan(testEvent);
      });
    });
  });

  describe('Data Mahasiswa 4 Program Studi Validation', () => {
    it('defines exactly the 4 allowed program studi', () => {
      expect(PRODI_OPTIONS).toEqual([
        'Manajemen Informatika',
        'Hubungan Masyarakat',
        'Komputerisasi Akuntansi',
        'Administrasi Bisnis',
      ]);
    });

    it.each([
      'Manajemen Informatika',
      'Hubungan Masyarakat',
      'Komputerisasi Akuntansi',
      'Administrasi Bisnis',
    ])('accepts creation with official prodi: %s', async (prodi) => {
      const nim = `NIM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const res = await request(app)
        .post('/api/v1/mahasiswa')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nim,
          nama: `Wisudawan ${prodi}`,
          prodi,
          angkatan: '2025',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prodi).toBe(prodi);
      expect(res.body.data.fakultas).toBe('-'); // Non-destructive default
      expect(res.body.data.status_kelayakan).toBe('ELIGIBLE'); // Non-destructive default
    });

    it('strictly rejects any prodi outside the 4 official choices', async () => {
      const nim = `FAIL-NIM-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/v1/mahasiswa')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nim,
          nama: 'Budi Bukan LP3I',
          prodi: 'Kedokteran Hewan',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('allows CSV export without Fakultas or Status Kelayakan columns', async () => {
      const res = await request(app)
        .get('/api/v1/mahasiswa/export-csv')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      const lines = res.text.split('\r\n');
      const header = lines[0];
      expect(header).toContain('NIM');
      expect(header).toContain('Nama Mahasiswa');
      expect(header).toContain('Program Studi');
      expect(header).not.toContain('Fakultas');
      expect(header).not.toContain('Status Kelayakan');
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
