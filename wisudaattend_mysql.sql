-- =====================================================================
-- DATABASE SCHEMA & SEED DATA: WisudaAttend (MySQL / MariaDB)
-- Kompatibel dengan: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+ (Domainesia cPanel / VPS)
-- Karakter encoding: utf8mb4 (Full Unicode / Emoji support)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. DROP EXISTING TABLES (Pembersihan jika tabel sudah ada)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `absensi`;
DROP TABLE IF EXISTS `qr_codes`;
DROP TABLE IF EXISTS `sesi_wisuda`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `mahasiswa`;
DROP TABLE IF EXISTS `users`;

-- ---------------------------------------------------------------------
-- 2. CREATE TABLE: users (Tabel Pengguna & Hak Akses RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'PETUGAS',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. CREATE TABLE: mahasiswa (Data Calon Wisudawan)
-- ---------------------------------------------------------------------
CREATE TABLE `mahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `nim` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `prodi` VARCHAR(191) NOT NULL,
    `fakultas` VARCHAR(191) NOT NULL,
    `angkatan` VARCHAR(191) NOT NULL,
    `status_kelayakan` VARCHAR(191) NOT NULL DEFAULT 'ELIGIBLE',
    `email` VARCHAR(191) NULL,
    `no_hp` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mahasiswa_nim_key`(`nim`),
    INDEX `mahasiswa_nim_idx`(`nim`),
    INDEX `mahasiswa_prodi_idx`(`prodi`),
    INDEX `mahasiswa_status_kelayakan_idx`(`status_kelayakan`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. CREATE TABLE: events (Acara Wisuda Induk)
-- ---------------------------------------------------------------------
CREATE TABLE `events` (
    `id` VARCHAR(191) NOT NULL,
    `nama_event` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `lokasi` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. CREATE TABLE: sesi_wisuda (Sesi Pelaksanaan Wisuda)
-- ---------------------------------------------------------------------
CREATE TABLE `sesi_wisuda` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `nama_sesi` VARCHAR(191) NOT NULL,
    `waktu_mulai` DATETIME(3) NOT NULL,
    `waktu_selesai` DATETIME(3) NOT NULL,
    `kuota` INTEGER NOT NULL DEFAULT 500,
    `is_open` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `sesi_wisuda_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. CREATE TABLE: qr_codes (Token Kriptografis Unik Wisudawan)
-- ---------------------------------------------------------------------
CREATE TABLE `qr_codes` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswa_id` VARCHAR(191) NOT NULL,
    `sesi_id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `qr_codes_token_key`(`token`),
    INDEX `qr_codes_token_idx`(`token`),
    INDEX `qr_codes_mahasiswa_id_sesi_id_idx`(`mahasiswa_id`, `sesi_id`),
    INDEX `qr_codes_sesi_id_idx`(`sesi_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. CREATE TABLE: absensi (Transaksi Presensi & Anti Duplikasi)
-- ---------------------------------------------------------------------
CREATE TABLE `absensi` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswa_id` VARCHAR(191) NOT NULL,
    `sesi_id` VARCHAR(191) NOT NULL,
    `qr_code_id` VARCHAR(191) NULL,
    `scanned_by_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'HADIR',
    `waktu_absen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metode` VARCHAR(191) NOT NULL DEFAULT 'QR_SCAN',
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `absensi_sesi_id_idx`(`sesi_id`),
    INDEX `absensi_mahasiswa_id_idx`(`mahasiswa_id`),
    INDEX `absensi_qr_code_id_idx`(`qr_code_id`),
    INDEX `absensi_scanned_by_id_idx`(`scanned_by_id`),
    UNIQUE INDEX `absensi_mahasiswa_id_sesi_id_key`(`mahasiswa_id`, `sesi_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. CREATE TABLE: audit_logs (Log Rekam Jejak Sistem & Keamanan)
-- ---------------------------------------------------------------------
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `reason` TEXT NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entity_entity_id_idx`(`entity`, `entity_id`),
    INDEX `audit_logs_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. FOREIGN KEY CONSTRAINTS (Integritas Relasional Data)
-- ---------------------------------------------------------------------
ALTER TABLE `sesi_wisuda` 
    ADD CONSTRAINT `sesi_wisuda_event_id_fkey` 
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `qr_codes` 
    ADD CONSTRAINT `qr_codes_mahasiswa_id_fkey` 
    FOREIGN KEY (`mahasiswa_id`) REFERENCES `mahasiswa`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `qr_codes` 
    ADD CONSTRAINT `qr_codes_sesi_id_fkey` 
    FOREIGN KEY (`sesi_id`) REFERENCES `sesi_wisuda`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `absensi` 
    ADD CONSTRAINT `absensi_mahasiswa_id_fkey` 
    FOREIGN KEY (`mahasiswa_id`) REFERENCES `mahasiswa`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `absensi` 
    ADD CONSTRAINT `absensi_sesi_id_fkey` 
    FOREIGN KEY (`sesi_id`) REFERENCES `sesi_wisuda`(`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `absensi` 
    ADD CONSTRAINT `absensi_qr_code_id_fkey` 
    FOREIGN KEY (`qr_code_id`) REFERENCES `qr_codes`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `absensi` 
    ADD CONSTRAINT `absensi_scanned_by_id_fkey` 
    FOREIGN KEY (`scanned_by_id`) REFERENCES `users`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `audit_logs` 
    ADD CONSTRAINT `audit_logs_user_id_fkey` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE;


-- =====================================================================
-- 10. INITIAL SEED DATA (Data Awal Pengguna & Pengujian)
-- Catatan: Password default seluruh akun di bawah adalah: Wisuda2026!
-- =====================================================================

-- Akun Pengguna (Users)
INSERT INTO `users` (`id`, `username`, `nama`, `email`, `password_hash`, `role`, `is_active`) VALUES
('usr_superadmin_01', 'superadmin', 'Bambang Supriyanto, M.Kom', 'superadmin@wisuda.ac.id', '$2a$10$NN8q6EWfyyZPBc7TR5Rl9uUPluyzWmDpFH/RoPm/qoiw459UXfM26', 'SUPERADMIN', 1),
('usr_panitia_01', 'adminpanitia', 'Siti Rahmawati, S.Sos', 'panitia@wisuda.ac.id', '$2a$10$NN8q6EWfyyZPBc7TR5Rl9uUPluyzWmDpFH/RoPm/qoiw459UXfM26', 'ADMIN_PANITIA', 1),
('usr_petugas_01', 'petugas1', 'Dimas Aditya (Scanner Pintu A)', 'petugas1@wisuda.ac.id', '$2a$10$NN8q6EWfyyZPBc7TR5Rl9uUPluyzWmDpFH/RoPm/qoiw459UXfM26', 'PETUGAS', 1),
('usr_viewer_01', 'viewer', 'Prof. Dr. Hendra Gunawan (Pimpinan)', 'viewer@wisuda.ac.id', '$2a$10$NN8q6EWfyyZPBc7TR5Rl9uUPluyzWmDpFH/RoPm/qoiw459UXfM26', 'VIEWER', 1);

-- Acara Wisuda (Events)
INSERT INTO `events` (`id`, `nama_event`, `deskripsi`, `tanggal`, `lokasi`, `is_active`) VALUES
('evt_wisuda_2026_01', 'Wisuda Sarjana & Magister Periode I Tahun 2026', 'Upacara wisuda kelulusan sarjana dan magister universitas tahun akademik 2025/2026.', '2026-11-15 08:00:00.000', 'Auditorium Utama & Grand Ballroom Kampus Terpadu', 1);

-- Sesi Wisuda (SesiWisuda)
INSERT INTO `sesi_wisuda` (`id`, `event_id`, `nama_sesi`, `waktu_mulai`, `waktu_selesai`, `kuota`, `is_open`) VALUES
('sesi_wisuda_pagi_01', 'evt_wisuda_2026_01', 'Sesi 1 (Pagi - Saintek, Kedokteran & Ilmu Komputer)', '2026-11-15 07:00:00.000', '2026-11-15 11:30:00.000', 600, 1),
('sesi_wisuda_siang_02', 'evt_wisuda_2026_01', 'Sesi 2 (Siang - Ekonomi, Bisnis & Hukum)', '2026-11-15 13:00:00.000', '2026-11-15 17:00:00.000', 500, 1);

-- Data Mahasiswa (Mahasiswa)
INSERT INTO `mahasiswa` (`id`, `nim`, `nama`, `prodi`, `fakultas`, `angkatan`, `status_kelayakan`, `email`, `no_hp`) VALUES
('mhs_202201001', '202201001', 'Ahmad Faiz Fadhlurrahman', 'Teknik Informatika', 'Teknologi Informasi', '2022', 'ELIGIBLE', 'ahmad.faiz@student.ac.id', '081234567001'),
('mhs_202201002', '202201002', 'Nabila Azzahra Putri', 'Sistem Informasi', 'Teknologi Informasi', '2022', 'ELIGIBLE', 'nabila.azzahra@student.ac.id', '081234567002'),
('mhs_202201003', '202201003', 'Rizky Maulana Pratama', 'Teknik Elektro', 'Teknik', '2022', 'ELIGIBLE', 'rizky.m@student.ac.id', '081234567003'),
('mhs_202201004', '202201004', 'Devi Anggraeni Kusuma', 'Kedokteran Umum', 'Kedokteran', '2021', 'ELIGIBLE', 'devi.kusuma@student.ac.id', '081234567004'),
('mhs_202201005', '202201005', 'Fahri Ramadhan Hidayat', 'Farmasi', 'Farmasi', '2022', 'NOT_ELIGIBLE', 'fahri.ramadhan@student.ac.id', '081234567005'),
('mhs_202202001', '202202001', 'Indah Permata Sari', 'Manajemen', 'Ekonomi dan Bisnis', '2022', 'ELIGIBLE', 'indah.permata@student.ac.id', '081234567006'),
('mhs_202202002', '202202002', 'Bagus Setiawan Wicaksono', 'Akuntansi', 'Ekonomi dan Bisnis', '2022', 'ELIGIBLE', 'bagus.wicaksono@student.ac.id', '081234567007'),
('mhs_202202003', '202202003', 'Clarissa Abigail Chen', 'Ilmu Hukum', 'Hukum', '2022', 'ELIGIBLE', 'clarissa.abigail@student.ac.id', '081234567008'),
('mhs_202202004', '202202004', 'Gilang Ramadhan Saputra', 'Hubungan Internasional', 'Ilmu Sosial dan Politik', '2022', 'ELIGIBLE', 'gilang.saputra@student.ac.id', '081234567009'),
('mhs_202202005', '202202005', 'Meilani Tri Hapsari', 'Ilmu Komunikasi', 'Ilmu Sosial dan Politik', '2022', 'ELIGIBLE', 'meilani.tri@student.ac.id', '081234567010');

-- QR Codes Token (QrCode)
INSERT INTO `qr_codes` (`id`, `mahasiswa_id`, `sesi_id`, `token`, `status`) VALUES
('qr_202201001', 'mhs_202201001', 'sesi_wisuda_pagi_01', 'WATT-c3a5e8f192b47e829a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8', 'ACTIVE'),
('qr_202201002', 'mhs_202201002', 'sesi_wisuda_pagi_01', 'WATT-7b192c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8c3a5e8f192b47e82', 'ACTIVE'),
('qr_202201003', 'mhs_202201003', 'sesi_wisuda_pagi_01', 'WATT-a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', 'ACTIVE'),
('qr_202201004', 'mhs_202201004', 'sesi_wisuda_pagi_01', 'WATT-f8e7d6c5b4a3928170f1e2d3c4b5a6978877665544332211aabbccddeeff0011', 'ACTIVE'),
('qr_202201005', 'mhs_202201005', 'sesi_wisuda_pagi_01', 'WATT-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'ACTIVE'),
('qr_202202001', 'mhs_202202001', 'sesi_wisuda_siang_02', 'WATT-9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba', 'ACTIVE'),
('qr_202202002', 'mhs_202202002', 'sesi_wisuda_siang_02', 'WATT-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'ACTIVE'),
('qr_202202003', 'mhs_202202003', 'sesi_wisuda_siang_02', 'WATT-fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 'ACTIVE'),
('qr_202202004', 'mhs_202202004', 'sesi_wisuda_siang_02', 'WATT-5544332211aabbccddeeff0011223344556677889900aabbccddeeff00112233', 'ACTIVE'),
('qr_202202005', 'mhs_202202005', 'sesi_wisuda_siang_02', 'WATT-6677889900aabbccddeeff0011223344556677889900aabbccddeeff0011223344', 'ACTIVE');

-- Sample Absensi (Ahmad Faiz Hadir)
INSERT INTO `absensi` (`id`, `mahasiswa_id`, `sesi_id`, `qr_code_id`, `scanned_by_id`, `status`, `waktu_absen`, `metode`, `catatan`) VALUES
('abs_202201001', 'mhs_202201001', 'sesi_wisuda_pagi_01', 'qr_202201001', 'usr_petugas_01', 'HADIR', NOW(), 'QR_SCAN', 'Hadir tepat waktu di pintu masuk utama');

-- Sample Audit Log Inisialisasi
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity`, `entity_id`, `reason`, `ip_address`) VALUES
('audit_init_01', 'usr_superadmin_01', 'SYSTEM_INIT', 'System', 'evt_wisuda_2026_01', 'Inisialisasi sistem basis data WisudaAttend di MySQL Domainesia.', '127.0.0.1');

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SELESAI: Database siap digunakan!
-- =====================================================================
