import React, { useMemo, useState } from 'react';
import {
  Download,
  Printer,
  Send,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  KOMPONEN_BOP_10,
  ReportStatus,
  STANDAR_PENDIDIKAN_7,
  formatRupiah,
} from '../types/bop';

interface PelaporanBopViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  selectedNpsn: string;
  onChangeSelectedNpsn: (npsn: string) => void;
  onSubmitReport: (npsn: string, tahap: 1 | 2) => Promise<void>;
  onVerifyReport: (
    npsn: string,
    statusLaporan: ReportStatus,
    catatan: string
  ) => Promise<void>;
}

export const PelaporanBopView: React.FC<PelaporanBopViewProps> = ({
  currentUser,
  state,
  selectedNpsn,
  onChangeSelectedNpsn,
  onSubmitReport,
  onVerifyReport,
}) => {
  const schools = useMemo(
    () => state.accounts.filter((a) => a.peran === 'sekolah'),
    [state.accounts]
  );

  const activeSchool = useMemo(() => {
    if (currentUser.peran === 'sekolah') {
      return schools.find((s) => s.id === currentUser.id) || currentUser;
    }
    return schools.find((s) => s.id === selectedNpsn) || schools[0];
  }, [currentUser, schools, selectedNpsn]);

  const [catatanLaporan, setCatatanLaporan] = useState('');

  const reportMatrix = useMemo(() => {
    if (!activeSchool) return null;
    const rkas = state.rkasItems.filter((i) => i.npsn === activeSchool.id);
    const bku = state.bkuTransactions.filter(
      (t) => t.npsn === activeSchool.id && t.jenis === 'PENGELUARAN'
    );

    const perKomponen = KOMPONEN_BOP_10.map((k) => {
      const anggaran = rkas
        .filter((i) => i.komponenId === k.id)
        .reduce((s, i) => s + i.jumlahTotal, 0);
      const realTahap1 = bku
        .filter((t) => t.komponenId === k.id && t.tahap === 1)
        .reduce((s, t) => s + t.nominal, 0);
      const realTahap2 = bku
        .filter((t) => t.komponenId === k.id && t.tahap === 2)
        .reduce((s, t) => s + t.nominal, 0);
      const totalRealisasi = realTahap1 + realTahap2;
      const sisa = anggaran - totalRealisasi;
      const persenSerap = anggaran > 0 ? (totalRealisasi / anggaran) * 100 : 0;

      return {
        komponen: k,
        anggaran,
        realTahap1,
        realTahap2,
        totalRealisasi,
        sisa,
        persenSerap,
      };
    });

    const perStandar = STANDAR_PENDIDIKAN_7.map((std) => {
      const anggaran = rkas
        .filter((i) => i.standarId === std.id)
        .reduce((s, i) => s + i.jumlahTotal, 0);
      const totalRealisasi = bku
        .filter((t) => t.standarId === std.id)
        .reduce((s, t) => s + t.nominal, 0);
      return {
        standar: std,
        anggaran,
        totalRealisasi,
        sisa: anggaran - totalRealisasi,
      };
    });

    const totalAnggaran = perKomponen.reduce((s, r) => s + r.anggaran, 0);
    const totalT1 = perKomponen.reduce((s, r) => s + r.realTahap1, 0);
    const totalT2 = perKomponen.reduce((s, r) => s + r.realTahap2, 0);
    const totalRealisasi = totalT1 + totalT2;

    return {
      perKomponen,
      perStandar,
      totalAnggaran,
      totalT1,
      totalT2,
      totalRealisasi,
      totalSisa: totalAnggaran - totalRealisasi,
    };
  }, [activeSchool, state.rkasItems, state.bkuTransactions]);

  if (!activeSchool || !reportMatrix) return null;

  const handleExportCsv = () => {
    const header = [
      'Nomor_Komponen',
      'Komponen_BOP_PAUD',
      'Rencana_RKAS_Rp',
      'Realisasi_Tahap1_Rp',
      'Realisasi_Tahap2_Rp',
      'Total_Realisasi_Rp',
      'Sisa_Anggaran_Rp',
    ];
    const rows = reportMatrix.perKomponen.map((r) => [
      r.komponen.nomor,
      `"${r.komponen.nama}"`,
      r.anggaran,
      r.realTahap1,
      r.realTahap2,
      r.totalRealisasi,
      r.sisa,
    ]);
    const csvContent =
      [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Realisasi_BOP_${activeSchool.id}_${state.tahunAnggaran}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-mono-num">
            Formulir K7a · Rekapitulasi Realisasi Penggunaan Dana BOP PAUD TA{' '}
            {state.tahunAnggaran}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {activeSchool.nama} (NPSN {activeSchool.id})
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Status Pelaporan:{' '}
            <strong className="font-semibold text-blue-700">
              {activeSchool.reportStatus?.replace(/_/g, ' ') || 'BELUM LAPOR'}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {currentUser.peran !== 'sekolah' && (
            <select
              value={activeSchool.id}
              onChange={(e) => onChangeSelectedNpsn(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.nama}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh CSV K7a</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak SPTJM / K7a</span>
          </button>

          {currentUser.peran === 'sekolah' && (
            <>
              <button
                type="button"
                onClick={() => onSubmitReport(activeSchool.id, 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Lapor Tahap 1</span>
              </button>
              <button
                type="button"
                onClick={() => onSubmitReport(activeSchool.id, 2)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Lapor Tahap 2 (100%)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 10 Komponen Realization Report Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">
            Tabel 1. Laporan Penggunaan Dana Berdasarkan 10 Komponen BOP PAUD
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">No</th>
                <th className="py-3 px-3 font-semibold">
                  Komponen Penggunaan Dana BOP PAUD
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Anggaran RKAS
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Realisasi Tahap 1
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Realisasi Tahap 2
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Total Realisasi
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  Sisa Anggaran
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportMatrix.perKomponen.map((row) => (
                <tr key={row.komponen.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono-num text-slate-500">
                    {String(row.komponen.nomor).padStart(2, '0')}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {row.komponen.nama}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num text-slate-800">
                    {formatRupiah(row.anggaran)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num text-slate-700">
                    {formatRupiah(row.realTahap1)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num text-slate-700">
                    {formatRupiah(row.realTahap2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-blue-700">
                    {formatRupiah(row.totalRealisasi)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-num text-slate-800">
                    {formatRupiah(row.sisa)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td colSpan={2} className="py-3 px-4">
                  JUMLAH TOTAL
                </td>
                <td className="py-3 px-3 text-right font-mono-num">
                  {formatRupiah(reportMatrix.totalAnggaran)}
                </td>
                <td className="py-3 px-3 text-right font-mono-num">
                  {formatRupiah(reportMatrix.totalT1)}
                </td>
                <td className="py-3 px-3 text-right font-mono-num">
                  {formatRupiah(reportMatrix.totalT2)}
                </td>
                <td className="py-3 px-3 text-right font-mono-num text-blue-700">
                  {formatRupiah(reportMatrix.totalRealisasi)}
                </td>
                <td className="py-3 px-4 text-right font-mono-num">
                  {formatRupiah(reportMatrix.totalSisa)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7 Standar Pendidikan Realization Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">
            Tabel 2. Rekapitulasi Berdasarkan 7 Standar Pendidikan PAUD
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">Kode</th>
                <th className="py-3 px-3 font-semibold">Standar Pendidikan</th>
                <th className="py-3 px-3 text-right font-semibold">
                  Anggaran RKAS
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Total Realisasi BKU
                </th>
                <th className="py-3 px-4 text-right font-semibold">
                  Sisa Anggaran
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportMatrix.perStandar.map((row) => (
                <tr key={row.standar.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono-num text-slate-500">
                    {row.standar.kode}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {row.standar.nama}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num text-slate-800">
                    {formatRupiah(row.anggaran)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-emerald-700">
                    {formatRupiah(row.totalRealisasi)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono-num text-slate-800">
                    {formatRupiah(row.sisa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dinas Report Verification Box */}
      {currentUser.peran !== 'sekolah' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 no-print">
          <h3 className="text-sm font-bold text-slate-900">
            Verifikasi Laporan Realisasi BOP PAUD oleh Dinas Pendidikan
          </h3>
          <textarea
            rows={2}
            value={catatanLaporan}
            onChange={(e) => setCatatanLaporan(e.target.value)}
            placeholder="Catatan pemeriksaan kesesuaian BKU, bukti pajak, dan SPTJM..."
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              onClick={() =>
                onVerifyReport(
                  activeSchool.id,
                  'REVISI_LAPORAN',
                  catatanLaporan || 'Mohon lengkapi bukti setor pajak pada BKU.'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Minta Revisi Laporan</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onVerifyReport(
                  activeSchool.id,
                  'DISETUJUI_TAHAP_1',
                  catatanLaporan || 'Laporan Realisasi Tahap 1 telah sesuai BKU.'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Setujui Laporan Tahap 1</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onVerifyReport(
                  activeSchool.id,
                  'SELESAI_100',
                  catatanLaporan || 'Laporan Akhir Tahun 100% BOP PAUD disahkan.'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Sahkan Laporan 100%</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
