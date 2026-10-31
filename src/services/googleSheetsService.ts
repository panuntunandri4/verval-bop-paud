import { getAccessToken } from './googleAuth';
import {
  AppDatabaseState,
  KOMPONEN_BOP_10,
  STANDAR_PENDIDIKAN_7,
  validateRkasJuknis,
} from '../types/bop';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetTitles: string[];
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }
  return token;
}

export async function getSpreadsheetMetadata(
  spreadsheetIdOrUrl: string
): Promise<SpreadsheetMetadata> {
  const token = await requireToken();
  const id = extractSpreadsheetId(spreadsheetIdOrUrl);
  const res = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(id)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `Gagal membaca metadata Google Sheets (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet Tanpa Judul',
    spreadsheetUrl:
      data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheetTitles: (data.sheets || []).map(
      (s: { properties?: { title?: string } }) => s.properties?.title || ''
    ),
  };
}

export async function createMasterBopSpreadsheet(
  tahunAnggaran: number
): Promise<SpreadsheetMetadata> {
  const token = await requireToken();
  const title = `SIM VERVAL RKAS & BOP PAUD ${tahunAnggaran}`;
  const tabNames = [
    'Akun_Pengguna',
    'Perencanaan_RKAS',
    'Verifikasi_Dinas',
    'Penatausahaan_BKU',
    'Rekap_7Standar_10Komponen',
    'Referensi_SHS_Jepara',
    'Master_7Standar_10Komponen',
  ];

  const res = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: tabNames.map((tabTitle) => ({
        properties: {
          title: tabTitle,
          gridProperties: { frozenRowCount: 1 },
        },
      })),
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `Gagal membuat Spreadsheet baru (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || title,
    spreadsheetUrl:
      data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheetTitles: tabNames,
  };
}

async function ensureRequiredTabs(
  spreadsheetId: string,
  existingTitles: string[],
  requiredTitles: string[],
  token: string
): Promise<void> {
  const missing = requiredTitles.filter((t) => !existingTitles.includes(t));
  if (missing.length === 0) return;

  const requests = missing.map((title) => ({
    addSheet: {
      properties: {
        title,
        gridProperties: { frozenRowCount: 1 },
      },
    },
  }));

  const res = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || 'Gagal menyiapkan tab di Google Spreadsheet'
    );
  }
}

