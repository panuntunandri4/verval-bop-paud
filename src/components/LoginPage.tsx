import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Lock,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (id: string, password: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  error,
  loading,
}) => {
  const [mode, setMode] = useState<'sekolah' | 'dinas'>('sekolah');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) return;
    await onLogin(userId.trim(), password.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Institutional Header (3-Zone Contract) */}
      <header className="flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-4 lg:px-12">
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          SIM VERVAL RKAS &amp; BOP PAUD
        </span>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#ketentuan-bosp"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Ketentuan Juknis BOSP
          </a>
          <a
            href="#standar-komponen"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            7 Standar &amp; 10 Komponen
          </a>
          <a
            href="#integrasi-sheets"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Integrasi Google Sheets
          </a>
        </nav>
        <div className="shrink-0">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Permendikdasmen 8/2026
          </span>
        </div>
      </header>

      {/* Main 2-Column Split */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12 lg:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: System Overview & BOSP Rules */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div>
              <p className="text-xs font-semibold text-blue-700">
                Dinas Pendidikan Pemuda dan Olahraga Kabupaten Jepara · Juknis BOSP Permendikdasmen Nomor 8 Tahun 2026
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl max-w-2xl text-balance">
                Input Perencanaan RKAS, Verifikasi Dinas, Penatausahaan &amp; Pelaporan BOP PAUD
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600 max-w-2xl">
                Platform resmi sesuai{' '}
                <strong className="font-semibold text-slate-800">
                  Permendikdasmen Nomor 8 Tahun 2026
                </strong>{' '}
                untuk pengelolaan perencanaan RKAS berbasis{' '}
                <strong className="font-semibold text-slate-800">
                  Standar Harga Satuan (SHS) Kabupaten Jepara
                </strong>
                , pemetaan{' '}
                <strong className="font-semibold text-slate-800">
                  7 Standar Pendidikan (02–08)
                </strong>{' '}
                dan{' '}
                <strong className="font-semibold text-slate-800">
                  10 Komponen Penggunaan Dana BOP PAUD
                </strong>
                , terhubung langsung dengan Google Sheets dan Google Apps Script.
              </p>
            </div>

            {/* Key Operational Rules Grid */}
            <div
              id="ketentuan-bosp"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Komponen 2 · Perpustakaan / Pojok Baca</span>
                  <span className="font-mono-num font-semibold text-emerald-700">
                    Min. 5%
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Wajib Minimal 5% Pagu Tahunan
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Pengembangan perpustakaan dan/atau layanan pojok baca divalidasi otomatis sebelum pengajuan RKAS.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Komponen 8 · Sarana &amp; Prasarana</span>
                  <span className="font-mono-num font-semibold text-amber-700">
                    Maks. 20%
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Batas Maksimal 20% Pemeliharaan
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Pemeliharaan sarana dan prasarana satuan pendidikan dijaga agar tidak melampaui 20% pagu.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Komponen 10 · Pembayaran Honorarium</span>
                  <span className="font-mono-num font-semibold text-blue-700">
                    20% / 40%
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Negeri Maks. 20% · Swasta Maks. 40%
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Sistem membedakan otomatis batas honorarium berdasarkan status satuan pendidikan Negeri maksimal 20% dan Swasta maks. 40%.
                </p>
              </div>

              <div
                id="integrasi-sheets"
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Ekosistem Database Terintegrasi</span>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Google Sheets, Apps Script &amp; AppSheet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Sinkronisasi dua arah dengan 7 tab database Google Sheets serta notifikasi verifikasi otomatis real-time.
                </p>
              </div>
            </div>

            {/* Structured Multi-User RBAC Banner */}
            <div
              id="standar-komponen"
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-blue-700 shrink-0" />
                <span className="font-semibold text-slate-900">
                  Hak Akses Multi-User Terstruktur:
                </span>
                <span>Sekolah login menggunakan Nomor NPSN</span>
                <span aria-hidden="true">·</span>
                <span>Dinas menggunakan 1 Level Admin (Verifikator Admin)</span>
              </div>
            </div>
          </div>

          {/* Right Column: Official Login Card (Zero Demo Credentials Exposed) */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Otentikasi Pengguna Resmi
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Masukkan kredensial resmi Satuan Pendidikan (NPSN) atau Verifikator Admin Dinas Pendidikan.
                </p>

                {/* Segmented Mode Control */}
                <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('sekolah');
                      setUserId('');
                      setPassword('');
                    }}
                    className={`flex items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                      mode === 'sekolah'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Satuan PAUD (NPSN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('dinas');
                      setUserId('');
                      setPassword('');
                    }}
                    className={`flex items-center justify-center gap-2 rounded-md py-2 px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                      mode === 'dinas'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Dinas Pendidikan</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {mode === 'sekolah'
                        ? 'Nomor Pokok Sekolah Nasional (NPSN)'
                        : 'ID Verifikator Admin Dinas'}
                    </label>
                    <div className="relative mt-1.5">
                      <UserCheck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder={
                          mode === 'sekolah'
                            ? 'Masukkan 8 digit Nomor NPSN'
                            : 'Masukkan ID Verifikator Admin'
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-mono-num text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Kata Sandi
                    </label>
                    <div className="relative mt-1.5">
                      <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan kata sandi akun"
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
                  >
                    <span>
                      {loading ? 'Memverifikasi Akses...' : 'Masuk ke Portal'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Official Access Guidance */}
              <div className="mt-6 border-t border-slate-200 pt-5 space-y-2 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  Informasi Akses Layanan Resmi:
                </p>
                <p>
                  1. Operator / Kepala Satuan PAUD masuk menggunakan{' '}
                  <span className="font-mono-num font-semibold text-slate-800">
                    Nomor NPSN
                  </span>{' '}
                  yang telah didaftarkan oleh Dinas Pendidikan Pemuda dan Olahraga.
                </p>
                <p>
                  2. Pengaturan akun satuan pendidikan, impor massal CSV{' '}
                  <span className="font-mono-num">VERVAL_ARKAS</span>, dan sinkronisasi database Google Sheets dikelola oleh Verifikator Admin Dinas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 lg:px-12 flex flex-wrap items-center justify-between gap-4">
        <span>
          SIM VERVAL RKAS &amp; BOP PAUD · Dinas Pendidikan Pemuda dan Olahraga Kabupaten Jepara
        </span>
        <span>Permendikdasmen Nomor 8 Tahun 2026</span>
      </footer>
    </div>
  );
};
