import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  console.log('-> Akun sistem berhasil disiapkan (Tanpa data dummy).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
