import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Check,
  History,
  FileDown,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  KOMPONEN_BOP_10,
  STANDAR_PENDIDIKAN_7,
  formatRupiah,
  getRoleLabel,
  validateRkasJuknis,
} from '../types/bop';

import { RkasPdfModal } from './RkasPdfModal';

interface RkasVerificationViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  selectedNpsn: string;
  onChangeSelectedNpsn: (npsn: string) => void;
  onVerifyItem: (
    itemId: string,
    statusItem: 'SESUAI' | 'REVISI',
    catatanVerifikator: string
  ) => Promise<void>;
  onVerifySchoolRkas: (
    npsn: string,
    keputusan: 'REVISI' | 'SAHKAN',
    catatan: string
  ) => Promise<void>;
  onSaveSignatories: (payload: {
    npsn: string;
    komiteSekolah: string;
    kepalaSekolah: string;
    nipKepalaSekolah: string;
    bendahara: string;
    nipBendahara: string;
    tempatTtd: string;
    kepalaDinas: string;
    pangkatKepalaDinas: string;
    nipKepalaDinas: string;
  }) => Promise<void>;
}

export const RkasVerificationView: React.FC<RkasVerificationViewProps> = ({
  currentUser,
  state,
  selectedNpsn,
  onChangeSelectedNpsn,
  onVerifyItem,
  onVerifySchoolRkas,
  onSaveSignatories,
}) => {
  const schools = useMemo(
    () => state.accounts.filter((a) => a.peran === 'sekolah'),
    [state.accounts]
  );

  const activeSchool = useMemo(
    () => schools.find((s) => s.id === selectedNpsn) || schools[0],
    [schools, selectedNpsn]
  );

  const [catatanDinas, setCatatanDinas] = useState('');
  const [itemNoteDrafts, setItemNoteDrafts] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const validation = useMemo(
    () =>
      activeSchool ? validateRkasJuknis(activeSchool, state.rkasItems) : null,
    [activeSchool, state.rkasItems]
  );

  const schoolItems = useMemo(
    () =>
      activeSchool
        ? state.rkasItems.filter((i) => i.npsn === activeSchool.id)
        : [],
    [state.rkasItems, activeSchool]
  );

  const schoolLogs = useMemo(
    () =>
      activeSchool
        ? state.verificationLogs.filter((l) => l.npsn === activeSchool.id)
        : [],
    [state.verificationLogs, activeSchool]
  );

  const isDinas = currentUser.peran === 'admin';

  const standarMap = new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, s]));
  const komponenMap = new Map(KOMPONEN_BOP_10.map((k) => [k.id, k]));

  const handleDecision = async (keputusan: 'REVISI' | 'SAHKAN') => {
    if (!activeSchool) return;
    setActionError(null);
    if (keputusan === 'REVISI' && !catatanDinas.trim()) {
      setActionError(
        'Mohon tuliskan catatan revisi resmi agar satuan pendidikan mengetahui bagian yang harus diperbaiki.'
      );
      return;
    }

    setProcessing(true);
    try {
      await onVerifySchoolRkas(activeSchool.id, keputusan, catatanDinas);
      setCatatanDinas('');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal memproses keputusan verifikasi'
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!activeSchool || !validation) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Tidak ada berkas sekolah pada wilayah kerja ini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left Queue Column: Schools List */}
      <div className="xl:col-span-4 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-900">
              Antrean Berkas Verval RKAS ({schools.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {getRoleLabel(currentUser.peran)}
            </p>
          </div>

          <div className="divide-y divide-slate-200 max-h-[620px] overflow-y-auto">
            {schools.map((sch) => {
              const isSelected = sch.id === activeSchool.id;
              return (
                <button
                  key={sch.id}
                  type="button"
                  onClick={() => {
                    onChangeSelectedNpsn(sch.id);
                    setActionError(null);
                  }}
                  className={`w-full p-4 text-left transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs text-slate-900">
                      {sch.nama}
                    </div>
                    <span className="font-mono-num text-[11px] text-slate-500 shrink-0">
                      {sch.id}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span>{sch.statusSekolah}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sch.wilayah}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-mono-num font-medium text-slate-800">
                      {formatRupiah(sch.paguTahunan || 0)}
                    </span>
                    <span
                      className={`font-semibold ${
                        sch.rkasStatus === 'DISAHKAN'
                          ? 'text-emerald-700'
                          : sch.rkasStatus === 'PERLU_REVISI'
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {sch.rkasStatus?.replace(/_/g, ' ') || 'DRAFT'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Inspection Column */}
      <div className="xl:col-span-8 space-y-6">
        {/* School Document Summary & Juknis Audit */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-xs text-slate-500">
                <span>NPSN {activeSchool.id}</span>
                <span aria-hidden="true"> · </span>
                <span>{activeSchool.statusSekolah}</span>
                <span aria-hidden="true"> · </span>
                <span>{activeSchool.wilayah}</span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-slate-900">
                {activeSchool.nama}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>Kepala Satuan: {activeSchool.kepalaSekolah || '-'}</span>
                <span aria-hidden="true">·</span>
                <span>SPTJM: {activeSchool.berkasSptjmUrl || 'Belum diunggah'}</span>
                <span aria-hidden="true">·</span>
                <span>RAB: {activeSchool.berkasRabUrl || 'Belum diunggah'}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <span className="text-xs text-slate-500">Status Berkas Saat Ini</span>
                <div className="mt-0.5 text-sm font-bold text-blue-700">
                  {activeSchool.rkasStatus?.replace(/_/g, ' ') || 'DRAFT'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <FileDown className="h-3.5 w-3.5 text-blue-700" />
                <span>Cetak PDF Verifikasi RKAS</span>
              </button>
            </div>
          </div>

          {/* Juknis BOSP Summary Strip */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {validation.checks.slice(0, 4).map((c) => (
              <div
                key={c.kode}
                className={`rounded-lg border p-3 text-xs ${
                  c.lulus
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-800 truncate">
                    {c.judul}
                  </span>
                  {c.lulus ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  )}
                </div>
                <div className="mt-1 font-mono-num font-bold text-slate-900">
                  {c.persenAktual.toFixed(1)}%{' '}
                  <span className="font-normal text-slate-500">
                    ({formatRupiah(c.nominalAktual)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Decision Panel for Verifikator Admin Dinas */}
          {isDinas && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <label className="block text-xs font-semibold text-slate-700">
                Berita Acara / Catatan Verifikator Admin Dinas Pendidikan
              </label>
              <textarea
                rows={2}
                value={catatanDinas}
                onChange={(e) => setCatatanDinas(e.target.value)}
                placeholder="Tuliskan hasil pemeriksaan kelayakan 10 komponen BOP, kesesuaian SHS Kab. Jepara, atau instruksi revisi..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />

              {actionError && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {actionError}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleDecision('REVISI')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 whitespace-nowrap"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Kembalikan untuk Revisi</span>
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleDecision('SAHKAN')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verifikasi & Sahkan RKAS BOP PAUD</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Line-by-Line RKAS Item Verification Table */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h4 className="text-sm font-bold text-slate-900">
              Pemeriksaan Rincian Kegiatan ({schoolItems.length} Baris Anggaran)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">Komponen & Standar</th>
                  <th className="py-2.5 px-3 font-semibold">Kegiatan & Catatan Item</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Jumlah</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  {isDinas && (
                    <th className="py-2.5 px-4 text-right font-semibold">
                      Uji Baris
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schoolItems.map((item) => {
                  const komp = komponenMap.get(item.komponenId);
                  const std = standarMap.get(item.standarId);
                  const draftNote =
                    itemNoteDrafts[item.id] ?? item.catatanVerifikator ?? '';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 align-top max-w-[200px]">
                        <div className="font-semibold text-slate-900">
                          K-{komp?.nomor}: {komp?.nama}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {std ? `${std.kode} ${std.nama}` : item.standarId}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-medium text-slate-900">
                          {item.uraianKegiatan}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-num">
                          {item.volume} {item.satuan} @{' '}
                          {formatRupiah(item.hargaSatuan)}
                          {item.kodeShs
                            ? ` · SHS Jepara: ${item.kodeShs}${
                                item.batasHargaShs
                                  ? ` (≤ ${formatRupiah(item.batasHargaShs)})`
                                  : ''
                              }`
                            : ''}
                        </div>
                        {isDinas && (
                          <input
                            type="text"
                            value={draftNote}
                            onChange={(e) =>
                              setItemNoteDrafts((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Catatan verifikator untuk baris ini..."
                            className="mt-1.5 w-full rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-800 focus:border-blue-600 focus:outline-none"
                          />
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {formatRupiah(item.jumlahTotal)}
                      </td>
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            item.statusItem === 'SESUAI'
                              ? 'text-emerald-700'
                              : item.statusItem === 'REVISI'
                              ? 'text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.statusItem}
                        </span>
                      </td>
                      {isDinas && (
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                onVerifyItem(item.id, 'SESUAI', draftNote)
                              }
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <Check className="h-3 w-3" />
                              <span>Sesuai</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onVerifyItem(item.id, 'REVISI', draftNote)
                              }
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                            >
                              Revisi
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit History Log */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Riwayat Jejak Audit Verifikasi ({schoolLogs.length})
            </h4>
          </div>
          <div className="mt-3 divide-y divide-slate-200">
            {schoolLogs.length === 0 ? (
              <p className="py-3 text-xs text-slate-500">
                Belum ada riwayat verifikasi untuk satuan pendidikan ini.
              </p>
            ) : (
              schoolLogs.map((log) => (
                <div key={log.id} className="py-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {log.aksi.replace(/_/g, ' ')} · {log.olehNama}
                    </span>
                    <span className="font-mono-num text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600">{log.catatan}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <RkasPdfModal
        open={pdfModalOpen}
        school={activeSchool}
        items={state.rkasItems}
        tahunAnggaran={state.tahunAnggaran}
        onClose={() => setPdfModalOpen(false)}
        onSaveSignatories={onSaveSignatories}
      />
    </div>
  );
};