export async function syncDatabaseToGoogleSheets(
  spreadsheetIdOrUrl: string,
  state: AppDatabaseState
): Promise<{ updatedSheets: number; totalRows: number; metadata: SpreadsheetMetadata }> {
  const token = await requireToken();
  const metadata = await getSpreadsheetMetadata(spreadsheetIdOrUrl);
  const spreadsheetId = metadata.spreadsheetId;

  const requiredTabs = [
    'Akun_Pengguna',
    'Perencanaan_RKAS',
    'Verifikasi_Dinas',
    'Penatausahaan_BKU',
    'Rekap_7Standar_10Komponen',
    'Referensi_SHS_Jepara',
    'Master_7Standar_10Komponen',
  ];

  await ensureRequiredTabs(spreadsheetId, metadata.sheetTitles, requiredTabs, token);

  const standarMap = new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, `${s.kode} ${s.nama}`]));
  const standarKodeMap = new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, s.kode]));
  const komponenMap = new Map(KOMPONEN_BOP_10.map((k) => [k.id, `${k.nomor}. ${k.nama}`]));

  // 1. Akun_Pengguna (compatible with VERVAL_ARKAS_2027 CSV schema + extended fields)
  const akunRows = [
    [
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
    ],
    ...state.accounts.map((acc) => [
      acc.id,
      acc.nama,
      acc.peran === 'sekolah' ? 'sekolah' : acc.peran,
      acc.kataSandi || '***',
      acc.wilayah,
      acc.statusSekolah || '-',
      acc.jumlahSiswa ?? 0,
      acc.paguTahunan ?? 0,
      acc.rkasStatus || '-',
      acc.reportStatus || '-',
    ]),
  ];

  // 2. Perencanaan_RKAS (Permendikdasmen No. 8 Tahun 2026)
  const rkasRows = [
    [
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
    ],
    ...state.rkasItems.map((item) => [
      item.id,
      item.npsn,
      item.tahunAnggaran,
      item.skemaBop || 'REGULER',
      item.bulanPelaksanaan || 'Januari - Desember',
      standarKodeMap.get(item.standarId) || item.standarId,
      standarMap.get(item.standarId) || item.standarId,
      item.komponenId,
      komponenMap.get(item.komponenId) || item.komponenId,
      item.kodeShs || '-',
      item.uraianKegiatan,
      item.spesifikasi,
      item.volume,
      item.satuan,
      item.hargaSatuan,
      item.batasHargaShs || '-',
      item.jumlahTotal,
      item.tahap1,
      item.tahap2,
      item.statusItem,
      item.catatanVerifikator || '',
      item.updatedAt,
    ]),
  ];

  // 3. Verifikasi_Dinas
  const verifRows = [
    [
      'ID_Log',
      'Waktu',
      'NPSN',
      'Nama_Sekolah',
      'Aksi_Verifikasi',
      'Verifikator_ID',
      'Nama_Verifikator',
      'Level_Peran',
      'Catatan_Resmi',
    ],
    ...state.verificationLogs.map((log) => [
      log.id,
      log.createdAt,
      log.npsn,
      log.namaSekolah,
      log.aksi,
      log.olehId,
      log.olehNama,
      log.olehPeran,
      log.catatan,
    ]),
  ];

  // 4. Penatausahaan_BKU
  const bkuRows = [
    [
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
    ],
    ...state.bkuTransactions.map((tx) => [
      tx.id,
      tx.tanggal,
      tx.npsn,
      tx.nomorBukti,
      tx.jenis,
      tx.tahap,
      tx.standarId || '-',
      tx.komponenId || '-',
      tx.uraian,
      tx.nominal,
      tx.pajakPphPpn,
      tx.penerimaToko,
    ]),
  ];

  // 5. Rekap_7Standar_10Komponen (Juknis BOSP Audit per School)
  const schools = state.accounts.filter((a) => a.peran === 'sekolah');
  const rekapRows = [
    [
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
    ],
    ...schools.map((sch) => {
      const val = validateRkasJuknis(sch, state.rkasItems);
      const realisasi = state.bkuTransactions
        .filter((t) => t.npsn === sch.id && t.jenis === 'PENGELUARAN')
        .reduce((s, t) => s + t.nominal, 0);
      const pBaca = val.perKomponen.find((k) => k.komponen.id === 'KOMP-02')?.persenPagu || 0;
      const pSarpras = val.perKomponen.find((k) => k.komponen.id === 'KOMP-08')?.persenPagu || 0;
      const pHonor = val.perKomponen.find((k) => k.komponen.id === 'KOMP-10')?.persenPagu || 0;
      return [
        sch.id,
        sch.nama,
        sch.statusSekolah || 'SWASTA',
        sch.wilayah,
        val.paguTahunan,
        val.totalRencana,
        realisasi,
        `${pBaca.toFixed(2)}%`,
        `${pSarpras.toFixed(2)}%`,
        `${pHonor.toFixed(2)}%`,
        val.semuaAturanLulus ? 'SESUAI JUKNIS BOSP' : 'PERLU PENYESUAIAN',
        sch.rkasStatus || 'DRAFT',
      ];
    }),
  ];

  // 6. Referensi_SHS_Jepara
  const shsRows = [
    [
      'ID_SHS',
      'Kode_Barang_Jepara',
      'Kategori',
      'Nama_Barang_Jasa',
      'Spesifikasi',
      'Satuan',
      'Harga_Satuan_Tertinggi_Rp',
      'Kode_Komponen_BOP',
      'Kode_Standar_PAUD',
    ],
    ...(state.shsItems || []).map((s) => [
      s.id,
      s.kodeBarang,
      s.kategori,
      s.namaBarangJasa,
      s.spesifikasi,
      s.satuan,
      s.hargaTertinggi,
      s.komponenId,
      s.standarId,
    ]),
  ];

  // 7. Master_7Standar_10Komponen (Permendikdasmen No. 8 Tahun 2026 Lookup)
  const masterRefRows: (string | number)[][] = [
    ['JENIS_REFERENSI', 'KODE_ID', 'NOMOR_KODE', 'URAIAN_STANDAR_ATAU_KOMPONEN', 'KETENTUAN_JUKNIS_PERMENDIKDASMEN_8_2026'],
    ...STANDAR_PENDIDIKAN_7.map((s) => [
      '7_STANDAR_PENDIDIKAN',
      s.id,
      s.kode,
      `${s.kode} ${s.nama}`,
      s.deskripsi,
    ]),
    ...KOMPONEN_BOP_10.map((k) => [
      '10_KOMPONEN_BOP_PAUD',
      k.id,
      `KOMP-${String(k.nomor).padStart(2, '0')}`,
      `${k.nomor}. ${k.nama}`,
      k.aturanKetentuan,
    ]),
  ];

  // Clear existing ranges first so stale rows don't linger
  await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: requiredTabs.map((tab) => `'${tab}'!A1:Z2000`),
      }),
    }
  );

  const batchPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: `'Akun_Pengguna'!A1`, values: akunRows },
      { range: `'Perencanaan_RKAS'!A1`, values: rkasRows },
      { range: `'Verifikasi_Dinas'!A1`, values: verifRows },
      { range: `'Penatausahaan_BKU'!A1`, values: bkuRows },
      { range: `'Rekap_7Standar_10Komponen'!A1`, values: rekapRows },
      { range: `'Referensi_SHS_Jepara'!A1`, values: shsRows },
      { range: `'Master_7Standar_10Komponen'!A1`, values: masterRefRows },
    ],
  };

  const writeRes = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchPayload),
    }
  );

  if (!writeRes.ok) {
    const errBody = await writeRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `Gagal menulis data ke Google Sheets (HTTP ${writeRes.status})`
    );
  }

  const refreshedMeta = await getSpreadsheetMetadata(spreadsheetId);
  const totalRows =
    akunRows.length +
    rkasRows.length +
    verifRows.length +
    bkuRows.length +
    rekapRows.length +
    shsRows.length +
    masterRefRows.length;

  return {
    updatedSheets: 7,
    totalRows,
    metadata: refreshedMeta,
  };
}

