import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv[2] || 'sqlite';
const sourceFile = mode === 'postgres' ? 'schema.prisma' : 'schema.sqlite.prisma';

console.log(`Setting database mode to: ${mode}`);

if (mode === 'sqlite') {
  const content = fs.readFileSync(path.join(__dirname, 'schema.sqlite.prisma'), 'utf-8');
  fs.writeFileSync(path.join(__dirname, 'schema.prisma'), content);
  console.log('Prisma schema updated to SQLite mode for zero-setup local dev/testing.');
} else {
  // Restore PostgreSQL schema
  const pgContent = `// Prisma schema for WisudaAttend
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String     @id @default(cuid())
  username      String     @unique
  nama          String
  email         String     @unique
  password_hash String
  role          String     @default("PETUGAS") // SUPERADMIN, ADMIN_PANITIA, PETUGAS, VIEWER
  is_active     Boolean    @default(true)
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt

  absensi_scanned Absensi[]
  audit_logs      AuditLog[]

  @@map("users")
}

model Mahasiswa {
  id               String     @id @default(cuid())
  nim              String     @unique
  nama             String
  prodi            String
  fakultas         String
  angkatan         String
  status_kelayakan String     @default("ELIGIBLE") // ELIGIBLE, NOT_ELIGIBLE
  email            String?
  no_hp            String?
  created_at       DateTime   @default(now())
  updated_at       DateTime   @updatedAt

  qr_codes QrCode[]
  absensi  Absensi[]

  @@index([nim])
  @@index([prodi])
  @@index([status_kelayakan])
  @@map("mahasiswa")
}

model Event {
  id          String       @id @default(cuid())
  nama_event  String
  deskripsi   String?
  tanggal     DateTime
  lokasi      String
  is_active   Boolean      @default(true)
  created_at  DateTime     @default(now())
  updated_at  DateTime     @updatedAt

  sesi SesiWisuda[]

  @@map("events")
}

model SesiWisuda {
  id            String    @id @default(cuid())
  event_id      String
  event         Event     @relation(fields: [event_id], references: [id], onDelete: Cascade)
  nama_sesi     String
  waktu_mulai   DateTime
  waktu_selesai DateTime
  kuota         Int       @default(500)
  is_open       Boolean   @default(true)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  qr_codes QrCode[]
  absensi  Absensi[]

  @@map("sesi_wisuda")
}

model QrCode {
  id           String      @id @default(cuid())
  mahasiswa_id String
  mahasiswa    Mahasiswa   @relation(fields: [mahasiswa_id], references: [id], onDelete: Cascade)
  sesi_id      String
  sesi         SesiWisuda  @relation(fields: [sesi_id], references: [id], onDelete: Cascade)
  token        String      @unique
  status       String      @default("ACTIVE") // ACTIVE, REVOKED, EXPIRED
  generated_at DateTime    @default(now())
  revoked_at   DateTime?

  absensi Absensi[]

  @@index([token])
  @@index([mahasiswa_id, sesi_id])
  @@map("qr_codes")
}

model Absensi {
  id            String      @id @default(cuid())
  mahasiswa_id  String
  mahasiswa     Mahasiswa   @relation(fields: [mahasiswa_id], references: [id], onDelete: Cascade)
  sesi_id       String
  sesi          SesiWisuda  @relation(fields: [sesi_id], references: [id], onDelete: Cascade)
  qr_code_id    String?
  qr_code       QrCode?     @relation(fields: [qr_code_id], references: [id], onDelete: SetNull)
  scanned_by_id String?
  scanned_by    User?       @relation(fields: [scanned_by_id], references: [id], onDelete: SetNull)
  status        String      @default("HADIR") // HADIR, TERLAMBAT, IZIN, KOREKSI
  waktu_absen   DateTime    @default(now()) // Timestamp generated strictly on server
  metode        String      @default("QR_SCAN") // QR_SCAN, MANUAL
  catatan       String?
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  // Strict double-attendance prevention at DB level
  @@unique([mahasiswa_id, sesi_id])
  @@index([sesi_id])
  @@index([mahasiswa_id])
  @@map("absensi")
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String?
  user       User?    @relation(fields: [user_id], references: [id], onDelete: SetNull)
  action     String   // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, QR_GENERATE, QR_REVOKE, SCAN_SUCCESS, SCAN_DUPLICATE, ATTENDANCE_CORRECT, CSV_IMPORT
  entity     String   // Mahasiswa, SesiWisuda, Absensi, QrCode, User, System
  entity_id  String?
  old_value  String?
  new_value  String?
  reason     String?
  ip_address String?
  created_at DateTime @default(now())

  @@index([action])
  @@index([entity, entity_id])
  @@map("audit_logs")
}
`;
  fs.writeFileSync(path.join(__dirname, 'schema.prisma'), pgContent);
  console.log('Prisma schema configured for PostgreSQL.');
}
