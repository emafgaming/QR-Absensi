import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mode = (process.argv[2] || '').toLowerCase();
if (!mode) {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.startsWith('postgres')) mode = 'postgres';
  else if (dbUrl.startsWith('mysql')) mode = 'mysql';
  else if (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')) mode = 'sqlite';
  else mode = 'postgres';
}
console.log(`Setting database mode to: ${mode}`);

const schemas = {
  mysql: `// Prisma schema for WisudaAttend (MySQL Mode - Production/Domainesia/Local MySQL)
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "mysql"
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
  deskripsi   String?      @db.Text
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

  @@index([event_id])
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
  @@index([sesi_id])
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
  waktu_absen   DateTime    @default(now())
  metode        String      @default("QR_SCAN") // QR_SCAN, MANUAL
  catatan       String?     @db.Text
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  @@unique([mahasiswa_id, sesi_id])
  @@index([sesi_id])
  @@index([mahasiswa_id])
  @@index([qr_code_id])
  @@index([scanned_by_id])
  @@map("absensi")
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String?
  user       User?    @relation(fields: [user_id], references: [id], onDelete: SetNull)
  action     String
  entity     String
  entity_id  String?
  old_value  String?  @db.Text
  new_value  String?  @db.Text
  reason     String?  @db.Text
  ip_address String?
  created_at DateTime @default(now())

  @@index([action])
  @@index([entity, entity_id])
  @@index([user_id])
  @@map("audit_logs")
}
`,
  postgres: `// Prisma schema for WisudaAttend (PostgreSQL Mode)
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]
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
  role          String     @default("PETUGAS")
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
  status_kelayakan String     @default("ELIGIBLE")
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
  status       String      @default("ACTIVE")
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
  status        String      @default("HADIR")
  waktu_absen   DateTime    @default(now())
  metode        String      @default("QR_SCAN")
  catatan       String?
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  @@unique([mahasiswa_id, sesi_id])
  @@index([sesi_id])
  @@index([mahasiswa_id])
  @@map("absensi")
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String?
  user       User?    @relation(fields: [user_id], references: [id], onDelete: SetNull)
  action     String
  entity     String
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
`,
  sqlite: `// Prisma schema for WisudaAttend (SQLite Mode)
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String     @id @default(cuid())
  username      String     @unique
  nama          String
  email         String     @unique
  password_hash String
  role          String     @default("PETUGAS")
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
  status_kelayakan String     @default("ELIGIBLE")
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
  status       String      @default("ACTIVE")
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
  status        String      @default("HADIR")
  waktu_absen   DateTime    @default(now())
  metode        String      @default("QR_SCAN")
  catatan       String?
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  @@unique([mahasiswa_id, sesi_id])
  @@index([sesi_id])
  @@index([mahasiswa_id])
  @@map("absensi")
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String?
  user       User?    @relation(fields: [user_id], references: [id], onDelete: SetNull)
  action     String
  entity     String
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
`
};

if (!schemas[mode]) {
  console.error(`Invalid mode '${mode}'. Choose from: mysql, postgres, sqlite`);
  process.exit(1);
}

fs.writeFileSync(path.join(__dirname, 'schema.prisma'), schemas[mode]);
console.log(`Prisma schema successfully updated to ${mode.toUpperCase()} mode.`);

