import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import {
  STANDAR_PENDIDIKAN_7,
  KOMPONEN_BOP_10,
  checkLaranganBosp2026,
  validateRkasJuknis,
} from './src/types/bop.ts';
import type {
  AccountProfile,
  AppDatabaseState,
  AppNotification,
  BkuTransaction,
  BopScheme,
  ReportStatus,
  RkasItem,
  RkasStatus,
  ShsJeparaItem,
  ShsKategori,
  UserRole,
  VerificationLog,
} from './src/types/bop.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'sim_bop_paud_2027.json');
const CSV_SEED_FILE = path.join(
  __dirname,
  'public',
  'assets',
  'aistudio',
  'VERVAL_ARKAS_2027_Unduh_f11874d4'
);

interface SessionInfo {
  token: string;
  userId: string;
  nama: string;
  peran: UserRole;
  wilayah: string;
  createdAt: number;
}

const sessions = new Map<string, SessionInfo>();

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function buildInitialDatabase(): AppDatabaseState {
  const now = new Date().toISOString();

  // Base accounts including multi-level Dinas RBAC & Negeri/Swasta schools
  const accountsMap = new Map<string, AccountProfile>();

  // Parse attached VERVAL_ARKAS_2027 CSV if available
  if (fs.existsSync(CSV_SEED_FILE)) {
    const rawCsv = fs.readFileSync(CSV_SEED_FILE, 'utf-8');
    const lines = rawCsv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const id = (cols[0] || '').trim();
      const rawNama = (cols[1] || '').replace(/,+$/, '').trim();
      const rawPeran = (cols[2] || '').toLowerCase().trim();
      const kataSandi = (cols[3] || id).trim();
      const wilayah = (cols[4] || 'Wilayah Pusat').trim();

      if (!id) continue;

      if (rawPeran === 'dinas' || rawPeran === 'admin' || id === 'admin') {
        accountsMap.set(id, {
          id,
          nama:
            rawNama && rawNama !== 'Dinas Pendidikan'
              ? rawNama
              : 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)',
          peran: 'admin',
          kataSandi,
          wilayah: 'Kabupaten Jepara',
          updatedAt: now,
        });
      } else {
        accountsMap.set(id, {
          id,
          nama:
            rawNama.toLowerCase() === 'sekolah'
              ? `TK Negeri Pembina Jepara (${id})`
              : rawNama,
          peran: 'sekolah',
          kataSandi,
          wilayah: wilayah === id ? 'Kec. Jepara' : wilayah,
          statusSekolah: 'NEGERI',
          jenjang: 'TK',
          skemaBopDefault: 'REGULER',
          jumlahSiswa: 80,
          satuanBiaya: 600000,
          paguTahunan: 48000000,
          kepalaSekolah: 'Dra. Hj. Siti Rahmawati, M.Pd.',
          bendahara: 'Nurlaila Sari, S.Pd.',
          tempatTtd: 'Jepara',
          rkasStatus: id === '20600001' ? 'DRAFT' : 'DIAJUKAN',
          reportStatus: 'BELUM_LAPOR',
          berkasSptjmUrl: 'SPTJM_BOP_20600001_2027.pdf',
          berkasRabUrl: 'RAB_ARKAS_20600001_2027.xlsx',
          updatedAt: now,
        });
      }
    }
  }

  // Ensure default CSV accounts exist (1 Level Verifikator Admin Dinas + Sekolah NPSN)
  if (!accountsMap.has('admin')) {
    accountsMap.set('admin', {
      id: 'admin',
      nama: 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)',
      peran: 'admin',
      kataSandi: 'admin',
      wilayah: 'Kabupaten Jepara',
      updatedAt: now,
    });
  }
  if (!accountsMap.has('20600001')) {
    accountsMap.set('20600001', {
      id: '20600001',
      nama: 'TK Negeri Pembina Jepara (20600001)',
      peran: 'sekolah',
      kataSandi: '20600001',
      wilayah: 'Kec. Jepara',
      statusSekolah: 'NEGERI',
      jenjang: 'TK',
      skemaBopDefault: 'REGULER',
      jumlahSiswa: 80,
      satuanBiaya: 600000,
      paguTahunan: 48000000,
      kepalaSekolah: 'Dra. Hj. Siti Rahmawati, M.Pd.',
      bendahara: 'Nurlaila Sari, S.Pd.',
      tempatTtd: 'Jepara',
      rkasStatus: 'DRAFT',
      reportStatus: 'BELUM_LAPOR',
      berkasSptjmUrl: 'SPTJM_BOP_20600001_2027.pdf',
      berkasRabUrl: 'RAB_ARKAS_20600001_2027.xlsx',
      updatedAt: now,
    });
  }

  // Sample PAUD schools in Kabupaten Jepara (login via Nomor NPSN)
  accountsMap.set('20600002', {
    id: '20600002',
    nama: 'TK Swasta Tunas Cendekia Tahunan',
    peran: 'sekolah',
    kataSandi: '20600002',
    wilayah: 'Kec. Tahunan',
    statusSekolah: 'SWASTA',
    jenjang: 'TK',
    jumlahSiswa: 65,
    satuanBiaya: 600000,
    paguTahunan: 39000000,
    kepalaSekolah: 'Dewi Anggraini, S.Pd.AUD',
    bendahara: 'Putri Maharani, S.E.',
    tempatTtd: 'Jepara',
    rkasStatus: 'DISAHKAN',
    reportStatus: 'DIAJUKAN_TAHAP_1',
    catatanDinas: 'RKAS 2027 telah memenuhi Juknis BOSP & Standar Harga Satuan Kab. Jepara (Pojok Baca 7.7%, Honor Swasta 30.8% <= 40%). Disahkan.',
    berkasSptjmUrl: 'SPTJM_BOP_20600002_2027.pdf',
    berkasRabUrl: 'RAB_ARKAS_20600002_2027.xlsx',
    updatedAt: now,
  });

  accountsMap.set('20600003', {
    id: '20600003',
    nama: 'KB Harapan Bangsa Batealit',
    peran: 'sekolah',
    kataSandi: '20600003',
    wilayah: 'Kec. Batealit',
    statusSekolah: 'SWASTA',
    jenjang: 'KB',
    jumlahSiswa: 50,
    satuanBiaya: 600000,
    paguTahunan: 30000000,
    kepalaSekolah: 'Lestari Handayani, S.Pd.',
    bendahara: 'Ahmad Fauzi',
    tempatTtd: 'Jepara',
    rkasStatus: 'DIAJUKAN',
    reportStatus: 'BELUM_LAPOR',
    catatanDinas: 'Menunggu verifikasi berkas oleh Verifikator Admin Dinas.',
    berkasSptjmUrl: 'SPTJM_BOP_20600003_2027.pdf',
    berkasRabUrl: 'RAB_ARKAS_20600003_2027.xlsx',
    updatedAt: now,
  });

  accountsMap.set('20600004', {
    id: '20600004',
    nama: 'TK Negeri Mekar Jaya Pecangaan',
    peran: 'sekolah',
    kataSandi: '20600004',
    wilayah: 'Kec. Pecangaan',
    statusSekolah: 'NEGERI',
    jenjang: 'TK',
    jumlahSiswa: 70,
    satuanBiaya: 600000,
    paguTahunan: 42000000,
    kepalaSekolah: 'Hj. Kartini, S.Pd.',
    bendahara: 'Rudi Hermawan',
    tempatTtd: 'Jepara',
    rkasStatus: 'PERLU_REVISI',
    reportStatus: 'BELUM_LAPOR',
    catatanDinas: 'Mohon sesuaikan alokasi Layanan Pojok Baca minimal 5% serta batas Honorarium Satuan Negeri maksimal 20% dari pagu sesuai Juknis BOSP.',
    berkasSptjmUrl: 'SPTJM_BOP_20600004_2027.pdf',
    berkasRabUrl: 'RAB_ARKAS_20600004_2027.xlsx',
    updatedAt: now,
  });

  // Seed RKAS items for 20600001 (TK Negeri Pembina - Pagu Rp 48.000.000, 100% compliant!)
  const rkasItems: RkasItem[] = [
    {
      id: 'RKAS-20600001-01',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-01',
      uraianKegiatan: 'Pelaksanaan Penerimaan Murid Baru (PPDB) & Sosialisasi PAUD Holistik',
      spesifikasi: 'Cetak formulir, spanduk informasi, buku panduan orang tua murid baru',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 2400000,
      jumlahTotal: 2400000,
      tahap1: 2400000,
      tahap2: 0,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-02',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-02',
      komponenId: 'KOMP-02',
      uraianKegiatan: 'Pengadaan Buku Cerita Bergambar & Penataan Layanan Pojok Baca PAUD',
      spesifikasi: 'Buku bacaan anak berjenjang lolos kurasi Kemendikdasmen & rak pojok baca',
      volume: 60,
      satuan: 'Eksemplar',
      hargaSatuan: 60000,
      jumlahTotal: 3600000, // 7.5% (>= 5% min!)
      tahap1: 2400000,
      tahap2: 1200000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-03',
      npsn: '20600001',
      tahunAnggaran: 2027,
      skemaBop: 'REGULER',
      bulanPelaksanaan: 'Januari - Desember',
      standarId: 'STD-03',
      komponenId: 'KOMP-03',
      uraianKegiatan: 'Penyediaan Alat Permainan Edukatif (APE) Dalam & Bahan Bermain Sensorik',
      spesifikasi: 'Balok kayu SNI, kartu huruf/angka, kertas lipat, cat air non-toksik',
      volume: 12,
      satuan: 'Set',
      hargaSatuan: 630000,
      jumlahTotal: 7560000,
      tahap1: 3780000,
      tahap2: 3780000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-04',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-08',
      komponenId: 'KOMP-04',
      uraianKegiatan: 'Cetak Portofolio Asesmen Perkembangan Anak & Buku Laporan Semester',
      spesifikasi: 'Map portofolio perkembangan anak 80 siswa x 2 semester',
      volume: 80,
      satuan: 'Siswa',
      hargaSatuan: 35000,
      jumlahTotal: 2800000,
      tahap1: 1400000,
      tahap2: 1400000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-05',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-06',
      komponenId: 'KOMP-05',
      uraianKegiatan: 'Pemutakhiran Dapodik, Rapat Kerja RKAS & ATK Administrasi Satuan',
      spesifikasi: 'Kertas HVS, tinta printer, penjilidan laporan BOSP & konsumsi rapat KSP',
      volume: 12,
      satuan: 'Bulan',
      hargaSatuan: 250000,
      jumlahTotal: 3000000,
      tahap1: 1500000,
      tahap2: 1500000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-06',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-04',
      komponenId: 'KOMP-06',
      uraianKegiatan: 'Peningkatan Kompetensi Guru PAUD pada Kegiatan PKG / Gugus PAUD',
      spesifikasi: 'Transportasi & materi workshop Kurikulum Nasional PAUD 4 pendidik',
      volume: 4,
      satuan: 'Orang',
      hargaSatuan: 600000,
      jumlahTotal: 2400000,
      tahap1: 1200000,
      tahap2: 1200000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-07',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-07',
      komponenId: 'KOMP-07',
      uraianKegiatan: 'Langganan Listrik PLN, Air Bersih PDAM & Internet Operasional Sekolah',
      spesifikasi: 'Tagihan listrik + internet fiber operasional Dapodik/ARKAS 12 bulan',
      volume: 12,
      satuan: 'Bulan',
      hargaSatuan: 300000,
      jumlahTotal: 3600000,
      tahap1: 1800000,
      tahap2: 1800000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-08',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-05',
      komponenId: 'KOMP-08',
      uraianKegiatan: 'Pemeliharaan Ringan Ruang Bermain, Pengecatan Wahana Luar & Sanitasi Anak',
      spesifikasi: 'Cat ramah anak, perbaikan keran wastafel cuci tangan & atap selasar',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 5400000,
      jumlahTotal: 5400000, // 11.25% (<= 20% max!)
      tahap1: 2400000,
      tahap2: 3000000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-09',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-09',
      uraianKegiatan: 'Penyelenggaraan PMT Lokal Bergizi, Deteksi Tumbuh Kembang (DDTK) & UKS',
      spesifikasi: 'Pemberian makanan tambahan sehat lokal, timbangan digital, pengukur tinggi badan',
      volume: 10,
      satuan: 'Kegiatan',
      hargaSatuan: 260000,
      jumlahTotal: 2600000,
      tahap1: 1300000,
      tahap2: 1300000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600001-10',
      npsn: '20600001',
      tahunAnggaran: 2027,
      standarId: 'STD-07',
      komponenId: 'KOMP-10',
      uraianKegiatan: 'Pembayaran Honorarium Pendidik Non-ASN Terdaftar Dapodik (Satuan Negeri)',
      spesifikasi: 'Pendidik Non-ASN x Rp 600.000 x 16 OB (20% Pagu <= 20% Maks Satuan Negeri)',
      volume: 16,
      satuan: 'OB',
      hargaSatuan: 600000,
      jumlahTotal: 9600000, // 20% (<= 20% max for Satuan Negeri!)
      tahap1: 4800000,
      tahap2: 4800000,
      statusItem: 'MENUNGGU',
      updatedAt: now,
    },

    // Seed RKAS items for 20600002 (TK Swasta Tunas Cendekia - Pagu Rp 39.000.000, DISAHKAN)
    {
      id: 'RKAS-20600002-01',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-02',
      komponenId: 'KOMP-02',
      uraianKegiatan: 'Pengembangan Pojok Baca Kelas & Koleksi Buku Cerita Nusantara',
      spesifikasi: '75 buku cerita anak PAUD & karpet baca',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 3000000,
      jumlahTotal: 3000000, // 7.69% >= 5%
      tahap1: 1500000,
      tahap2: 1500000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600002-02',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-03',
      uraianKegiatan: 'Kegiatan Pembelajaran Kontekstual, Bahan Bermain & Projek Penguatan',
      spesifikasi: 'Bahan habis pakai pembelajaran 65 siswa selama 2 semester',
      volume: 2,
      satuan: 'Semester',
      hargaSatuan: 4100000,
      jumlahTotal: 8200000,
      tahap1: 4100000,
      tahap2: 4100000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600002-03',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-08',
      komponenId: 'KOMP-04',
      uraianKegiatan: 'Evaluasi & Asesmen Tumbuh Kembang Anak Didik',
      spesifikasi: 'Instrumen ceklis capaian perkembangan & rapor PAUD',
      volume: 65,
      satuan: 'Siswa',
      hargaSatuan: 40000,
      jumlahTotal: 2600000,
      tahap1: 1300000,
      tahap2: 1300000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600002-04',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-07',
      komponenId: 'KOMP-07',
      uraianKegiatan: 'Pembiayaan Langganan Listrik & Internet Sekolah',
      spesifikasi: 'Listrik & internet 12 bulan',
      volume: 12,
      satuan: 'Bulan',
      hargaSatuan: 300000,
      jumlahTotal: 3600000,
      tahap1: 1800000,
      tahap2: 1800000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600002-05',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-05',
      komponenId: 'KOMP-08',
      uraianKegiatan: 'Pemeliharaan Sarana Bermain Outdoor & Sanitasi Toilet Anak',
      spesifikasi: 'Perbaikan ayunan, papan titian & sanitasi bersih',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 5600000,
      jumlahTotal: 5600000, // 14.36% <= 20%
      tahap1: 2800000,
      tahap2: 2800000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600002-06',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-09',
      uraianKegiatan: 'Kegiatan Gizi PMT Sehat, Cuci Tangan Pakai Sabun & Pemeriksaan Kesehatan',
      spesifikasi: 'PMT lokal sehat bulanan & perlengkapan P3K',
      volume: 10,
      satuan: 'Kegiatan',
      hargaSatuan: 400000,
      jumlahTotal: 4000000,
      tahap1: 2000000,
      tahap2: 2000000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600002-07',
      npsn: '20600002',
      tahunAnggaran: 2027,
      standarId: 'STD-07',
      komponenId: 'KOMP-10',
      uraianKegiatan: 'Pembayaran Honor Pendidik PAUD Swasta (Maksimal 40% Juknis BOSP)',
      spesifikasi: 'Pendidik Non-ASN x Rp 600.000 x 20 OB (30.77% <= 40% Maks Swasta)',
      volume: 20,
      satuan: 'OB',
      hargaSatuan: 600000,
      jumlahTotal: 12000000, // 30.77% <= 40% max for Swasta!
      tahap1: 6000000,
      tahap2: 6000000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },

    // Seed RKAS items for 20600003 (KB Harapan Bangsa - Pagu Rp 30.000.000, DIAJUKAN)
    {
      id: 'RKAS-20600003-01',
      npsn: '20600003',
      tahunAnggaran: 2027,
      standarId: 'STD-02',
      komponenId: 'KOMP-02',
      uraianKegiatan: 'Pengembangan Layanan Pojok Baca & Buku Kain Balita/KB',
      spesifikasi: 'Koleksi buku cerita anak usia 3-5 tahun',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 2100000,
      jumlahTotal: 2100000, // 7% >= 5%
      tahap1: 1100000,
      tahap2: 1000000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600003-02',
      npsn: '20600003',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-03',
      uraianKegiatan: 'Pengadaan Alat Bermain Edukatif Motorik Halus & Kasar',
      spesifikasi: 'Puzzle kayu, meronce, bola sensorik & bahan bermain tematik',
      volume: 2,
      satuan: 'Semester',
      hargaSatuan: 6200000,
      jumlahTotal: 12400000,
      tahap1: 6200000,
      tahap2: 6200000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600003-03',
      npsn: '20600003',
      tahunAnggaran: 2027,
      standarId: 'STD-06',
      komponenId: 'KOMP-05',
      uraianKegiatan: 'Administrasi Satuan Pendidikan, Pendataan Dapodik & Langganan Daya',
      spesifikasi: 'Operasional administrasi KB 12 bulan',
      volume: 12,
      satuan: 'Bulan',
      hargaSatuan: 350000,
      jumlahTotal: 4200000,
      tahap1: 2100000,
      tahap2: 2100000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600003-04',
      npsn: '20600003',
      tahunAnggaran: 2027,
      standarId: 'STD-05',
      komponenId: 'KOMP-08',
      uraianKegiatan: 'Pemeliharaan Lantai Vinyl Ruang Bermain & Pagar Pengaman Anak',
      spesifikasi: 'Perbaikan matras/lantai ruang bermain aman anak',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 3500000,
      jumlahTotal: 3500000, // 11.67% <= 20%
      tahap1: 1800000,
      tahap2: 1700000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600003-05',
      npsn: '20600003',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-09',
      uraianKegiatan: 'Penyelenggaraan Kegiatan Kesehatan, Gizi PMT & Kebersihan Lingkungan',
      spesifikasi: 'PMT bergizi & sabun cuci tangan anak',
      volume: 10,
      satuan: 'Kegiatan',
      hargaSatuan: 240000,
      jumlahTotal: 2400000,
      tahap1: 1200000,
      tahap2: 1200000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600003-06',
      npsn: '20600003',
      tahunAnggaran: 2027,
      standarId: 'STD-07',
      komponenId: 'KOMP-10',
      uraianKegiatan: 'Pembayaran Honor Pendidik KB Swasta',
      spesifikasi: 'Honorarium pendidik terdaftar Dapodik (18% <= 40% Maks Swasta)',
      volume: 12,
      satuan: 'OB',
      hargaSatuan: 450000,
      jumlahTotal: 5400000, // 18% <= 40%
      tahap1: 2600000,
      tahap2: 2800000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },

    // Seed RKAS items for 20600004 (TK Negeri Mekar Jaya - PERLU_REVISI: Pojok baca currently 2.86% < 5%)
    {
      id: 'RKAS-20600004-01',
      npsn: '20600004',
      tahunAnggaran: 2027,
      standarId: 'STD-02',
      komponenId: 'KOMP-02',
      uraianKegiatan: 'Pengadaan Buku Cerita Pojok Baca (Perlu ditambah agar >= 5%)',
      spesifikasi: '20 buku bacaan anak',
      volume: 20,
      satuan: 'Eksemplar',
      hargaSatuan: 60000,
      jumlahTotal: 1200000, // Only 2.86% -> flagged by Juknis validator!
      tahap1: 1200000,
      tahap2: 0,
      statusItem: 'REVISI',
      catatanVerifikator: 'Alokasi Komponen 2 baru 2,86%. Wajib minimal 5% (Rp 2.100.000).',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600004-02',
      npsn: '20600004',
      tahunAnggaran: 2027,
      standarId: 'STD-03',
      komponenId: 'KOMP-03',
      uraianKegiatan: 'Pelaksanaan Kegiatan Pembelajaran dan Bermain Tematik',
      spesifikasi: 'APE dalam & bahan habis pakai',
      volume: 2,
      satuan: 'Semester',
      hargaSatuan: 9500000,
      jumlahTotal: 19000000,
      tahap1: 9500000,
      tahap2: 9500000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600004-03',
      npsn: '20600004',
      tahunAnggaran: 2027,
      standarId: 'STD-05',
      komponenId: 'KOMP-08',
      uraianKegiatan: 'Pemeliharaan Ringan Ruang Kelas TK',
      spesifikasi: 'Perbaikan plafon & pengecatan dinding kelas',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 6800000,
      jumlahTotal: 6800000,
      tahap1: 3400000,
      tahap2: 3400000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
    {
      id: 'RKAS-20600004-04',
      npsn: '20600004',
      tahunAnggaran: 2027,
      standarId: 'STD-07',
      komponenId: 'KOMP-10',
      uraianKegiatan: 'Honorarium Guru Non-ASN TK Negeri',
      spesifikasi: '2 orang x 12 bulan',
      volume: 24,
      satuan: 'OB',
      hargaSatuan: 600000,
      jumlahTotal: 14400000,
      tahap1: 6900000,
      tahap2: 7500000,
      statusItem: 'SESUAI',
      updatedAt: now,
    },
  ];

  // Seed BKU Transactions (Penatausahaan)
  const bkuTransactions: BkuTransaction[] = [
    {
      id: 'BKU-20600002-01',
      npsn: '20600002',
      tanggal: '2027-02-04',
      nomorBukti: 'SP2D-T1/20600002/2027',
      jenis: 'PENERIMAAN',
      tahap: 1,
      uraian: 'Penerimaan Penyaluran Dana BOP PAUD Reguler Tahap 1 (50% Pagu)',
      nominal: 19500000,
      pajakPphPpn: 0,
      penerimaToko: 'Rekening Kas Satuan Pendidikan (RKUD/Salur)',
      createdAt: now,
    },
    {
      id: 'BKU-20600002-02',
      npsn: '20600002',
      tanggal: '2027-02-18',
      nomorBukti: 'KWT-001/BOP/II/2027',
      jenis: 'PENGELUARAN',
      tahap: 1,
      rkasItemId: 'RKAS-20600002-01',
      standarId: 'STD-02',
      komponenId: 'KOMP-02',
      uraian: 'Belanja Buku Cerita Bergambar & Rak Pojok Baca Tahap 1 (SIPLah)',
      nominal: 1500000,
      pajakPphPpn: 0,
      penerimaToko: 'CV Pustaka Anak Nusantara (SIPLah)',
      createdAt: now,
    },
    {
      id: 'BKU-20600002-03',
      npsn: '20600002',
      tanggal: '2027-03-10',
      nomorBukti: 'KWT-002/BOP/III/2027',
      jenis: 'PENGELUARAN',
      tahap: 1,
      rkasItemId: 'RKAS-20600002-02',
      standarId: 'STD-03',
      komponenId: 'KOMP-03',
      uraian: 'Belanja Bahan Bermain Edukatif & Alat Pembelajaran Semester 1',
      nominal: 6500000,
      pajakPphPpn: 650000,
      penerimaToko: 'Toko Edukasi Ceria Mandiri',
      createdAt: now,
    },
    {
      id: 'BKU-20600002-04',
      npsn: '20600002',
      tanggal: '2027-04-15',
      nomorBukti: 'KWT-003/BOP/IV/2027',
      jenis: 'PENGELUARAN',
      tahap: 1,
      rkasItemId: 'RKAS-20600002-06',
      standarId: 'STD-03',
      komponenId: 'KOMP-09',
      uraian: 'Pelaksanaan Pemberian Makanan Tambahan (PMT) Bergizi & DDTK Tahap 1',
      nominal: 2000000,
      pajakPphPpn: 40000,
      penerimaToko: 'Koperasi Sehat Sejahtera',
      createdAt: now,
    },
    {
      id: 'BKU-20600002-05',
      npsn: '20600002',
      tanggal: '2027-06-05',
      nomorBukti: 'KWT-004/BOP/VI/2027',
      jenis: 'PENGELUARAN',
      tahap: 1,
      rkasItemId: 'RKAS-20600002-07',
      standarId: 'STD-07',
      komponenId: 'KOMP-10',
      uraian: 'Pembayaran Honorarium Pendidik PAUD Semester 1 (Jan–Jun)',
      nominal: 3600000,
      pajakPphPpn: 180000,
      penerimaToko: 'Pendidik Non-ASN Terdaftar Dapodik',
      createdAt: now,
    },
    {
      id: 'BKU-20600001-01',
      npsn: '20600001',
      tanggal: '2027-02-05',
      nomorBukti: 'SP2D-T1/20600001/2027',
      jenis: 'PENERIMAAN',
      tahap: 1,
      uraian: 'Penerimaan Penyaluran Dana BOP PAUD Reguler Tahap 1 (50% Pagu)',
      nominal: 24000000,
      pajakPphPpn: 0,
      penerimaToko: 'Rekening Kas TK Negeri Pembina',
      createdAt: now,
    },
  ];

  const verificationLogs: VerificationLog[] = [
    {
      id: 'LOG-001',
      npsn: '20600002',
      namaSekolah: 'TK Swasta Tunas Cendekia Tahunan',
      aksi: 'SAHKAN',
      olehId: 'admin',
      olehNama: 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)',
      olehPeran: 'admin',
      catatan: 'Seluruh 10 komponen BOP PAUD telah sesuai Juknis BOSP dan SHS Kab. Jepara. RKAS 2027 disahkan.',
      createdAt: now,
    },
    {
      id: 'LOG-003',
      npsn: '20600004',
      namaSekolah: 'TK Negeri Mekar Jaya Pecangaan',
      aksi: 'REVISI',
      olehId: 'admin',
      olehNama: 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)',
      olehPeran: 'admin',
      catatan: 'Komponen 2 (Layanan Pojok Baca) masih di bawah batas minimal 5%. Mohon diperbaiki.',
      createdAt: now,
    },
    {
      id: 'LOG-004',
      npsn: '20600001',
      namaSekolah: 'TK Negeri Pembina Jepara (20600001)',
      aksi: 'AJUKAN',
      olehId: '20600001',
      olehNama: 'TK Negeri Pembina Jepara (20600001)',
      olehPeran: 'sekolah',
      catatan: 'Pengajuan berkas RKAS BOP PAUD TA 2027 beserta SPTJM dan RAB untuk diverifikasi Dinas.',
      createdAt: now,
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'NOTIF-001',
      targetNpsnOrRole: 'ALL_DINAS',
      wilayah: 'Kec. Jepara',
      judul: 'Pengajuan Verifikasi RKAS Baru — NPSN 20600001',
      pesan: 'TK Negeri Pembina Jepara (20600001) telah mengajukan RKAS BOP PAUD senilai Rp 48.000.000 untuk diverifikasi.',
      tipe: 'INFO',
      linkTab: 'verifikasi',
      npsnTerkait: '20600001',
      dibacaOleh: [],
      createdAt: now,
    },
    {
      id: 'NOTIF-002',
      targetNpsnOrRole: 'ALL_DINAS',
      judul: 'Pengajuan Verifikasi RKAS — KB Harapan Bangsa (20600003)',
      pesan: 'Berkas RKAS NPSN 20600003 telah diajukan dan siap diperiksa oleh Verifikator Admin Dinas.',
      tipe: 'WARNING',
      linkTab: 'verifikasi',
      npsnTerkait: '20600003',
      dibacaOleh: [],
      createdAt: now,
    },
    {
      id: 'NOTIF-003',
      targetNpsnOrRole: '20600004',
      judul: 'Catatan Revisi Berkas RKAS dari Verifikator Admin Dinas',
      pesan: 'RKAS Anda dikembalikan untuk revisi: Alokasi Layanan Pojok Baca wajib minimal 5% dari pagu.',
      tipe: 'ALERT',
      linkTab: 'rkas',
      npsnTerkait: '20600004',
      dibacaOleh: [],
      createdAt: now,
    },
    {
      id: 'NOTIF-004',
      targetNpsnOrRole: '20600002',
      judul: 'RKAS BOP PAUD TA 2027 Resmi Disahkan Dinas',
      pesan: 'RKAS satuan pendidikan Anda telah disahkan oleh Verifikator Admin Dinas. Silakan lanjutkan penatausahaan BKU.',
      tipe: 'SUCCESS',
      linkTab: 'bku',
      npsnTerkait: '20600002',
      dibacaOleh: [],
      createdAt: now,
    },
  ];

  return {
    tahunAnggaran: 2027,
    standarSchemaVersion: 2,
    accounts: Array.from(accountsMap.values()),
    shsItems: [],
    rkasItems,
    verificationLogs,
    bkuTransactions,
    notifications,
    sheetConfig: {
      spreadsheetId: '',
      spreadsheetTitle: '',
      spreadsheetUrl: '',
      appsScriptWebAppUrl: '',
      appSheetAppId: '',
      autoSyncAppsScript: true,
      autoSyncGoogleSheets: false,
      lastSyncedAt: null,
      lastSyncedBy: null,
    },
  };
}

