import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function generateSecureToken(): string {
  return `WATT-${crypto.randomBytes(32).toString('hex')}`;
}

async function main() {
  console.log('Memverifikasi akun autentikasi sistem WisudaAttend...');

  // 1. Ensure primary role accounts exist
  const passwordHash = await bcrypt.hash('Wisuda2026!', 10);

  const defaultUsers = [
    {
      username: 'superadmin',
      nama: 'Administrator Utama',
      email: 'superadmin@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'SUPERADMIN',
    },
    {
      username: 'adminpanitia',
      nama: 'Admin Panitia Wisuda',
      email: 'panitia@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'ADMIN_PANITIA',
    },
    {
      username: 'petugas1',
      nama: 'Petugas Pemindai Presensi',
      email: 'petugas1@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'PETUGAS',
    },
    {
      username: 'viewer',
      nama: 'Pimpinan & Pengawas (Viewer)',
      email: 'viewer@wisuda.ac.id',
      password_hash: passwordHash,
      role: 'VIEWER',
    },
  ];

  for (const u of defaultUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        password_hash: passwordHash,
        is_active: true,
      },
      create: u,
    });
  }
  console.log('-> Akun sistem berhasil disiapkan.');

  // 2. Ensure Active Event & Sesi Wisuda exist
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
  console.log(`-> Sesi Aktif: "${sesi.nama_sesi}" (${event.nama_event})`);

  // 3. Safety Check: Only clean data if database is empty or explicitly allowed via ALLOW_DESTRUCTIVE_SEED=true
  const existingMhsCount = await prisma.mahasiswa.count();
  if (existingMhsCount > 0 && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    console.log(`-> Database telah berisi ${existingMhsCount} data mahasiswa. Melewati pembersihan destruktif untuk menjaga integritas data.`);
    console.log('-> Gunakan ALLOW_DESTRUCTIVE_SEED=true bila secara sengaja ingin mengulang inisialisasi dari awal.');
  } else {
    console.log('-> Membersihkan data lama untuk inisialisasi bersih...');
    await prisma.absensi.deleteMany({});
    await prisma.qrCode.deleteMany({});
    const deletedMhs = await prisma.mahasiswa.deleteMany({});
    console.log(`-> Berhasil membersihkan ${deletedMhs.count} data mahasiswa.`);
  }

  // 4. Import Real Students from real_students.json (from 'Rekap IPK Mahasiswa Angkatan 2024.xls')
  const jsonPath = path.resolve(__dirname, 'real_students.json');
  const ALLOWED_PRODIS = [
    'Manajemen Informatika',
    'Hubungan Masyarakat',
    'Komputerisasi Akuntansi',
    'Administrasi Bisnis',
  ];

  if (fs.existsSync(jsonPath)) {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const students: any[] = JSON.parse(rawData);

    // Strictly filter only students in the 4 official prodis
    const validStudents = students.filter((s) => ALLOWED_PRODIS.includes(s.prodi));

    console.log(`Memproses impor ${validStudents.length} data mahasiswa resmi dari 'Rekap IPK Mahasiswa Angkatan 2024.xls'...`);

    let importedCount = 0;
    let qrCreatedCount = 0;

    for (const s of validStudents) {
      const mhs = await prisma.mahasiswa.create({
        data: {
          nim: s.nim,
          nama: s.nama,
          prodi: s.prodi,
          angkatan: s.angkatan || '2024',
          fakultas: s.fakultas || '-',
          status_kelayakan: s.status_kelayakan || 'ELIGIBLE',
        },
      });
      importedCount++;

      // Create active QR code for this student in the active session
      await prisma.qrCode.create({
        data: {
          mahasiswa_id: mhs.id,
          sesi_id: sesi.id,
          token: generateSecureToken(),
          status: 'ACTIVE',
        },
      });
      qrCreatedCount++;
    }

    console.log(`-> Berhasil mengimpor ${importedCount} data mahasiswa resmi.`);
    console.log(`-> Berhasil menerbitkan ${qrCreatedCount} QR code aktif baru.`);
  } else {
    console.warn('-> Berkas real_students.json tidak ditemukan.');
  }

  // Ensure any other prodi is wiped out if exists
  await prisma.mahasiswa.deleteMany({
    where: {
      prodi: {
        notIn: ALLOWED_PRODIS,
      },
    },
  });

  const totalMhs = await prisma.mahasiswa.count();
  console.log(`-> Total mahasiswa di database sekarang: ${totalMhs}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
