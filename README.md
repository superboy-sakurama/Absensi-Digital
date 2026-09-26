Mengapa saya menggunakan sistem Pay From Heart ❓ 

Karena saya percaya, saat seseorang memberi dengan penuh kesadaran dan ketulusan,
ia sedang melatih dirinya untuk hidup dalam rasa cukup dan berkelimpahan.

Besar kecilnya kontribusi bukan tentang nominal, tetapi tentang keikhlasan hati.
Namun, sering kali orang yang berani memberi lebih besar juga sedang membangun identitas yang lebih siap untuk menerima lebih besar.

Dalam banyak pengalaman, apa yang kita berikan dengan tulus
sering kali kembali dalam bentuk yang tidak selalu sama, tetapi bermakna bagi kehidupan.

Berikan seberaninya. Berikan setulusnya. Sisanya, biarkan kehidupan bekerja dengan caranya sendiri. 🙏

Cara setting aplikasi sampai Deploy 
Chat Whatsapp ; 081332248688
Perkenalkan diri anda 
Nama : 
Asal Instansi :
Alamat Instansi :
Keperluan/perihal : 

---

# 📖 Panduan Lengkap Instalasi, Konfigurasi & Deployment

Panduan ini ditujukan bagi Anda yang melakukan **Fork** atau **Clone** dari repositori ini agar dapat menjalankan aplikasi di komputer lokal maupun mendeploy ke layanan cloud seperti **Vercel** atau server VPS.

---

