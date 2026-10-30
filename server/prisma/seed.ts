import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding WisudaAttend database with initial data...');

  // Clean existing data for clean seed
  await prisma.auditLog.deleteMany({});
  await prisma.absensi.deleteMany({});
  await prisma.qrCode.deleteMany({});
  await prisma.mahasiswa.deleteMany({});
  await prisma.sesiWisuda.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Users for all 4 roles
  const passwordHash = await bcrypt.hash('Wisuda2026!', 10);

  const users = [
    {
      username: 'superadmin',
      nama: 'Bambang Supriyanto, M.Kom',
      email: 'superadmin@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'SUPERADMIN',
    },
    {
      username: 'adminpanitia',
      nama: 'Siti Rahmawati, S.Sos',
      email: 'panitia@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'ADMIN_PANITIA',
    },
    {
      username: 'petugas1',
      nama: 'Dimas Aditya (Scanner Pintu A)',
      email: 'petugas1@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'PETUGAS',
    },
    {
      username: 'viewer',
      nama: 'Prof. Dr. Hendra Gunawan (Pimpinan)',
      email: 'viewer@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'VIEWER',
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: u,
    });
  }
  console.log('-> Users seeded.');

  // 2. Seed Event
  const event = await prisma.event.create({
    data: {
      nama_event: 'Wisuda Sarjana & Magister Periode I Tahun 2026',
      deskripsi: 'Upacara wisuda kelulusan sarjana dan magister universitas tahun akademik 2025/2026.',
      tanggal: new Date('2026-11-15T08:00:00Z'),
      lokasi: 'Auditorium Utama & Grand Ballroom Kampus Terpadu',
      is_active: true,
    },
  });
  console.log('-> Event created:', event.nama_event);

  // 3. Seed Sessions
  const sesiPagi = await prisma.sesiWisuda.create({
    data: {
      event_id: event.id,
      nama_sesi: 'Sesi 1 (Pagi - Saintek, Kedokteran & Ilmu Komputer)',
      waktu_mulai: new Date('2026-11-15T07:00:00Z'),
      waktu_selesai: new Date('2026-11-15T11:30:00Z'),
      kuota: 600,
      is_open: true, // open for scanning
    },
  });

  const sesiSiang = await prisma.sesiWisuda.create({
    data: {
      event_id: event.id,
      nama_sesi: 'Sesi 2 (Siang - Ekonomi, Bisnis & Hukum)',
      waktu_mulai: new Date('2026-11-15T13:00:00Z'),
      waktu_selesai: new Date('2026-11-15T17:00:00Z'),
      kuota: 500,
      is_open: true,
    },
  });
  console.log('-> Sesi created: Sesi 1 (Pagi) & Sesi 2 (Siang).');

  // 4. Seed Mahasiswa
  const mahasiswaData = [
    {
      nim: '202201001',
      nama: 'Ahmad Faiz Fadhlurrahman',
      prodi: 'Teknik Informatika',
      fakultas: 'Teknologi Informasi',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'ahmad.faiz@student.ac.id',
      no_hp: '081234567001',
      sesi: sesiPagi,
    },
    {
      nim: '202201002',
      nama: 'Nabila Azzahra Putri',
      prodi: 'Sistem Informasi',
      fakultas: 'Teknologi Informasi',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'nabila.azzahra@student.ac.id',
      no_hp: '081234567002',
      sesi: sesiPagi,
    },
    {
      nim: '202201003',
      nama: 'Rizky Maulana Pratama',
      prodi: 'Teknik Elektro',
      fakultas: 'Teknik',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'rizky.m@student.ac.id',
      no_hp: '081234567003',
      sesi: sesiPagi,
    },
    {
      nim: '202201004',
      nama: 'Devi Anggraeni Kusuma',
      prodi: 'Kedokteran Umum',
      fakultas: 'Kedokteran',
      angkatan: '2021',
      status_kelayakan: 'ELIGIBLE',
      email: 'devi.kusuma@student.ac.id',
      no_hp: '081234567004',
      sesi: sesiPagi,
    },
    {
      nim: '202201005',
      nama: 'Fahri Ramadhan Hidayat',
      prodi: 'Farmasi',
      fakultas: 'Farmasi',
      angkatan: '2022',
      status_kelayakan: 'NOT_ELIGIBLE', // Tested for rejection
      email: 'fahri.ramadhan@student.ac.id',
      no_hp: '081234567005',
      sesi: sesiPagi,
    },
    {
      nim: '202202001',
      nama: 'Indah Permata Sari',
      prodi: 'Manajemen',
      fakultas: 'Ekonomi dan Bisnis',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'indah.permata@student.ac.id',
      no_hp: '081234567006',
      sesi: sesiSiang,
    },
    {
      nim: '202202002',
      nama: 'Bagus Setiawan Wicaksono',
      prodi: 'Akuntansi',
      fakultas: 'Ekonomi dan Bisnis',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'bagus.wicaksono@student.ac.id',
      no_hp: '081234567007',
      sesi: sesiSiang,
    },
    {
      nim: '202202003',
      nama: 'Clarissa Abigail Chen',
      prodi: 'Ilmu Hukum',
      fakultas: 'Hukum',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'clarissa.abigail@student.ac.id',
      no_hp: '081234567008',
      sesi: sesiSiang,
    },
    {
      nim: '202202004',
      nama: 'Gilang Ramadhan Saputra',
      prodi: 'Hubungan Internasional',
      fakultas: 'Ilmu Sosial dan Politik',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'gilang.saputra@student.ac.id',
      no_hp: '081234567009',
      sesi: sesiSiang,
    },
    {
      nim: '202202005',
      nama: 'Meilani Tri Hapsari',
      prodi: 'Ilmu Komunikasi',
      fakultas: 'Ilmu Sosial dan Politik',
      angkatan: '2022',
      status_kelayakan: 'ELIGIBLE',
      email: 'meilani.tri@student.ac.id',
      no_hp: '081234567010',
      sesi: sesiSiang,
    },
  ];

  const petugas = await prisma.user.findUnique({ where: { username: 'petugas1' } });

  for (const m of mahasiswaData) {
    const createdMhs = await prisma.mahasiswa.create({
      data: {
        nim: m.nim,
        nama: m.nama,
        prodi: m.prodi,
        fakultas: m.fakultas,
        angkatan: m.angkatan,
        status_kelayakan: m.status_kelayakan,
        email: m.email,
        no_hp: m.no_hp,
      },
    });

    // Generate random secure token for QR
    const randomHex = crypto.randomBytes(32).toString('hex');
    const token = `WATT-${randomHex}`;

    const qr = await prisma.qrCode.create({
      data: {
        mahasiswa_id: createdMhs.id,
        sesi_id: m.sesi.id,
        token,
        status: 'ACTIVE',
      },
    });

    // Mark Ahmad Faiz as already attended for initial stats
    if (m.nim === '202201001') {
      await prisma.absensi.create({
        data: {
          mahasiswa_id: createdMhs.id,
          sesi_id: m.sesi.id,
          qr_code_id: qr.id,
          scanned_by_id: petugas?.id || null,
          status: 'HADIR',
          waktu_absen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          metode: 'QR_SCAN',
          catatan: 'Hadir tepat waktu di pintu masuk utama',
        },
      });
    }
  }

  // 5. Audit Log Seed
  const superadmin = await prisma.user.findUnique({ where: { username: 'superadmin' } });
  await prisma.auditLog.create({
    data: {
      user: superadmin ? { connect: { id: superadmin.id } } : undefined,
      action: 'SYSTEM_INIT',
      entity: 'System',
      reason: 'Inisialisasi sistem basis data WisudaAttend dengan data awal acara dan wisudawan.',
      ip_address: '127.0.0.1',
    },
  });

  console.log('-> Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
