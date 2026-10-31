# SIM VERVAL RKAS & BOP PAUD

**Sistem Informasi Manajemen Perencanaan RKAS, Verifikasi Dinas, Penatausahaan (BKU), dan Pelaporan Dana BOP PAUD Real-Time**  
*Dinas Pendidikan Pemuda dan Olahraga Kabupaten Jepara — Berpedoman pada Permendikdasmen Nomor 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP*

---

## Ringkasan Sistem

**SIM VERVAL RKAS & BOP PAUD** adalah aplikasi web terintegrasi **Google Sheets**, **Google Apps Script**, dan **REST/Webhook API** untuk mengelola siklus anggaran Bantuan Operasional Penyelenggaraan (BOP) PAUD secara akuntabel dan real-time, mulai dari penyusunan kertas kerja RKAS oleh satuan pendidikan hingga verifikasi, pengesahan, penatausahaan Buku Kas Umum (BKU), serta pelaporan realisasi oleh Dinas Pendidikan.

---

## Fitur Utama

### 1. Hak Akses Multi-User Terstruktur
- **Satuan Pendidikan PAUD (`sekolah`)**: Login menggunakan **8 digit Nomor Pokok Sekolah Nasional (NPSN)** untuk menyusun RKAS, memilih referensi Standar Harga Satuan (SHS) Kabupaten Jepara, mencetak lembar pengesahan PDF, mencatat transaksi BKU, dan mengirim laporan realisasi.
- **Dinas Pendidikan (`admin` — 1 Level Verifikator Admin)**: Memeriksa rincian RKAS per sekolah, memberikan catatan revisi atau pengesahan resmi, mengelola katalog SHS Kabupaten Jepara, mengelola akun NPSN (termasuk impor/ekspor CSV `VERVAL_ARKAS`), serta menyinkronkan database 7 tab Google Sheets.

### 2. Pemetaan 7 Standar Pendidikan PAUD
1. `02 Standar Isi`
2. `03 Standar Proses`
3. `04 Standar Tenaga Kependidikan`
4. `05 Standar Sarana Prasarana`
5. `06 Standar Pengelolaan`
6. `07 Standar Pembiayaan`
7. `08 Standar Penilaian`

### 3. Validasi Otomatis 10 Komponen Penggunaan Dana BOP PAUD (Permendikdasmen No. 8 Tahun 2026)
1. Penerimaan Murid Baru
2. Pengembangan Perpustakaan dan/atau Layanan Pojok Baca — **Wajib Minimal 5%** dari pagu tahunan
3. Pelaksanaan Kegiatan Pembelajaran dan Bermain
4. Pelaksanaan Kegiatan Evaluasi/Asesmen Pembelajaran dan Bermain
5. Pelaksanaan Administrasi Kegiatan Satuan Pendidikan
6. Pengembangan Profesi Pendidik dan Tenaga Kependidikan
7. Pembiayaan Langganan Daya dan Jasa
8. Pemeliharaan Sarana dan Prasarana — **Maksimal 20%** dari pagu tahunan
9. Penyelenggaraan Kegiatan Kesehatan, Gizi, dan Kebersihan
10. Pembayaran Honorarium — Dibedakan otomatis sesuai status satuan pendidikan:
    - **Satuan PAUD Negeri: Maksimal 20%**
    - **Satuan PAUD Swasta: Maksimal 40%**

### 4. Dasbor Visualisasi & Pemantauan Real-Time
- Kartu ringkasan Pagu Tahunan, Total Perencanaan RKAS, Realisasi Belanja BKU, dan Progres Pengesahan Dinas.
- Grafik perbandingan rencana RKAS vs realisasi BKU pada 10 Komponen BOP PAUD dan distribusi 7 Standar Pendidikan.
- **Chart Progress Bar Realisasi Pengeluaran BKU terhadap Pagu Anggaran per Sekolah** lengkap dengan pembanding dana salur kas dan indikator serapan Tahap 1 (50%).
- Notifikasi real-time berbasis WebSocket setiap kali sekolah mengajukan berkas atau Dinas menerbitkan status revisi/pengesahan.

