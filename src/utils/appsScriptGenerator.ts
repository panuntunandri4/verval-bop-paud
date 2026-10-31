/**
 * Generator Proyek Lengkap Google Apps Script (Code.gs + Index.html)
 * SIM VERVAL RKAS & BOP PAUD — Permendikdasmen Nomor 8 Tahun 2026
 *
 * Dapat dijalankan:
 * 1. Sebagai Backend REST API (doGet / doPost) untuk aplikasi web & AppSheet
 * 2. Sebagai Aplikasi Web Mandiri (Standalone HtmlService Web App) langsung dari Google Sheets!
 */

export function generateAppsScriptCodeGs(params: {
  tahunAnggaran: number;
  webAppOriginUrl: string;
}): string {
  const { tahunAnggaran, webAppOriginUrl } = params;

  return `/**
 * ============================================================================
 * GOOGLE APPS SCRIPT (Code.gs) — SIM VERVAL RKAS & BOP PAUD TA ${tahunAnggaran}
 * Regulasi: Permendikdasmen Nomor 8 Tahun 2026 (Juknis Pengelolaan Dana BOSP)
 * ============================================================================
 *
 * CARA PASANG DI GOOGLE SHEETS:
 * 1. Buka Google Spreadsheet baru atau yang sudah ada.
 * 2. Klik menu Extensions (Ekstensi) -> Apps Script.
 * 3. Hapus isi Code.gs bawaan, lalu tempel seluruh kode Code.gs ini.
 * 4. Buat file HTML baru (+) bernama persis: Index  (otomatis menjadi Index.html),
 *    lalu tempel kode dari tab "Index.html" pada generator aplikasi.
 * 5. Klik tombol Jalankan (Run) pada fungsi "setupDatabaseSheets" untuk membuat
 *    7 Sheet Database otomatis beserta format dan rumus rekapitulasi.
 * 6. Klik Deploy -> New deployment -> Web app:
 *    - Execute as: Me (Saya)
 *    - Who has access: Anyone (Siapa saja)
 *    Salin URL Web App (.../exec) untuk dipakai langsung di browser atau
 *    dihubungkan ke Portal Web (${webAppOriginUrl}).
 */

const API_KEY = 'bop-paud-sync-${tahunAnggaran}';
const WEB_PORTAL_URL = '${webAppOriginUrl}';
const TAHUN_ANGGARAN = ${tahunAnggaran};

const TABS = {
  AKUN: 'Akun_Pengguna',
  RKAS: 'Perencanaan_RKAS',
  VERIF: 'Verifikasi_Dinas',
  BKU: 'Penatausahaan_BKU',
  REKAP: 'Rekap_7Standar_10Komponen',
  SHS: 'Referensi_SHS_Jepara',
  MASTER: 'Master_7Standar_10Komponen',
};

const STANDAR_7 = [
  ['STD-02', '02', '02 Standar Isi', 'Penyusunan KSP, modul ajar, perpustakaan/pojok baca & buku bacaan PAUD'],
  ['STD-03', '03', '03 Standar Proses', 'Penerimaan murid baru, pembelajaran & bermain, APE, kesehatan/gizi/kebersihan'],
  ['STD-04', '04', '04 Standar Tenaga Kependidikan', 'Pengembangan profesi pendidik dan tenaga kependidikan, PKG/Gugus PAUD'],
  ['STD-05', '05', '05 Standar Sarana Prasarana', 'Pemeliharaan ringan sarana dan prasarana ruang bermain & sanitasi anak'],
  ['STD-06', '06', '06 Standar Pengelolaan', 'Administrasi kegiatan satuan pendidikan, Dapodik, ARKAS & tata kelola'],
  ['STD-07', '07', '07 Standar Pembiayaan', 'Pembiayaan langganan daya dan jasa serta pembayaran honorarium PTK Non-ASN'],
  ['STD-08', '08', '08 Standar Penilaian', 'Evaluasi dan asesmen perkembangan anak, portofolio & laporan capaian'],
];

const KOMPONEN_10 = [
  ['KOMP-01', 1, 'Penerimaan Murid Baru', 'STD-03', 'Sesuai kebutuhan SPMB/PPDB PAUD'],
  ['KOMP-02', 2, 'Pengembangan Perpustakaan dan/atau Layanan Pojok Baca', 'STD-02', 'Wajib Minimal 5% Pagu'],
  ['KOMP-03', 3, 'Pelaksanaan Kegiatan Pembelajaran dan Bermain', 'STD-03', 'Prioritas APE ber-SNI & bahan bermain'],
  ['KOMP-04', 4, 'Pelaksanaan Kegiatan Evaluasi/Asesmen Pembelajaran dan Bermain', 'STD-08', 'Asesmen autentik & rapor PAUD'],
  ['KOMP-05', 5, 'Pelaksanaan Administrasi Kegiatan Satuan Pendidikan', 'STD-06', 'Dapodik, ARKAS, ATK & rapat kerja'],
  ['KOMP-06', 6, 'Pengembangan Profesi Pendidik dan Tenaga Kependidikan', 'STD-04', 'PKG, Gugus PAUD & komunitas belajar'],
  ['KOMP-07', 7, 'Pembiayaan Langganan Daya dan Jasa', 'STD-07', 'Listrik, air bersih & internet sekolah'],
  ['KOMP-08', 8, 'Pemeliharaan Sarana dan Prasarana', 'STD-05', 'Maksimal 20% Pagu (pemeliharaan ringan)'],
  ['KOMP-09', 9, 'Penyelenggaraan Kegiatan Kesehatan, Gizi, dan Kebersihan', 'STD-03', 'PMT lokal bergizi, DDTK, UKS & CTPS'],
  ['KOMP-10', 10, 'Pembayaran Honor', 'STD-07', 'Negeri Maksimal 20% | Swasta Maksimal 40%'],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SIM BOP PAUD 2026')
    .addItem('1. Siapkan 7 Tab Database Otomatis', 'setupDatabaseSheets')
    .addItem('2. Buka Aplikasi Web di Dalam Google Sheets', 'openModalApp')
    .addSeparator()
    .addItem('3. Hitung Ulang Audit Juknis (5% / 20% / Honor)', 'rebuildRekapJuknisSheet')
    .addItem('4. Bersihkan Data Contoh (Mode Produksi Resmi)', 'bersihkanDataContohProduksi')
    .addToUi();
}

function bersihkanDataContohProduksi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    'Aktifkan Mode Produksi Resmi',
    'Seluruh baris sekolah contoh, RKAS contoh, dan BKU contoh akan dihapus (Akun Admin & Referensi SHS Jepara tetap dipertahankan). Lanjutkan?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  const shAkun = ss.getSheetByName(TABS.AKUN);
  if (shAkun && shAkun.getLastRow() > 1) {
    const data = shAkun.getRange(2, 1, shAkun.getLastRow() - 1, 10).getValues();
    const adminsOnly = data.filter((r) => String(r[2] || '').toLowerCase() === 'admin');
    shAkun.getRange(2, 1, shAkun.getLastRow() - 1, 10).clearContent();
    if (adminsOnly.length > 0) {
      shAkun.getRange(2, 1, adminsOnly.length, 10).setValues(adminsOnly);
    }
  }

  [TABS.RKAS, TABS.VERIF, TABS.BKU, TABS.REKAP].forEach((tabName) => {
    const sh = ss.getSheetByName(tabName);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    }
  });

  ui.alert('Mode Produksi Resmi aktif. Silakan isi tab Akun_Pengguna dengan daftar NPSN riil.');
}

function openModalApp() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(1220)
    .setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(
    html,
    'SIM VERVAL RKAS & BOP PAUD — Permendikdasmen No. 8 Tahun 2026'
  );
}

/**
 * Membuat & memformat seluruh 7 Sheet Database di Google Spreadsheet aktif
 */
function setupDatabaseSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const ensureTab = (name, headers) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    sh.setFrozenRows(1);
    const headerRange = sh.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    return sh;
  };

  // 1. Akun_Pengguna
  const shAkun = ensureTab(TABS.AKUN, [
    'NPSN/ID',
    'Nama',
    'Peran (sekolah/admin)',
    'KataSandi',
    'Wilayah',
    'StatusSekolah',
    'JumlahSiswa',
    'PaguTahunan',
    'StatusRKAS',
    'StatusLaporan',
  ]);
  if (shAkun.getLastRow() === 1) {
    shAkun.getRange(2, 1, 3, 10).setValues([
      ['admin', 'Verifikator Admin Dinas (Disdikpora Kab. Jepara)', 'admin', 'admin', 'Kabupaten Jepara', '-', 0, 0, '-', '-'],
      ['20600001', 'TK Negeri Pembina Jepara', 'sekolah', '20600001', 'Kec. Jepara', 'NEGERI', 80, 48000000, 'DRAFT', 'BELUM_LAPOR'],
      ['20600002', 'TK Swasta Tunas Cendekia Tahunan', 'sekolah', '20600002', 'Kec. Tahunan', 'SWASTA', 65, 39000000, 'DISAHKAN', 'DIAJUKAN_TAHAP_1'],
    ]);
  }

  // 2. Perencanaan_RKAS
  ensureTab(TABS.RKAS, [
    'ID_Item',
    'NPSN',
    'Tahun',
    'Skema_BOP',
    'Bulan_Pelaksanaan',
    'Kode_Standar',
    'Standar_Pendidikan_7',
    'Kode_Komponen',
    'Komponen_BOP_PAUD_10',
    'Kode_SHS_Jepara',
    'Uraian_Kegiatan',
    'Spesifikasi',
    'Volume',
    'Satuan',
    'Harga_Satuan',
    'Batas_SHS_Jepara',
    'Jumlah_Total',
    'Alokasi_Tahap_1',
    'Alokasi_Tahap_2',
    'Status_Verifikasi_Item',
    'Catatan_Verifikator',
    'Terakhir_Diubah',
  ]);

  // 3. Verifikasi_Dinas
  ensureTab(TABS.VERIF, [
    'ID_Log',
    'Waktu',
    'NPSN',
    'Nama_Sekolah',
    'Aksi_Verifikasi',
    'Verifikator_ID',
    'Nama_Verifikator',
    'Level_Peran',
    'Catatan_Resmi',
  ]);

  // 4. Penatausahaan_BKU
  ensureTab(TABS.BKU, [
    'ID_BKU',
    'Tanggal',
    'NPSN',
    'Nomor_Bukti',
    'Jenis_Transaksi',
    'Tahap',
    'Kode_Standar',
    'Kode_Komponen',
    'Uraian_Transaksi',
    'Nominal_Rp',
    'Pajak_PPh_PPN_Rp',
    'Penerima_Penyedia',
  ]);

  // 5. Rekap_7Standar_10Komponen
  ensureTab(TABS.REKAP, [
    'NPSN',
    'Nama_Satuan_PAUD',
    'Status_Negeri_Swasta',
    'Wilayah',
    'Pagu_Tahunan_Rp',
    'Total_RKAS_Rp',
    'Realisasi_BKU_Rp',
    'Persen_Pojok_Baca_Min5',
    'Persen_Sarpras_Maks20',
    'Persen_Honor_Maks20Negeri_40Swasta',
    'Kepatuhan_Juknis_BOSP',
    'Status_RKAS',
  ]);

  // 6. Referensi_SHS_Jepara (Dikelola langsung di Google Sheets!)
  const shShs = ensureTab(TABS.SHS, [
    'ID_SHS',
    'Kode_Barang_Jepara',
    'Kategori',
    'Nama_Barang_Jasa',
    'Spesifikasi',
    'Satuan',
    'Harga_Satuan_Tertinggi_Rp',
    'Kode_Komponen_BOP',
    'Kode_Standar_PAUD',
  ]);
  if (shShs.getLastRow() === 1) {
    shShs.getRange(2, 1, 5, 9).setValues([
      ['SHS-01', '5.2.05.01.01', 'SSH', 'Buku Cerita Anak Bergambar PAUD Terkurasi', 'Full color kertas art paper aman anak', 'Eksemplar', 65000, 'KOMP-02', 'STD-02'],
      ['SHS-02', '5.1.02.01.01', 'SSH', 'Set Balok Kayu Edukatif Natural SNI', 'Kayu kering halus cat non-toksik isi 100 keping', 'Set', 650000, 'KOMP-03', 'STD-03'],
      ['SHS-03', '5.1.02.01.02', 'SSH', 'Kertas HVS F4 75 gsm Administrasi Sekolah', 'Kertas HVS 500 lembar per rim', 'Rim', 62000, 'KOMP-05', 'STD-06'],
      ['SHS-04', '5.1.02.03.03', 'HSPK', 'Pemeliharaan Ringan Ruang Bermain & Sanitasi Anak', 'Pengecatan ramah anak & perbaikan keran cuci tangan', 'Paket', 3000000, 'KOMP-08', 'STD-05'],
      ['SHS-05', '5.1.02.02.01', 'SBU', 'Honorarium Pendidik PAUD Non-ASN Terdaftar Dapodik', 'Negeri maks. 20% pagu | Swasta maks. 40% pagu', 'OB', 650000, 'KOMP-10', 'STD-07'],
    ]);
  }

  // 7. Master_7Standar_10Komponen
  const shMaster = ensureTab(TABS.MASTER, [
    'JENIS_REFERENSI',
    'KODE_ID',
    'NOMOR_KODE',
    'URAIAN_STANDAR_ATAU_KOMPONEN',
    'KETENTUAN_JUKNIS_PERMENDIKDASMEN_8_2026',
  ]);
  const masterRows = [
    ...STANDAR_7.map((s) => ['7_STANDAR_PENDIDIKAN', s[0], s[1], s[2], s[3]]),
    ...KOMPONEN_10.map((k) => ['10_KOMPONEN_BOP_PAUD', k[0], 'KOMP-' + String(k[1]).padStart(2, '0'), k[1] + '. ' + k[2], k[4]]),
  ];
  shMaster.getRange(2, 1, masterRows.length, 5).setValues(masterRows);

  rebuildRekapJuknisSheet();
  return { ok: true, spreadsheetUrl: ss.getUrl(), spreadsheetId: ss.getId() };
}

/**
 * Web App HTTP GET Handler:
 * - ?action=state -> Mengembalikan JSON seluruh database dari 7 Sheet (untuk API / Portal Web / AppSheet)
 * - Default -> Menampilkan antarmuka Web App mandiri (Index.html)
 */
function doGet(e) {
  const action = e && e.parameter ? String(e.parameter.action || '') : '';
  if (action === 'state' || action === 'json') {
    const key = e && e.parameter ? String(e.parameter.apiKey || '') : '';
    if (key && key !== API_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Invalid API Key' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const payload = readAllDatabaseFromSheets();
    return ContentService.createTextOutput(JSON.stringify({ ok: true, ...payload }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const tpl = HtmlService.createTemplateFromFile('Index');
  return tpl
    .evaluate()
    .setTitle('SIM VERVAL RKAS & BOP PAUD — Google Sheets & Apps Script')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Web App HTTP POST Handler:
 * Menerima sinkronisasi penuh (SYNC_ALL) maupun transaksi satuan dari Portal Web / AppSheet
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    if (body.apiKey && body.apiKey !== API_KEY) {
      return jsonResponse({ ok: false, error: 'Invalid API Key' });
    }

    const action = String(body.action || '');
    if (action === 'SYNC_ALL' && body.state) {
      writeFullStateToSheets(body.state);
      rebuildRekapJuknisSheet();
      return jsonResponse({ ok: true, message: 'Seluruh 7 tab Google Sheets berhasil diperbarui.' });
    }

    if (action === 'SAVE_RKAS_ITEM' && body.item) {
      gasSaveRkasItem(body.item);
      return jsonResponse({ ok: true, state: readAllDatabaseFromSheets() });
    }

    if (action === 'VERIFY_RKAS' && body.npsn) {
      gasVerifyRkas(body.npsn, body.keputusan, body.catatan, body.olehNama || 'Verifikator Admin');
      return jsonResponse({ ok: true, state: readAllDatabaseFromSheets() });
    }

    return jsonResponse({ ok: true, state: readAllDatabaseFromSheets() });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getRows(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function readAllDatabaseFromSheets() {
  setupDatabaseSheetsIfMissing();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const accounts = getRows(TABS.AKUN)
    .filter((r) => String(r[0] || '').trim() !== '')
    .map((r) => ({
      id: String(r[0]).trim(),
      nama: String(r[1] || '').trim(),
      peran: String(r[2] || '').toLowerCase().trim() === 'admin' ? 'admin' : 'sekolah',
      kataSandi: String(r[3] || r[0]).trim(),
      wilayah: String(r[4] || 'Kec. Jepara').trim(),
      statusSekolah: String(r[5] || '').toUpperCase().trim() === 'NEGERI' ? 'NEGERI' : 'SWASTA',
      jumlahSiswa: Number(r[6]) || 0,
      satuanBiaya: 600000,
      paguTahunan: Number(r[7]) || (Number(r[6]) || 0) * 600000,
      rkasStatus: String(r[8] || 'DRAFT').trim(),
      reportStatus: String(r[9] || 'BELUM_LAPOR').trim(),
    }));

  const standarByKode = {};
  STANDAR_7.forEach((s) => {
    standarByKode[s[1]] = s[0];
    standarByKode[s[0]] = s[0];
  });

  const rkasItems = getRows(TABS.RKAS)
    .filter((r) => String(r[0] || '').trim() !== '')
    .map((r) => {
      const rawStd = String(r[5] || '03').trim();
      return {
        id: String(r[0]).trim(),
        npsn: String(r[1]).trim(),
        tahunAnggaran: Number(r[2]) || TAHUN_ANGGARAN,
        skemaBop: String(r[3] || 'REGULER').trim(),
        bulanPelaksanaan: String(r[4] || 'Januari - Desember').trim(),
        standarId: standarByKode[rawStd] || 'STD-03',
        komponenId: String(r[7] || 'KOMP-03').trim(),
        kodeShs: String(r[9] || '') === '-' ? '' : String(r[9] || ''),
        uraianKegiatan: String(r[10] || '').trim(),
        spesifikasi: String(r[11] || '').trim(),
        volume: Number(r[12]) || 1,
        satuan: String(r[13] || 'Paket').trim(),
        hargaSatuan: Number(r[14]) || 0,
        batasHargaShs: Number(r[15]) || undefined,
        jumlahTotal: Number(r[16]) || 0,
        tahap1: Number(r[17]) || 0,
        tahap2: Number(r[18]) || 0,
        statusItem: String(r[19] || 'MENUNGGU').trim(),
        catatanVerifikator: String(r[20] || '').trim(),
        updatedAt: String(r[21] || new Date().toISOString()),
      };
    });

  const verificationLogs = getRows(TABS.VERIF)
    .filter((r) => String(r[0] || '').trim() !== '')
    .map((r) => ({
      id: String(r[0]).trim(),
      createdAt: String(r[1] || new Date().toISOString()),
      npsn: String(r[2]).trim(),
      namaSekolah: String(r[3] || '').trim(),
      aksi: String(r[4] || 'AJUKAN').trim(),
      olehId: String(r[5] || '').trim(),
      olehNama: String(r[6] || '').trim(),
      olehPeran: String(r[7] || 'admin').trim(),
      catatan: String(r[8] || '').trim(),
    }));

  const bkuTransactions = getRows(TABS.BKU)
    .filter((r) => String(r[0] || '').trim() !== '')
    .map((r) => ({
      id: String(r[0]).trim(),
      tanggal: String(r[1] || '').slice(0, 10),
      npsn: String(r[2]).trim(),
      nomorBukti: String(r[3] || '').trim(),
      jenis: String(r[4] || 'PENGELUARAN').trim(),
      tahap: Number(r[5]) === 2 ? 2 : 1,
      standarId: String(r[6] || '') === '-' ? undefined : String(r[6]),
      komponenId: String(r[7] || '') === '-' ? undefined : String(r[7]),
      uraian: String(r[8] || '').trim(),
      nominal: Number(r[9]) || 0,
      pajakPphPpn: Number(r[10]) || 0,
      penerimaToko: String(r[11] || '').trim(),
    }));

  const shsItems = getRows(TABS.SHS)
    .filter((r) => String(r[0] || '').trim() !== '')
    .map((r) => ({
      id: String(r[0]).trim(),
      kodeBarang: String(r[1] || '').trim(),
      kategori: String(r[2] || 'SSH').trim(),
      namaBarangJasa: String(r[3] || '').trim(),
      spesifikasi: String(r[4] || '').trim(),
      satuan: String(r[5] || 'Paket').trim(),
      hargaTertinggi: Number(r[6]) || 0,
      komponenId: String(r[7] || 'KOMP-03').trim(),
      standarId: String(r[8] || 'STD-03').trim(),
    }));

  return {
    spreadsheetId: ss.getId(),
    spreadsheetTitle: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    tahunAnggaran: TAHUN_ANGGARAN,
    accounts,
    rkasItems,
    verificationLogs,
    bkuTransactions,
    shsItems,
    standar7: STANDAR_7,
    komponen10: KOMPONEN_10,
  };
}

function setupDatabaseSheetsIfMissing() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(TABS.AKUN) || !ss.getSheetByName(TABS.RKAS)) {
    setupDatabaseSheets();
  }
}

function writeTableRows(sheetName, rows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return;
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }
  if (rows.length > 0) {
    sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function writeFullStateToSheets(state) {
  setupDatabaseSheetsIfMissing();
  const stdKode = {};
  const stdNama = {};
  STANDAR_7.forEach((s) => {
    stdKode[s[0]] = s[1];
    stdNama[s[0]] = s[2];
  });
  const kompNama = {};
  KOMPONEN_10.forEach((k) => {
    kompNama[k[0]] = k[1] + '. ' + k[2];
  });

  if (Array.isArray(state.accounts)) {
    writeTableRows(
      TABS.AKUN,
      state.accounts.map((a) => [
        a.id,
        a.nama,
        a.peran,
        a.kataSandi || a.id,
        a.wilayah || 'Kec. Jepara',
        a.statusSekolah || '-',
        a.jumlahSiswa || 0,
        a.paguTahunan || 0,
        a.rkasStatus || '-',
        a.reportStatus || '-',
      ])
    );
  }

  if (Array.isArray(state.rkasItems)) {
    writeTableRows(
      TABS.RKAS,
      state.rkasItems.map((i) => [
        i.id,
        i.npsn,
        i.tahunAnggaran || TAHUN_ANGGARAN,
        i.skemaBop || 'REGULER',
        i.bulanPelaksanaan || 'Januari - Desember',
        stdKode[i.standarId] || i.standarId,
        stdNama[i.standarId] || i.standarId,
        i.komponenId,
        kompNama[i.komponenId] || i.komponenId,
        i.kodeShs || '-',
        i.uraianKegiatan,
        i.spesifikasi,
        i.volume,
        i.satuan,
        i.hargaSatuan,
        i.batasHargaShs || '-',
        i.jumlahTotal,
        i.tahap1,
        i.tahap2,
        i.statusItem || 'MENUNGGU',
        i.catatanVerifikator || '',
        i.updatedAt || new Date().toISOString(),
      ])
    );
  }

  if (Array.isArray(state.verificationLogs)) {
    writeTableRows(
      TABS.VERIF,
      state.verificationLogs.map((l) => [
        l.id,
        l.createdAt,
        l.npsn,
        l.namaSekolah,
        l.aksi,
        l.olehId,
        l.olehNama,
        l.olehPeran,
        l.catatan,
      ])
    );
  }

  if (Array.isArray(state.bkuTransactions)) {
    writeTableRows(
      TABS.BKU,
      state.bkuTransactions.map((t) => [
        t.id,
        t.tanggal,
        t.npsn,
        t.nomorBukti,
        t.jenis,
        t.tahap,
        t.standarId || '-',
        t.komponenId || '-',
        t.uraian,
        t.nominal,
        t.pajakPphPpn || 0,
        t.penerimaToko || '',
      ])
    );
  }

  if (Array.isArray(state.shsItems) && state.shsItems.length > 0) {
    writeTableRows(
      TABS.SHS,
      state.shsItems.map((s) => [
        s.id,
        s.kodeBarang,
        s.kategori,
        s.namaBarangJasa,
        s.spesifikasi,
        s.satuan,
        s.hargaTertinggi,
        s.komponenId,
        s.standarId,
      ])
    );
  }
}

/**
 * Menghitung ulang Rekap_7Standar_10Komponen sesuai Permendikdasmen No. 8 Tahun 2026:
 * - Pojok Baca Min 5%
 * - Pemeliharaan Sarpras Maks 20%
 * - Honorarium Negeri Maks 20% & Swasta Maks 40%
 */
function rebuildRekapJuknisSheet() {
  const db = readAllDatabaseFromSheets();
  const schools = db.accounts.filter((a) => a.peran === 'sekolah');
  const rows = schools.map((sch) => {
    const pagu = Number(sch.paguTahunan) || 0;
    const items = db.rkasItems.filter((i) => i.npsn === sch.id);
    const totalRkas = items.reduce((s, i) => s + (Number(i.jumlahTotal) || 0), 0);
    const realisasi = db.bkuTransactions
      .filter((t) => t.npsn === sch.id && t.jenis === 'PENGELUARAN')
      .reduce((s, t) => s + (Number(t.nominal) || 0), 0);

    const sumKomp = (kid) =>
      items.filter((i) => i.komponenId === kid).reduce((s, i) => s + (Number(i.jumlahTotal) || 0), 0);

    const pBaca = pagu > 0 ? (sumKomp('KOMP-02') / pagu) * 100 : 0;
    const pSarpras = pagu > 0 ? (sumKomp('KOMP-08') / pagu) * 100 : 0;
    const pHonor = pagu > 0 ? (sumKomp('KOMP-10') / pagu) * 100 : 0;
    const maxHonor = sch.statusSekolah === 'NEGERI' ? 20 : 40;

    const lulus =
      totalRkas > 0 &&
      totalRkas <= pagu &&
      pBaca >= 5 &&
      pSarpras <= 20 &&
      pHonor <= maxHonor;

    return [
      sch.id,
      sch.nama,
      sch.statusSekolah,
      sch.wilayah,
      pagu,
      totalRkas,
      realisasi,
      pBaca.toFixed(2) + '%',
      pSarpras.toFixed(2) + '%',
      pHonor.toFixed(2) + '% (Maks ' + maxHonor + '%)',
      lulus ? 'SESUAI PERMENDIKDASMEN 8/2026' : 'PERLU PENYESUAIAN',
      sch.rkasStatus || 'DRAFT',
    ];
  });

  writeTableRows(TABS.REKAP, rows);
  return rows.length;
}

// ============================================================================
// FUNGSI RPC NATIVE UNTUK INDEX.HTML (google.script.run)
// ============================================================================

function gasLogin(userId, password) {
  const db = readAllDatabaseFromSheets();
  const cleanId = String(userId || '').trim();
  const cleanPw = String(password || '').trim();
  const found = db.accounts.find(
    (a) => a.id.toLowerCase() === cleanId.toLowerCase() && String(a.kataSandi) === cleanPw
  );
  if (!found) {
    throw new Error('NPSN / ID atau Kata Sandi tidak sesuai pada tab Akun_Pengguna.');
  }
  return { user: found, db };
}

function gasSaveRkasItem(payload) {
  const db = readAllDatabaseFromSheets();
  const vol = Number(payload.volume) || 1;
  const harga = Number(payload.hargaSatuan) || 0;
  const total = vol * harga;
  const t1 = payload.tahap1 !== undefined ? Number(payload.tahap1) : Math.floor(total / 2);
  const t2 = payload.tahap2 !== undefined ? Number(payload.tahap2) : total - t1;

  const newItem = {
    id: payload.id || 'RKAS-' + payload.npsn + '-' + String(new Date().getTime()).slice(-5),
    npsn: String(payload.npsn),
    tahunAnggaran: TAHUN_ANGGARAN,
    skemaBop: payload.skemaBop || 'REGULER',
    bulanPelaksanaan: payload.bulanPelaksanaan || 'Januari - Desember',
    standarId: payload.standarId || 'STD-03',
    komponenId: payload.komponenId || 'KOMP-03',
    kodeShs: payload.kodeShs || '-',
    uraianKegiatan: String(payload.uraianKegiatan || '').trim(),
    spesifikasi: String(payload.spesifikasi || '-').trim(),
    volume: vol,
    satuan: String(payload.satuan || 'Paket').trim(),
    hargaSatuan: harga,
    batasHargaShs: payload.batasHargaShs || '',
    jumlahTotal: total,
    tahap1: t1,
    tahap2: t2,
    statusItem: 'MENUNGGU',
    catatanVerifikator: '',
    updatedAt: new Date().toISOString(),
  };

  const idx = db.rkasItems.findIndex((i) => i.id === newItem.id);
  if (idx >= 0) db.rkasItems[idx] = newItem;
  else db.rkasItems.push(newItem);

  writeFullStateToSheets(db);
  rebuildRekapJuknisSheet();
  return readAllDatabaseFromSheets();
}

function gasDeleteRkasItem(itemId) {
  const db = readAllDatabaseFromSheets();
  db.rkasItems = db.rkasItems.filter((i) => i.id !== String(itemId));
  writeFullStateToSheets(db);
  rebuildRekapJuknisSheet();
  return readAllDatabaseFromSheets();
}

function gasSubmitRkas(npsn) {
  const db = readAllDatabaseFromSheets();
  const sch = db.accounts.find((a) => a.id === String(npsn));
  if (!sch) throw new Error('Sekolah tidak ditemukan.');
  sch.rkasStatus = 'DIAJUKAN';
  db.verificationLogs.unshift({
    id: 'LOG-' + new Date().getTime(),
    createdAt: new Date().toISOString(),
    npsn: sch.id,
    namaSekolah: sch.nama,
    aksi: 'AJUKAN',
    olehId: sch.id,
    olehNama: sch.nama,
    olehPeran: 'sekolah',
    catatan: 'Pengajuan RKAS BOP PAUD dari Aplikasi Google Sheets',
  });
  writeFullStateToSheets(db);
  rebuildRekapJuknisSheet();
  return readAllDatabaseFromSheets();
}

function gasVerifyRkas(npsn, keputusan, catatan, verifikatorNama) {
  const db = readAllDatabaseFromSheets();
  const sch = db.accounts.find((a) => a.id === String(npsn));
  if (!sch) throw new Error('Sekolah tidak ditemukan.');
  sch.rkasStatus = keputusan === 'SAHKAN' ? 'DISAHKAN' : 'PERLU_REVISI';
  if (keputusan === 'SAHKAN') {
    db.rkasItems.forEach((i) => {
      if (i.npsn === sch.id) i.statusItem = 'SESUAI';
    });
  }
  db.verificationLogs.unshift({
    id: 'LOG-' + new Date().getTime(),
    createdAt: new Date().toISOString(),
    npsn: sch.id,
    namaSekolah: sch.nama,
    aksi: keputusan === 'SAHKAN' ? 'SAHKAN' : 'REVISI',
    olehId: 'admin',
    olehNama: verifikatorNama || 'Verifikator Admin Dinas',
    olehPeran: 'admin',
    catatan: String(catatan || ''),
  });
  writeFullStateToSheets(db);
  rebuildRekapJuknisSheet();
  return readAllDatabaseFromSheets();
}
`;
}

