export type SchoolStatus = 'NEGERI' | 'SWASTA';

export type UserRole = 'sekolah' | 'admin';

export type RkasStatus = 'DRAFT' | 'DIAJUKAN' | 'PERLU_REVISI' | 'DISAHKAN';

export type BopScheme = 'REGULER' | 'KINERJA' | 'AFIRMASI';

export const JUKNIS_REGULASI_LABEL = 'Permendikdasmen Nomor 8 Tahun 2026';

export type ShsKategori = 'SSH' | 'SBU' | 'HSPK';

export interface ShsJeparaItem {
  id: string;
  kodeBarang: string;
  kategori: ShsKategori;
  namaBarangJasa: string;
  spesifikasi: string;
  satuan: string;
  hargaTertinggi: number;
  komponenId: string;
  standarId: string;
}

export type ReportStatus =
  | 'BELUM_LAPOR'
  | 'DIAJUKAN_TAHAP_1'
  | 'DISETUJUI_TAHAP_1'
  | 'DIAJUKAN_TAHAP_2'
  | 'SELESAI_100'
  | 'REVISI_LAPORAN';

export interface StandarPendidikan {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
}

export interface KomponenBop {
  id: string;
  nomor: number;
  nama: string;
  aturanKetentuan: string;
  minPersen?: number;
  maxPersenNegeri?: number;
  maxPersenSwasta?: number;
  defaultStandarId: string;
}

export const STANDAR_PENDIDIKAN_7: StandarPendidikan[] = [
  {
    id: 'STD-02',
    kode: '02',
    nama: 'Standar Isi',
    deskripsi: 'Penyusunan kurikulum satuan pendidikan (KSP), modul ajar, pengembangan perpustakaan, dan buku bacaan anak PAUD.',
  },
  {
    id: 'STD-03',
    kode: '03',
    nama: 'Standar Proses',
    deskripsi: 'Penerimaan murid baru, pelaksanaan kegiatan pembelajaran dan bermain, APE, serta kegiatan kesehatan, gizi, dan kebersihan.',
  },
  {
    id: 'STD-04',
    kode: '04',
    nama: 'Standar Tenaga Kependidikan',
    deskripsi: 'Pengembangan profesi pendidik dan tenaga kependidikan, kegiatan PKG/Gugus PAUD, serta peningkatan kompetensi PTK.',
  },
  {
    id: 'STD-05',
    kode: '05',
    nama: 'Standar Sarana Prasarana',
    deskripsi: 'Pemeliharaan ringan sarana dan prasarana satuan pendidikan, ruang bermain, meubelair, dan fasilitas sanitasi anak.',
  },
  {
    id: 'STD-06',
    kode: '06',
    nama: 'Standar Pengelolaan',
    deskripsi: 'Pelaksanaan administrasi kegiatan satuan pendidikan, pendataan Dapodik, penyusunan RKAS/ARKAS, dan tata kelola lembaga.',
  },
  {
    id: 'STD-07',
    kode: '07',
    nama: 'Standar Pembiayaan',
    deskripsi: 'Pembiayaan langganan daya dan jasa operasional (listrik, air, internet) serta pembayaran honorarium PTK Non-ASN.',
  },
  {
    id: 'STD-08',
    kode: '08',
    nama: 'Standar Penilaian',
    deskripsi: 'Pelaksanaan evaluasi dan asesmen perkembangan anak, instrumen observasi autentik, portofolio, dan laporan capaian belajar.',
  },
];