function migrateDatabaseState(rawState: any): { state: AppDatabaseState; changed: boolean } {
  let changed = false;

  // Remove legacy multi-level demo accounts if present
  const legacyIds = new Set(['verifikator_pusat', 'verifikator_utara', 'kabid_paud']);
  const rawAccounts: any[] = Array.isArray(rawState.accounts) ? rawState.accounts : [];
  const nextAccounts: AccountProfile[] = [];

  for (const acc of rawAccounts) {
    if (legacyIds.has(acc.id)) {
      changed = true;
      continue;
    }
    const nextAcc = { ...acc };
    if (nextAcc.peran !== 'sekolah') {
      if (nextAcc.peran !== 'admin') {
        nextAcc.peran = 'admin';
        changed = true;
      }
      if (nextAcc.id === 'admin' && !nextAcc.nama.includes('Verifikator')) {
        nextAcc.nama = 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)';
        nextAcc.wilayah = 'Kabupaten Jepara';
        changed = true;
      }
    } else {
      if (nextAcc.rkasStatus === 'TERVERIFIKASI_TEKNIS') {
        nextAcc.rkasStatus = 'DIAJUKAN';
        changed = true;
      }
      if (nextAcc.wilayah === 'Wilayah Pusat (20600001)') {
        nextAcc.wilayah = 'Kec. Jepara';
        changed = true;
      } else if (nextAcc.wilayah === 'Wilayah Utara') {
        nextAcc.wilayah = 'Kec. Tahunan';
        changed = true;
      }
      if (!nextAcc.tempatTtd) {
        nextAcc.tempatTtd = 'Jepara';
        changed = true;
      }
      if (!nextAcc.skemaBopDefault) {
        nextAcc.skemaBopDefault = 'REGULER';
        if (nextAcc.id === '20600001' && nextAcc.rkasStatus === 'DIAJUKAN') {
          nextAcc.rkasStatus = 'DRAFT';
        }
        changed = true;
      }
      if (
        nextAcc.id === '20600002' &&
        nextAcc.catatanDinas?.includes('18.5%')
      ) {
        nextAcc.catatanDinas =
          'RKAS 2027 telah memenuhi Juknis BOSP Permendikdasmen No. 8 Tahun 2026 & SHS Kab. Jepara (Pojok Baca 7.7%, Honor Swasta 30.8% <= 40%). Disahkan.';
        changed = true;
      }
      if (
        nextAcc.id === '20600004' &&
        nextAcc.catatanDinas ===
          'Mohon sesuaikan alokasi Layanan Pojok Baca minimal 5% dari total pagu sesuai Juknis BOSP.'
      ) {
        nextAcc.catatanDinas =
          'Mohon sesuaikan alokasi Layanan Pojok Baca minimal 5% serta batas Honorarium Satuan Negeri maksimal 20% dari pagu sesuai Permendikdasmen No. 8 Tahun 2026.';
        changed = true;
      }
    }
    nextAccounts.push(nextAcc as AccountProfile);
  }

  const needsStandarV2Migration = rawState.standarSchemaVersion !== 2;
  const komponenDefaultStandarMap = new Map(
    KOMPONEN_BOP_10.map((k) => [k.id, k.defaultStandarId])
  );

  // SHS catalog is managed dynamically via Google Sheets (Referensi_SHS_Jepara tab) & Admin UI
  const nextShs: ShsJeparaItem[] = (
    Array.isArray(rawState.shsItems) ? rawState.shsItems : []
  ).map((s: any) => {
    const updatedShs = { ...s };
    if (needsStandarV2Migration || s.standarId === 'STD-01') {
      const targetStandar =
        komponenDefaultStandarMap.get(s.komponenId) || 'STD-03';
      if (updatedShs.standarId !== targetStandar) {
        updatedShs.standarId = targetStandar;
        changed = true;
      }
    }
    return updatedShs as ShsJeparaItem;
  });

  // Migrate initial seeded RKAS items for Permendikdasmen No. 8 Tahun 2026 & 02..08 Standar
  const shsMap = new Map(nextShs.map((s) => [s.id, s]));
  const nextRkasItems: RkasItem[] = (Array.isArray(rawState.rkasItems) ? rawState.rkasItems : []).map(
    (rawItem: any) => {
      let item = { ...rawItem };

      if (needsStandarV2Migration || item.standarId === 'STD-01') {
        const linkedShs = item.shsId ? shsMap.get(item.shsId) : undefined;
        const targetStandar =
          linkedShs?.standarId ||
          komponenDefaultStandarMap.get(item.komponenId) ||
          'STD-03';
        if (item.standarId !== targetStandar) {
          item.standarId = targetStandar;
          changed = true;
        }
      }

      if (!item.skemaBop) {
        item.skemaBop = 'REGULER';
        item.bulanPelaksanaan = item.tahap2 === 0 ? 'Januari - Juni' : item.tahap1 === 0 ? 'Juli - Desember' : 'Januari - Desember';
        changed = true;
      }

      // Leave Sisa Pagu Rp 5.040.000 on default school 20600001 so user can immediately add new RKAS items
      if (item.id === 'RKAS-20600001-03' && (item.jumlahTotal === 7800000 || item.jumlahTotal === 12600000)) {
        item = {
          ...item,
          volume: 12,
          hargaSatuan: 630000,
          jumlahTotal: 7560000,
          tahap1: 3780000,
          tahap2: 3780000,
        };
        changed = true;
      } else if (item.id === 'RKAS-20600001-10' && item.jumlahTotal === 14400000) {
        item = {
          ...item,
          uraianKegiatan: 'Pembayaran Honorarium Pendidik Non-ASN Terdaftar Dapodik (Satuan Negeri)',
          spesifikasi: 'Pendidik Non-ASN x Rp 600.000 x 16 OB (20% Pagu <= 20% Maks Satuan Negeri)',
          volume: 16,
          hargaSatuan: 600000,
          jumlahTotal: 9600000,
          tahap1: 4800000,
          tahap2: 4800000,
        };
        changed = true;
      } else if (item.id === 'RKAS-20600002-02' && item.jumlahTotal === 13000000) {
        item = {
          ...item,
          volume: 2,
          hargaSatuan: 4100000,
          jumlahTotal: 8200000,
          tahap1: 4100000,
          tahap2: 4100000,
        };
        changed = true;
      } else if (item.id === 'RKAS-20600002-07' && item.jumlahTotal === 7200000) {
        item = {
          ...item,
          uraianKegiatan: 'Pembayaran Honor Pendidik PAUD Swasta (Maksimal 40% Juknis BOSP)',
          spesifikasi: 'Pendidik Non-ASN x Rp 600.000 x 20 OB (30.77% <= 40% Maks Swasta)',
          volume: 20,
          hargaSatuan: 600000,
          jumlahTotal: 12000000,
          tahap1: 6000000,
          tahap2: 6000000,
        };
        changed = true;
      } else if (item.id === 'RKAS-20600003-06' && String(item.spesifikasi || '').includes('<= 20%')) {
        item = {
          ...item,
          spesifikasi: 'Honorarium pendidik terdaftar Dapodik (18% <= 40% Maks Swasta)',
        };
        changed = true;
      }

      return item as RkasItem;
    }
  );

  const nextLogs: VerificationLog[] = (
    Array.isArray(rawState.verificationLogs) ? rawState.verificationLogs : []
  ).map((log: any) => {
    let updated = false;
    const nextLog = { ...log };
    if (nextLog.olehPeran !== 'sekolah' && nextLog.olehPeran !== 'admin') {
      nextLog.olehPeran = 'admin';
      updated = true;
    }
    if (nextLog.aksi === 'VERIFIKASI_TEKNIS') {
      nextLog.aksi = 'AJUKAN';
      updated = true;
    }
    if (updated) changed = true;
    return nextLog as VerificationLog;
  });

  const nextNotifs: AppNotification[] = (
    Array.isArray(rawState.notifications) ? rawState.notifications : []
  ).map((n: any) => {
    if (
      n.targetNpsnOrRole === 'validator_kabid' ||
      n.targetNpsnOrRole === 'verifikator_wilayah' ||
      n.targetNpsnOrRole === 'super_admin'
    ) {
      changed = true;
      return { ...n, targetNpsnOrRole: 'ALL_DINAS' };
    }
    return n as AppNotification;
  });

  const rkasMap = new Map(nextRkasItems.map((r) => [r.id, r]));
  const nextBkuTransactions: BkuTransaction[] = (
    Array.isArray(rawState.bkuTransactions) ? rawState.bkuTransactions : []
  ).map((rawTx: any) => {
    if (
      rawTx.jenis === 'PENGELUARAN' &&
      (needsStandarV2Migration || rawTx.standarId === 'STD-01')
    ) {
      const linkedRkas = rawTx.rkasItemId ? rkasMap.get(rawTx.rkasItemId) : undefined;
      const targetStandar =
        linkedRkas?.standarId ||
        (rawTx.komponenId ? komponenDefaultStandarMap.get(rawTx.komponenId) : undefined) ||
        'STD-03';
      if (rawTx.standarId !== targetStandar) {
        changed = true;
        return { ...rawTx, standarId: targetStandar } as BkuTransaction;
      }
    }
    return rawTx as BkuTransaction;
  });

  if (needsStandarV2Migration) {
    changed = true;
  }

  return {
    state: {
      tahunAnggaran: rawState.tahunAnggaran || 2027,
      standarSchemaVersion: 2,
      accounts: nextAccounts,
      shsItems: nextShs,
      rkasItems: nextRkasItems,
      verificationLogs: nextLogs,
      bkuTransactions: nextBkuTransactions,
      notifications: nextNotifs,
      sheetConfig: rawState.sheetConfig || {
        spreadsheetId: '',
        spreadsheetTitle: '',
        spreadsheetUrl: '',
        appsScriptWebAppUrl: '',
        appSheetAppId: '',
        lastSyncedAt: null,
        lastSyncedBy: null,
      },
    },
    changed,
  };
}