export function generateAppsScriptIndexHtml(params: {
  tahunAnggaran: number;
}): string {
  const { tahunAnggaran } = params;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>SIM VERVAL RKAS & BOP PAUD ${tahunAnggaran}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
    .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, monospace; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <!-- LOGIN VIEW -->
  <div id="loginView" class="max-w-md mx-auto mt-16 bg-white border border-slate-200 rounded-xl p-6">
    <p class="text-xs font-semibold text-blue-700">Google Sheets & Apps Script Native Web App</p>
    <h1 class="text-xl font-bold mt-1">SIM VERVAL RKAS & BOP PAUD ${tahunAnggaran}</h1>
    <p class="text-xs text-slate-500 mt-1">Permendikdasmen No. 8 Tahun 2026 · Sekolah login dengan NPSN · Dinas 1 Level Admin</p>
    <form onsubmit="handleLogin(event)" class="mt-5 space-y-3">
      <div>
        <label class="block text-xs font-semibold text-slate-700">Nomor NPSN / ID Admin Dinas</label>
        <input id="loginId" required placeholder="Masukkan 8 digit NPSN atau ID Admin" class="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mono" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700">Kata Sandi</label>
        <input id="loginPw" type="password" required placeholder="Masukkan kata sandi" class="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mono" />
      </div>
      <div id="loginErr" class="hidden text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5"></div>
      <button id="btnLogin" type="submit" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg py-2.5 text-xs">
        Masuk ke Portal Resmi
      </button>
    </form>
  </div>

  <!-- MAIN WORKSPACE -->
  <div id="appView" class="hidden">
    <header class="bg-slate-900 text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 no-print">
      <div>
        <div class="text-sm font-bold">SIM VERVAL RKAS & BOP PAUD — GOOGLE SHEETS</div>
        <div id="userInfo" class="text-xs text-slate-300"></div>
      </div>
      <div class="flex items-center gap-2">
        <select id="schoolPicker" onchange="renderAll()" class="hidden bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5"></select>
        <button onclick="window.print()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold">Cetak Lembar Pengesahan</button>
        <button onclick="logout()" class="bg-red-700 hover:bg-red-800 px-3 py-1.5 rounded-lg text-xs font-semibold">Keluar</button>
      </div>
    </header>

    <main class="max-w-6xl mx-auto p-6 space-y-6">
      <!-- KPI CARDS -->
      <div id="kpiGrid" class="grid grid-cols-1 sm:grid-cols-4 gap-4"></div>

      <!-- INPUT PERENCANAAN / RKAS FORM (PERMENDIKDASMEN 8/2026) -->
      <div id="inputCard" class="bg-white border border-slate-200 rounded-xl p-5 space-y-4 no-print">
        <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold">Input Perencanaan / RKAS (Permendikdasmen No. 8 Tahun 2026)</h2>
            <p class="text-xs text-slate-500">Data langsung tersimpan ke tab Perencanaan_RKAS & Rekap_7Standar_10Komponen di Google Sheets</p>
          </div>
        </div>
        <form onsubmit="handleSaveRkas(event)" class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label class="font-semibold">10 Komponen Penggunaan BOP PAUD</label>
            <select id="fKomponen" onchange="syncDefaultStandar()" class="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2"></select>
          </div>
          <div>
            <label class="font-semibold">7 Standar Pendidikan (02–08)</label>
            <select id="fStandar" class="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2"></select>
          </div>
          <div>
            <label class="font-semibold">Referensi SHS dari Tab Google Sheets</label>
            <select id="fShs" onchange="applyShs()" class="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2"></select>
          </div>
          <div class="md:col-span-2">
            <label class="font-semibold">Uraian Kegiatan RKAS</label>
            <input id="fUraian" required placeholder="Contoh: Pengadaan Buku Cerita Pojok Baca PAUD" class="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2" />
          </div>
          <div>
            <label class="font-semibold">Spesifikasi</label>
            <input id="fSpec" placeholder="Spesifikasi barang/kegiatan" class="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2" />
          </div>
          <div>
            <label class="font-semibold">Volume & Satuan</label>
            <div class="mt-1 flex gap-2">
              <input id="fVol" type="number" min="1" value="1" required class="w-24 border border-slate-300 rounded-lg px-2.5 py-2 mono" />
              <input id="fSatuan" value="Paket" required class="flex-1 border border-slate-300 rounded-lg px-2.5 py-2" />
            </div>
          </div>
          <div>
            <label class="font-semibold">Harga Satuan (Rp)</label>
            <input id="fHarga" type="number" min="1000" value="500000" required class="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 mono" />
          </div>
          <div class="flex items-end gap-2">
            <button type="submit" class="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg py-2 px-4">
              + Simpan Kegiatan ke Google Sheets
            </button>
          </div>
        </form>
      </div>

      <!-- VERIFICATION PANEL FOR ADMIN DINAS -->
      <div id="adminPanel" class="hidden bg-white border border-slate-200 rounded-xl p-5 space-y-3 no-print">
        <h2 class="text-sm font-bold">Keputusan Verifikator Admin Dinas Pendidikan</h2>
        <input id="adminNote" placeholder="Catatan pengesahan atau instruksi revisi untuk sekolah..." class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs" />
        <div class="flex gap-2 justify-end">
          <button onclick="verifySchool('REVISI')" class="border border-red-300 text-red-700 font-semibold px-4 py-2 rounded-lg text-xs">Kembalikan untuk Revisi</button>
          <button onclick="verifySchool('SAHKAN')" class="bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-xs">Sahkan RKAS Sekolah</button>
        </div>
      </div>

      <!-- RKAS TABLE -->
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-sm font-bold">Kertas Kerja RKAS & Validasi Permendikdasmen No. 8 Tahun 2026</h3>
          <button id="btnAjukan" onclick="submitRkas()" class="no-print bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg">
            Ajukan Verifikasi ke Dinas
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th class="p-3">Komponen & Standar (02–08)</th>
                <th class="p-3">Uraian Kegiatan</th>
                <th class="p-3 text-right">Vol × Harga</th>
                <th class="p-3 text-right">Jumlah Total</th>
                <th class="p-3 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody id="rkasBody" class="divide-y divide-slate-200"></tbody>
          </table>
        </div>
      </div>

      <!-- SIGNATURE BLOCK FOR PRINT -->
      <div class="bg-white border border-slate-200 rounded-xl p-6 text-xs text-center space-y-6">
        <div class="grid grid-cols-3 gap-4">
          <div><p>Menyetujui,<br/>Ketua Komite Sekolah</p><div class="h-14"></div><p class="font-bold underline">( ............................ )</p></div>
          <div><p>Menetapkan,<br/>Kepala Satuan PAUD</p><div class="h-14"></div><p class="font-bold underline">( ............................ )</p></div>
          <div><p>Jepara, ....................<br/>Bendahara BOP PAUD</p><div class="h-14"></div><p class="font-bold underline">( ............................ )</p></div>
        </div>
        <div class="pt-2">
          <p>Mengetahui,<br/>Kepala Dinas Pendidikan Pemuda dan Olahraga</p>
          <div class="h-14"></div>
          <p class="font-bold underline">( ........................................ )</p>
        </div>
      </div>
    </main>
  </div>

  <script>
    let STATE = null;
    let USER = null;
    const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');

    function handleLogin(e) {
      e.preventDefault();
      const id = document.getElementById('loginId').value;
      const pw = document.getElementById('loginPw').value;
      document.getElementById('btnLogin').textContent = 'Memeriksa tab Akun_Pengguna...';
      google.script.run
        .withSuccessHandler((res) => {
          USER = res.user;
          STATE = res.db;
          document.getElementById('loginView').classList.add('hidden');
          document.getElementById('appView').classList.remove('hidden');
          initSelectors();
          renderAll();
        })
        .withFailureHandler((err) => {
          const el = document.getElementById('loginErr');
          el.textContent = err.message || String(err);
          el.classList.remove('hidden');
          document.getElementById('btnLogin').textContent = 'Masuk dari Database Google Sheets';
        })
        .gasLogin(id, pw);
    }

    function logout() {
      USER = null;
      document.getElementById('appView').classList.add('hidden');
      document.getElementById('loginView').classList.remove('hidden');
      document.getElementById('btnLogin').textContent = 'Masuk dari Database Google Sheets';
    }

    function initSelectors() {
      const fKomp = document.getElementById('fKomponen');
      fKomp.innerHTML = STATE.komponen10.map(k => '<option value="'+k[0]+'">'+k[1]+'. '+k[2]+'</option>').join('');
      const fStd = document.getElementById('fStandar');
      fStd.innerHTML = STATE.standar7.map(s => '<option value="'+s[0]+'">'+s[2]+'</option>').join('');
      const fShs = document.getElementById('fShs');
      fShs.innerHTML = '<option value="">-- Ketik Manual / Pilih SHS Sheet --</option>' +
        STATE.shsItems.map(s => '<option value="'+s.id+'">['+s.kategori+'] '+s.namaBarangJasa+' ('+rp(s.hargaTertinggi)+')</option>').join('');

      const picker = document.getElementById('schoolPicker');
      const schools = STATE.accounts.filter(a => a.peran === 'sekolah');
      if (USER.peran === 'admin') {
        picker.classList.remove('hidden');
        picker.innerHTML = schools.map(s => '<option value="'+s.id+'">'+s.id+' - '+s.nama+' ('+s.statusSekolah+')</option>').join('');
        document.getElementById('adminPanel').classList.remove('hidden');
      } else {
        picker.classList.add('hidden');
        picker.innerHTML = '<option value="'+USER.id+'">'+USER.nama+'</option>';
        document.getElementById('adminPanel').classList.add('hidden');
      }
      syncDefaultStandar();
    }

    function syncDefaultStandar() {
      const kid = document.getElementById('fKomponen').value;
      const found = STATE.komponen10.find(k => k[0] === kid);
      if (found) document.getElementById('fStandar').value = found[3];
    }

    function applyShs() {
      const sid = document.getElementById('fShs').value;
      const s = STATE.shsItems.find(x => x.id === sid);
      if (!s) return;
      document.getElementById('fKomponen').value = s.komponenId;
      document.getElementById('fStandar').value = s.standarId;
      document.getElementById('fUraian').value = s.namaBarangJasa;
      document.getElementById('fSpec').value = s.spesifikasi;
      document.getElementById('fSatuan').value = s.satuan;
      document.getElementById('fHarga').value = s.hargaTertinggi;
    }

    function getActiveSchool() {
      const npsn = USER.peran === 'sekolah' ? USER.id : document.getElementById('schoolPicker').value;
      return STATE.accounts.find(a => a.id === npsn) || STATE.accounts.find(a => a.peran === 'sekolah');
    }

    function renderAll() {
      const sch = getActiveSchool();
      if (!sch) return;
      document.getElementById('userInfo').textContent = USER.nama + ' (' + USER.id + ') · Aktif: ' + sch.nama + ' [' + sch.statusSekolah + ']';
      const items = STATE.rkasItems.filter(i => i.npsn === sch.id);
      const pagu = Number(sch.paguTahunan) || 0;
      const total = items.reduce((s, i) => s + Number(i.jumlahTotal || 0), 0);
      const sumK = (kid) => items.filter(i => i.komponenId === kid).reduce((s, i) => s + Number(i.jumlahTotal || 0), 0);
      const pBaca = pagu > 0 ? (sumK('KOMP-02') / pagu) * 100 : 0;
      const pHonor = pagu > 0 ? (sumK('KOMP-10') / pagu) * 100 : 0;
      const maxHonor = sch.statusSekolah === 'NEGERI' ? 20 : 40;

      document.getElementById('kpiGrid').innerHTML = [
        ['Pagu BOP PAUD', rp(pagu), 'Status: ' + sch.statusSekolah],
        ['Total Rencana RKAS', rp(total), 'Sisa: ' + rp(pagu - total)],
        ['Pojok Baca (Min 5%)', pBaca.toFixed(1) + '%', pBaca >= 5 ? 'Memenuhi >= 5%' : 'Kurang dari 5%'],
        ['Honorarium (Maks '+maxHonor+'%)', pHonor.toFixed(1) + '%', pHonor <= maxHonor ? 'Memenuhi <= '+maxHonor+'%' : 'Melebihi '+maxHonor+'%']
      ].map(c => '<div class="bg-white border border-slate-200 rounded-xl p-4"><div class="text-xs text-slate-500">'+c[0]+'</div><div class="text-lg font-bold mono mt-1">'+c[1]+'</div><div class="text-[11px] text-slate-600 mt-1">'+c[2]+'</div></div>').join('');

      const stdMap = {}; STATE.standar7.forEach(s => stdMap[s[0]] = s[2]);
      const kompMap = {}; STATE.komponen10.forEach(k => kompMap[k[0]] = k[1] + '. ' + k[2]);

      document.getElementById('rkasBody').innerHTML = items.length === 0
        ? '<tr><td colspan="5" class="p-6 text-center text-slate-500">Belum ada kegiatan di tab Perencanaan_RKAS untuk NPSN ' + sch.id + '</td></tr>'
        : items.map(i => '<tr>' +
            '<td class="p-3"><div class="font-semibold">'+(kompMap[i.komponenId]||i.komponenId)+'</div><div class="text-[11px] text-slate-500">'+(stdMap[i.standarId]||i.standarId)+'</div></td>' +
            '<td class="p-3"><div class="font-medium">'+i.uraianKegiatan+'</div><div class="text-[11px] text-slate-500">'+i.spesifikasi+'</div></td>' +
            '<td class="p-3 text-right mono">'+i.volume+' '+i.satuan+' × '+rp(i.hargaSatuan)+'</td>' +
            '<td class="p-3 text-right font-bold mono">'+rp(i.jumlahTotal)+'</td>' +
            '<td class="p-3 text-right no-print"><button onclick="delItem(\\''+i.id+'\\')" class="text-red-600 hover:underline font-semibold">Hapus</button></td>' +
          '</tr>').join('');
    }

    function handleSaveRkas(e) {
      e.preventDefault();
      const sch = getActiveSchool();
      const payload = {
        npsn: sch.id,
        komponenId: document.getElementById('fKomponen').value,
        standarId: document.getElementById('fStandar').value,
        uraianKegiatan: document.getElementById('fUraian').value,
        spesifikasi: document.getElementById('fSpec').value,
        volume: Number(document.getElementById('fVol').value),
        satuan: document.getElementById('fSatuan').value,
        hargaSatuan: Number(document.getElementById('fHarga').value),
      };
      google.script.run.withSuccessHandler((db) => { STATE = db; renderAll(); e.target.reset(); syncDefaultStandar(); }).gasSaveRkasItem(payload);
    }

    function delItem(id) {
      google.script.run.withSuccessHandler((db) => { STATE = db; renderAll(); }).gasDeleteRkasItem(id);
    }

    function submitRkas() {
      const sch = getActiveSchool();
      google.script.run.withSuccessHandler((db) => { STATE = db; renderAll(); }).gasSubmitRkas(sch.id);
    }

    function verifySchool(keputusan) {
      const sch = getActiveSchool();
      const note = document.getElementById('adminNote').value;
      google.script.run.withSuccessHandler((db) => { STATE = db; renderAll(); }).gasVerifyRkas(sch.id, keputusan, note, USER.nama);
    }
  </script>
</body>
</html>`;
}
