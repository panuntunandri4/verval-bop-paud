import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Search,
  FilePlus2,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  JUKNIS_REGULASI_LABEL,
  KOMPONEN_BOP_10,
  STANDAR_PENDIDIKAN_7,
  formatRupiah,
  getMaxHonorPersen,
  validateRkasJuknis,
} from '../types/bop';

interface DashboardViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  onSelectSchoolAndTab: (
    npsn: string,
    tab: 'input_rkas' | 'rkas' | 'verifikasi' | 'bku' | 'pelaporan'
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  state,
  onSelectSchoolAndTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bkuSortBy, setBkuSortBy] = useState<'DESC_PERSEN' | 'ASC_PERSEN' | 'DESC_PAGU'>('DESC_PERSEN');

  const schools = useMemo(
    () => state.accounts.filter((a) => a.peran === 'sekolah'),
    [state.accounts]
  );

  const metrics = useMemo(() => {
    const totalPagu = schools.reduce((s, a) => s + (a.paguTahunan || 0), 0);
    const totalRkas = state.rkasItems.reduce((s, i) => s + i.jumlahTotal, 0);
    const totalPenerimaan = state.bkuTransactions
      .filter((t) => t.jenis === 'PENERIMAAN')
      .reduce((s, t) => s + t.nominal, 0);
    const totalRealisasi = state.bkuTransactions
      .filter((t) => t.jenis === 'PENGELUARAN')
      .reduce((s, t) => s + t.nominal, 0);
    const disahkanCount = schools.filter(
      (s) => s.rkasStatus === 'DISAHKAN'
    ).length;
    const menungguCount = schools.filter(
      (s) => s.rkasStatus === 'DIAJUKAN'
    ).length;

    return {
      totalPagu,
      totalRkas,
      totalPenerimaan,
      totalRealisasi,
      persenRkas: totalPagu > 0 ? (totalRkas / totalPagu) * 100 : 0,
      persenSerapan: totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0,
      disahkanCount,
      menungguCount,
    };
  }, [schools, state.rkasItems, state.bkuTransactions]);

  const komponenChartData = useMemo(() => {
    return KOMPONEN_BOP_10.map((k) => {
      const rkasSum = state.rkasItems
        .filter((i) => i.komponenId === k.id)
        .reduce((s, i) => s + i.jumlahTotal, 0);
      const bkuSum = state.bkuTransactions
        .filter((t) => t.jenis === 'PENGELUARAN' && t.komponenId === k.id)
        .reduce((s, t) => s + t.nominal, 0);
      const persenPagu =
        metrics.totalPagu > 0 ? (rkasSum / metrics.totalPagu) * 100 : 0;

      return {
        kode: `K-${k.nomor}`,
        namaLengkap: `${k.nomor}. ${k.nama}`,
        rencanaJuta: Number((rkasSum / 1_000_000).toFixed(2)),
        realisasiJuta: Number((bkuSum / 1_000_000).toFixed(2)),
        rencanaRp: rkasSum,
        realisasiRp: bkuSum,
        persenPagu: Number(persenPagu.toFixed(1)),
      };
    });
  }, [state.rkasItems, state.bkuTransactions, metrics.totalPagu]);

  const standarChartData = useMemo(() => {
    return STANDAR_PENDIDIKAN_7.map((std) => {
      const rkasSum = state.rkasItems
        .filter((i) => i.standarId === std.id)
        .reduce((s, i) => s + i.jumlahTotal, 0);
      return {
        kode: `${std.kode} ${std.nama.replace('Standar ', '')}`,
        namaLengkap: `${std.kode} ${std.nama}`,
        rencanaJuta: Number((rkasSum / 1_000_000).toFixed(2)),
        rencanaRp: rkasSum,
      };
    });
  }, [state.rkasItems]);

  const schoolBkuProgressData = useMemo(() => {
    const rows = schools.map((sch) => {
      const val = validateRkasJuknis(sch, state.rkasItems);
      const pagu = val.paguTahunan;
      const schoolTx = state.bkuTransactions.filter((t) => t.npsn === sch.id);
      const penerimaanRp = schoolTx
        .filter((t) => t.jenis === 'PENERIMAAN')
        .reduce((sum, t) => sum + t.nominal, 0);
      const pengeluaranTx = schoolTx.filter((t) => t.jenis === 'PENGELUARAN');
      const realisasiRp = pengeluaranTx.reduce((sum, t) => sum + t.nominal, 0);
      const sisaPaguRp = Math.max(0, pagu - realisasiRp);
      const selisihLebihRp = Math.max(0, realisasiRp - pagu);
      const persenRealisasi = pagu > 0 ? (realisasiRp / pagu) * 100 : 0;
      const persenSalur = pagu > 0 ? (penerimaanRp / pagu) * 100 : 0;

      return {
        npsn: sch.id,
        nama: sch.nama,
        statusSekolah: sch.statusSekolah || 'SWASTA',
        wilayah: sch.wilayah,
        pagu,
        penerimaanRp,
        realisasiRp,
        sisaPaguRp,
        selisihLebihRp,
        persenRealisasi,
        persenSalur,
        buktiCount: pengeluaranTx.length,
      };
    });

    return rows.sort((a, b) => {
      if (bkuSortBy === 'ASC_PERSEN') {
        return a.persenRealisasi - b.persenRealisasi || b.pagu - a.pagu;
      }
      if (bkuSortBy === 'DESC_PAGU') {
        return b.pagu - a.pagu || b.persenRealisasi - a.persenRealisasi;
      }
      return b.persenRealisasi - a.persenRealisasi || b.realisasiRp - a.realisasiRp;
    });
  }, [schools, state.rkasItems, state.bkuTransactions, bkuSortBy]);

  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const matchSearch =
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.wilayah.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === 'ALL' ? true : s.rkasStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [schools, searchQuery, statusFilter]);

  const renderStatusText = (status?: AccountProfile['rkasStatus']) => {
    switch (status) {
      case 'DISAHKAN':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Disahkan Dinas</span>
          </span>
        );
      case 'DIAJUKAN':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Menunggu Verifikasi</span>
          </span>
        );
      case 'PERLU_REVISI':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Perlu Revisi</span>
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium text-slate-500">
            Draft Sekolah
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Bar for Satuan Pendidikan (Sekolah) */}
      {currentUser.peran === 'sekolah' && (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Penyusunan Perencanaan & RKAS BOP PAUD ({JUKNIS_REGULASI_LABEL})
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Tambahkan rincian belanja 10 komponen BOP PAUD menggunakan katalog Standar Harga Satuan (SHS) Kabupaten Jepara.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onSelectSchoolAndTab(currentUser.id, 'input_rkas')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Input Perencanaan / RKAS</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSchoolAndTab(currentUser.id, 'rkas')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <span>Lihat Kertas Kerja</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 4-Card KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Pagu BOP PAUD ({schools.length} Satuan)
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900">
            {formatRupiah(metrics.totalPagu)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            TA {state.tahunAnggaran} · {JUKNIS_REGULASI_LABEL}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Perencanaan RKAS Terinput
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900">
            {formatRupiah(metrics.totalRkas)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 font-mono-num">
            {metrics.persenRkas.toFixed(1)}% dari total pagu anggaran
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Realisasi Penatausahaan BKU
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num text-blue-700">
            {formatRupiah(metrics.totalRealisasi)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 font-mono-num">
            Serapan {metrics.persenSerapan.toFixed(1)}% · Kas Masuk{' '}
            {formatRupiah(metrics.totalPenerimaan)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">
            Progres Verifikasi & Pengesahan RKAS
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-num text-emerald-700">
            {metrics.disahkanCount} / {schools.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            <span>{metrics.disahkanCount} Disahkan</span>
            <span aria-hidden="true"> · </span>
            <span>{metrics.menungguCount} Antrean Dinas</span>
          </p>
        </div>
      </div>

      {/* Charts Row: 10 Komponen BOP PAUD & 7 Standar Pendidikan */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Realisasi & Perencanaan 10 Komponen Dana BOP PAUD
              </h2>
              <p className="text-xs text-slate-500">
                Perbandingan alokasi RKAS terhadap realisasi belanja BKU (dalam Juta Rupiah)
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono-num">
              K-2 Min 5% · K-8 Maks 20% · K-10 Negeri ≤20% / Swasta ≤40%
            </span>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={komponenChartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="kode"
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#475569' }}
                  unit=" Jt"
                />
                <Tooltip
                  formatter={(value, name) => [
                    `Rp ${(Number(value || 0) * 1_000_000).toLocaleString('id-ID')}`,
                    String(name ?? ''),
                  ]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.namaLengkap || label
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="rencanaJuta"
                  name="Rencana RKAS"
                  fill="#1d4ed8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="realisasiJuta"
                  name="Realisasi BKU"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Distribusi 7 Standar Pendidikan PAUD
            </h2>
            <p className="text-xs text-slate-500">
              Pemetaan anggaran RKAS berdasarkan Standar Nasional Pendidikan (Juta Rupiah)
            </p>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={standarChartData}
                layout="vertical"
                margin={{ top: 6, right: 18, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  unit=" Jt"
                />
                <YAxis
                  type="category"
                  dataKey="kode"
                  width={120}
                  tick={{ fontSize: 10.5, fill: '#334155' }}
                />
                <Tooltip
                  formatter={(value) => [
                    `Rp ${(Number(value || 0) * 1_000_000).toLocaleString('id-ID')}`,
                    'Alokasi RKAS',
                  ]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.namaLengkap || label
                  }
                />
                <Bar
                  dataKey="rencanaJuta"
                  name="Alokasi Standar"
                  fill="#334155"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Progress Bar Chart: Realisasi Pengeluaran BKU vs Total Pagu Anggaran per Sekolah */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Realisasi Pengeluaran BKU terhadap Pagu Anggaran per Sekolah
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>Perbandingan serapan belanja BKU aktual dengan batas pagu tahunan</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono-num font-medium text-slate-700">
                Total Serapan {formatRupiah(metrics.totalRealisasi)} dari {formatRupiah(metrics.totalPagu)} ({metrics.persenSerapan.toFixed(1)}%)
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
                <span>Optimal (≥50%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-600" aria-hidden="true" />
                <span>Berjalan (&lt;50%)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-slate-300" aria-hidden="true" />
                <span>Dana Salur Kas</span>
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { id: 'DESC_PERSEN' as const, label: 'Serapan Tertinggi' },
                { id: 'ASC_PERSEN' as const, label: 'Serapan Terendah' },
                { id: 'DESC_PAGU' as const, label: 'Pagu Terbesar' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBkuSortBy(opt.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    bkuSortBy === opt.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {schoolBkuProgressData.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada data satuan pendidikan untuk menampilkan perbandingan realisasi BKU terhadap pagu anggaran.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schoolBkuProgressData.map((row) => {
              const clampedRealisasiWidth = Math.min(
                1000,
                Math.max(0, Math.round(row.persenRealisasi * 10))
              );
              const clampedSalurWidth = Math.min(
                1000,
                Math.max(0, Math.round(row.persenSalur * 10))
              );
              const isOverPagu = row.selisihLebihRp > 0;
              const isOptimal = !isOverPagu && row.persenRealisasi >= 50;
              const isRunning = !isOverPagu && row.persenRealisasi > 0 && row.persenRealisasi < 50;

              const barFillClass = isOverPagu
                ? 'fill-red-600'
                : isOptimal
                ? 'fill-emerald-600'
                : isRunning
                ? 'fill-blue-600'
                : 'fill-slate-400';

              const statusLabel = isOverPagu
                ? 'Melebihi Pagu Anggaran'
                : isOptimal
                ? 'Serapan Optimal (≥50%)'
                : isRunning
                ? 'Realisasi Sedang Berjalan'
                : 'Belum Ada Pengeluaran BKU';

              const statusTextClass = isOverPagu
                ? 'text-red-700 font-semibold'
                : isOptimal
                ? 'text-emerald-700 font-semibold'
                : isRunning
                ? 'text-blue-700 font-medium'
                : 'text-slate-500';

              return (
                <div
                  key={row.npsn}
                  className="px-5 py-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {row.nama}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono-num">
                          NPSN {row.npsn}
                        </span>
                        <span className="text-[11px] text-slate-400" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {row.statusSekolah} · {row.wilayah} · {row.buktiCount} Bukti Belanja
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-3 shrink-0">
                      <div className="text-xs font-mono-num">
                        <span className="font-bold text-slate-900">
                          {formatRupiah(row.realisasiRp)}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-600">
                          {formatRupiah(row.pagu)}
                        </span>
                        <span
                          className={`ml-2 font-bold ${
                            isOverPagu
                              ? 'text-red-700'
                              : isOptimal
                              ? 'text-emerald-700'
                              : 'text-blue-700'
                          }`}
                        >
                          ({row.persenRealisasi.toFixed(1)}%)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectSchoolAndTab(row.npsn, 'bku')}
                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
                      >
                        <span>Rincian BKU</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Proportional Progress Bar Track (BKU Expenditure vs Total Pagu) */}
                  <div className="mt-2.5">
                    <svg
                      viewBox="0 0 1000 12"
                      preserveAspectRatio="none"
                      className="h-3 w-full rounded bg-slate-100 overflow-hidden block"
                      role="img"
                      aria-label={`Realisasi pengeluaran BKU ${row.nama}: ${row.persenRealisasi.toFixed(1)}% dari pagu ${formatRupiah(row.pagu)}`}
                    >
                      {clampedSalurWidth > 0 && (
                        <rect
                          x={0}
                          y={0}
                          width={clampedSalurWidth}
                          height={12}
                          className="fill-slate-300/80"
                        />
                      )}
                      {clampedRealisasiWidth > 0 && (
                        <rect
                          x={0}
                          y={0}
                          width={clampedRealisasiWidth}
                          height={12}
                          className={barFillClass}
                        />
                      )}
                      <line
                        x1={500}
                        y1={0}
                        x2={500}
                        y2={12}
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                    </svg>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={statusTextClass}>{statusLabel}</span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500 font-mono-num">
                        Dana Salur Kas: {formatRupiah(row.penerimaanRp)} ({row.persenSalur.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="font-mono-num text-slate-600">
                      {isOverPagu ? (
                        <span className="font-semibold text-red-700">
                          Selisih Melebihi Pagu: +{formatRupiah(row.selisihLebihRp)}
                        </span>
                      ) : (
                        <span>
                          Sisa Pagu Anggaran:{' '}
                          <strong className="font-semibold text-slate-800">
                            {formatRupiah(row.sisaPaguRp)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monitoring & Juknis BOSP Compliance Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rekapitulasi Kepatuhan Juknis BOSP & Status Verval Satuan Pendidikan
            </h2>
            <p className="text-xs text-slate-500">
              Pemantauan real-time batas minimal 5% Pojok Baca, maksimal 20% Sarpras, dan batas Honorarium Negeri/Swasta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NPSN / Sekolah..."
                className="rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'DIAJUKAN', label: 'Diajukan' },
                { id: 'PERLU_REVISI', label: 'Revisi' },
                { id: 'DISAHKAN', label: 'Disahkan' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">NPSN & Satuan PAUD</th>
                <th className="py-3 px-3 font-semibold">Status & Wilayah</th>
                <th className="py-3 px-3 text-right font-semibold">Pagu BOP</th>
                <th className="py-3 px-3 text-right font-semibold">
                  Pojok Baca (≥5%)
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Sarpras (≤20%)
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Honor (Negeri ≤20% / Swasta ≤40%)
                </th>
                <th className="py-3 px-3 font-semibold">Status Verval</th>
                <th className="py-3 px-4 text-right font-semibold">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Tidak ada satuan pendidikan yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredSchools.map((sch) => {
                  const val = validateRkasJuknis(sch, state.rkasItems);
                  const kBaca = val.perKomponen.find(
                    (c) => c.komponen.id === 'KOMP-02'
                  );
                  const kSarpras = val.perKomponen.find(
                    (c) => c.komponen.id === 'KOMP-08'
                  );
                  const kHonor = val.perKomponen.find(
                    (c) => c.komponen.id === 'KOMP-10'
                  );
                  const maxHonor = getMaxHonorPersen(sch.statusSekolah);

                  return (
                    <tr
                      key={sch.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {sch.nama}
                        </div>
                        <div className="font-mono-num text-[11px] text-slate-500">
                          NPSN {sch.id} · {sch.jumlahSiswa || 0} Murid
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span>{sch.statusSekolah || 'SWASTA'}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{sch.wilayah}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-medium text-slate-900">
                        {formatRupiah(val.paguTahunan)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono-num font-semibold ${
                          kBaca?.lulus ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {(kBaca?.persenPagu || 0).toFixed(1)}%
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono-num font-semibold ${
                          kSarpras?.lulus ? 'text-slate-800' : 'text-red-600'
                        }`}
                      >
                        {(kSarpras?.persenPagu || 0).toFixed(1)}%
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono-num font-semibold ${
                          kHonor?.lulus ? 'text-slate-800' : 'text-red-600'
                        }`}
                      >
                        {(kHonor?.persenPagu || 0).toFixed(1)}% / {maxHonor}%
                      </td>
                      <td className="py-3 px-3">
                        {renderStatusText(sch.rkasStatus)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectSchoolAndTab(
                              sch.id,
                              currentUser.peran === 'sekolah'
                                ? 'input_rkas'
                                : 'verifikasi'
                            )
                          }
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline whitespace-nowrap"
                        >
                          <span>
                            {currentUser.peran === 'sekolah'
                              ? 'Input / Kelola RKAS'
                              : 'Periksa Berkas'}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
