import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Webhook,
  LogOut,
  PlusCircle,
  DownloadCloud,
  UploadCloud,
  Download,
  Database,
  CheckCircle2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { AccountProfile, AppDatabaseState } from '../types/bop';
import {
  googleLogout,
  googleSignIn,
  initAuth,
} from '../services/googleAuth';
import {
  FullSheetDatabasePayload,
  SpreadsheetMetadata,
  createMasterBopSpreadsheet,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  pullFullDatabaseFromGoogleSheets,
  readRowsFromSheetTab,
  syncDatabaseToGoogleSheets,
} from '../services/googleSheetsService';
import {
  generateAppsScriptCodeGs,
  generateAppsScriptIndexHtml,
} from '../utils/appsScriptGenerator';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConfirmModal } from './ConfirmModal';

type IntegrationSubTab = 'sheets_db' | 'appscript_bridge' | 'appscript_studio';
type ScriptFileTab = 'code_gs' | 'index_html';

interface IntegrasiSpreadsheetViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  onSaveSheetConfig: (payload: {
    spreadsheetId?: string;
    spreadsheetTitle?: string;
    spreadsheetUrl?: string;
    appsScriptWebAppUrl?: string;
    appSheetAppId?: string;
    autoSyncAppsScript?: boolean;
    autoSyncGoogleSheets?: boolean;
    markSynced?: boolean;
  }) => Promise<void>;
  onImportAccountsFromSheet: (rows: string[][]) => Promise<number>;
  onPullFullFromSheets: (payload: FullSheetDatabasePayload) => Promise<{
    accounts: number;
    rkasItems: number;
    bkuTransactions: number;
    shsItems: number;
  }>;
  onAppsScriptPull: (appsScriptWebAppUrl: string) => Promise<string>;
  onAppsScriptPush: (appsScriptWebAppUrl: string) => Promise<string>;
  onTestWebhookPing: () => Promise<string>;
}

export const IntegrasiSpreadsheetView: React.FC<
  IntegrasiSpreadsheetViewProps