## 📋 Daftar Isi
1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Cara Fork & Clone Repositori](#2-cara-fork--clone-repositori)
3. [Instalasi & Menjalankan di Lokal (Localhost)](#3-instalasi--menjalankan-di-lokal-localhost)
4. [Penjelasan & Konfigurasi Environment Variables (.env)](#4-penjelasan--konfigurasi-environment-variables-env)
5. [Panduan Deploy ke Vercel (Gratis & Cepat)](#5-panduan-deploy-ke-vercel-gratis--cepat)
6. [Panduan Deploy ke VPS / Server Mandiri](#6-panduan-deploy-ke-vps--server-mandiri)
7. [Pengaturan Fitur Absensi (Kamera & GPS)](#7-pengaturan-fitur-absensi-kamera--gps)
8. [Troubleshooting & Solusi Masalah Umum](#8-troubleshooting--solusi-masalah-umum)

---

## 1. Prasyarat Sistem

Sebelum memulai, pastikan perangkat atau lingkungan Anda telah terpasang:
- **Node.js**: Versi `18.x` atau `20.x` LTS (Rekomendasi). Cek dengan `node -v`.
- **NPM**: Versi `9.x` atau lebih baru. Cek dengan `npm -v`.
- **Git**: Terpasang di komputer Anda.
- **Akun GitHub**: Untuk melakukan fork dan mengelola repositori.
- **Akun Vercel**: (Gratis di [vercel.com](https://vercel.com)) jika ingin melakukan hosting gratis.

---

## 2. Cara Fork & Clone Repositori

1. **Fork Repositori**:
   - Buka halaman repositori GitHub ini.
   - Klik tombol **Fork** di pojok kanan atas.
   - Pilih akun/organisasi GitHub Anda lalu klik **Create Fork**.
2. **Clone ke Komputer Lokal**:
   - Buka terminal / command prompt.
   - Jalankan perintah:
     ```bash
     git clone https://github.com/USERNAME-ANDA/NAMA-REPO-FORK.git
     cd NAMA-REPO-FORK
     ```

---

## 3. Instalasi & Menjalankan di Lokal (Localhost)

1. **Pasang Dependensi**:
   ```bash
   npm install
   ```
2. **Buat File Konfigurasi Lingkungan (`.env`)**:
   Salin file `.env.example` menjadi `.env`:
   - Pada Linux/macOS:
     ```bash
     cp .env.example .env
     ```
   - Pada Windows (Command Prompt):
     ```cmd
     copy .env.example .env
     ```
   - Pada Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```
3. **Isi Nilai Environment Variables**:
   Buka file `.env` menggunakan teks editor (VS Code, Notepad, dll) dan sesuaikan nilainya (lihat bab 4).
4. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
5. Buka browser dan akses alamat:
   ```text
   http://localhost:3000
   ```

---

## 4. Penjelasan & Konfigurasi Environment Variables (`.env`)

Berikut rincian variabel konfigurasi yang tersedia di `.env`:

| Variabel | Sifat | Penjelasan |
| :--- | :---: | :--- |
| `VITE_SUPABASE_URL` | **Wajib** | URL instans Supabase Anda (contoh: `https://xxxx.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Wajib** | Public Anon Key dari proyek Supabase Anda. |
| `SPREADSHEET_ID` | Opsional | ID Google Spreadsheet untuk integrasi database/backup data absensi. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Opsional | Email Service Account dari Google Cloud Console. |
| `GOOGLE_PRIVATE_KEY` | Opsional | Private Key RSA dari Service Account Google Cloud. |
| `VITE_GOOGLE_MAPS_API_KEY` | Opsional | API Key Google Maps untuk meningkatkan presisi peta lokasi kantor. |
| `RESEND_API_KEY` | Opsional | API Key dari Resend ([resend.com](https://resend.com)) untuk pengiriman email reset password. |
| `APP_URL` | Opsional | Alamat domain aplikasi (misal `https://absensi.domainanda.com`). |

### Cara Mengatur Integrasi Google Sheets (Jika Menggunakan):
1. Masuk ke [Google Cloud Console](https://console.cloud.google.com).
2. Buat Service Account dan unduh file kredensial JSON.
3. Buka Google Spreadsheet baru di browser Anda:
   - Ambil **Spreadsheet ID** dari URL (teks panjang di antara `/d/` dan `/edit`).
   - Klik tombol **Bagikan (Share)** pada Google Spreadsheet tersebut, lalu masukkan email Service Account (`xxxx@xxxx.iam.gserviceaccount.com`) sebagai **Editor**.
4. Isi `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `SPREADSHEET_ID`, dan `GOOGLE_PRIVATE_KEY` ke dalam file `.env` Anda.

---

## 5. Panduan Deploy ke Vercel (Gratis & Cepat)

Aplikasi ini sudah dilengkapi konfigurasi bawaan `vercel.json` dan serverless handler di folder `/api`, sehingga sangat optimal untuk Vercel.

### Langkah-langkah Deploy:
1. Masuk ke [Vercel Dashboard](https://vercel.com) menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** > **Project**.
3. Cari dan pilih repositori hasil **Fork** Anda dari daftar GitHub, lalu klik **Import**.
4. Di bagian **Configure Project**:
   - **Framework Preset**: Pilih `Vite` (atau biarkan *Other*).
   - **Root Directory**: `./` (default).
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
5. Buka menu **Environment Variables**, lalu tambahkan semua variabel yang diperlukan:
   - `VITE_SUPABASE_URL` = (nilai Supabase URL Anda)
   - `VITE_SUPABASE_ANON_KEY` = (nilai Supabase Anon Key Anda)
   - `SPREADSHEET_ID` = (jika menggunakan Google Sheets)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = (jika menggunakan Google Sheets)
   - `GOOGLE_PRIVATE_KEY` = (paste seluruh teks private key termasuk `-----BEGIN PRIVATE KEY-----` dan `-----END PRIVATE KEY-----`)
   - `RESEND_API_KEY` = (jika menggunakan Resend)
   - `APP_URL` = `https://nama-proyek-anda.vercel.app` (atau biarkan kosong, Vercel akan otomatis mendeteksi)
6. Klik tombol **Deploy**.
7. Tunggu 1-2 menit hingga proses build selesai. Setelah selesai, aplikasi Anda sudah online dan dapat diakses publik melalui domain Vercel yang diberikan.

> 💡 **Penting Saat Update Environment di Vercel**:  
> Jika di kemudian hari Anda menambahkan atau mengubah nilai Environment Variables di dashboard Vercel, jangan lupa untuk melakukan **Redeploy** (Deployments > Klik titik tiga ⋮ > Redeploy) agar nilai baru tersebut aktif.

---

## 6. Panduan Deploy ke VPS / Server Mandiri

Jika Anda ingin mendeploy pada VPS Linux (Ubuntu/Debian) sendiri:

1. **Clone dan Install**:
   ```bash
   git clone https://github.com/USERNAME-ANDA/NAMA-REPO-FORK.git /var/www/absensi
   cd /var/www/absensi
   npm install
   ```
2. **Setup File `.env`**:
   ```bash
   cp .env.example .env
   nano .env
   ```
3. **Build Aplikasi**:
   ```bash
   npm run build
   ```
4. **Jalankan Aplikasi dengan Process Manager (PM2)**:
   ```bash
   npm install -g pm2
   pm2 start "npm run start" --name "absensi-app"
   pm2 save
   pm2 startup
   ```
5. **Konfigurasi Reverse Proxy (Nginx + SSL HTTPS)**:
   Arahkan Nginx reverse proxy ke `http://localhost:3000` dan pasang SSL gratis menggunakan Certbot Let's Encrypt:
   ```bash
   sudo certbot --nginx -d absensi.domainanda.com
   ```

---

## 7. Pengaturan Fitur Absensi (Kamera & GPS)

Aplikasi ini menggunakan teknologi **PWA (Progressive Web App)**, **Webcam API**, dan **HTML5 Geolocation API**:

1. **Kewajiban HTTPS**:
   - Fitur kamera dan lokasi GPS di browser modern (Chrome, Safari, Edge) **wajib berjalan di bawah protokol HTTPS** (atau `localhost` saat pengujian).
   - Domain Vercel secara otomatis sudah mendukung HTTPS.
2. **Izin Perangkat (Permission)**:
   - Saat pegawai pertama kali membuka halaman absensi, browser akan meminta izin *Camera* dan *Location*. Pengguna wajib memilih **Izinkan (Allow)**.
3. **Setting Radius & Lokasi Kantor**:
   - Masuk ke akun Admin.
   - Buka menu **Pengaturan / Sistem**.
   - Masukkan titik koordinat Latitude, Longitude, dan Radius (meter) kantor untuk pembatasan wilayah absensi.

---

## 8. Troubleshooting & Solusi Masalah Umum

- **Kamera / Lokasi Tidak Terdeteksi di HP**:
  - Pastikan website dibuka via protokol `https://` (bukan `http://`).
  - Pastikan GPS di smartphone dalam keadaan aktif dengan mode akurasi tinggi.
  - Cek izin situs di browser HP Anda (Settings > Site Settings > Camera & Location > Allow).
- **Google Spreadsheet Error / Tidak Tersambung**:
  - Pastikan email Service Account sudah di-invite sebagai **Editor** pada Google Sheet.
  - Pastikan `GOOGLE_PRIVATE_KEY` diinput dengan lengkap beserta tanda baris barunya.
- **Vercel Error 500 FUNCTION_INVOCATION_FAILED**:
  - Periksa tab **Logs** pada Vercel Dashboard untuk melihat pesan error.
  - Pastikan environment variable `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` telah diisi di pengaturan Vercel.
  - Lakukan **Redeploy** setelah mengubah variabel lingkungan.

---
✨ *Selamat menggunakan aplikasi! Jika memerlukan bantuan teknis lebih lanjut, silakan hubungi kontak yang tertera di atas.*
