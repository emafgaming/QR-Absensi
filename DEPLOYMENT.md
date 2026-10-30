# Panduan Deployment & Backup Basis Data WisudaAttend

Dokumen ini menjelaskan prosedur penerapan (*deployment*) produksi berstandar keamanan tinggi untuk aplikasi **WisudaAttend**.

---

## 🌟 Panduan Khusus Deployment di Domainesia (cPanel / Cloud Hosting)

Bila Anda mendeploy di hosting Domainesia (menggunakan fitur **Setup Node.js App** dan **MySQL/phpMyAdmin** di cPanel):

### 1. Buat Database & User MySQL di cPanel
1. Masuk ke **cPanel Domainesia**.
2. Buka menu **MySQL Database Wizard**.
3. Buat database baru (misal: `u1234567_wisudadb`).
4. Buat user database baru beserta password yang kuat (misal: `u1234567_wisuda`).
5. Centang **ALL PRIVILEGES** pada user tersebut untuk database yang dibuat.

### 2. Import Struktur Database & Data Awal via phpMyAdmin
1. Buka menu **phpMyAdmin** di cPanel.
2. Klik nama database yang baru dibuat di panel sebelah kiri.
3. Klik tab **Import** di bagian atas.
4. Pilih file [`wisudaattend_mysql.sql`](file:///D:/Project%20Absen/wisudaattend_mysql.sql) yang sudah disediakan di root project.
5. Klik **Go / Kirim**. Seluruh tabel (`users`, `mahasiswa`, `events`, `sesi_wisuda`, `qr_codes`, `absensi`, `audit_logs`) dan akun default akan langsung terbuat!

### 3. Setup Node.js App di cPanel
1. Masuk ke menu **Setup Node.js App** di cPanel Domainesia.
2. Klik **Create Application**:
   - **Node.js version:** Pilih 18.x atau 20.x LTS.
   - **Application mode:** `Production`
   - **Application root:** misal `apps/wisuda-api`
   - **Application URL:** subdomain API Anda, misal `api.domainanda.com`
   - **Application startup file:** `dist/server.js`
3. Upload seluruh file folder `server/` (setelah di-build `npm run build`) ke direktori root aplikasi tersebut.
4. Pada bagian **Environment variables**, tambahkan:
   - `PORT` = `5000` (atau port yang ditentukan cPanel)
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (string rahasia acak yang panjang)
   - `CORS_ORIGIN` = `https://domainanda.com`
   - `DATABASE_URL` = `mysql://u1234567_wisuda:PasswordAnda@localhost:3306/u1234567_wisudadb`
5. Jalankan `npm install --production` dan jalankan app.

---

## 1. Arsitektur Deployment Produksi VPS / Dedicated Server

```
[ Klien / Browser Petugas ]
            │ (HTTPS / Port 443)
            ▼
[ Reverse Proxy Nginx / Cloudflare ]
      │                   │
      ▼ (Static Assets)   ▼ (/api/v1 Reverse Proxy)
[ client/dist ]    [ Express Server (Node.js/PM2) : Port 5000 ]
                          │ (Prisma Client Connection Pool)
                          ▼
             [ Basis Data PostgreSQL 16+ ]
```

---

## 2. Konfigurasi Lingkungan Produksi (`server/.env`)

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=gunakan-string-acak-panjang-minimal-64-karakter-di-produksi
CORS_ORIGIN=https://wisuda.kampus.ac.id
DATABASE_URL="postgresql://wisuda_user:strong_password@127.0.0.1:5432/wisudaattend?schema=public&sslmode=prefer"
```

---

## 3. Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)

```nginx
server {
    listen 80;
    server_name wisuda.kampus.ac.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wisuda.kampus.ac.id;

    ssl_certificate /etc/letsencrypt/live/wisuda.kampus.ac.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wisuda.kampus.ac.id/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Static SPA
    location / {
        root /var/www/wisudaattend/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/v1/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings for high-volume scanner
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
    }
}
```

---

## 4. Menjalankan Server dengan Process Manager (PM2)

```bash
# Instalasi PM2 secara global
npm install -g pm2

# Build proyek
npm run build

# Menjalankan backend dengan cluster mode
pm2 start server/dist/server.js --name "wisudaattend-api" -i max
pm2 save
pm2 startup
```

---

## 5. Prosedur Pencadangan (Backup) & Pemulihan (Disaster Recovery)

Untuk menjamin ketersediaan data saat hari pelaksanaan wisuda, siapkan pencadangan otomatis berkala.

### A. Skrip Backup PostgreSQL Otomatis (`scripts/backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/wisudaattend"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="wisudaattend"
DB_USER="wisuda_user"

mkdir -p $BACKUP_DIR

# Ekspor basis data dalam format kompresi biner
pg_dump -U $DB_USER -h 127.0.0.1 -F c -b -v -f "$BACKUP_DIR/backup_${DB_NAME}_$DATE.dump" $DB_NAME

# Pertahankan arsip selama 30 hari
find $BACKUP_DIR -name "*.dump" -type f -mtime +30 -delete

echo "Backup berhasil disimpan di $BACKUP_DIR/backup_${DB_NAME}_$DATE.dump"
```

### B. Otomatisasi via Cron Job (Setiap 30 Menit saat Acara Berlangsung)
```bash
# Tambahkan ke crontab
*/30 6-18 * * * /bin/bash /var/www/wisudaattend/scripts/backup.sh >> /var/log/wisuda_backup.log 2>&1
```

### C. Prosedur Pemulihan Basis Data (Restore)
Jika terjadi insiden sistem pada server:
```bash
# 1. Hentikan aplikasi
pm2 stop wisudaattend-api

# 2. Pulihkan basis data dari file dump
pg_restore -U wisuda_user -h 127.0.0.1 -d wisudaattend -v -c /var/backups/wisudaattend/backup_terbaru.dump

# 3. Jalankan kembali aplikasi
pm2 start wisudaattend-api
```