### 5. Cetak Lembar Verifikasi & Pengesahan RKAS (PDF A4 Resmi)
Menghasilkan dokumen PDF ukuran A4 siap cetak dengan susunan tanda tangan resmi:
- **Sebelah Kiri**: Komite Sekolah
- **Tengah**: Kepala Satuan Pendidikan
- **Sebelah Kanan**: Bendahara BOP PAUD
- **Tengah Bawah (Mengetahui)**: Kepala Dinas Pendidikan Pemuda dan Olahraga Kabupaten Jepara

---

## Struktur 7 Tab Database Google Sheets

Sistem mendukung sinkronisasi **2 arah** dengan Google Spreadsheet menggunakan 7 lembar kerja (*sheet*) terstruktur:

| No | Nama Sheet | Fungsi Utama |
| :- | :--- | :--- |
| 01 | `Akun_Pengguna` | Data akun NPSN Satuan PAUD & Verifikator Admin Dinas, status Negeri/Swasta, jumlah murid, dan pagu tahunan |
| 02 | `Perencanaan_RKAS` | Rincian item kegiatan RKAS 22 kolom (Skema BOP, Standar `02–08`, Komponen `1–10`, Kode SHS, Volume, Harga, Tahap 1 & 2) |
| 03 | `Verifikasi_Dinas` | Riwayat pengajuan berkas, catatan revisi, dan pengesahan oleh Verifikator Admin Dinas |
| 04 | `Penatausahaan_BKU` | Buku Kas Umum penerimaan dana salur & pengeluaran belanja beserta potongan pajak PPh/PPN |
| 05 | `Rekap_7Standar_10Komponen` | Rekapitulasi otomatis kepatuhan persentase Pojok Baca (≥5%), Sarpras (≤20%), dan Honorarium (Negeri ≤20% / Swasta ≤40%) |
| 06 | `Referensi_SHS_Jepara` | Katalog Standar Harga Satuan (SSH / SBU / HSPK) Kabupaten Jepara |
| 07 | `Master_7Standar_10Komponen` | Tabel referensi baku 7 Standar Pendidikan (`02–08`) dan 10 Komponen BOP PAUD |

---

## Cara Menjalankan & Publikasi (Deployment)

### A. Menjalankan pada Server Node.js / Google Cloud Run

Prasyarat: **Node.js v22+**

```bash
# 1. Instal dependensi
npm install

# 2. Bangun aset frontend produksi
npm run build

# 3. Jalankan server produksi (Port 3000)
NODE_ENV=production npm start
```

Aplikasi dapat diakses melalui `http://localhost:3000`.

### B. Menjalankan Mandiri 100% di Google Sheets & Google Apps Script

1. Masuk ke aplikasi sebagai Admin Dinas, lalu buka menu **Google Sheets & Apps Script -> Tab 3 (`Proyek Mandiri Apps Script`)**.
2. Buka Google Spreadsheet baru milik Dinas -> klik **Extensions -> Apps Script**.
3. Salin kode **`Code.gs`** ke berkas `Code.gs`, lalu buat berkas HTML baru bernama **`Index`** dan tempel kode **`Index.html`**.
4. Jalankan fungsi **`setupDatabaseSheets`** dari toolbar Apps Script untuk membuat 7 tab database secara otomatis.
5. Untuk menghapus data simulasi awal, klik menu atas Google Sheets **`SIM BOP PAUD 2026` -> `4. Bersihkan Data Contoh (Mode Produksi Resmi)`**.
6. Klik **Deploy -> New deployment -> Web app** (*Execute as: Me*, *Who has access: Anyone*) untuk menerbitkan tautan aplikasi resmi `https://script.google.com/macros/s/.../exec`.

---

## Persiapan Mode Produksi Resmi (Non-Demo)

Sebelum membagikan tautan portal kepada satuan pendidikan:
1. Masuk sebagai Verifikator Admin Dinas.
2. Buka menu **Hak Akses & NPSN** -> klik tombol **`Mode Produksi & Sandi Admin`**.
3. Perbarui kata sandi Admin Dinas, sesuaikan Tahun Anggaran, dan centang opsi pembersihan akun contoh bawaan.
4. Unggah data riil satuan pendidikan menggunakan fitur **Impor CSV Akun** (`VERVAL_ARKAS`) atau tarik langsung dari Google Sheets.
