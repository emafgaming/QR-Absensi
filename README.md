# WisudaAttend — Sistem Presensi Wisuda Berbasis QR Code

**WisudaAttend** adalah aplikasi web sistem absensi wisuda berbasis QR Code yang aman, tangguh, berkecepatan tinggi, dan berstandar produksi. Sistem ini dirancang untuk menangani ribuan wisudawan dalam durasi prosesi wisuda yang ketat dengan verifikasi real-time, perlindungan transaksi di tingkat database, pemindai kamera browser tanpa reload, dan jejak audit kepatuhan.

---

## 🌟 Fitur Utama

1. **Autentikasi & Kontrol Akses Berbasis Peran (RBAC):**
   - **Superadmin:** Akses penuh seluruh sistem, manajemen pengguna, dan peninjauan jejak audit.
   - **Admin Panitia:** Manajemen mahasiswa, impor CSV, generate QR batch, koreksi absensi, dan pengaturan sesi wisuda.
   - **Petugas Scanner:** Pemindai QR berbasis kamera kecepatan tinggi, validasi instan, dan presensi manual.
   - **Viewer:** Akses read-only ke ringkasan statistik kehadiran dan ekspor laporan.
2. **Dashboard Real-Time:**
   - Statistik kehadiran aktual (Hadir, Belum Hadir, Terlambat, Izin, Persentase).
   - Pemantauan progres kedatangan per program studi dan fakultas.
   - Feed pemindaian terkini (*live recent scans*) diperbarui otomatis dari server.
3. **Pencegahan Absensi Ganda Tingkat Database:**
   - Constraint unik `@@unique([mahasiswa_id, sesi_id])` pada basis data.
   - Transaksi database atomik (`prisma.$transaction`) mencegah race conditions.
   - Pemindaian ulang (*rescan*) menampilkan notifikasi status "Sudah Hadir Sebelumnya" tanpa membuat duplikasi data.
4. **Keamanan QR Berbasis Token Kriptografis:**
   - QR Code memuat token acak berkekuatan tinggi (`WATT-[64-hex]`), **bukan** NIM atau data pribadi mentah.
   - Penolakan otomatis terhadap token tidak dikenal, token kadaluwarsa, atau token yang telah dicabut (*revoked*).
5. **Pemindai Kamera Browser (Prioritas UI/UX):**
   - Area kamera besar responsif dengan animasi bidik laser (*reticle targeting*).
   - Pemilihan multi-kamera (kamera belakang/depan/eksternal USB).
   - Umpan balik audio sintetis (Web Audio API) untuk sukses, duplikat, dan kesalahan.
   - Pemindaian kontinu (*auto-ready for next scan*) tanpa navigasi atau refresh halaman.
   - Modal input NIM manual sebagai alternatif jika kartu fisik rusak.
   - Deteksi pemutus koneksi (*offline banner*) yang adaptif.
6. **Koreksi Absensi & Audit Log Lengkap:**
   - Fitur koreksi status atau pembatalan absensi dengan kolom alasan wajib.
   - Log audit mencatat detail aktor, aksi, entity, nilai lama, nilai baru, alasan, dan IP address.
   - Sanitasi data otomatis: password dan token QR disembunyikan dari audit log.
7. **Impor & Ekspor Data CSV:**
   - Impor data wisudawan via CSV dengan validasi baris dan laporan error terperinci.
   - Ekspor rekapitulasi kehadiran wisudawan ke format CSV kompatibel Excel.

---

## 🛠️ Arsitektur Teknologi

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, html5-qrcode, PapaParse.
- **Backend:** Node.js, Express, TypeScript, Zod, Helmet, Morgan, Express Rate Limit, JWT, Bcrypt.
- **Database & ORM:** PostgreSQL + Prisma ORM (dilengkapi skrip switcher SQLite untuk pengujian lokal zero-setup).
- **Pengujian:** Vitest, Supertest.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat
- Node.js (v18+ atau v20+)
- npm (v9+)

### 2. Instalasi Dependensi
Jalankan perintah berikut di root folder proyek:
```bash
npm install
```

### 3. Konfigurasi Database

Proyek ini telah dikonfigurasi secara fleksibel:
- **Mode SQLite (Bawaan untuk pengujian lokal langsung tanpa perlu server tambahan):**
  ```bash
  npm run dev:server
  ```
- **Mode PostgreSQL (Siap Produksi):**
  1. Sesuaikan variabel di `server/.env`:
     ```env
     DATABASE_URL="postgresql://postgres:password@localhost:5432/wisudaattend?schema=public"
     ```
  2. Beralih ke schema PostgreSQL dan sinkronkan tabel:
     ```bash
     npm --prefix server run db:mode:postgres
     npm --prefix server run prisma:push
     npm --prefix server run prisma:seed
     ```

### 4. Menjalankan Aplikasi

Jalankan backend API dan frontend Vite secara berdampingan:

**Terminal 1 (Backend API):**
```bash
npm run dev:server
```
*Backend berjalan di: `http://localhost:5000` (Health check: `http://localhost:5000/api/v1/health`)*

**Terminal 2 (Frontend Client):**
```bash
npm run dev:client
```
*Frontend berjalan di: `http://localhost:5173`*

---

## 🔐 Akun Pengujian Bawaan (Seed Data)

Semua akun berikut telah di-seed dengan kata sandi: **`Wisuda2026!`**

| Peran (Role) | Username | Hak Akses |
|---|---|---|
| **Superadmin** | `superadmin` | Akses penuh, manajemen pengguna, audit log |
| **Admin Panitia** | `adminpanitia` | Master mahasiswa, impor CSV, generate QR, koreksi |
| **Petugas Scanner** | `petugas1` | Pemindai QR kamera, verifikasi, presensi manual |
| **Viewer** | `viewer` | Read-only dashboard statistik & ekspor laporan |

*(Tersedia tombol pintas "Akses Cepat Pengujian" di halaman login untuk beralih akun tanpa mengetik)*

---

## 🧪 Menjalankan Pengujian Otomatis

Uji seluruh alur bisnis, autentikasi, scanning, pencegahan absensi ganda, dan audit trail:
```bash
npm run test:server
```
Semua 15 pengujian integrasi akan berjalan menggunakan Vitest dan Supertest.

---

## 📦 Prosedur Build Produksi

Untuk menghasilkan bundle produksi:
```bash
npm run build
```
Hasil build:
- Frontend: `client/dist/`
- Backend: `server/dist/`