export async function readRowsFromSheetTab(
  spreadsheetIdOrUrl: string,
  tabTitle: string
): Promise<string[][]> {
  const token = await requireToken();
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const encodedRange = encodeURIComponent(`'${tabTitle}'!A1:Z2000`);
  const res = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodedRange}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `Gagal membaca tab '${tabTitle}' dari Google Sheets`
    );
  }

  const data = await res.json();
  return (data.values || []) as string[][];
}

export interface FullSheetDatabasePayload {
  metadata: SpreadsheetMetadata;
  accountsRows: string[][];
  rkasRows: string[][];
  verifRows: string[][];
  bkuRows: string[][];
  shsRows: string[][];
}

export async function pullFullDatabaseFromGoogleSheets(
  spreadsheetIdOrUrl: string
): Promise<FullSheetDatabasePayload> {
  const token = await requireToken();
  const metadata = await getSpreadsheetMetadata(spreadsheetIdOrUrl);
  const spreadsheetId = metadata.spreadsheetId;
  const existingSet = new Set(metadata.sheetTitles);

  const targetTabs = [
    { key: 'accountsRows', tab: 'Akun_Pengguna' },
    { key: 'rkasRows', tab: 'Perencanaan_RKAS' },
    { key: 'verifRows', tab: 'Verifikasi_Dinas' },
    { key: 'bkuRows', tab: 'Penatausahaan_BKU' },
    { key: 'shsRows', tab: 'Referensi_SHS_Jepara' },
  ] as const;

  const presentTabs = targetTabs.filter((t) => existingSet.has(t.tab));
  const result: FullSheetDatabasePayload = {
    metadata,
    accountsRows: [],
    rkasRows: [],
    verifRows: [],
    bkuRows: [],
    shsRows: [],
  };

  if (presentTabs.length === 0) {
    return result;
  }

  const queryRanges = presentTabs
    .map((t) => `ranges=${encodeURIComponent(`'${t.tab}'!A2:Z2000`)}`)
    .join('&');

  const res = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${queryRanges}&valueRenderOption=UNFORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message ||
        `Gagal menarik seluruh tabel dari Google Sheets (HTTP ${res.status})`
    );
  }

  const body = await res.json();
  const valueRanges: { values?: any[][] }[] = body.valueRanges || [];

  presentTabs.forEach((t, idx) => {
    const rawValues = valueRanges[idx]?.values || [];
    result[t.key] = rawValues.map((row) =>
      Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []
    );
  });

  return result;
}