export const KOMPONEN_BOP_10: KomponenBop[] = [
  {
    id: 'KOMP-01',
    nomor: 1,
    nama: 'Penerimaan Murid Baru',
    aturanKetentuan: 'Pelaksanaan SPMB/PPDB satuan pendidikan PAUD sesuai Permendikdasmen No. 8 Tahun 2026',
    defaultStandarId: 'STD-03',
  },
  {
    id: 'KOMP-02',
    nomor: 2,
    nama: 'Pengembangan Perpustakaan dan/atau Layanan Pojok Baca',
    aturanKetentuan: 'Wajib Minimal 5% dari total pagu anggaran BOP PAUD (Permendikdasmen No. 8 Tahun 2026)',
    minPersen: 5,
    defaultStandarId: 'STD-02',
  },
  {
    id: 'KOMP-03',
    nomor: 3,
    nama: 'Pelaksanaan Kegiatan Pembelajaran dan Bermain',
    aturanKetentuan: 'Prioritas penyediaan APE ber-SNI, bahan bermain & pembelajaran mendalam PAUD',
    defaultStandarId: 'STD-03',
  },
  {
    id: 'KOMP-04',
    nomor: 4,
    nama: 'Pelaksanaan Kegiatan Evaluasi/Asesmen Pembelajaran dan Bermain',
    aturanKetentuan: 'Instrumen asesmen autentik perkembangan anak & pelaporan capaian belajar',
    defaultStandarId: 'STD-08',
  },
  {
    id: 'KOMP-05',
    nomor: 5,
    nama: 'Pelaksanaan Administrasi Kegiatan Satuan Pendidikan',
    aturanKetentuan: 'Pemutakhiran Dapodik, pengelolaan ARKAS, ATK, dan tata kelola satuan pendidikan',
    defaultStandarId: 'STD-06',
  },
  {
    id: 'KOMP-06',
    nomor: 6,
    nama: 'Pengembangan Profesi Pendidik dan Tenaga Kependidikan',
    aturanKetentuan: 'Peningkatan kompetensi guru/tendik di PKG/Gugus PAUD & komunitas belajar',
    defaultStandarId: 'STD-04',
  },
  {
    id: 'KOMP-07',
    nomor: 7,
    nama: 'Pembiayaan Langganan Daya dan Jasa',
    aturanKetentuan: 'Langganan listrik, air bersih, dan internet operasional satuan pendidikan',
    defaultStandarId: 'STD-07',
  },
  {
    id: 'KOMP-08',
    nomor: 8,
    nama: 'Pemeliharaan Sarana dan Prasarana',
    aturanKetentuan: 'Maksimal 20% pagu untuk pemeliharaan ringan non-struktural, sanitasi, meubelair & sarpras inklusi',
    maxPersenNegeri: 20,
    maxPersenSwasta: 20,
    defaultStandarId: 'STD-05',
  },
  {
    id: 'KOMP-09',
    nomor: 9,
    nama: 'Penyelenggaraan Kegiatan Kesehatan, Gizi, dan Kebersihan',
    aturanKetentuan: 'PMT pangan lokal bergizi, DDTK, UKS, sanitasi & perilaku hidup bersih sehat',
    defaultStandarId: 'STD-03',
  },
  {
    id: 'KOMP-10',
    nomor: 10,
    nama: 'Pembayaran Honor',
    aturanKetentuan: 'Maksimal 20% untuk Satuan Negeri & Maksimal 40% untuk Satuan Swasta (Non-ASN terdaftar Dapodik)',
    maxPersenNegeri: 20,
    maxPersenSwasta: 40,
    defaultStandarId: 'STD-07',
  },
];

export interface SignatoryData {
  tempatTanggal: string;
  komiteSekolah: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  bendahara: string;
  nipBendahara: string;
  kepalaDinas: string;
  pangkatKepalaDinas: string;
  nipKepalaDinas: string;
}

export interface AccountProfile {
  id: string; // NPSN for school or admin ID for dinas
  nama: string;
  peran: UserRole;
  kataSandi?: string;
  wilayah: string;
  // School-specific attributes
  statusSekolah?: SchoolStatus;
  jenjang?: 'TK' | 'KB' | 'TPA' | 'SPS';
  skemaBopDefault?: BopScheme;
  jumlahSiswa?: number;
  satuanBiaya?: number; // e.g. Rp 600.000
  paguTahunan?: number;
  komiteSekolah?: string;
  kepalaSekolah?: string;
  nipKepalaSekolah?: string;
  bendahara?: string;
  nipBendahara?: string;
  tempatTtd?: string;
  kepalaDinas?: string;
  pangkatKepalaDinas?: string;
  nipKepalaDinas?: string;
  rkasStatus?: RkasStatus;
  reportStatus?: ReportStatus;
  catatanDinas?: string;
  berkasSptjmUrl?: string;
  berkasRabUrl?: string;
  updatedAt: string;
}

export interface RkasItem {
  id: string;
  npsn: string;
  tahunAnggaran: number;
  skemaBop?: BopScheme;
  bulanPelaksanaan?: string;
  standarId: string; // STD-02 .. STD-08
  komponenId: string; // KOMP-01 .. KOMP-10
  shsId?: string;
  kodeShs?: string;
  batasHargaShs?: number;
  uraianKegiatan: string;
  spesifikasi: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  jumlahTotal: number;
  tahap1: number; // Alokasi Jan - Jun
  tahap2: number; // Alokasi Jul - Des
  statusItem: 'MENUNGGU' | 'SESUAI' | 'REVISI';
  catatanVerifikator?: string;
  updatedAt: string;
}

