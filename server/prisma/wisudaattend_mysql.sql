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

-- Data Mahasiswa Angkatan 2024 (Mahasiswa)
INSERT INTO `mahasiswa` (`id`, `nim`, `nama`, `prodi`, `fakultas`, `angkatan`, `status_kelayakan`, `email`, `no_hp`) VALUES
('cmw6zl53t002ayczsbkj45424', '202421001', 'AGUSTIANA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl50x001gyczsm50lqgv7', '202421002', 'FAULINA DELFITA SARI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl54p002jyczsymeo8nwv', '202421004', 'LINA AYU WULANDARI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl542002dyczsdiv58foy', '202421006', 'M. PADILA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4yv000vyczsc6yyazts', '202421008', 'MELANI DWI PUSPITASARI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl529001vyczssfdv9oux', '202421009', 'MELODY SABILA SUWANDI AZKA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl50l001dyczspszotnb1', '202421010', 'MURSYIDA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl52m001yyczs036pmjgc', '202421011', 'NOVIANTI BR SIMANJUNTAK', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5010017yczsm2mv241h', '202421014', 'NURJULIANA EKA WAHYUNI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl517001jyczsn6a7jgo2', '202421017', 'RYAN DAUD PERLINDUNGAN PANJAITAN', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl51g001myczsz8udsprm', '202421021', 'GADIS AMELIA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl54f002gyczs7e532tbf', '202421024', 'T. NUR LIZA ASTI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl559002pyczs0kh83lsq', '202421025', 'TEGAR KURNIAWAN', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl54z002myczsuqeedj5q', '202421028', 'NAYA HASANTA QULQI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5360024yczs6zvc8ifd', '202421029', 'ARYUDA DWITAMA RAMADHAN', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4ww000ayczsu2cfel99', '202421031', 'WINDI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl50b001ayczsq3l5ezc8', '202421032', 'AFNA NUR AZIZAH', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4xr000jyczs183frsll', '202421033', 'AMELIA SANTOSO', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4ze0011yczss74on2hg', '202421034', 'ASRI DHEA NATALIA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4yb000pyczs989pcewg', '202421035', 'DINI WULANDARI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4wi0007yczsl48b946b', '202421036', 'FEMIL AZZURANI SAEL', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4w70004yczsoaekglm0', '202421037', 'HAFIFAH SALSABILA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4y1000myczsu3ltg913', '202421039', 'INDAH ULI ZEGA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4x6000dyczscbydy1ej', '202421040', 'LIDIANA ANGLE WENDY HUTAHAEAN', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl51q001pyczszsdlu3if', '202421041', 'NADELA PUTRI PRATAMA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl53j0027yczscbqr36qe', '202421042', 'NAINA SYAQILALIYA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl52v0021yczswm2qpwyv', '202421043', 'NANDA RAHMA DITA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4yk000syczsgvqq3zdo', '202421044', 'RENO SUGITNO', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4xh000gyczs9l0ytwch', '202421045', 'RESKI PADILA', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4zr0014yczsirovjq6w', '202421046', 'TRI APRILIA SETYO WARDANI', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl4z5000yyczseiaxo1ue', '202421053', 'RANDI KURNIAWAN', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl520001syczsmqx1dtxf', '202421054', 'NAZWA NURKAMILATU\' SADIYYAH', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl55k002syczsi702e5xb', '202421056', 'AHMAD FAISAL ALI TANJUNG', 'Administrasi Bisnis', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5gl0061yczsfboj3fqi', '202424002', 'ANDINI', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5hp006dyczsffna2uf5', '202424004', 'FITRI WAHYUNI', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5hg006ayczsu7g628n9', '202424005', 'SIDQI RAMADHANI', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5hz006gyczsqhlzdnid', '202424006', 'PUTRA PRATAMA', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5h70067yczsen8uur50', '202424007', 'SUCI INDAH RAMADHANI', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5gc005yyczsyu80x22y', '202424009', 'RISKA FITRIA', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5ft005syczsynlypben', '202424010', 'CATHERINE GRACE MARIA', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5g3005vyczsvqk9655j', '202424011', 'MAISA KHASANAH', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5fk005pyczs18ivydlm', '202424012', 'WILDAN ZACKY', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5gx0064yczse95sxuzc', '202424013', 'SALMA RAHMADEFI', 'Hubungan Masyarakat', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5a90044yczsgoqt4o3y', '202423001', 'ALEX CANDRA SINAMBELA', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl586003jyczso0ortxt4', '202423002', 'ANJEL SIRAIT', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl58s003pyczs5xnxy5r6', '202423003', 'ARDHYAS GUSHENDA', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl59q003yyczs3dexhi8c', '202423006', 'INTAN SAPUTRI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl57m003dyczsi5jtmhnu', '202423007', 'JENNY ARIMBI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl55u002vyczsniovwvey', '202423009', 'MELDA SORMIN', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl59e003vyczsvpxgtelz', '202423011', 'RASENDRIYA YUDIANINGSIH EKA PUTRI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5700037yczsmk5m1u0f', '202423012', 'RIVA DWI PERMATASARI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl58h003myczsvcm0dkjq', '202423015', 'ZANETA INSANI ZAIN', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl579003ayczs0vuwqere', '202423016', 'ERIKA ADETIA BR RAMBE', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5ak0047yczsbs0v6otx', '202423017', 'KALISA PURNAMA', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5bz004myczs7o1py1zr', '202423018', 'SOPIANI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5a00041yczs8qyqm3we', '202423020', 'HESTI PRAMESTIA', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5at004ayczs4qpbtl25', '202423021', 'YUDHA KURNIAWAN', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5bd004gyczs1yqrecli', '202423022', 'RAYSA', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl564002yyczsl348s46s', '202423023', 'SASKIA SAHRANI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl57x003gyczs1jdvxqob', '202423025', 'TIARA RANTIKA', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl56q0034yczsej3cgqqy', '202423026', 'R. PUTRI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5bp004jyczs5dr6jvhi', '202423028', 'HISKIA SANDRI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl593003syczsbmd305py', '202423029', 'NABILA RAHMAH MAYRIZAL SARI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5b3004dyczs599kzrid', '202423030', 'MUHAMMAD WILDAN EL HAKIM', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl56d0031yczso3z6zx30', '202423031', 'NURJAYANTI', 'Komputerisasi Akuntansi', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5eg005dyczslqww1fds', '202422001', 'ABDULLAH', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5e5005ayczsebj3ko36', '202422003', 'CELIA ERMAYANI', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5er005gyczs85xgo3sc', '202422004', 'DIMAS ARSY SATRIA PUTRA', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5dc0051yczsv6sehciv', '202422005', 'MOHAMAD RIDHO ALFARIZI', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5ct004vyczsyebhwx0h', '202422007', 'SHAHIBIL LADZI', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5d2004yyczszqkkredv', '202422008', 'NUR INTAN KHAIRINA', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5dl0054yczso6kd0kwi', '202422009', 'M. ARYA JULIO', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5c9004pyczsb3ecqzzb', '202422011', 'KARINA NURAINI KUSUMA', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5dv0057yczsmluk6y2f', '202422012', 'M. FIKRI ALFAJRI', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5ci004syczsqifxkqze', '202422018', 'RAFLY IRWANSYAH SAPUTRA', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5f0005jyczsq9bucfjf', '202422019', 'RIO PUTRA', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL),
('cmw6zl5fa005myczsyp8qhaql', '202422020', 'BUDI SETIAWAN', 'Manajemen Informatika', '-', '2024', 'ELIGIBLE', NULL, NULL);

-- QR Codes Token (QrCode)
INSERT INTO `qr_codes` (`id`, `mahasiswa_id`, `sesi_id`, `token`, `status`) VALUES
('cmw6zl4wc0006yczs69xpus3a', 'cmw6zl4w70004yczsoaekglm0', 'sesi_wisuda_pagi_01', 'WATT-1dc30bc515fbdb724dd5930c9ba455ee7d197490bd36e2487e4e088a71d7cc47', 'ACTIVE'),
('cmw6zl4wr0009yczseytjs5j2', 'cmw6zl4wi0007yczsl48b946b', 'sesi_wisuda_pagi_01', 'WATT-3669e5e041c4b5b5ebd8857734a28d773483f5c8da47bbef313632b36741e8d8', 'ACTIVE'),
('cmw6zl4x1000cyczsk6cnqpz8', 'cmw6zl4ww000ayczsu2cfel99', 'sesi_wisuda_pagi_01', 'WATT-d03df9b8f946778a867ef0bd8a0c491e9ae9736c9fd8e24b80b5ff961e43035e', 'ACTIVE'),
('cmw6zl4xb000fyczs097tzv1x', 'cmw6zl4x6000dyczscbydy1ej', 'sesi_wisuda_pagi_01', 'WATT-0271da8fe64244a4703c6aa2424b6e7211fcc54ddbf4d8f72d56e0ab1a57596a', 'ACTIVE'),
('cmw6zl4xm000iyczszfx18dy1', 'cmw6zl4xh000gyczs9l0ytwch', 'sesi_wisuda_pagi_01', 'WATT-6337426c6890145c5484240e51ec09084ca7218b4390d2734f3e0d12e747dda9', 'ACTIVE'),
('cmw6zl4xw000lyczsyrcjacoo', 'cmw6zl4xr000jyczs183frsll', 'sesi_wisuda_pagi_01', 'WATT-c54d63f0c0fde90378d6a41e998994d768deccca4c106cae5ee0087802dfd5c7', 'ACTIVE'),
('cmw6zl4y6000oyczsp615zuoj', 'cmw6zl4y1000myczsu3ltg913', 'sesi_wisuda_pagi_01', 'WATT-2f3b3ec830b822e48ff4628eac7f2d4430412f4474b8b7379444c3553343136f', 'ACTIVE'),
('cmw6zl4yg000ryczscpaazf3q', 'cmw6zl4yb000pyczs989pcewg', 'sesi_wisuda_pagi_01', 'WATT-21b60e96aff7e444572290b789053abaad08d9c0397f8a40a7e32eb9b9d49c2f', 'ACTIVE'),
('cmw6zl4yr000uyczse8pnfiba', 'cmw6zl4yk000syczsgvqq3zdo', 'sesi_wisuda_pagi_01', 'WATT-8e28810c74ed335a43ac0d8502e0012758dee39035e7fcb86e622f787748915b', 'ACTIVE'),
('cmw6zl4z0000xyczswe70bozd', 'cmw6zl4yv000vyczsc6yyazts', 'sesi_wisuda_pagi_01', 'WATT-190721a89e891407837a55552bf7d98c699c74ad6d9e72134d6348320c245cf0', 'ACTIVE'),
('cmw6zl4za0010yczsceme51ys', 'cmw6zl4z5000yyczseiaxo1ue', 'sesi_wisuda_pagi_01', 'WATT-346d0a2586cb6360eb0b6ea09aab465c12ec8d662701caabea900aa35c9f9ce8', 'ACTIVE'),
('cmw6zl4zm0013yczszaub9qvu', 'cmw6zl4ze0011yczss74on2hg', 'sesi_wisuda_pagi_01', 'WATT-3eda031b61f8f4f760a6af6bff2dde2db04d95ef5b9f38172581f8e4f04215e4', 'ACTIVE'),
('cmw6zl4zw0016yczsnaz79w3v', 'cmw6zl4zr0014yczsirovjq6w', 'sesi_wisuda_pagi_01', 'WATT-6aa38fbad08d86a5f870aeece1937d161ea4a7814234dc9ffaffe8313d0b4b83', 'ACTIVE'),
('cmw6zl5060019yczs5dvc9mmw', 'cmw6zl5010017yczsm2mv241h', 'sesi_wisuda_pagi_01', 'WATT-3aebf91b764d0d3fa4be22a0d680aa42f1461c437198a908ae1beadc57099989', 'ACTIVE'),
('cmw6zl50f001cyczsj5lvggs8', 'cmw6zl50b001ayczsq3l5ezc8', 'sesi_wisuda_pagi_01', 'WATT-0ee317ad0340efb1d4118f0f8852e1c5f38ab8df8f8d6b5326c2e9606c3ac527', 'ACTIVE'),
('cmw6zl50s001fyczso3py4kal', 'cmw6zl50l001dyczspszotnb1', 'sesi_wisuda_pagi_01', 'WATT-a28c923a6b69313b1a82577ca2feae57a70fb921127c5d097c9895dda0614bab', 'ACTIVE'),
('cmw6zl512001iyczsji3djiku', 'cmw6zl50x001gyczsm50lqgv7', 'sesi_wisuda_pagi_01', 'WATT-0d83ea4b0aeec9e834863741cebeffbbbab15d42fedaea32954822532439497c', 'ACTIVE'),
('cmw6zl51c001lyczsrgu49eia', 'cmw6zl517001jyczsn6a7jgo2', 'sesi_wisuda_pagi_01', 'WATT-00429898522a8a3fd2c696c9235f72b71da4ad679b895fd4390edddb84215415', 'ACTIVE'),
('cmw6zl51l001oyczstxrjts1w', 'cmw6zl51g001myczsz8udsprm', 'sesi_wisuda_pagi_01', 'WATT-e8770d3b62a0526a22eda0cee70489e5a3302f2d0b1e0fa4e069f54de5c80dc7', 'ACTIVE'),
('cmw6zl51v001ryczs85z5mhno', 'cmw6zl51q001pyczszsdlu3if', 'sesi_wisuda_pagi_01', 'WATT-b2dea9d088eb44b34a6829967d3b76d5a0fa4921ed9c85e0d3170b4817a060e5', 'ACTIVE'),
('cmw6zl524001uyczs4hiluh9v', 'cmw6zl520001syczsmqx1dtxf', 'sesi_wisuda_pagi_01', 'WATT-c47ab9bb0c4d32c9bf7402bd94966ab51f62a3612223e3ef269da76bd6ccef02', 'ACTIVE'),
('cmw6zl52e001xyczsa0xewt21', 'cmw6zl529001vyczssfdv9oux', 'sesi_wisuda_pagi_01', 'WATT-03b2406227842fa940b34702d621146b1e123551c12be7033c2019c485e77a6a', 'ACTIVE'),
('cmw6zl52r0020yczsgqj8x2mo', 'cmw6zl52m001yyczs036pmjgc', 'sesi_wisuda_pagi_01', 'WATT-de9bcb7ddd87ba8b8cb70f45bf2cc50c4710374fa9e575c9adb80604674d0e76', 'ACTIVE'),
('cmw6zl5310023yczs08xyjrmv', 'cmw6zl52v0021yczswm2qpwyv', 'sesi_wisuda_pagi_01', 'WATT-bd2d571d1f0181c9f8cdfd7e593c057d2ba7f69c32563afffa011ca38a3ac78d', 'ACTIVE'),
('cmw6zl53e0026yczs2nd20v33', 'cmw6zl5360024yczs6zvc8ifd', 'sesi_wisuda_pagi_01', 'WATT-24622b229ad074081bbd4c64a8bda3b95a7b22513b033c1c9ab4296b0fc5809d', 'ACTIVE'),
('cmw6zl53o0029yczs3gx8iqa6', 'cmw6zl53j0027yczscbqr36qe', 'sesi_wisuda_pagi_01', 'WATT-377dc274db9b0ae8810ba7198866544c06444958ca4abce1c7b63d35cbb7e7a9', 'ACTIVE'),
('cmw6zl53y002cyczss2q1sa9z', 'cmw6zl53t002ayczsbkj45424', 'sesi_wisuda_pagi_01', 'WATT-ecebbe1fb541958fb3296f4b8377bc6d4f2845a5a11c7f5f758c2c49ac49a8e9', 'ACTIVE'),
('cmw6zl54a002fyczsz83ckvmk', 'cmw6zl542002dyczsdiv58foy', 'sesi_wisuda_pagi_01', 'WATT-1713e338dc759aad7242eb46fb78a6f432a96d5ab39dfad9b8e9fdf718ee7820', 'ACTIVE'),
('cmw6zl54k002iyczsy2crknyn', 'cmw6zl54f002gyczs7e532tbf', 'sesi_wisuda_pagi_01', 'WATT-3bb091c7293201898bbcf5650de27c876bdea4127274ab3f876d13f3f2fa8ce2', 'ACTIVE'),
('cmw6zl54u002lyczsspqthf1h', 'cmw6zl54p002jyczsymeo8nwv', 'sesi_wisuda_pagi_01', 'WATT-cee0242f1719c0c5478050591e453e8f82103505a11ada312a7c97da35d9ee1c', 'ACTIVE'),
('cmw6zl554002oyczs458txkdj', 'cmw6zl54z002myczsuqeedj5q', 'sesi_wisuda_pagi_01', 'WATT-eb8e85c63384c74640a1d1fe1ab010b42c6945d9f9929d58e68b118bf9d506db', 'ACTIVE'),
('cmw6zl55d002ryczsffr3ap9b', 'cmw6zl559002pyczs0kh83lsq', 'sesi_wisuda_pagi_01', 'WATT-e4c756891599a99794fd15a10d008bc4448f223295f5756c664950ed53c92d7d', 'ACTIVE'),
('cmw6zl55p002uyczsf6gcyvkx', 'cmw6zl55k002syczsi702e5xb', 'sesi_wisuda_pagi_01', 'WATT-9ec05df776d4cc5f524084e5e62882d4ddb1ca0efaf798634e15155ec747db76', 'ACTIVE'),
('cmw6zl55z002xyczs41igbh9o', 'cmw6zl55u002vyczsniovwvey', 'sesi_wisuda_pagi_01', 'WATT-1d4c86efe228906ea3957fd1b1692a9731a1d76753145fd396bdd572c60dac43', 'ACTIVE'),
('cmw6zl5690030yczsr14v063c', 'cmw6zl564002yyczsl348s46s', 'sesi_wisuda_pagi_01', 'WATT-c30bdd7450b1963129ed33d2b7436476ad7987178cf7637059b523dfe757de51', 'ACTIVE'),
('cmw6zl56l0033yczsa6iggnsf', 'cmw6zl56d0031yczso3z6zx30', 'sesi_wisuda_pagi_01', 'WATT-1f5f5c16b62536fb9f88140a58b29c6755e932b3f98c3d0bcd581545069ee8fb', 'ACTIVE'),
('cmw6zl56v0036yczsiqxq09o5', 'cmw6zl56q0034yczsej3cgqqy', 'sesi_wisuda_pagi_01', 'WATT-b4ebd447b8c7f505dcba60d1e96087d38733138015d8eb5ab452c98480808e29', 'ACTIVE'),
('cmw6zl5750039yczsgodtnutk', 'cmw6zl5700037yczsmk5m1u0f', 'sesi_wisuda_pagi_01', 'WATT-63484af54100f5ada16b5c955826bbe3c16603090781d79f8c3c0aadc5bbb717', 'ACTIVE'),
('cmw6zl57h003cyczsp2kvsxyy', 'cmw6zl579003ayczs0vuwqere', 'sesi_wisuda_pagi_01', 'WATT-090fc61398c96464f319ab9f3c099e93bafe14ceea14670faf979617b31179fb', 'ACTIVE'),
('cmw6zl57r003fyczsrvqdyiyt', 'cmw6zl57m003dyczsi5jtmhnu', 'sesi_wisuda_pagi_01', 'WATT-97bcd6bcdbba135854c9a924f892cbce915d42d9410031ff2cae128bf2d1af48', 'ACTIVE'),
('cmw6zl582003iyczsyeubs5ej', 'cmw6zl57x003gyczs1jdvxqob', 'sesi_wisuda_pagi_01', 'WATT-65792b140a8a6cb7263ba0f1e0e21d91d893573b237b24501b09545c60d3ad0e', 'ACTIVE'),
('cmw6zl58c003lyczssbbyxu6r', 'cmw6zl586003jyczso0ortxt4', 'sesi_wisuda_pagi_01', 'WATT-a88e5dc74824b0cc026ca1fb969e3b0ae62c1a2e2b71cab3ee3452bdd1d9dd7f', 'ACTIVE'),
('cmw6zl58m003oyczsfxcu45p1', 'cmw6zl58h003myczsvcm0dkjq', 'sesi_wisuda_pagi_01', 'WATT-5e88330f80746810e43127f1703fa1183721f8a5cb6308a219466771340e02d1', 'ACTIVE'),
('cmw6zl58y003ryczsadjyd11a', 'cmw6zl58s003pyczs5xnxy5r6', 'sesi_wisuda_pagi_01', 'WATT-b93ec6dbfbaa5ef976118eb8934f76dcb70dd1a871437d9037967254ebd458ee', 'ACTIVE'),
('cmw6zl599003uyczs7wd2mqx9', 'cmw6zl593003syczsbmd305py', 'sesi_wisuda_pagi_01', 'WATT-eab4e06a76c7c4660051a1933e2aa16e7fa25bc8bd88e427cd971d045990bdd1', 'ACTIVE'),
('cmw6zl59j003xyczs7o7qdiiy', 'cmw6zl59e003vyczsvpxgtelz', 'sesi_wisuda_pagi_01', 'WATT-d08b6b0a0b14ec2c0e3f44fe0be32bb75b42ffb1fac18f23f5f99b16ca8aeb84', 'ACTIVE'),
('cmw6zl59v0040yczshdkj852r', 'cmw6zl59q003yyczs3dexhi8c', 'sesi_wisuda_pagi_01', 'WATT-a1f7a245e8a6fa1a9cdf5ecf40b514afad14ef0a098277a8e67f1a82b6bd9205', 'ACTIVE'),
('cmw6zl5a40043yczsr917n2or', 'cmw6zl5a00041yczs8qyqm3we', 'sesi_wisuda_pagi_01', 'WATT-1a3d6cedb341c7513132bc269cc89810de0fb0edc2e75ddc775030c81fdd4447', 'ACTIVE'),
('cmw6zl5ae0046yczsic5nh02r', 'cmw6zl5a90044yczsgoqt4o3y', 'sesi_wisuda_pagi_01', 'WATT-4605dcbcc97ebcc287227e2200501e705a201355cde97962f1df890aecd2c39c', 'ACTIVE'),
('cmw6zl5ap0049yczsjh01vio6', 'cmw6zl5ak0047yczsbs0v6otx', 'sesi_wisuda_pagi_01', 'WATT-e169c6f56b0627df732065ea38d1f1eec393495f583599bfc2d886462bc84af9', 'ACTIVE'),
('cmw6zl5ay004cyczscca2gojb', 'cmw6zl5at004ayczs4qpbtl25', 'sesi_wisuda_pagi_01', 'WATT-d151222231decda084461ba2dab2b9b2626eac5e36af9232b7623c8467fc2c1e', 'ACTIVE'),
('cmw6zl5b8004fyczsu0ixyo0s', 'cmw6zl5b3004dyczs599kzrid', 'sesi_wisuda_pagi_01', 'WATT-85bcbdad5d3c7b9e5e7d69e908b5822e88418ce66546353f11a1a4a112d04ca0', 'ACTIVE'),
('cmw6zl5bi004iyczsm9hw9i2h', 'cmw6zl5bd004gyczs1yqrecli', 'sesi_wisuda_pagi_01', 'WATT-e7572bca6f93b654ba7f5e76ca09ce8728e78be60c503569b29598eac89c0419', 'ACTIVE'),
('cmw6zl5bu004lyczstfsmp2gv', 'cmw6zl5bp004jyczs5dr6jvhi', 'sesi_wisuda_pagi_01', 'WATT-107e7ce372cf8fc41ae9f1bde0d098b7e128ec3bc43a4474397bae5e3b77102f', 'ACTIVE'),
('cmw6zl5c3004oyczsv4baxt5e', 'cmw6zl5bz004myczs7o1py1zr', 'sesi_wisuda_pagi_01', 'WATT-d2b25bf75af4971f0e53a5b133240021a83eed37372737ddba148bccbc4e43c9', 'ACTIVE'),
('cmw6zl5ce004ryczs1hbharqv', 'cmw6zl5c9004pyczsb3ecqzzb', 'sesi_wisuda_pagi_01', 'WATT-14ac04c17a2079eb7ad58de77065090a10f1db3c66438ac1f496027e85dfa0dc', 'ACTIVE'),
('cmw6zl5co004uyczsww5s7y8s', 'cmw6zl5ci004syczsqifxkqze', 'sesi_wisuda_pagi_01', 'WATT-84450622c4b98a528b17a79ef1efb9cce30b73aaaf46bf0d92679d01f0307430', 'ACTIVE'),
('cmw6zl5cx004xyczs2cvbtt13', 'cmw6zl5ct004vyczsyebhwx0h', 'sesi_wisuda_pagi_01', 'WATT-81a3c3ec2ac24ee7c1cd0c88bef31de94350743ab922bb099bf76f3165a8209c', 'ACTIVE'),
('cmw6zl5d70050yczsrqcdg3d0', 'cmw6zl5d2004yyczszqkkredv', 'sesi_wisuda_pagi_01', 'WATT-31ca50bcef358b14a7cb9a372cf22eafa44776b9fa5631b71b02f09485ca7a4e', 'ACTIVE'),
('cmw6zl5dg0053yczsoveipaei', 'cmw6zl5dc0051yczsv6sehciv', 'sesi_wisuda_pagi_01', 'WATT-3ce7367c8b1c1065367ebc3672f20af343299d02bb7ea0ce52bfa59b8037a9ea', 'ACTIVE'),
('cmw6zl5dq0056yczs8d8nm66w', 'cmw6zl5dl0054yczso6kd0kwi', 'sesi_wisuda_pagi_01', 'WATT-dff79b95ed564adb633ed6c75c525d5dc49686c356531d382d07f80b78246c74', 'ACTIVE'),
('cmw6zl5e00059yczshlzdvgc6', 'cmw6zl5dv0057yczsmluk6y2f', 'sesi_wisuda_pagi_01', 'WATT-6dcf9f5e9e169dc6299b82c2e4c9dc5c73c80542cf9e24954720c624899d8155', 'ACTIVE'),
('cmw6zl5eb005cyczsal6l7zkz', 'cmw6zl5e5005ayczsebj3ko36', 'sesi_wisuda_pagi_01', 'WATT-d7dbe849a04fa8524c41a27e0bbe85e770226b7dbb0602564b5ff1889f9da767', 'ACTIVE'),
('cmw6zl5em005fyczs5wc3bn9i', 'cmw6zl5eg005dyczslqww1fds', 'sesi_wisuda_pagi_01', 'WATT-79a8e677933c9bdc481bde0a999d66d52f814135da8fc8c01bd594cbeee9d85c', 'ACTIVE'),
('cmw6zl5ew005iyczse8ki2k11', 'cmw6zl5er005gyczs85xgo3sc', 'sesi_wisuda_pagi_01', 'WATT-b545af94a5a6610ecaac7f46d4c55425a61580b369fe3f73a4d71007c179c802', 'ACTIVE'),
('cmw6zl5f5005lyczs98h2713a', 'cmw6zl5f0005jyczsq9bucfjf', 'sesi_wisuda_pagi_01', 'WATT-40a992b30f2e891c8e493174497a8c174a1575c9b1a30247a7683077861c0ad9', 'ACTIVE'),
('cmw6zl5ff005oyczszzm4tykl', 'cmw6zl5fa005myczsyp8qhaql', 'sesi_wisuda_pagi_01', 'WATT-c2d86a0767cc9858a3170e2dd7a0741b46c29500fdffb710d440fd4f6593a5e5', 'ACTIVE'),
('cmw6zl5fo005ryczsnofrga4i', 'cmw6zl5fk005pyczs18ivydlm', 'sesi_wisuda_pagi_01', 'WATT-b9fadc7beb6612380e6e19492c3c952173524a03a27b5dcf836a17b8bcf9cc96', 'ACTIVE'),
('cmw6zl5fy005uyczshbxsvm73', 'cmw6zl5ft005syczsynlypben', 'sesi_wisuda_pagi_01', 'WATT-c349c47214e5306db494da67d3e4992832c87b3a498c8c20fe8d6d0211a646a7', 'ACTIVE'),
('cmw6zl5g7005xyczszjdb5xfe', 'cmw6zl5g3005vyczsvqk9655j', 'sesi_wisuda_pagi_01', 'WATT-312dd18f5f9cf0cfd91cdcd4af57e8aec08de925c89ec26610dd4d6317fe9504', 'ACTIVE'),
('cmw6zl5gh0060yczsdd7y9sp0', 'cmw6zl5gc005yyczsyu80x22y', 'sesi_wisuda_pagi_01', 'WATT-3b7a3eeccc8428ce05d60626e53e7d24e0a41a3afebf882a6ef1061211684b4a', 'ACTIVE'),
('cmw6zl5gt0063yczss5cl7135', 'cmw6zl5gl0061yczsfboj3fqi', 'sesi_wisuda_pagi_01', 'WATT-056fe976ac5382881598030ad2b922d03d40b354c203cc7dd57d89b12236b8c6', 'ACTIVE'),
('cmw6zl5h20066yczspn536k5e', 'cmw6zl5gx0064yczse95sxuzc', 'sesi_wisuda_pagi_01', 'WATT-efc66b475519755e5b377a56adebe6d03894f0ab0b3bdd1310571480fea3f567', 'ACTIVE'),
('cmw6zl5hb0069yczsg46kct2a', 'cmw6zl5h70067yczsen8uur50', 'sesi_wisuda_pagi_01', 'WATT-9b1e2d1876ba6f94143e14fa5cdd64d193a455e47660a0cbd2b872cc93f2da01', 'ACTIVE'),
('cmw6zl5hk006cyczs7fk4jmp3', 'cmw6zl5hg006ayczsu7g628n9', 'sesi_wisuda_pagi_01', 'WATT-34b0c0b0676ab37e425aed0ee06d0a1015ebfc10c6309850e2581963690c86eb', 'ACTIVE'),
('cmw6zl5hu006fyczs6mattefo', 'cmw6zl5hp006dyczsffna2uf5', 'sesi_wisuda_pagi_01', 'WATT-dab4f18dcc9d3eec07d94cada9bf127f6fb709135dd9f451abc58f1705f07df6', 'ACTIVE'),
('cmw6zl5i3006iyczs6ghsonrn', 'cmw6zl5hz006gyczsqhlzdnid', 'sesi_wisuda_pagi_01', 'WATT-3581da15d0f3077c6ff0af0c069b4a5eae669a15df18dc0d1a9ef100f7c41a76', 'ACTIVE');

-- Absensi (Kosong - Siap Digunakan Hari H Wisuda)

-- Sample Audit Log Inisialisasi
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity`, `entity_id`, `reason`, `ip_address`) VALUES
('audit_init_01', 'usr_superadmin_01', 'SYSTEM_INIT', 'System', 'evt_wisuda_2026_01', 'Inisialisasi sistem basis data WisudaAttend di MySQL Domainesia.', '127.0.0.1');

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SELESAI: Database siap digunakan!
-- =====================================================================