function loadDb(): AppDatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = migrateDatabaseState(buildInitialDatabase()).state;
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const { state, changed } = migrateDatabaseState(parsed);
    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    }
    return state;
  } catch {
    const initial = migrateDatabaseState(buildInitialDatabase()).state;
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

let db: AppDatabaseState = loadDb();
let appsScriptSyncTimer: ReturnType<typeof setTimeout> | null = null;

async function pushStateToAppsScriptUrl(targetUrl: string): Promise<{ ok: boolean; message?: string }> {
  const expectedKey = process.env.BOP_WEBHOOK_KEY || `bop-paud-sync-${db.tahunAnggaran}`;
  const res = await fetch(targetUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      apiKey: expectedKey,
      action: 'SYNC_ALL',
      state: {
        tahunAnggaran: db.tahunAnggaran,
        accounts: db.accounts,
        rkasItems: db.rkasItems,
        verificationLogs: db.verificationLogs,
        bkuTransactions: db.bkuTransactions,
        shsItems: db.shsItems,
      },
    }),
  });
  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Apps Script Web App merespons HTTP ${res.status}`);
    }
  }
  if (parsed && parsed.ok === false) {
    throw new Error(parsed.error || 'Gagal menyinkronkan ke Google Apps Script.');
  }
  return { ok: true, message: parsed.message || 'Sinkronisasi ke Google Apps Script berhasil.' };
}

function saveDb(skipAutoAppsScript = false) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');

  if (
    !skipAutoAppsScript &&
    db.sheetConfig.appsScriptWebAppUrl &&
    db.sheetConfig.autoSyncAppsScript !== false
  ) {
    const targetUrl = db.sheetConfig.appsScriptWebAppUrl;
    if (appsScriptSyncTimer) clearTimeout(appsScriptSyncTimer);
    appsScriptSyncTimer = setTimeout(() => {
      pushStateToAppsScriptUrl(targetUrl)
        .then(() => {
          db.sheetConfig.lastSyncedAt = new Date().toISOString();
          db.sheetConfig.lastSyncedBy = 'Auto-Sync Apps Script';
          fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        })
        .catch(() => {
          // non-blocking background sync
        });
    }, 800);
  }
}

function sanitizeStateForSession(session: SessionInfo): AppDatabaseState {
  if (session.peran === 'sekolah') {
    const myAccount = db.accounts
      .filter((a) => a.id === session.userId)
      .map(({ kataSandi: _pw, ...rest }) => rest as AccountProfile);
    const myRkas = db.rkasItems.filter((i) => i.npsn === session.userId);
    const myLogs = db.verificationLogs.filter((l) => l.npsn === session.userId);
    const myBku = db.bkuTransactions.filter((t) => t.npsn === session.userId);
    const myNotifs = db.notifications.filter(
      (n) => n.targetNpsnOrRole === session.userId
    );
    return {
      ...db,
      accounts: myAccount,
      shsItems: db.shsItems,
      rkasItems: myRkas,
      verificationLogs: myLogs,
      bkuTransactions: myBku,
      notifications: myNotifs,
    };
  }

  // Dinas 1-Level Verifikator Admin ('admin')
  const filteredNotifs = db.notifications.filter(
    (n) =>
      n.targetNpsnOrRole === 'ALL_DINAS' ||
      n.targetNpsnOrRole === 'admin' ||
      n.targetNpsnOrRole === session.userId
  );

  return {
    ...db,
    accounts: db.accounts,
    shsItems: db.shsItems,
    rkasItems: db.rkasItems,
    verificationLogs: db.verificationLogs,
    bkuTransactions: db.bkuTransactions,
    notifications: filteredNotifs,
  };
}

function getSessionFromReq(req: express.Request): SessionInfo | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return sessions.get(token) || null;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json({ limit: '5mb' }));

  interface WsClientMeta {
    ws: WebSocket;
    session: SessionInfo | null;
  }

  const clients = new Set<WsClientMeta>();

  function broadcastPresence() {
    const activeUsers = Array.from(clients)
      .filter((c) => c.session !== null && c.ws.readyState === WebSocket.OPEN)
      .map((c) => ({
        userId: c.session!.userId,
        nama: c.session!.nama,
        peran: c.session!.peran,
      }));
    const uniqueMap = new Map(activeUsers.map((u) => [u.userId, u]));
    const payload = JSON.stringify({
      type: 'presence:update',
      onlineUsers: Array.from(uniqueMap.values()),
    });
    for (const c of clients) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(payload);
      }
    }
  }

  function broadcastStateAndNotification(newNotif?: AppNotification) {
    for (const c of clients) {
      if (c.ws.readyState === WebSocket.OPEN && c.session) {
        const scopedState = sanitizeStateForSession(c.session);
        c.ws.send(
          JSON.stringify({
            type: 'state:updated',
            state: scopedState,
          })
        );
        if (newNotif) {
          const isForThisClient = scopedState.notifications.some(
            (n) => n.id === newNotif.id
          );
          if (isForThisClient) {
            c.ws.send(
              JSON.stringify({
                type: 'notification:created',
                notification: newNotif,
              })
            );
          }
        }
      }
    }
  }

  function pushNotification(notif: Omit<AppNotification, 'id' | 'dibacaOleh' | 'createdAt'>): AppNotification {
    const full: AppNotification = {
      ...notif,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dibacaOleh: [],
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(full);
    if (db.notifications.length > 200) {
      db.notifications = db.notifications.slice(0, 200);
    }
    return full;
  }

  wss.on('connection', (ws) => {
    const meta: WsClientMeta = { ws, session: null };
    clients.add(meta);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'auth' && typeof msg.token === 'string') {
          const sess = sessions.get(msg.token) || null;
          meta.session = sess;
          if (sess) {
            ws.send(
              JSON.stringify({
                type: 'state:init',
                state: sanitizeStateForSession(sess),
              })
            );
            broadcastPresence();
          }
        }
      } catch {
        // ignore malformed ws message
      }
    });

    ws.on('close', () => {
      clients.delete(meta);
      broadcastPresence();
    });
  });

  // --- AUTH ENDPOINTS ---
  app.post('/api/auth/login', (req, res) => {
    const { id, password } = req.body || {};
    const cleanId = String(id || '').trim();
    const cleanPw = String(password || '').trim();

    const account = db.accounts.find(
      (a) => a.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (!account) {
      res.status(401).json({ error: 'NPSN atau ID Pengguna tidak ditemukan.' });
      return;
    }

    // Support exact password or CSV admin123 fallback for initial admin row
    const validPw =
      account.kataSandi === cleanPw ||
      (account.id === 'admin' && (cleanPw === 'admin' || cleanPw === 'admin123'));

    if (!validPw) {
      res.status(401).json({ error: 'Kata sandi tidak sesuai. Periksa kembali kredensial Anda.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const session: SessionInfo = {
      token,
      userId: account.id,
      nama: account.nama,
      peran: account.peran,
      wilayah: account.wilayah,
      createdAt: Date.now(),
    };
    sessions.set(token, session);

    const { kataSandi: _pw, ...safeProfile } = account;
    res.json({
      token,
      user: safeProfile,
      state: sanitizeStateForSession(session),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const sess = getSessionFromReq(req);
    if (sess) {
      sessions.delete(sess.token);
      broadcastPresence();
    }
    res.json({ ok: true });
  });

  app.get('/api/state', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Sesi berakhir, silakan masuk kembali.' });
      return;
    }
    const account = db.accounts.find((a) => a.id === sess.userId);
    const { kataSandi: _pw, ...safeProfile } = account || {};
    res.json({
      user: safeProfile,
      state: sanitizeStateForSession(sess),
    });
  });

  // --- SAVE INSTITUTION SIGNATORIES FOR RKAS VERIFICATION PDF ---
  app.post('/api/schools/signatories', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const targetNpsn =
      sess.peran === 'sekolah' ? sess.userId : String(body.npsn || '');
    const school = db.accounts.find(
      (a) => a.id === targetNpsn && a.peran === 'sekolah'
    );

    if (!school) {
      res.status(404).json({ error: 'Data lembaga/sekolah tidak ditemukan.' });
      return;
    }

    if (typeof body.komiteSekolah === 'string') {
      school.komiteSekolah = body.komiteSekolah.trim();
    }
    if (typeof body.kepalaSekolah === 'string') {
      school.kepalaSekolah = body.kepalaSekolah.trim();
    }
    if (typeof body.nipKepalaSekolah === 'string') {
      school.nipKepalaSekolah = body.nipKepalaSekolah.trim();
    }
    if (typeof body.bendahara === 'string') {
      school.bendahara = body.bendahara.trim();
    }
    if (typeof body.nipBendahara === 'string') {
      school.nipBendahara = body.nipBendahara.trim();
    }
    if (typeof body.tempatTtd === 'string') {
      school.tempatTtd = body.tempatTtd.trim();
    }
    if (typeof body.kepalaDinas === 'string') {
      school.kepalaDinas = body.kepalaDinas.trim();
    }
    if (typeof body.pangkatKepalaDinas === 'string') {
      school.pangkatKepalaDinas = body.pangkatKepalaDinas.trim();
    }
    if (typeof body.nipKepalaDinas === 'string') {
      school.nipKepalaDinas = body.nipKepalaDinas.trim();
    }

    school.updatedAt = new Date().toISOString();
    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- UPDATE SCHOOL PAGU & DAPODIK PARAMETERS (PERMENDIKDASMEN NO. 8 TAHUN 2026) ---
  app.post('/api/schools/pagu', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const targetNpsn =
      sess.peran === 'sekolah' ? sess.userId : String(body.npsn || '');
    const school = db.accounts.find(
      (a) => a.id === targetNpsn && a.peran === 'sekolah'
    );

    if (!school) {
      res.status(404).json({ error: 'Data satuan pendidikan tidak ditemukan.' });
      return;
    }

    if (
      sess.peran === 'sekolah' &&
      (school.rkasStatus === 'DIAJUKAN' || school.rkasStatus === 'DISAHKAN')
    ) {
      res.status(400).json({
        error: 'Buka kunci / perubahan RKAS terlebih dahulu sebelum memperbarui parameter Pagu Dapodik.',
      });
      return;
    }

    const jumlahSiswa = Math.max(1, Number(body.jumlahSiswa) || school.jumlahSiswa || 1);
    const satuanBiaya = Math.max(100000, Number(body.satuanBiaya) || school.satuanBiaya || 600000);
    const rawSkema = String(body.skemaBopDefault || school.skemaBopDefault || 'REGULER').toUpperCase();
    const skemaBopDefault: BopScheme =
      rawSkema === 'KINERJA' ? 'KINERJA' : rawSkema === 'AFIRMASI' ? 'AFIRMASI' : 'REGULER';

    school.jumlahSiswa = jumlahSiswa;
    school.satuanBiaya = satuanBiaya;
    school.skemaBopDefault = skemaBopDefault;
    school.paguTahunan =
      body.paguTahunan && Number(body.paguTahunan) > 0
        ? Number(body.paguTahunan)
        : jumlahSiswa * satuanBiaya;
    school.updatedAt = new Date().toISOString();

    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- REOPEN RKAS FOR INPUT / AMENDMENT (PERGESERAN / PERUBAHAN RKAS PERMENDIKDASMEN 8/2026) ---
  app.post('/api/rkas/reopen', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const targetNpsn =
      sess.peran === 'sekolah' ? sess.userId : String(req.body?.npsn || '');
    const school = db.accounts.find(
      (a) => a.id === targetNpsn && a.peran === 'sekolah'
    );
    if (!school) {
      res.status(404).json({ error: 'Satuan pendidikan tidak ditemukan.' });
      return;
    }

    const prevStatus = school.rkasStatus || 'DRAFT';
    school.rkasStatus = 'DRAFT';
    school.updatedAt = new Date().toISOString();

    db.verificationLogs.unshift({
      id: `LOG-${Date.now()}`,
      npsn: school.id,
      namaSekolah: school.nama,
      aksi: 'AJUKAN',
      olehId: sess.userId,
      olehNama: sess.nama,
      olehPeran: sess.peran,
      catatan:
        prevStatus === 'DISAHKAN'
          ? 'Membuka mode Perubahan / Pergeseran RKAS sesuai Permendikdasmen No. 8 Tahun 2026.'
          : 'Menarik pengajuan RKAS ke status Draft untuk penambahan/penyesuaian kegiatan.',
      createdAt: school.updatedAt,
    });

    const notif = pushNotification({
      targetNpsnOrRole: 'ALL_DINAS',
      wilayah: school.wilayah,
      judul: `Perubahan / Penyesuaian RKAS Dibuka — ${school.nama}`,
      pesan: `${school.nama} (${school.id}) membuka kembali mode penyusunan RKAS dari status ${prevStatus} sesuai Permendikdasmen No. 8 Tahun 2026.`,
      tipe: 'INFO',
      linkTab: 'verifikasi',
      npsnTerkait: school.id,
    });

    saveDb();
    broadcastStateAndNotification(notif);
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- RKAS PLANNING CRUD ---
  app.post('/api/rkas/items', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const targetNpsn = sess.peran === 'sekolah' ? sess.userId : String(body.npsn || '');
    const school = db.accounts.find((a) => a.id === targetNpsn && a.peran === 'sekolah');

    if (!school) {
      res.status(404).json({ error: 'Data satuan pendidikan tidak ditemukan.' });
      return;
    }

    if (
      sess.peran === 'sekolah' &&
      (school.rkasStatus === 'DIAJUKAN' || school.rkasStatus === 'DISAHKAN')
    ) {
      res.status(400).json({
        error: 'RKAS sedang terkunci. Klik tombol "Buka Kunci / Perubahan RKAS" terlebih dahulu untuk menambahkan kegiatan baru.',
      });
      return;
    }

    const uraianKegiatan = String(body.uraianKegiatan || '').trim();
    const spesifikasi = String(body.spesifikasi || '').trim();

    const laranganError = checkLaranganBosp2026(uraianKegiatan, spesifikasi);
    if (laranganError) {
      res.status(400).json({ error: laranganError });
      return;
    }

    const volume = Number(body.volume) || 0;
    const hargaSatuan = Number(body.hargaSatuan) || 0;
    const jumlahTotal = volume * hargaSatuan;
    const tahap1 = Number(body.tahap1) || 0;
    const tahap2 = Number(body.tahap2) || 0;

    if (volume <= 0 || hargaSatuan <= 0) {
      res.status(400).json({ error: 'Volume dan Harga Satuan wajib lebih besar dari 0.' });
      return;
    }

    // Validate against Standar Harga Satuan (SHS) Kabupaten Jepara if linked
    const shsId = body.shsId ? String(body.shsId).trim() : undefined;
    const shsRef = shsId ? db.shsItems.find((s) => s.id === shsId) : undefined;
    if (shsRef && hargaSatuan > shsRef.hargaTertinggi) {
      res.status(400).json({
        error: `Harga satuan Rp ${hargaSatuan.toLocaleString('id-ID')} melampaui Batas Tertinggi Standar Harga Satuan (SHS) Kabupaten Jepara untuk "${shsRef.namaBarangJasa}" sebesar Rp ${shsRef.hargaTertinggi.toLocaleString('id-ID')}.`,
      });
      return;
    }

    if (Math.abs(tahap1 + tahap2 - jumlahTotal) > 1) {
      res.status(400).json({
        error: 'Jumlah alokasi Tahap 1 + Tahap 2 harus sama persis dengan Jumlah Total kegiatan.',
      });
      return;
    }

    const rawSkema = String(body.skemaBop || school.skemaBopDefault || 'REGULER').toUpperCase();
    const skemaBop: BopScheme =
      rawSkema === 'KINERJA' ? 'KINERJA' : rawSkema === 'AFIRMASI' ? 'AFIRMASI' : 'REGULER';
    const bulanPelaksanaan = String(
      body.bulanPelaksanaan ||
        (tahap2 === 0
          ? 'Januari - Juni'
          : tahap1 === 0
          ? 'Juli - Desember'
          : 'Januari - Desember')
    ).trim();

    const now = new Date().toISOString();
    const existingIdx = body.id
      ? db.rkasItems.findIndex((i) => i.id === body.id && i.npsn === targetNpsn)
      : -1;

    const kodeShs = shsRef
      ? shsRef.kodeBarang
      : body.kodeShs
      ? String(body.kodeShs).trim()
      : undefined;
    const batasHargaShs = shsRef
      ? shsRef.hargaTertinggi
      : body.batasHargaShs
      ? Number(body.batasHargaShs)
      : undefined;

    if (existingIdx >= 0) {
      db.rkasItems[existingIdx] = {
        ...db.rkasItems[existingIdx],
        skemaBop,
        bulanPelaksanaan,
        standarId: String(body.standarId),
        komponenId: String(body.komponenId),
        shsId: shsRef?.id || shsId,
        kodeShs,
        batasHargaShs,
        uraianKegiatan,
        spesifikasi,
        volume,
        satuan: String(body.satuan || 'Paket').trim(),
        hargaSatuan,
        jumlahTotal,
        tahap1,
        tahap2,
        statusItem: 'MENUNGGU',
        updatedAt: now,
      };
    } else {
      const newItem: RkasItem = {
        id: `RKAS-${targetNpsn}-${Date.now().toString().slice(-5)}`,
        npsn: targetNpsn,
        tahunAnggaran: db.tahunAnggaran,
        skemaBop,
        bulanPelaksanaan,
        standarId: String(body.standarId),
        komponenId: String(body.komponenId),
        shsId: shsRef?.id || shsId,
        kodeShs,
        batasHargaShs,
        uraianKegiatan,
        spesifikasi,
        volume,
        satuan: String(body.satuan || 'Paket').trim(),
        hargaSatuan,
        jumlahTotal,
        tahap1,
        tahap2,
        statusItem: 'MENUNGGU',
        updatedAt: now,
      };
      db.rkasItems.push(newItem);
    }

    school.updatedAt = now;
    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.delete('/api/rkas/items/:itemId', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const item = db.rkasItems.find((i) => i.id === req.params.itemId);
    if (!item) {
      res.status(404).json({ error: 'Rincian RKAS tidak ditemukan.' });
      return;
    }

    if (sess.peran === 'sekolah' && item.npsn !== sess.userId) {
      res.status(403).json({ error: 'Tidak memiliki akses untuk menghapus item sekolah lain.' });
      return;
    }

    const school = db.accounts.find((a) => a.id === item.npsn);
    if (
      sess.peran === 'sekolah' &&
      school &&
      (school.rkasStatus === 'DIAJUKAN' || school.rkasStatus === 'DISAHKAN')
    ) {
      res.status(400).json({ error: 'RKAS terkunci karena sedang diverifikasi / telah disahkan.' });
      return;
    }

    db.rkasItems = db.rkasItems.filter((i) => i.id !== req.params.itemId);
    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- STANDAR HARGA SATUAN (SHS) KABUPATEN JEPARA CATALOG CRUD ---
  app.post('/api/shs', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({
        error: 'Hanya Verifikator Admin Dinas yang dapat mengelola katalog Standar Harga Satuan Kabupaten Jepara.',
      });
      return;
    }

    const body = req.body || {};
    const namaBarangJasa = String(body.namaBarangJasa || '').trim();
    const kodeBarang = String(body.kodeBarang || '').trim();
    const hargaTertinggi = Number(body.hargaTertinggi) || 0;
    const satuan = String(body.satuan || 'Paket').trim();
    const spesifikasi = String(body.spesifikasi || '-').trim();
    const komponenId = String(body.komponenId || 'KOMP-03');
    const standarId = String(body.standarId || 'STD-03');
    const rawKat = String(body.kategori || 'SSH').toUpperCase();
    const kategori: ShsKategori =
      rawKat === 'SBU' ? 'SBU' : rawKat === 'HSPK' ? 'HSPK' : 'SSH';

    if (!namaBarangJasa || !kodeBarang || hargaTertinggi <= 0) {
      res.status(400).json({
        error: 'Kode barang, nama barang/jasa, dan harga tertinggi (> Rp 0) wajib diisi.',
      });
      return;
    }

    const id = body.id
      ? String(body.id).trim()
      : `SHS-JPR-${Date.now().toString().slice(-5)}`;

    const shsItem: ShsJeparaItem = {
      id,
      kodeBarang,
      kategori,
      namaBarangJasa,
      spesifikasi,
      satuan,
      hargaTertinggi,
      komponenId,
      standarId,
    };

    const existingIdx = db.shsItems.findIndex((s) => s.id === id);
    if (existingIdx >= 0) {
      db.shsItems[existingIdx] = shsItem;
    } else {
      db.shsItems.unshift(shsItem);
    }

    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.delete('/api/shs/:shsId', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({
        error: 'Hanya Verifikator Admin Dinas yang dapat menghapus referensi SHS.',
      });
      return;
    }

    db.shsItems = db.shsItems.filter((s) => s.id !== req.params.shsId);
    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- SUBMIT RKAS FOR VERIFICATION (JUKNIS BOSP VALIDATED) ---
  app.post('/api/rkas/submit', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const npsn = sess.peran === 'sekolah' ? sess.userId : String(req.body?.npsn || '');
    const school = db.accounts.find((a) => a.id === npsn && a.peran === 'sekolah');
    if (!school) {
      res.status(404).json({ error: 'Data sekolah tidak ditemukan.' });
      return;
    }

    const validation = validateRkasJuknis(school, db.rkasItems);
    if (!validation.siapDiajukan) {
      const failedRules = validation.checks
        .filter((c) => !c.lulus)
        .map((c) => `${c.judul}: ${c.pesanStatus}`)
        .join('; ');
      res.status(400).json({
        error: `Pengajuan ditolak sistem karena belum memenuhi ketentuan Juknis BOSP: ${failedRules}`,
      });
      return;
    }

    const { berkasSptjmUrl, berkasRabUrl, catatanPengajuan } = req.body || {};
    if (berkasSptjmUrl) school.berkasSptjmUrl = String(berkasSptjmUrl).trim();
    if (berkasRabUrl) school.berkasRabUrl = String(berkasRabUrl).trim();

    school.rkasStatus = 'DIAJUKAN';
    school.updatedAt = new Date().toISOString();

    db.verificationLogs.unshift({
      id: `LOG-${Date.now()}`,
      npsn: school.id,
      namaSekolah: school.nama,
      aksi: 'AJUKAN',
      olehId: sess.userId,
      olehNama: sess.nama,
      olehPeran: sess.peran,
      catatan:
        String(catatanPengajuan || '').trim() ||
        `Pengajuan verifikasi RKAS BOP PAUD TA ${db.tahunAnggaran} sebesar Rp ${validation.totalRencana.toLocaleString('id-ID')}.`,
      createdAt: school.updatedAt,
    });

    const notif = pushNotification({
      targetNpsnOrRole: 'ALL_DINAS',
      wilayah: school.wilayah,
      judul: `Berkas RKAS Masuk — ${school.nama} (${school.id})`,
      pesan: `${school.nama} mengajukan verifikasi RKAS senilai Rp ${validation.totalRencana.toLocaleString('id-ID')} (telah lolos uji otomatis Juknis BOSP).`,
      tipe: 'INFO',
      linkTab: 'verifikasi',
      npsnTerkait: school.id,
    });

    saveDb();
    broadcastStateAndNotification(notif);
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- DINAS TIERED RKAS VERIFICATION ---
  app.post('/api/rkas/verify-item', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran === 'sekolah') {
      res.status(403).json({ error: 'Hanya Verifikator/Admin Dinas yang berwenang memverifikasi item.' });
      return;
    }

    const { itemId, statusItem, catatanVerifikator } = req.body || {};
    const item = db.rkasItems.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ error: 'Rincian RKAS tidak ditemukan.' });
      return;
    }

    item.statusItem = statusItem === 'REVISI' ? 'REVISI' : 'SESUAI';
    item.catatanVerifikator = String(catatanVerifikator || '').trim();
    item.updatedAt = new Date().toISOString();

    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.post('/api/rkas/verify', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({ error: 'Akses ditolak. Hanya Verifikator Admin Dinas yang berwenang.' });
      return;
    }

    const { npsn, keputusan, catatan } = req.body || {};
    const school = db.accounts.find((a) => a.id === npsn && a.peran === 'sekolah');
    if (!school) {
      res.status(404).json({ error: 'Sekolah tidak ditemukan.' });
      return;
    }

    // Re-check Juknis BOSP before approving
    if (keputusan === 'SAHKAN') {
      const val = validateRkasJuknis(school, db.rkasItems);
      if (!val.semuaAturanLulus) {
        res.status(400).json({
          error: 'RKAS belum memenuhi seluruh batas persentase Juknis BOSP. Kembalikan untuk revisi terlebih dahulu.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const cleanCatatan = String(catatan || '').trim();

    if (keputusan === 'REVISI') {
      school.rkasStatus = 'PERLU_REVISI';
    } else if (keputusan === 'SAHKAN') {
      school.rkasStatus = 'DISAHKAN';
      db.rkasItems
        .filter((i) => i.npsn === school.id)
        .forEach((i) => {
          i.statusItem = 'SESUAI';
        });
    } else {
      res.status(400).json({ error: 'Keputusan verifikasi tidak valid.' });
      return;
    }

    school.catatanDinas = cleanCatatan;
    school.updatedAt = now;

    db.verificationLogs.unshift({
      id: `LOG-${Date.now()}`,
      npsn: school.id,
      namaSekolah: school.nama,
      aksi: keputusan === 'SAHKAN' ? 'SAHKAN' : 'REVISI',
      olehId: sess.userId,
      olehNama: sess.nama,
      olehPeran: sess.peran,
      catatan: cleanCatatan || `Status RKAS diperbarui menjadi ${school.rkasStatus}`,
      createdAt: now,
    });

    // Notify target school automatically in real-time
    const schoolNotif = pushNotification({
      targetNpsnOrRole: school.id,
      judul:
        keputusan === 'SAHKAN'
          ? 'RKAS BOP PAUD Resmi Disahkan Verifikator Admin Dinas'
          : 'Permintaan Revisi Berkas RKAS dari Verifikator Admin Dinas',
      pesan:
        cleanCatatan ||
        (keputusan === 'SAHKAN'
          ? 'RKAS Anda telah resmi diverifikasi dan disahkan Dinas Pendidikan. Penatausahaan BKU kini dapat dilaksanakan.'
          : 'Silakan perbaiki rincian RKAS sesuai catatan Verifikator Admin Dinas.'),
      tipe: keputusan === 'SAHKAN' ? 'SUCCESS' : 'ALERT',
      linkTab: keputusan === 'SAHKAN' ? 'bku' : 'rkas',
      npsnTerkait: school.id,
    });

    saveDb();
    broadcastStateAndNotification(schoolNotif);
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- PENATAUSAHAAN BKU TRANSACTIONS ---
  app.post('/api/bku/transactions', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const targetNpsn = sess.peran === 'sekolah' ? sess.userId : String(body.npsn || '');
    const school = db.accounts.find((a) => a.id === targetNpsn && a.peran === 'sekolah');
    if (!school) {
      res.status(404).json({ error: 'Satuan pendidikan tidak ditemukan.' });
      return;
    }

    const jenis = body.jenis === 'PENERIMAAN' ? 'PENERIMAAN' : 'PENGELUARAN';
    const nominal = Number(body.nominal) || 0;
    if (nominal <= 0) {
      res.status(400).json({ error: 'Nominal transaksi wajib lebih dari Rp 0.' });
      return;
    }

    if (jenis === 'PENGELUARAN') {
      if (school.rkasStatus !== 'DISAHKAN' && sess.peran === 'sekolah') {
        res.status(400).json({
          error: 'Realisasi belanja BKU hanya dapat dicatat setelah RKAS disahkan oleh Dinas Pendidikan.',
        });
        return;
      }

      // Check cash balance
      const existingTx = db.bkuTransactions.filter((t) => t.npsn === targetNpsn);
      const totalMasuk = existingTx
        .filter((t) => t.jenis === 'PENERIMAAN')
        .reduce((s, t) => s + t.nominal, 0);
      const totalKeluar = existingTx
        .filter((t) => t.jenis === 'PENGELUARAN')
        .reduce((s, t) => s + t.nominal, 0);

      if (totalKeluar + nominal > totalMasuk) {
        res.status(400).json({
          error: `Saldo kas BKU tidak mencukupi (Saldo saat ini Rp ${(totalMasuk - totalKeluar).toLocaleString('id-ID')}). Catat penerimaan salur terlebih dahulu.`,
        });
        return;
      }

      // Check linked RKAS item budget ceiling if linked
      if (body.rkasItemId) {
        const linkedItem = db.rkasItems.find(
          (i) => i.id === body.rkasItemId && i.npsn === targetNpsn
        );
        if (linkedItem) {
          const spentOnItem = existingTx
            .filter((t) => t.rkasItemId === linkedItem.id)
            .reduce((s, t) => s + t.nominal, 0);
          if (spentOnItem + nominal > linkedItem.jumlahTotal) {
            res.status(400).json({
              error: `Belanja melebihi sisa pagu kegiatan RKAS "${linkedItem.uraianKegiatan}" (Sisa Rp ${(linkedItem.jumlahTotal - spentOnItem).toLocaleString('id-ID')}).`,
            });
            return;
          }
        }
      }
    }

    const rkasRef = body.rkasItemId
      ? db.rkasItems.find((i) => i.id === body.rkasItemId)
      : undefined;

    const newTx: BkuTransaction = {
      id: `BKU-${targetNpsn}-${Date.now().toString().slice(-5)}`,
      npsn: targetNpsn,
      tanggal: String(body.tanggal || new Date().toISOString().slice(0, 10)),
      nomorBukti: String(body.nomorBukti || `KWT-${Date.now().toString().slice(-4)}`).trim(),
      jenis,
      tahap: Number(body.tahap) === 2 ? 2 : 1,
      rkasItemId: rkasRef?.id || undefined,
      standarId: rkasRef?.standarId || (body.standarId ? String(body.standarId) : undefined),
      komponenId: rkasRef?.komponenId || (body.komponenId ? String(body.komponenId) : undefined),
      uraian: String(body.uraian || rkasRef?.uraianKegiatan || '').trim(),
      nominal,
      pajakPphPpn: Number(body.pajakPphPpn) || 0,
      penerimaToko: String(body.penerimaToko || '').trim(),
      createdAt: new Date().toISOString(),
    };

    db.bkuTransactions.push(newTx);
    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.delete('/api/bku/transactions/:txId', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tx = db.bkuTransactions.find((t) => t.id === req.params.txId);
    if (!tx) {
      res.status(404).json({ error: 'Transaksi BKU tidak ditemukan.' });
      return;
    }
    if (sess.peran === 'sekolah' && tx.npsn !== sess.userId) {
      res.status(403).json({ error: 'Akses ditolak.' });
      return;
    }

    db.bkuTransactions = db.bkuTransactions.filter((t) => t.id !== req.params.txId);
    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- PELAPORAN SUBMISSION & VERIFICATION ---
  app.post('/api/reports/submit', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const npsn = sess.peran === 'sekolah' ? sess.userId : String(req.body?.npsn || '');
    const tahap = Number(req.body?.tahap) === 2 ? 2 : 1;
    const school = db.accounts.find((a) => a.id === npsn && a.peran === 'sekolah');
    if (!school) {
      res.status(404).json({ error: 'Satuan pendidikan tidak ditemukan.' });
      return;
    }

    school.reportStatus = tahap === 2 ? 'DIAJUKAN_TAHAP_2' : 'DIAJUKAN_TAHAP_1';
    school.updatedAt = new Date().toISOString();

    const notif = pushNotification({
      targetNpsnOrRole: 'ALL_DINAS',
      wilayah: school.wilayah,
      judul: `Laporan Realisasi BOP Tahap ${tahap} — ${school.nama}`,
      pesan: `${school.nama} (${school.id}) telah mengirim Laporan Realisasi & K7a Tahap ${tahap} untuk diverifikasi.`,
      tipe: 'INFO',
      linkTab: 'pelaporan',
      npsnTerkait: school.id,
    });

    saveDb();
    broadcastStateAndNotification(notif);
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.post('/api/reports/verify', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran === 'sekolah') {
      res.status(403).json({ error: 'Hanya Admin Dinas yang dapat memverifikasi laporan.' });
      return;
    }

    const { npsn, statusLaporan, catatan } = req.body || {};
    const school = db.accounts.find((a) => a.id === npsn && a.peran === 'sekolah');
    if (!school) {
      res.status(404).json({ error: 'Sekolah tidak ditemukan.' });
      return;
    }

    school.reportStatus = statusLaporan;
    if (catatan) school.catatanDinas = String(catatan).trim();
    school.updatedAt = new Date().toISOString();

    db.verificationLogs.unshift({
      id: `LOG-${Date.now()}`,
      npsn: school.id,
      namaSekolah: school.nama,
      aksi: 'VERIFIKASI_LAPORAN',
      olehId: sess.userId,
      olehNama: sess.nama,
      olehPeran: sess.peran,
      catatan: String(catatan || `Status laporan diperbarui menjadi ${statusLaporan}`),
      createdAt: school.updatedAt,
    });

    const notif = pushNotification({
      targetNpsnOrRole: school.id,
      judul:
        statusLaporan === 'REVISI_LAPORAN'
          ? 'Permintaan Perbaikan Laporan Realisasi BOP PAUD'
          : 'Laporan Realisasi BOP PAUD Disetujui Dinas',
      pesan:
        String(catatan || '').trim() ||
        `Status laporan realisasi Anda kini: ${statusLaporan}.`,
      tipe: statusLaporan === 'REVISI_LAPORAN' ? 'ALERT' : 'SUCCESS',
      linkTab: 'pelaporan',
      npsnTerkait: school.id,
    });

    saveDb();
    broadcastStateAndNotification(notif);
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- NOTIFICATIONS ---
  app.post('/api/notifications/mark-read', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { notificationId, markAll } = req.body || {};
    db.notifications.forEach((n) => {
      if (markAll || n.id === notificationId) {
        if (!n.dibacaOleh.includes(sess.userId)) {
          n.dibacaOleh.push(sess.userId);
        }
      }
    });

    saveDb();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- USER / NPSN MANAGEMENT & CSV / SPREADSHEET IMPORT (VERIFIKATOR ADMIN DINAS) ---
  app.post('/api/users', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({ error: 'Hanya Verifikator Admin Dinas yang dapat mengelola akun pengguna.' });
      return;
    }

    const body = req.body || {};
    const id = String(body.id || '').trim();
    const nama = String(body.nama || '').trim();
    const peran: UserRole = body.peran === 'admin' ? 'admin' : 'sekolah';
    const kataSandi = String(body.kataSandi || id).trim();
    const wilayah = String(body.wilayah || 'Kec. Jepara').trim();

    if (!id || !nama) {
      res.status(400).json({ error: 'NPSN/ID dan Nama wajib diisi.' });
      return;
    }

    const now = new Date().toISOString();
    const jumlahSiswa = Number(body.jumlahSiswa) || 50;
    const satuanBiaya = Number(body.satuanBiaya) || 600000;
    const paguTahunan =
      peran === 'sekolah'
        ? Number(body.paguTahunan) || jumlahSiswa * satuanBiaya
        : undefined;

    const existingIdx = db.accounts.findIndex(
      (a) => a.id.toLowerCase() === id.toLowerCase()
    );

    const resolvedPassword =
      existingIdx >= 0 && (!kataSandi || kataSandi === '***')
        ? db.accounts[existingIdx].kataSandi
        : kataSandi || id;

    const profile: AccountProfile = {
      id,
      nama,
      peran,
      kataSandi: resolvedPassword,
      wilayah,
      statusSekolah: peran === 'sekolah' ? (body.statusSekolah === 'NEGERI' ? 'NEGERI' : 'SWASTA') : undefined,
      jenjang: peran === 'sekolah' ? body.jenjang || 'TK' : undefined,
      jumlahSiswa: peran === 'sekolah' ? jumlahSiswa : undefined,
      satuanBiaya: peran === 'sekolah' ? satuanBiaya : undefined,
      paguTahunan,
      kepalaSekolah: body.kepalaSekolah || undefined,
      bendahara: body.bendahara || undefined,
      tempatTtd: peran === 'sekolah' ? 'Jepara' : undefined,
      rkasStatus:
        existingIdx >= 0
          ? db.accounts[existingIdx].rkasStatus
          : peran === 'sekolah'
          ? 'DRAFT'
          : undefined,
      reportStatus:
        existingIdx >= 0
          ? db.accounts[existingIdx].reportStatus
          : peran === 'sekolah'
          ? 'BELUM_LAPOR'
          : undefined,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      db.accounts[existingIdx] = { ...db.accounts[existingIdx], ...profile };
    } else {
      db.accounts.push(profile);
    }

    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.post('/api/users/import-rows', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({ error: 'Hanya Verifikator Admin Dinas yang dapat mengimpor data akun.' });
      return;
    }

    const rows: string[][] = Array.isArray(req.body?.rows) ? req.body.rows : [];
    let importedCount = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      if (!Array.isArray(cols) || cols.length < 2) continue;
      const id = String(cols[0] || '').trim();
      if (!id || id.toLowerCase().includes('npsn')) continue;

      const namaRaw = String(cols[1] || '').replace(/,+$/, '').trim();
      const peranRaw = String(cols[2] || 'sekolah').toLowerCase().trim();
      const kataSandi = String(cols[3] || id).trim();
      const wilayah = String(cols[4] || 'Kec. Jepara').trim();
      const statusSekolahRaw = String(cols[5] || '').toUpperCase().trim();
      const siswaRaw = Number(cols[6]) || 60;
      const paguRaw = Number(cols[7]) || siswaRaw * 600000;

      const mappedRole: UserRole =
        peranRaw === 'sekolah' ? 'sekolah' : 'admin';

      const existingIdx = db.accounts.findIndex(
        (a) => a.id.toLowerCase() === id.toLowerCase()
      );

      if (existingIdx >= 0) {
        db.accounts[existingIdx] = {
          ...db.accounts[existingIdx],
          nama: namaRaw || db.accounts[existingIdx].nama,
          peran: mappedRole,
          kataSandi: kataSandi === '***' ? db.accounts[existingIdx].kataSandi : kataSandi,
          wilayah: wilayah || db.accounts[existingIdx].wilayah,
          updatedAt: now,
        };
      } else {
        db.accounts.push({
          id,
          nama: namaRaw || `Satuan PAUD ${id}`,
          peran: mappedRole,
          kataSandi,
          wilayah,
          statusSekolah:
            mappedRole === 'sekolah'
              ? statusSekolahRaw === 'NEGERI' || namaRaw.toLowerCase().includes('negeri')
                ? 'NEGERI'
                : 'SWASTA'
              : undefined,
          jenjang: mappedRole === 'sekolah' ? 'TK' : undefined,
          jumlahSiswa: mappedRole === 'sekolah' ? siswaRaw : undefined,
          satuanBiaya: mappedRole === 'sekolah' ? 600000 : undefined,
          paguTahunan: mappedRole === 'sekolah' ? paguRaw : undefined,
          tempatTtd: mappedRole === 'sekolah' ? 'Jepara' : undefined,
          rkasStatus: mappedRole === 'sekolah' ? 'DRAFT' : undefined,
          reportStatus: mappedRole === 'sekolah' ? 'BELUM_LAPOR' : undefined,
          updatedAt: now,
        });
      }
      importedCount++;
    }

    saveDb();
    broadcastStateAndNotification();
    res.json({
      ok: true,
      importedCount,
      state: sanitizeStateForSession(sess),
    });
  });

  app.delete('/api/users/:id', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({
        error: 'Hanya Verifikator Admin Dinas yang dapat menghapus akun pengguna.',
      });
      return;
    }

    const targetId = String(req.params.id || '').trim();
    if (!targetId) {
      res.status(400).json({ error: 'ID akun wajib diisi.' });
      return;
    }

    if (targetId.toLowerCase() === sess.userId.toLowerCase()) {
      res.status(400).json({
        error: 'Akun Verifikator Admin yang sedang aktif digunakan tidak dapat dihapus.',
      });
      return;
    }

    const beforeLen = db.accounts.length;
    db.accounts = db.accounts.filter(
      (a) => a.id.toLowerCase() !== targetId.toLowerCase()
    );
    if (db.accounts.length === beforeLen) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }

    db.rkasItems = db.rkasItems.filter((i) => i.npsn !== targetId);
    db.bkuTransactions = db.bkuTransactions.filter((t) => t.npsn !== targetId);
    db.verificationLogs = db.verificationLogs.filter((l) => l.npsn !== targetId);
    db.notifications = db.notifications.filter(
      (n) => n.npsnTerkait !== targetId && n.targetNpsnOrRole !== targetId
    );

    saveDb();
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  app.post('/api/admin/production-reset', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess || sess.peran !== 'admin') {
      res.status(403).json({
        error: 'Hanya Verifikator Admin Dinas yang dapat mengaktifkan Mode Produksi.',
      });
      return;
    }

    const body = req.body || {};
    const newPassword = String(body.newAdminPassword || '').trim();
    const newAdminName = String(body.adminName || '').trim();
    const nextTahun = Number(body.tahunAnggaran);
    const clearSampleData = body.clearSampleData !== false;

    const adminIdx = db.accounts.findIndex(
      (a) => a.id.toLowerCase() === sess.userId.toLowerCase()
    );
    if (adminIdx >= 0) {
      if (newPassword) {
        db.accounts[adminIdx].kataSandi = newPassword;
      }
      if (newAdminName) {
        db.accounts[adminIdx].nama = newAdminName;
        sess.nama = newAdminName;
      }
      db.accounts[adminIdx].updatedAt = new Date().toISOString();
    }

    if (!Number.isNaN(nextTahun) && nextTahun >= 2025 && nextTahun <= 2035) {
      db.tahunAnggaran = nextTahun;
    }

    if (clearSampleData) {
      db.accounts = db.accounts.filter((a) => a.peran === 'admin');
      db.rkasItems = [];
      db.bkuTransactions = [];
      db.verificationLogs = [];
      db.notifications = [];
    }

    saveDb();
    broadcastStateAndNotification();
    res.json({
      ok: true,
      message: clearSampleData
        ? 'Mode Produksi Resmi aktif: seluruh akun contoh dan transaksi simulasi telah dibersihkan.'
        : 'Pengaturan kredensial Admin Dinas dan Tahun Anggaran berhasil diperbarui.',
      state: sanitizeStateForSession(sess),
    });
  });

  // --- GOOGLE SHEETS / APPS SCRIPT / APPSHEET CONFIG ---
  app.post('/api/sheets/config', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    if (typeof body.spreadsheetId === 'string') {
      db.sheetConfig.spreadsheetId = body.spreadsheetId.trim();
    }
    if (typeof body.spreadsheetTitle === 'string') {
      db.sheetConfig.spreadsheetTitle = body.spreadsheetTitle.trim();
    }
    if (typeof body.spreadsheetUrl === 'string') {
      db.sheetConfig.spreadsheetUrl = body.spreadsheetUrl.trim();
    }
    if (typeof body.appsScriptWebAppUrl === 'string') {
      db.sheetConfig.appsScriptWebAppUrl = body.appsScriptWebAppUrl.trim();
    }
    if (typeof body.appSheetAppId === 'string') {
      db.sheetConfig.appSheetAppId = body.appSheetAppId.trim();
    }
    if (typeof body.autoSyncAppsScript === 'boolean') {
      db.sheetConfig.autoSyncAppsScript = body.autoSyncAppsScript;
    }
    if (typeof body.autoSyncGoogleSheets === 'boolean') {
      db.sheetConfig.autoSyncGoogleSheets = body.autoSyncGoogleSheets;
    }
    if (body.markSynced) {
      db.sheetConfig.lastSyncedAt = new Date().toISOString();
      db.sheetConfig.lastSyncedBy = `${sess.nama} (${sess.userId})`;
    }

    saveDb(true);
    broadcastStateAndNotification();
    res.json({ ok: true, state: sanitizeStateForSession(sess) });
  });

  // --- FULL 2-WAY PULL FROM GOOGLE SHEETS API TAB ROWS ---
  app.post('/api/sheets/pull-all', (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const now = new Date().toISOString();
    const standarKodeToId = new Map<string, string>();
    STANDAR_PENDIDIKAN_7.forEach((s) => {
      standarKodeToId.set(s.kode, s.id);
      standarKodeToId.set(s.id, s.id);
    });
    const kompDefaultStd = new Map(KOMPONEN_BOP_10.map((k) => [k.id, k.defaultStandarId]));

    // 1. Accounts
    if (Array.isArray(body.accountsRows) && body.accountsRows.length > 0) {
      const existingPwMap = new Map(db.accounts.map((a) => [a.id.toLowerCase(), a.kataSandi]));
      const existingAccMap = new Map(db.accounts.map((a) => [a.id.toLowerCase(), a]));
      const parsedAccounts: AccountProfile[] = [];

      for (const cols of body.accountsRows) {
        if (!Array.isArray(cols)) continue;
        const id = String(cols[0] || '').trim();
        if (!id || id.toLowerCase().includes('npsn')) continue;
        const prev = existingAccMap.get(id.toLowerCase());
        const peran: UserRole =
          String(cols[2] || '').toLowerCase().trim() === 'admin' || id === 'admin'
            ? 'admin'
            : 'sekolah';
        const rawPw = String(cols[3] || '').trim();
        const kataSandi =
          !rawPw || rawPw === '***'
            ? existingPwMap.get(id.toLowerCase()) || id
            : rawPw;
        const wilayah = String(cols[4] || prev?.wilayah || 'Kec. Jepara').trim();
        const statusRaw = String(cols[5] || prev?.statusSekolah || 'SWASTA').toUpperCase().trim();
        const siswa = Number(cols[6]) || prev?.jumlahSiswa || 50;
        const pagu = Number(cols[7]) || prev?.paguTahunan || siswa * 600000;
        const rkasStRaw = String(cols[8] || prev?.rkasStatus || 'DRAFT').toUpperCase().trim();
        const repStRaw = String(cols[9] || prev?.reportStatus || 'BELUM_LAPOR').toUpperCase().trim();

        parsedAccounts.push({
          ...prev,
          id,
          nama: String(cols[1] || prev?.nama || `Satuan PAUD ${id}`).trim(),
          peran,
          kataSandi,
          wilayah,
          statusSekolah:
            peran === 'sekolah'
              ? statusRaw === 'NEGERI'
                ? 'NEGERI'
                : 'SWASTA'
              : undefined,
          jenjang: peran === 'sekolah' ? prev?.jenjang || 'TK' : undefined,
          skemaBopDefault: peran === 'sekolah' ? prev?.skemaBopDefault || 'REGULER' : undefined,
          jumlahSiswa: peran === 'sekolah' ? siswa : undefined,
          satuanBiaya: peran === 'sekolah' ? prev?.satuanBiaya || 600000 : undefined,
          paguTahunan: peran === 'sekolah' ? pagu : undefined,
          rkasStatus:
            peran === 'sekolah'
              ? (['DRAFT', 'DIAJUKAN', 'PERLU_REVISI', 'DISAHKAN'].includes(rkasStRaw)
                  ? (rkasStRaw as RkasStatus)
                  : 'DRAFT')
              : undefined,
          reportStatus:
            peran === 'sekolah'
              ? (repStRaw as ReportStatus) || 'BELUM_LAPOR'
              : undefined,
          updatedAt: now,
        });
      }

      if (parsedAccounts.length > 0) {
        if (!parsedAccounts.some((a) => a.peran === 'admin')) {
          const prevAdmin = db.accounts.find((a) => a.peran === 'admin');
          if (prevAdmin) parsedAccounts.unshift(prevAdmin);
        }
        db.accounts = parsedAccounts;
      }
    }

    // 2. SHS Catalog (Referensi_SHS_Jepara)
    if (Array.isArray(body.shsRows)) {
      const parsedShs: ShsJeparaItem[] = [];
      for (const cols of body.shsRows) {
        if (!Array.isArray(cols)) continue;
        const id = String(cols[0] || '').trim();
        const namaBarangJasa = String(cols[3] || '').trim();
        if (!id || !namaBarangJasa || id.toLowerCase() === 'id_shs') continue;
        const katRaw = String(cols[2] || 'SSH').toUpperCase().trim();
        const kategori: ShsKategori =
          katRaw === 'SBU' ? 'SBU' : katRaw === 'HSPK' ? 'HSPK' : 'SSH';
        const komponenId = String(cols[7] || 'KOMP-03').trim();
        const rawStd = String(cols[8] || '').trim();
        const standarId =
          standarKodeToId.get(rawStd) || kompDefaultStd.get(komponenId) || 'STD-03';

        parsedShs.push({
          id,
          kodeBarang: String(cols[1] || id).trim(),
          kategori,
          namaBarangJasa,
          spesifikasi: String(cols[4] || '-').trim(),
          satuan: String(cols[5] || 'Paket').trim(),
          hargaTertinggi: Number(cols[6]) || 0,
          komponenId,
          standarId,
        });
      }
      db.shsItems = parsedShs;
    }

    // 3. RKAS Items (Perencanaan_RKAS — supports both 20-col legacy and 22-col Permendikdasmen 8/2026)
    if (Array.isArray(body.rkasRows) && body.rkasRows.length > 0) {
      const parsedRkas: RkasItem[] = [];
      for (const cols of body.rkasRows) {
        if (!Array.isArray(cols)) continue;
        const id = String(cols[0] || '').trim();
        const npsn = String(cols[1] || '').trim();
        if (!id || !npsn || id.toLowerCase() === 'id_item') continue;

        const isExtended22 =
          ['REGULER', 'KINERJA', 'AFIRMASI'].includes(String(cols[3] || '').toUpperCase().trim());

        const skemaRaw = isExtended22 ? String(cols[3] || 'REGULER').toUpperCase().trim() : 'REGULER';
        const skemaBop: BopScheme =
          skemaRaw === 'KINERJA' ? 'KINERJA' : skemaRaw === 'AFIRMASI' ? 'AFIRMASI' : 'REGULER';
        const bulanPelaksanaan = isExtended22
          ? String(cols[4] || 'Januari - Desember').trim()
          : 'Januari - Desember';
        const offset = isExtended22 ? 2 : 0;

        const rawKodeStd = String(cols[3 + offset] || '').trim();
        const komponenId = String(cols[5 + offset] || 'KOMP-03').trim();
        const standarId =
          standarKodeToId.get(rawKodeStd) || kompDefaultStd.get(komponenId) || 'STD-03';
        const kodeShsRaw = String(cols[7 + offset] || '').trim();
        const volume = Number(cols[10 + offset]) || 1;
        const hargaSatuan = Number(cols[12 + offset]) || 0;
        const batasRaw = Number(cols[13 + offset]);
        const jumlahTotal = Number(cols[14 + offset]) || volume * hargaSatuan;
        const tahap1 = Number(cols[15 + offset]) || 0;
        const tahap2 = Number(cols[16 + offset]) || Math.max(0, jumlahTotal - tahap1);
        const statusRaw = String(cols[17 + offset] || 'MENUNGGU').toUpperCase().trim();

        parsedRkas.push({
          id,
          npsn,
          tahunAnggaran: Number(cols[2]) || db.tahunAnggaran,
          skemaBop,
          bulanPelaksanaan,
          standarId,
          komponenId,
          kodeShs: kodeShsRaw && kodeShsRaw !== '-' ? kodeShsRaw : undefined,
          uraianKegiatan: String(cols[8 + offset] || '').trim(),
          spesifikasi: String(cols[9 + offset] || '-').trim(),
          volume,
          satuan: String(cols[11 + offset] || 'Paket').trim(),
          hargaSatuan,
          batasHargaShs: !Number.isNaN(batasRaw) && batasRaw > 0 ? batasRaw : undefined,
          jumlahTotal,
          tahap1,
          tahap2,
          statusItem:
            statusRaw === 'SESUAI' ? 'SESUAI' : statusRaw === 'REVISI' ? 'REVISI' : 'MENUNGGU',
          catatanVerifikator: String(cols[18 + offset] || '').trim() || undefined,
          updatedAt: String(cols[19 + offset] || now),
        });
      }
      if (parsedRkas.length > 0) {
        db.rkasItems = parsedRkas;
      }
    }

    // 4. BKU Transactions (Penatausahaan_BKU)
    if (Array.isArray(body.bkuRows) && body.bkuRows.length > 0) {
      const parsedBku: BkuTransaction[] = [];
      for (const cols of body.bkuRows) {
        if (!Array.isArray(cols)) continue;
        const id = String(cols[0] || '').trim();
        const npsn = String(cols[2] || '').trim();
        if (!id || !npsn || id.toLowerCase() === 'id_bku') continue;
        parsedBku.push({
          id,
          tanggal: String(cols[1] || now.slice(0, 10)).slice(0, 10),
          npsn,
          nomorBukti: String(cols[3] || '-').trim(),
          jenis: String(cols[4] || '').toUpperCase().trim() === 'PENERIMAAN' ? 'PENERIMAAN' : 'PENGELUARAN',
          tahap: Number(cols[5]) === 2 ? 2 : 1,
          standarId: cols[6] && cols[6] !== '-' ? standarKodeToId.get(String(cols[6])) || String(cols[6]) : undefined,
          komponenId: cols[7] && cols[7] !== '-' ? String(cols[7]) : undefined,
          uraian: String(cols[8] || '').trim(),
          nominal: Number(cols[9]) || 0,
          pajakPphPpn: Number(cols[10]) || 0,
          penerimaToko: String(cols[11] || '').trim(),
          createdAt: now,
        });
      }
      if (parsedBku.length > 0) {
        db.bkuTransactions = parsedBku;
      }
    }

    if (body.spreadsheetId) db.sheetConfig.spreadsheetId = String(body.spreadsheetId);
    if (body.spreadsheetTitle) db.sheetConfig.spreadsheetTitle = String(body.spreadsheetTitle);
    if (body.spreadsheetUrl) db.sheetConfig.spreadsheetUrl = String(body.spreadsheetUrl);
    db.sheetConfig.lastSyncedAt = now;
    db.sheetConfig.lastSyncedBy = `${sess.nama} (Tarik Google Sheets)`;

    saveDb(true);
    broadcastStateAndNotification();
    res.json({
      ok: true,
      counts: {
        accounts: db.accounts.length,
        rkasItems: db.rkasItems.length,
        bkuTransactions: db.bkuTransactions.length,
        shsItems: db.shsItems.length,
      },
      state: sanitizeStateForSession(sess),
    });
  });

  // --- SERVER-SIDE BRIDGE TO GOOGLE APPS SCRIPT WEB APP (doGet / doPost) ---
  app.post('/api/appscript/pull', async (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webAppUrl = String(
      req.body?.appsScriptWebAppUrl || db.sheetConfig.appsScriptWebAppUrl || ''
    ).trim();
    if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/')) {
      res.status(400).json({
        error: 'Masukkan URL Web App Google Apps Script yang valid (https://script.google.com/macros/s/.../exec).',
      });
      return;
    }

    try {
      const expectedKey = process.env.BOP_WEBHOOK_KEY || `bop-paud-sync-${db.tahunAnggaran}`;
      const sep = webAppUrl.includes('?') ? '&' : '?';
      const upstream = await fetch(
        `${webAppUrl}${sep}action=state&apiKey=${encodeURIComponent(expectedKey)}`,
        { method: 'GET', redirect: 'follow' }
      );
      const data: any = await upstream.json();
      if (!upstream.ok || data.ok === false) {
        res.status(400).json({
          error: data.error || `Gagal menarik data dari Apps Script (HTTP ${upstream.status}).`,
        });
        return;
      }

      if (Array.isArray(data.accounts) && data.accounts.length > 0) {
        db.accounts = data.accounts;
      }
      if (Array.isArray(data.rkasItems)) {
        db.rkasItems = data.rkasItems;
      }
      if (Array.isArray(data.verificationLogs)) {
        db.verificationLogs = data.verificationLogs;
      }
      if (Array.isArray(data.bkuTransactions)) {
        db.bkuTransactions = data.bkuTransactions;
      }
      if (Array.isArray(data.shsItems)) {
        db.shsItems = data.shsItems;
      }

      db.sheetConfig.appsScriptWebAppUrl = webAppUrl;
      if (data.spreadsheetId) db.sheetConfig.spreadsheetId = data.spreadsheetId;
      if (data.spreadsheetTitle) db.sheetConfig.spreadsheetTitle = data.spreadsheetTitle;
      if (data.spreadsheetUrl) db.sheetConfig.spreadsheetUrl = data.spreadsheetUrl;
      db.sheetConfig.lastSyncedAt = new Date().toISOString();
      db.sheetConfig.lastSyncedBy = `Apps Script (${sess.nama})`;

      saveDb(true);
      broadcastStateAndNotification();
      res.json({
        ok: true,
        message: `Berhasil menarik database dari Google Sheets melalui Apps Script (${db.accounts.length} akun, ${db.rkasItems.length} item RKAS, ${db.shsItems.length} referensi SHS).`,
        state: sanitizeStateForSession(sess),
      });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? `Gagal menghubungi Web App Apps Script: ${err.message}`
            : 'Gagal menghubungi Web App Apps Script.',
      });
    }
  });

  app.post('/api/appscript/push', async (req, res) => {
    const sess = getSessionFromReq(req);
    if (!sess) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webAppUrl = String(
      req.body?.appsScriptWebAppUrl || db.sheetConfig.appsScriptWebAppUrl || ''
    ).trim();
    if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/')) {
      res.status(400).json({
        error: 'Masukkan URL Web App Google Apps Script yang valid (https://script.google.com/macros/s/.../exec).',
      });
      return;
    }

    try {
      db.sheetConfig.appsScriptWebAppUrl = webAppUrl;
      const result = await pushStateToAppsScriptUrl(webAppUrl);
      db.sheetConfig.lastSyncedAt = new Date().toISOString();
      db.sheetConfig.lastSyncedBy = `Apps Script Push (${sess.nama})`;
      saveDb(true);
      broadcastStateAndNotification();
      res.json({
        ok: true,
        message: result.message || 'Seluruh 7 tab Google Sheets berhasil diperbarui melalui Apps Script Web App.',
        state: sanitizeStateForSession(sess),
      });
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? `Gagal mengirim data ke Web App Apps Script: ${err.message}`
            : 'Gagal mengirim data ke Web App Apps Script.',
      });
    }
  });

  // --- EXTERNAL REST API FOR GOOGLE APPS SCRIPT & APPSHEET INTEGRATION ---
  app.get('/api/external/v1/summary', (req, res) => {
    const expectedKey = process.env.BOP_WEBHOOK_KEY || 'bop-paud-sync-2027';
    const providedKey =
      req.headers['x-api-key'] || req.query.apiKey || 'bop-paud-sync-2027';
    if (providedKey !== expectedKey) {
      res.status(401).json({ error: 'Invalid BOP_WEBHOOK_KEY' });
      return;
    }

    const schools = db.accounts.filter((a) => a.peran === 'sekolah');
    const summary = schools.map((s) => {
      const val = validateRkasJuknis(s, db.rkasItems);
      const realisasi = db.bkuTransactions
        .filter((t) => t.npsn === s.id && t.jenis === 'PENGELUARAN')
        .reduce((acc, t) => acc + t.nominal, 0);
      return {
        npsn: s.id,
        namaSekolah: s.nama,
        statusSekolah: s.statusSekolah,
        wilayah: s.wilayah,
        paguTahunan: val.paguTahunan,
        totalRencanaRkas: val.totalRencana,
        totalRealisasiBku: realisasi,
        statusRkas: s.rkasStatus,
        statusLaporan: s.reportStatus,
        lulusJuknisBosp: val.semuaAturanLulus,
      };
    });

    res.json({
      service: 'SIM VERVAL RKAS & BOP PAUD API v1',
      tahunAnggaran: db.tahunAnggaran,
      standarPendidikanCount: STANDAR_PENDIDIKAN_7.length,
      komponenBopCount: KOMPONEN_BOP_10.length,
      totalSekolah: schools.length,
      data: summary,
    });
  });

  app.post('/api/external/v1/webhook', (req, res) => {
    const expectedKey = process.env.BOP_WEBHOOK_KEY || 'bop-paud-sync-2027';
    const providedKey = req.headers['x-api-key'] || req.query.apiKey;
    if (providedKey && providedKey !== expectedKey) {
      res.status(401).json({ error: 'Invalid BOP_WEBHOOK_KEY' });
      return;
    }

    const { source, action, npsn, payload } = req.body || {};
    const sourceName = String(source || 'Google Apps Script / AppSheet');

    if (action === 'UPSERT_RKAS_ITEM' && npsn && payload) {
      const school = db.accounts.find((a) => a.id === String(npsn));
      if (school) {
        const vol = Number(payload.volume) || 1;
        const harga = Number(payload.hargaSatuan) || 0;
        const total = vol * harga;
        const newItem: RkasItem = {
          id: String(payload.id || `GAS-${npsn}-${Date.now().toString().slice(-4)}`),
          npsn: String(npsn),
          tahunAnggaran: db.tahunAnggaran,
          standarId: String(payload.standarId || 'STD-03'),
          komponenId: String(payload.komponenId || 'KOMP-03'),
          uraianKegiatan: String(payload.uraianKegiatan || 'Sinkronisasi Kegiatan Spreadsheet'),
          spesifikasi: String(payload.spesifikasi || '-'),
          volume: vol,
          satuan: String(payload.satuan || 'Paket'),
          hargaSatuan: harga,
          jumlahTotal: total,
          tahap1: Number(payload.tahap1) || total / 2,
          tahap2: Number(payload.tahap2) || total / 2,
          statusItem: 'MENUNGGU',
          updatedAt: new Date().toISOString(),
        };
        const idx = db.rkasItems.findIndex((i) => i.id === newItem.id);
        if (idx >= 0) db.rkasItems[idx] = newItem;
        else db.rkasItems.push(newItem);
      }
    }

    const notif = pushNotification({
      targetNpsnOrRole: 'ALL_DINAS',
      judul: `Sinkronisasi Webhook Masuk (${sourceName})`,
      pesan: `Data ${action || 'PING'} untuk NPSN ${npsn || 'Master'} berhasil diterima melalui API integrasi.`,
      tipe: 'INFO',
      linkTab: 'integrasi',
      npsnTerkait: npsn ? String(npsn) : undefined,
    });

    db.sheetConfig.lastSyncedAt = new Date().toISOString();
    db.sheetConfig.lastSyncedBy = sourceName;
    saveDb();
    broadcastStateAndNotification(notif);

    res.json({
      ok: true,
      receivedAt: db.sheetConfig.lastSyncedAt,
      message: 'Webhook berhasil diproses dan disiarkan secara real-time.',
    });
  });

  // --- VITE MIDDLEWARE IN DEV / STATIC IN PROD ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SIM VERVAL RKAS & BOP PAUD running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