> = ({
  currentUser,
  state,
  onSaveSheetConfig,
  onImportAccountsFromSheet,
  onPullFullFromSheets,
  onAppsScriptPull,
  onAppsScriptPush,
  onTestWebhookPing,
}) => {
  const [subTab, setSubTab] = useState<IntegrationSubTab>('sheets_db');
  const [scriptFileTab, setScriptFileTab] = useState<ScriptFileTab>('code_gs');

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [spreadsheetInput, setSpreadsheetInput] = useState(
    state.sheetConfig.spreadsheetId || ''
  );
  const [sheetMeta, setSheetMeta] = useState<SpreadsheetMetadata | null>(null);
  const [selectedImportTab, setSelectedImportTab] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState(
    state.sheetConfig.appsScriptWebAppUrl || ''
  );
  const [appSheetId, setAppSheetId] = useState(
    state.sheetConfig.appSheetAppId || ''
  );
  const [autoSyncAppsScript, setAutoSyncAppsScript] = useState<boolean>(
    Boolean(state.sheetConfig.autoSyncAppsScript)
  );
  const [autoSyncGoogleSheets, setAutoSyncGoogleSheets] = useState<boolean>(
    Boolean(state.sheetConfig.autoSyncGoogleSheets)
  );

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Mandatory Confirmation Modals before mutating Google Sheets / Apps Script
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [confirmGasPushOpen, setConfirmGasPushOpen] = useState(false);

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setGoogleUser(u);
        setHasToken(true);
      },
      () => {
        setGoogleUser(null);
        setHasToken(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (state.sheetConfig.spreadsheetId && !spreadsheetInput) {
      setSpreadsheetInput(state.sheetConfig.spreadsheetId);
    }
  }, [state.sheetConfig.spreadsheetId, spreadsheetInput]);

  useEffect(() => {
    setAutoSyncAppsScript(Boolean(state.sheetConfig.autoSyncAppsScript));
    setAutoSyncGoogleSheets(Boolean(state.sheetConfig.autoSyncGoogleSheets));
  }, [
    state.sheetConfig.autoSyncAppsScript,
    state.sheetConfig.autoSyncGoogleSheets,
  ]);

  const handleGoogleSignIn = async () => {
    setFeedback(null);
    setSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setHasToken(true);
        setFeedback({
          type: 'success',
          message: `Terhubung ke Google Sheets sebagai ${res.user.email || res.user.displayName}.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal otentikasi dengan Google Sheets.',
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleLogout();
    setGoogleUser(null);
    setHasToken(false);
    setSheetMeta(null);
  };

  const handleInspectSheet = async () => {
    if (!spreadsheetInput.trim()) return;
    setFeedback(null);
    setBusy(true);
    try {
      const meta = await getSpreadsheetMetadata(spreadsheetInput);
      setSheetMeta(meta);
      if (meta.sheetTitles.length > 0 && !selectedImportTab) {
        setSelectedImportTab(meta.sheetTitles[0]);
      }
      await onSaveSheetConfig({
        spreadsheetId: meta.spreadsheetId,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: meta.spreadsheetUrl,
      });
      setFeedback({
        type: 'success',
        message: `Spreadsheet "${meta.title}" berhasil terhubung (${meta.sheetTitles.length} sheet terdeteksi).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error && err.message === 'AUTH_REQUIRED'
            ? 'Sesi token Google Sheets berakhir. Silakan klik Sign in with Google kembali.'
            : err instanceof Error
            ? err.message
            : 'Gagal memeriksa Spreadsheet.',
      });
    } finally {
      setBusy(false);
    }
  };

  const executeCreateMasterSpreadsheet = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const meta = await createMasterBopSpreadsheet(state.tahunAnggaran);
      setSpreadsheetInput(meta.spreadsheetId);
      setSheetMeta(meta);
      if (meta.sheetTitles.length > 0) {
        setSelectedImportTab(meta.sheetTitles[0]);
      }
      await syncDatabaseToGoogleSheets(meta.spreadsheetId, state);
      await onSaveSheetConfig({
        spreadsheetId: meta.spreadsheetId,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: meta.spreadsheetUrl,
        markSynced: true,
      });
      setConfirmCreateOpen(false);
      setFeedback({
        type: 'success',
        message: `Database Google Sheets "${meta.title}" (7 tab terintegrasi) berhasil dibuat dan diisi otomatis.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal membuat Master Spreadsheet baru.',
      });
    } finally {
      setBusy(false);
    }
  };

  const executeSyncToGoogleSheets = async () => {
    if (!spreadsheetInput.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await syncDatabaseToGoogleSheets(spreadsheetInput, state);
      setSheetMeta(res.metadata);
      await onSaveSheetConfig({
        spreadsheetId: res.metadata.spreadsheetId,
        spreadsheetTitle: res.metadata.title,
        spreadsheetUrl: res.metadata.spreadsheetUrl,
        markSynced: true,
      });
      setConfirmSyncOpen(false);
      setFeedback({
        type: 'success',
        message: `Sinkronisasi selesai: ${res.totalRows} baris pada ${res.updatedSheets} tab "${res.metadata.title}" berhasil diperbarui.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal menyinkronkan data ke Google Sheets.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePullFullFromGoogleSheets = async () => {
    if (!spreadsheetInput.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const payload = await pullFullDatabaseFromGoogleSheets(spreadsheetInput);
      setSheetMeta(payload.metadata);
      const counts = await onPullFullFromSheets(payload);
      setFeedback({
        type: 'success',
        message: `Database berhasil ditarik dari Google Sheets "${payload.metadata.title}": ${counts.accounts} akun, ${counts.rkasItems} rincian RKAS, ${counts.bkuTransactions} transaksi BKU, dan ${counts.shsItems} referensi SHS.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error && err.message === 'AUTH_REQUIRED'
            ? 'Silakan klik Sign in with Google terlebih dahulu untuk menarik database dari Google Sheets.'
            : err instanceof Error
            ? err.message
            : 'Gagal menarik database dari Google Sheets.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImportFromSheetTab = async () => {
    if (!spreadsheetInput.trim() || !selectedImportTab) return;
    setBusy(true);
    setFeedback(null);
    try {
      const rows = await readRowsFromSheetTab(
        spreadsheetInput,
        selectedImportTab
      );
      if (rows.length <= 1) {
        throw new Error('Tab tidak memiliki baris data (minimal 2 baris).');
      }
      const count = await onImportAccountsFromSheet(rows.slice(1));
      setFeedback({
        type: 'success',
        message: `Berhasil mengimpor / memperbarui ${count} satuan PAUD (NPSN) dari tab "${selectedImportTab}".`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal menarik data dari tab Google Sheets.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAutoSyncGoogleSheets = async (nextVal: boolean) => {
    setAutoSyncGoogleSheets(nextVal);
    setBusy(true);
    setFeedback(null);
    try {
      await onSaveSheetConfig({ autoSyncGoogleSheets: nextVal });
      setFeedback({
        type: 'success',
        message: nextVal
          ? 'Auto-Sync Google Sheets diaktifkan. Setiap perubahan RKAS/BKU/Verifikasi akan langsung ditulis ke Google Sheets selama sesi Google aktif.'
          : 'Auto-Sync Google Sheets dinonaktifkan.',
      });
    } catch (err) {
      setAutoSyncGoogleSheets(!nextVal);
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal memperbarui pengaturan Auto-Sync Google Sheets.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAppsScriptConfig = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await onSaveSheetConfig({
        appsScriptWebAppUrl: appsScriptUrl.trim(),
        appSheetAppId: appSheetId.trim(),
        autoSyncAppsScript,
      });
      setFeedback({
        type: 'success',
        message:
          'Konfigurasi URL Web App Google Apps Script, Auto-Sync Server, dan AppSheet berhasil disimpan.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan konfigurasi Apps Script.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePullFromAppsScript = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const msg = await onAppsScriptPull(appsScriptUrl.trim());
      setFeedback({ type: 'success', message: msg });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal menarik database dari Apps Script Web App.',
      });
    } finally {
      setBusy(false);
    }
  };

  const executePushToAppsScript = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const msg = await onAppsScriptPush(appsScriptUrl.trim());
      setConfirmGasPushOpen(false);
      setFeedback({ type: 'success', message: msg });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal mendorong database ke Apps Script Web App.',
      });
    } finally {
      setBusy(false);
    }
  };

  const appOriginUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  const codeGsSource = useMemo(
    () =>
      generateAppsScriptCodeGs({
        tahunAnggaran: state.tahunAnggaran,
        webAppOriginUrl: appOriginUrl,
      }),
    [state.tahunAnggaran, appOriginUrl]
  );

  const indexHtmlSource = useMemo(
    () =>
      generateAppsScriptIndexHtml({
        tahunAnggaran: state.tahunAnggaran,
      }),
    [state.tahunAnggaran]
  );

  const activeScriptContent =
    scriptFileTab === 'code_gs' ? codeGsSource : indexHtmlSource;
  const activeScriptFilename =
    scriptFileTab === 'code_gs' ? 'Code.gs' : 'Index.html';

  const handleCopyActiveScript = async () => {
    await navigator.clipboard.writeText(activeScriptContent);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadActiveScript = () => {
    const blob = new Blob([activeScriptContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeScriptFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const schoolsCount = state.accounts.filter(
    (a) => a.peran === 'sekolah'
  ).length;

  const sheetDatabaseTabs = [
    {
      name: 'Akun_Pengguna',
      rowsCount: state.accounts.length,
      desc: 'Data akun login NPSN Satuan PAUD & Verifikator Admin Dinas, status Negeri/Swasta, jumlah siswa, dan pagu.',
    },
    {
      name: 'Perencanaan_RKAS',
      rowsCount: state.rkasItems.length,
      desc: 'Rincian RKAS 22 kolom Permendikdasmen 8/2026 terpetakan ke 7 Standar (02–08) & 10 Komponen BOP PAUD.',
    },
    {
      name: 'Verifikasi_Dinas',
      rowsCount: state.verificationLogs.length,
      desc: 'Log histori pengajuan berkas satuan PAUD, catatan revisi, dan pengesahan oleh Verifikator Admin Dinas.',
    },
    {
      name: 'Penatausahaan_BKU',
      rowsCount: state.bkuTransactions.length,
      desc: 'Buku Kas Umum (penerimaan salur Tahap 1/2, belanja SIPLah/kwitansi, dan potongan pajak PPh/PPN).',
    },
    {
      name: 'Rekap_7Standar_10Komponen',
      rowsCount: schoolsCount,
      desc: 'Matriks persentase otomatis Pojok Baca (>=5%), Sarpras (<=20%), dan Honorarium (Negeri <=20% / Swasta <=40%).',
    },
    {
      name: 'Referensi_SHS_Jepara',
      rowsCount: state.shsItems.length,
      desc: 'Katalog Standar Harga Satuan (SSH/SBU/HSPK) Kabupaten Jepara yang langsung dikelola dari Google Sheets.',
    },
    {
      name: 'Master_7Standar_10Komponen',
      rowsCount: 17,
      desc: 'Tabel referensi baku 7 Standar Pendidikan (02–08) & 10 Komponen BOP PAUD sesuai Permendikdasmen 8/2026.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Status Koneksi */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Database Google Sheets &amp; Google Apps Script
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Arsitektur berbasis 7 Sheet terstruktur, sinkronisasi 2 arah Google
            Sheets API v4, jembatan server <code className="font-mono-num">doGet/doPost</code>, serta paket kode mandiri{' '}
            <code className="font-mono-num">Code.gs + Index.html</code>.
          </p>
        </div>

        <div className="text-right text-xs text-slate-500 space-y-0.5">
          {state.sheetConfig.lastSyncedAt ? (
            <>
              <div>
                Sinkron terakhir:{' '}
                <strong className="font-mono-num text-slate-800">
                  {new Date(state.sheetConfig.lastSyncedAt).toLocaleString(
                    'id-ID'
                  )}
                </strong>
              </div>
              <div>Oleh: {state.sheetConfig.lastSyncedBy || '-'}</div>
            </>
          ) : (
            <div>Belum ada riwayat sinkronisasi Google Sheets</div>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
        <button
          type="button"
          onClick={() => setSubTab('sheets_db')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'sheets_db'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span>1. Database Google Sheets (API 2 Arah)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('appscript_bridge')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'appscript_bridge'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Webhook className="h-4 w-4 shrink-0" />
          <span>2. Backend Web App Apps Script (exec) &amp; AppSheet</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('appscript_studio')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'appscript_studio'
              ? 'bg-white text-blue-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="h-4 w-4 shrink-0" />
          <span>3. Proyek Mandiri Apps Script (Code.gs + Index.html)</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* TAB 1: GOOGLE SHEETS API 2-WAY DATABASE */}
      {subTab === 'sheets_db' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Koneksi Langsung Google Sheets API v4 (Baca &amp; Tulis 7 Tab)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kelola akun NPSN, RKAS 02–08, verifikasi Dinas, BKU, dan
                    referensi SHS Kabupaten Jepara langsung di dalam Google
                    Spreadsheet Anda.
                  </p>
                </div>
              </div>

              {hasToken && googleUser ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900">
                      {googleUser.displayName || 'Akun Google Aktif'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {googleUser.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar Akun Google</span>
                  </button>
                </div>
              ) : (
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  label={
                    signingIn ? 'Menghubungkan...' : 'Sign in with Google'
                  }
                />
              )}
            </div>

            {!hasToken ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                Klik tombol <strong>Sign in with Google</strong> di kanan atas
                untuk mengaktifkan pembacaan dan penulisan otomatis 7 tab pada
                Google Spreadsheet Anda, atau gunakan tab{' '}
                <strong>2. Backend Web App Apps Script (exec)</strong> jika Anda
                ingin menghubungkan spreadsheet melalui URL deployment{' '}
                <code className="font-mono-num">Code.gs</code> tanpa login OAuth
                per pengguna.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <label className="block text-xs font-semibold text-slate-700">
                      URL atau ID Google Spreadsheet Database Utama
                    </label>
                    <div className="mt-1.5 flex flex-wrap sm:flex-nowrap gap-2">
                      <input
                        type="text"
                        value={spreadsheetInput}
                        onChange={(e) => setSpreadsheetInput(e.target.value)}
                        placeholder="Tempel link https://docs.google.com/spreadsheets/d/... atau ID Spreadsheet"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleInspectSheet}
                        disabled={busy || !spreadsheetInput.trim()}
                        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        Periksa Sheet
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmCreateOpen(true)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Buat Database 7-Sheet Baru Otomatis</span>
                    </button>
                  </div>
                </div>

                {/* Action Bar: 2-Way Push & Pull */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-900">
                      Sinkronisasi 2 Arah Database Google Sheets
                      {state.sheetConfig.spreadsheetTitle
                        ? ` — ${state.sheetConfig.spreadsheetTitle}`
                        : ''}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      <strong>Dorong ke Sheets</strong> menulis seluruh data
                      aplikasi ke 7 tab. <strong>Tarik dari Sheets</strong>{' '}
                      memuat ulang Akun NPSN, RKAS, BKU, &amp; Katalog SHS dari
                      editan Anda di Google Sheets.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {state.sheetConfig.spreadsheetUrl && (
                      <a
                        href={state.sheetConfig.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Buka Google Sheets</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={handlePullFullFromGoogleSheets}
                      disabled={busy || !spreadsheetInput.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <DownloadCloud className="h-3.5 w-3.5" />
                      <span>Tarik Seluruh Database dari Sheets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmSyncOpen(true)}
                      disabled={busy || !spreadsheetInput.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Dorong Semua Data ke 7 Tab Sheets</span>
                    </button>
                  </div>
                </div>

                {/* Auto-Sync Toggle + Custom Tab Import */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Auto-Sync Real-Time ke Google Sheets
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                        Saat aktif dan Spreadsheet telah terhubung, setiap
                        simpanan RKAS, verifikasi Dinas, atau input BKU akan
                        otomatis menyegarkan 7 tab Google Sheets di latar
                        belakang.
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoSyncGoogleSheets}
                        onChange={(e) =>
                          handleToggleAutoSyncGoogleSheets(e.target.checked)
                        }
                        disabled={busy || !spreadsheetInput.trim()}
                        className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {autoSyncGoogleSheets ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </label>
                  </div>

                  {sheetMeta && sheetMeta.sheetTitles.length > 0 && (
                    <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-900">
                        Impor Cepat Data NPSN dari Sheet Kustom (Misal: VERVAL
                        ARKAS)
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <select
                          value={selectedImportTab}
                          onChange={(e) => setSelectedImportTab(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                        >
                          {sheetMeta.sheetTitles.map((t) => (
                            <option key={t} value={t}>
                              Tab: {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleImportFromSheetTab}
                          disabled={busy || !selectedImportTab}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Impor NPSN</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7-Sheet Relational Schema Overview */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Skema 7 Sheet Terintegrasi pada Google Spreadsheet
                </h3>
                <p className="text-xs text-slate-500">
                  Seluruh referensi (termasuk Katalog SHS Kabupaten Jepara dan 7
                  Standar Pendidikan 02–08) tersimpan sebagai tabel di Google
                  Sheets.
                </p>
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-700">
                7 Tabel Aktif
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold">No</th>
                    <th className="py-2.5 px-4 font-semibold">
                      Nama Tab Google Sheets
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      Baris Data Saat Ini
                    </th>
                    <th className="py-2.5 px-5 font-semibold">
                      Fungsi &amp; Struktur Kolom
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sheetDatabaseTabs.map((tab, idx) => (
                    <tr key={tab.name} className="hover:bg-slate-50/70">
                      <td className="py-3 px-5 font-mono-num text-slate-500">
                        0{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono-num font-semibold text-slate-900">
                        {tab.name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-blue-700">
                        {tab.rowsCount} baris
                      </td>
                      <td className="py-3 px-5 text-slate-600">{tab.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPS SCRIPT WEB APP BRIDGE & APPSHEET */}
      {subTab === 'appscript_bridge' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Jembatan Backend Google Apps Script Web App (<code className="font-mono-num">doGet / doPost</code>)
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Tempelkan URL hasil deploy Web App dari{' '}
                <code className="font-mono-num">Code.gs</code> (berakhiran{' '}
                <code className="font-mono-num">/exec</code>). Saat{' '}
                <strong>Auto-Sync Server ke Apps Script</strong> diaktifkan oleh
                Admin Dinas, setiap satuan PAUD yang login menggunakan NPSN
                otomatis menyimpan RKAS dan BKU langsung ke Google Sheets tanpa
                perlu login Google masing-masing.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  URL Web App Google Apps Script (<code className="font-mono-num">.../exec</code>)
                </label>
                <input
                  type="url"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono-num focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Auto-Sync Server ke Google Sheets via Apps Script
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Setiap perubahan data oleh Sekolah (NPSN) maupun Verifikator
                    Admin Dinas otomatis dikirim ke fungsi{' '}
                    <code className="font-mono-num">doPost(SYNC_ALL)</code> di
                    Google Sheets.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoSyncAppsScript}
                    onChange={(e) => setAutoSyncAppsScript(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {autoSyncAppsScript ? 'Aktif' : 'Nonaktif'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  AppSheet Application ID (Opsional)
                </label>
                <input
                  type="text"
                  value={appSheetId}
                  onChange={(e) => setAppSheetId(e.target.value)}
                  placeholder="Contoh: b8acbf04-bop-paud-2026"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 font-mono-num focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSaveAppsScriptConfig}
                  disabled={busy}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                >
                  Simpan Konfigurasi Backend
                </button>

                <button
                  type="button"
                  onClick={handlePullFromAppsScript}
                  disabled={busy || !appsScriptUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  <span>Tarik Database dari Apps Script (doGet)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmGasPushOpen(true)}
                  disabled={busy || !appsScriptUrl.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Dorong ke Apps Script (doPost)</span>
                </button>

                {appsScriptUrl.trim().startsWith('https://script.google.com/') && (
                  <a
                    href={appsScriptUrl.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Buka Web App Mandiri</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              REST API &amp; Webhook AppSheet / Bot Automation
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gunakan endpoint di bawah ini pada <strong>AppSheet Automation</strong>{' '}
              (Call a webhook) atau trigger <code className="font-mono-num">onEdit</code>{' '}
              di Google Sheets untuk memicu notifikasi verifikasi real-time.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-700">
                  GET Rekapitulasi Seluruh Satuan PAUD (JSON)
                </div>
                <div className="mt-1 font-mono-num text-[11px] text-blue-700 break-all">
                  {appOriginUrl}/api/external/v1/summary?apiKey=bop-paud-sync-2027
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-semibold text-slate-700">
                  POST Webhook Sinkronisasi Baris RKAS &amp; Verifikasi
                </div>
                <div className="mt-1 font-mono-num text-[11px] text-blue-700 break-all">
                  {appOriginUrl}/api/external/v1/webhook
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Header:{' '}
                  <code className="font-mono-num">
                    x-api-key: bop-paud-sync-2027
                  </code>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                setFeedback(null);
                try {
                  const msg = await onTestWebhookPing();
                  setFeedback({ type: 'success', message: msg });
                } catch (err) {
                  setFeedback({
                    type: 'error',
                    message:
                      err instanceof Error ? err.message : 'Uji webhook gagal.',
                  });
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Uji Kirim Webhook Real-Time</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: STANDALONE APPS SCRIPT PROJECT GENERATOR (Code.gs + Index.html) */}
      {subTab === 'appscript_studio' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Paket Lengkap Aplikasi Google Apps Script Mandiri (<code className="font-mono-num">Code.gs</code> +{' '}
                  <code className="font-mono-num">Index.html</code>)
                </h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl">
                  Kode di bawah ini dapat dipasang langsung di dalam Google
                  Spreadsheet Anda sehingga SIM VERVAL RKAS &amp; BOP PAUD
                  berjalan <strong>100% di atas Google Apps Script &amp; Google Sheets</strong>{' '}
                  (lengkap dengan menu kustom di Google Sheets, pembuatan
                  otomatis 7 tab, login NPSN &amp; Verifikator Admin Dinas,
                  validasi Permendikdasmen Nomor 8 Tahun 2026, serta cetak
                  lembar pengesahan 4 penandatangan).
                </p>
              </div>
            </div>

            {/* 5-Step Quick Install Guide */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 text-xs">
              {[
                {
                  step: '01',
                  title: 'Buka Apps Script',
                  desc: 'Buka Google Sheet baru -> klik menu Extensions -> Apps Script.',
                },
                {
                  step: '02',
                  title: 'Tempel Code.gs',
                  desc: 'Salin isi file Code.gs di bawah ke editor Code.gs lalu simpan.',
                },
                {
                  step: '03',
                  title: 'Buat Index.html',
                  desc: 'Klik tanda (+) -> HTML -> beri nama persis "Index" lalu tempel kode Index.html.',
                },
                {
                  step: '04',
                  title: 'Inisialisasi 7 Tab',
                  desc: 'Pilih fungsi setupDatabaseSheets pada toolbar lalu klik Run (Jalankan).',
                },
                {
                  step: '05',
                  title: 'Deploy Web App',
                  desc: 'Klik Deploy -> New deployment -> Web app (Execute as: Me, Access: Anyone).',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-mono-num text-[11px] font-bold text-blue-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>LANGKAH {item.step}</span>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {item.title}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* File Switcher + Copy/Download Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setScriptFileTab('code_gs')}
                  className={`rounded-md px-3 py-1.5 text-xs font-mono-num font-semibold transition-colors ${
                    scriptFileTab === 'code_gs'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Code.gs (Backend 7-Sheet + REST API)
                </button>
                <button
                  type="button"
                  onClick={() => setScriptFileTab('index_html')}
                  className={`rounded-md px-3 py-1.5 text-xs font-mono-num font-semibold transition-colors ${
                    scriptFileTab === 'index_html'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Index.html (Antarmuka Web App HtmlService)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadActiveScript}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh {activeScriptFilename}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyActiveScript}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  {copiedScript ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Tersalin ({activeScriptFilename})</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Kode {activeScriptFilename}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="max-h-[460px] overflow-auto rounded-lg bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100 font-mono-num">
              {activeScriptContent}
            </pre>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Modal: Create Master Spreadsheet */}
      <ConfirmModal
        open={confirmCreateOpen}
        title="Konfirmasi Pembuatan Database 7-Sheet Baru"
        description="Sistem akan membuat file Google Spreadsheet baru di akun Google Drive Anda dan langsung mengisi seluruh 7 tab database BOP PAUD."
        details={[
          `Nama File: SIM VERVAL RKAS & BOP PAUD ${state.tahunAnggaran}`,
          '7 Tab Otomatis: Akun_Pengguna, Perencanaan_RKAS, Verifikasi_Dinas, Penatausahaan_BKU, Rekap_7Standar_10Komponen, Referensi_SHS_Jepara, Master_7Standar_10Komponen',
          `Pengguna Pengonfirmasi: ${currentUser.nama}`,
        ]}
        confirmLabel="Buat & Sinkronkan 7 Tab"
        loading={busy}
        onConfirm={executeCreateMasterSpreadsheet}
        onCancel={() => setConfirmCreateOpen(false)}
      />

      {/* Mandatory Confirmation Modal: Overwrite/Sync Spreadsheet */}
      <ConfirmModal
        open={confirmSyncOpen}
        title="Konfirmasi Penulisan ke 7 Tab Google Sheets"
        description="Tindakan ini akan memperbarui seluruh 7 tab pada Google Spreadsheet yang dipilih agar persis sama dengan data terbaru aplikasi."
        details={[
          `Target Spreadsheet ID: ${extractSpreadsheetId(spreadsheetInput)}`,
          `Total Satuan PAUD: ${schoolsCount} Lembaga`,
          `Total Rincian RKAS: ${state.rkasItems.length} Baris Kegiatan`,
          `Total Transaksi BKU: ${state.bkuTransactions.length} Bukti & ${state.shsItems.length} Item SHS Jepara`,
        ]}
        confirmLabel="Ya, Perbarui Google Sheets"
        loading={busy}
        onConfirm={executeSyncToGoogleSheets}
        onCancel={() => setConfirmSyncOpen(false)}
      />

      {/* Mandatory Confirmation Modal: Push via Apps Script doPost */}
      <ConfirmModal
        open={confirmGasPushOpen}
        title="Konfirmasi Dorong Database ke Apps Script Web App"
        description="Server akan mengirimkan seluruh tabel (Akun, RKAS, Verifikasi, BKU, Rekap 7 Standar & 10 Komponen, dan SHS Jepara) ke endpoint doPost(SYNC_ALL) pada Google Sheets Anda."
        details={[
          `Endpoint Apps Script: ${appsScriptUrl.trim()}`,
          `Total Satuan PAUD: ${schoolsCount} Lembaga & ${state.rkasItems.length} Item RKAS`,
        ]}
        confirmLabel="Ya, Dorong ke Apps Script"
        loading={busy}
        onConfirm={executePushToAppsScript}
        onCancel={() => setConfirmGasPushOpen(false)}
      />
    </div>
  );
};