export interface VerificationLog {
  id: string;
  npsn: string;
  namaSekolah: string;
  aksi: 'AJUKAN' | 'REVISI' | 'SAHKAN' | 'VERIFIKASI_LAPORAN';
  olehId: string;
  olehNama: string;
  olehPeran: UserRole;
  catatan: string;
  createdAt: string;
}

export interface BkuTransaction {
  id: string;
  npsn: string;
  tanggal: string;
  nomorBukti: string;
  jenis: 'PENERIMAAN' | 'PENGELUARAN';
  tahap: 1 | 2;
  rkasItemId?: string;
  standarId?: string;
  komponenId?: string;
  uraian: string;
  nominal: number;
  pajakPphPpn: number;
  penerimaToko: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  targetNpsnOrRole: string; // specific NPSN, 'ALL_DINAS', 'verifikator_wilayah', 'validator_kabid'
  wilayah?: string;
  judul: string;
  pesan: string;
  tipe: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  linkTab: 'dashboard' | 'rkas' | 'verifikasi' | 'bku' | 'pelaporan' | 'integrasi';
  npsnTerkait?: string;
  dibacaOleh: string[];
  createdAt: string;
}

export interface SheetSyncConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  appsScriptWebAppUrl: string;
  appSheetAppId: string;
  autoSyncAppsScript?: boolean;
  autoSyncGoogleSheets?: boolean;
  lastSyncedAt: string | null;
  lastSyncedBy: string | null;
}

export interface AppDatabaseState {
  tahunAnggaran: number;
  standarSchemaVersion?: number;
  accounts: AccountProfile[];
  shsItems: ShsJeparaItem[];
  rkasItems: RkasItem[];
  verificationLogs: VerificationLog[];
  bkuTransactions: BkuTransaction[];
  notifications: AppNotification[];
  sheetConfig: SheetSyncConfig;
}

export interface JuknisRuleCheck {
  kode: string;
  judul: string;
  aturanText: string;
  nominalAktual: number;
  persenAktual: number;
  batasPersen: number;
  tipeBatas: 'MIN' | 'MAX' | 'EXACT_OR_MAX';
  lulus: boolean;
  pesanStatus: string;
}

export interface JuknisValidationResult {
  paguTahunan: number;
  totalRencana: number;
  sisaPagu: number;
  persenTerencana: number;
  totalTahap1: number;
  totalTahap2: number;
  semuaAturanLulus: boolean;
  siapDiajukan: boolean;
  checks: JuknisRuleCheck[];
  perKomponen: {
    komponen: KomponenBop;
    nominal: number;
    persenPagu: number;
    lulus: boolean;
    catatanBatas?: string;
  }[];
  perStandar: {
    standar: StandarPendidikan;
    nominal: number;
    persenPagu: number;
  }[];
}

export function getMaxHonorPersen(statusSekolah?: SchoolStatus): number {
  return statusSekolah === 'NEGERI' ? 20 : 40;
}

export const LARANGAN_BOSP_2026_LIST: string[] = [
  'Pembangunan gedung atau ruang kelas baru (konstruksi berat)',
  'Pembelian pakaian, seragam, atau sepatu bagi guru/murid yang bukan inventaris sekolah',
  'Penyimpanan dana BOSP dalam bentuk deposito, saham, atau dipinjamkan ke pihak lain',
  'Pembayaran bonus, tunjangan hari raya (THR), sumbangan, atau hadiah pribadi',
  'Pembiayaan kegiatan yang telah didanai secara penuh dari sumber APBN/APBD lainnya',
];

export function checkLaranganBosp2026(
  uraianKegiatan: string,
  spesifikasi: string
): string | null {
  const combined = `${uraianKegiatan} ${spesifikasi}`.toLowerCase();
  if (
    combined.includes('bangun gedung baru') ||
    combined.includes('pembangunan gedung baru') ||
    combined.includes('ruang kelas baru')
  ) {
    return 'Dilarang Permendikdasmen No. 8 Tahun 2026: Dana BOP PAUD tidak boleh digunakan untuk pembangunan gedung atau ruang baru.';
  }
  if (
    combined.includes('deposito') ||
    combined.includes('beli saham') ||
    combined.includes('investasi saham') ||
    combined.includes('dipinjamkan')
  ) {
    return 'Dilarang Permendikdasmen No. 8 Tahun 2026: Dana BOP PAUD dilarang disimpan untuk bunga/deposito, saham, atau dipinjamkan.';
  }
  if (
    combined.includes('tunjangan hari raya') ||
    /\bthr\b/.test(combined) ||
    combined.includes('bonus tahunan') ||
    combined.includes('sumbangan')
  ) {
    return 'Dilarang Permendikdasmen No. 8 Tahun 2026: Dana BOP PAUD tidak boleh digunakan untuk pembayaran THR, bonus, atau sumbangan.';
  }
  if (
    combined.includes('seragam pribadi') ||
    combined.includes('seragam guru') ||
    combined.includes('pakaian pribadi')
  ) {
    return 'Dilarang Permendikdasmen No. 8 Tahun 2026: Pembelian pakaian/seragam yang bukan pakaian inventaris satuan pendidikan tidak diperkenankan.';
  }
  return null;
}

export function validateRkasJuknis(
  school: AccountProfile,
  items: RkasItem[]
): JuknisValidationResult {
  const pagu = school.paguTahunan || 0;
  const schoolItems = items.filter((item) => item.npsn === school.id);

  const totalRencana = schoolItems.reduce((sum, i) => sum + i.jumlahTotal, 0);
  const totalTahap1 = schoolItems.reduce((sum, i) => sum + i.tahap1, 0);
  const totalTahap2 = schoolItems.reduce((sum, i) => sum + i.tahap2, 0);
  const sisaPagu = pagu - totalRencana;
  const persenTerencana = pagu > 0 ? (totalRencana / pagu) * 100 : 0;

  const statusSekolah: SchoolStatus = school.statusSekolah || 'SWASTA';
  const maxHonorPersen = getMaxHonorPersen(statusSekolah);

  const sumByKomponen = (kompId: string) =>
    schoolItems
      .filter((i) => i.komponenId === kompId)
      .reduce((s, i) => s + i.jumlahTotal, 0);

  const nominalPojokBaca = sumByKomponen('KOMP-02');
  const persenPojokBaca = pagu > 0 ? (nominalPojokBaca / pagu) * 100 : 0;
  const lulusPojokBaca = pagu > 0 && persenPojokBaca >= 5 - 0.0001;

  const nominalSarpras = sumByKomponen('KOMP-08');
  const persenSarpras = pagu > 0 ? (nominalSarpras / pagu) * 100 : 0;
  const lulusSarpras = persenSarpras <= 20 + 0.0001;

  const nominalHonor = sumByKomponen('KOMP-10');
  const persenHonor = pagu > 0 ? (nominalHonor / pagu) * 100 : 0;
  const lulusHonor = persenHonor <= maxHonorPersen + 0.0001;

  const lulusPagu = pagu > 0 && totalRencana <= pagu && totalRencana > 0;
  const lulusTahap1 = pagu > 0 && totalTahap1 <= pagu * 0.5 + 1;

  const checks: JuknisRuleCheck[] = [
    {
      kode: 'PAGU_TOTAL',
      judul: 'Batas Pagu Anggaran Tahunan',
      aturanText: 'Total RKAS tidak melebihi 100% Pagu BOP PAUD',
      nominalAktual: totalRencana,
      persenAktual: persenTerencana,
      batasPersen: 100,
      tipeBatas: 'EXACT_OR_MAX',
      lulus: lulusPagu,
      pesanStatus:
        totalRencana === 0
          ? 'Belum ada rincian kegiatan RKAS'
          : totalRencana > pagu
          ? `Melebihi pagu sebesar Rp ${(totalRencana - pagu).toLocaleString('id-ID')}`
          : sisaPagu === 0
          ? 'Teralokasi tepat 100% dari Pagu'
          : `Sesuai (Sisa belum dianggarkan Rp ${sisaPagu.toLocaleString('id-ID')})`,
    },
    {
      kode: 'KOMP_02_MIN_5',
      judul: 'Perpustakaan / Layanan Pojok Baca',
      aturanText: 'Wajib Minimal 5% dari Pagu BOP PAUD (Komponen 2)',
      nominalAktual: nominalPojokBaca,
      persenAktual: persenPojokBaca,
      batasPersen: 5,
      tipeBatas: 'MIN',
      lulus: lulusPojokBaca,
      pesanStatus: lulusPojokBaca
        ? `Memenuhi syarat minimal 5% (${persenPojokBaca.toFixed(1)}%)`
        : `Kurang dari 5% — minimal Rp ${Math.ceil(pagu * 0.05).toLocaleString('id-ID')}`,
    },
    {
      kode: 'KOMP_08_MAX_20',
      judul: 'Pemeliharaan Sarana dan Prasarana',
      aturanText: 'Wajib Maksimal 20% dari Pagu BOP PAUD (Komponen 8)',
      nominalAktual: nominalSarpras,
      persenAktual: persenSarpras,
      batasPersen: 20,
      tipeBatas: 'MAX',
      lulus: lulusSarpras,
      pesanStatus: lulusSarpras
        ? `Memenuhi batas maksimal 20% (${persenSarpras.toFixed(1)}%)`
        : `Melebihi 20% — maksimal Rp ${Math.floor(pagu * 0.2).toLocaleString('id-ID')}`,
    },
    {
      kode: 'KOMP_10_HONOR',
      judul: `Pembayaran Honor (${statusSekolah === 'NEGERI' ? 'Satuan Negeri' : 'Satuan Swasta'})`,
      aturanText:
        statusSekolah === 'NEGERI'
          ? 'Maksimal 20% untuk Satuan Pendidikan Negeri (Komponen 10)'
          : 'Maksimal 40% untuk Satuan Pendidikan Swasta (Komponen 10)',
      nominalAktual: nominalHonor,
      persenAktual: persenHonor,
      batasPersen: maxHonorPersen,
      tipeBatas: 'MAX',
      lulus: lulusHonor,
      pesanStatus: lulusHonor
        ? `Memenuhi batas maksimal ${maxHonorPersen}% ${statusSekolah === 'NEGERI' ? 'Negeri' : 'Swasta'} (${persenHonor.toFixed(1)}%)`
        : `Melebihi ${maxHonorPersen}% (${statusSekolah === 'NEGERI' ? 'Negeri' : 'Swasta'}) — maks Rp ${Math.floor((pagu * maxHonorPersen) / 100).toLocaleString('id-ID')}`,
    },
    {
      kode: 'TAHAP_1_50',
      judul: 'Proporsi Pencairan Tahap 1 (Jan–Jun)',
      aturanText: 'Alokasi Tahap 1 maksimal 50% dari Pagu Tahunan',
      nominalAktual: totalTahap1,
      persenAktual: pagu > 0 ? (totalTahap1 / pagu) * 100 : 0,
      batasPersen: 50,
      tipeBatas: 'MAX',
      lulus: lulusTahap1,
      pesanStatus: lulusTahap1
        ? `Alokasi Tahap 1 sesuai (${pagu > 0 ? ((totalTahap1 / pagu) * 100).toFixed(1) : '0.0'}%)`
        : `Alokasi Tahap 1 melebihi 50% (maks Rp ${Math.floor(pagu * 0.5).toLocaleString('id-ID')})`,
    },
  ];

  const perKomponen = KOMPONEN_BOP_10.map((komp) => {
    const nominal = sumByKomponen(komp.id);
    const persenPagu = pagu > 0 ? (nominal / pagu) * 100 : 0;
    let lulus = true;
    let catatanBatas: string | undefined;

    if (komp.id === 'KOMP-02') {
      lulus = lulusPojokBaca;
      catatanBatas = 'Min. 5%';
    } else if (komp.id === 'KOMP-08') {
      lulus = lulusSarpras;
      catatanBatas = 'Maks. 20%';
    } else if (komp.id === 'KOMP-10') {
      lulus = lulusHonor;
      catatanBatas = statusSekolah === 'NEGERI' ? 'Maks. 20% (Negeri)' : 'Maks. 40% (Swasta)';
    }

    return { komponen: komp, nominal, persenPagu, lulus, catatanBatas };
  });

  const perStandar = STANDAR_PENDIDIKAN_7.map((standar) => {
    const nominal = schoolItems
      .filter((i) => i.standarId === standar.id)
      .reduce((s, i) => s + i.jumlahTotal, 0);
    const persenPagu = pagu > 0 ? (nominal / pagu) * 100 : 0;
    return { standar, nominal, persenPagu };
  });

  const semuaAturanLulus = checks.every((c) => c.lulus);
  const siapDiajukan = semuaAturanLulus && totalRencana > 0;

  return {
    paguTahunan: pagu,
    totalRencana,
    sisaPagu,
    persenTerencana,
    totalTahap1,
    totalTahap2,
    semuaAturanLulus,
    siapDiajukan,
    checks,
    perKomponen,
    perStandar,
  };
}

export function formatRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'sekolah':
      return 'Operator / Bendahara Sekolah (NPSN)';
    case 'admin':
      return 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)';
  }
}
