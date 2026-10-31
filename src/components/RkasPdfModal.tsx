import React, { useEffect, useMemo, useState } from 'react';
import {
  FileDown,
  Printer,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  AccountProfile,
  KOMPONEN_BOP_10,
  RkasItem,
  STANDAR_PENDIDIKAN_7,
  SignatoryData,
  formatRupiah,
  validateRkasJuknis,
} from '../types/bop';
import { generateRkasVerificationPdf } from '../utils/rkasPdfGenerator';

interface RkasPdfModalProps {
  open: boolean;
  school: AccountProfile;
  items: RkasItem[];
  tahunAnggaran: number;
  onClose: () => void;
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

export const RkasPdfModal: React.FC<RkasPdfModalProps> = ({
  open,
  school,
  items,
  tahunAnggaran,
  onClose,
  onSaveSignatories,
}) => {
  const defaultDateStr = useMemo(
    () =>
      new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const [tempatTtd, setTempatTtd] = useState('Jepara');
  const [tanggalTtd, setTanggalTtd] = useState(defaultDateStr);
  const [komiteSekolah, setKomiteSekolah] = useState('');
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState('');
  const [bendahara, setBendahara] = useState('');
  const [nipBendahara, setNipBendahara] = useState('');
  const [kepalaDinas, setKepalaDinas] = useState('');
  const [pangkatKepalaDinas, setPangkatKepalaDinas] = useState('');
  const [nipKepalaDinas, setNipKepalaDinas] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTempatTtd(school.tempatTtd || 'Jepara');
    setKomiteSekolah(school.komiteSekolah || 'H. Ahmad Sulaiman, S.Sos.');
    setKepalaSekolah(school.kepalaSekolah || 'Kepala Satuan Pendidikan');
    setNipKepalaSekolah(
      school.nipKepalaSekolah ||
        (school.statusSekolah === 'NEGERI' ? '19780512 200501 2 008' : '-')
    );
    setBendahara(school.bendahara || 'Bendahara BOP PAUD');
    setNipBendahara(
      school.nipBendahara ||
        (school.statusSekolah === 'NEGERI' ? '19860914 201101 2 011' : '-')
    );
    setKepalaDinas(
      school.kepalaDinas || 'Dr. Drs. H. Suryadi Pratama, M.Pd.'
    );
    setPangkatKepalaDinas(
      school.pangkatKepalaDinas || 'Pembina Utama Muda (IV/c)'
    );
    setNipKepalaDinas(school.nipKepalaDinas || '19690410 199403 1 005');
    setSavedNotice(false);
  }, [open, school]);

  const schoolItems = useMemo(
    () => items.filter((i) => i.npsn === school.id),
    [items, school.id]
  );

  const validation = useMemo(
    () => validateRkasJuknis(school, items),
    [school, items]
  );

  if (!open) return null;

  const signatories: SignatoryData = {
    tempatTanggal: `${tempatTtd}, ${tanggalTtd}`,
    komiteSekolah,
    kepalaSekolah,
    nipKepalaSekolah,
    bendahara,
    nipBendahara,
    kepalaDinas,
    pangkatKepalaDinas,
    nipKepalaDinas,
  };

  const handleSaveData = async () => {
    setSaving(true);
    try {
      await onSaveSignatories({
        npsn: school.id,
        komiteSekolah,
        kepalaSekolah,
        nipKepalaSekolah,
        bendahara,
        nipBendahara,
        tempatTtd,
        kepalaDinas,
        pangkatKepalaDinas,
        nipKepalaDinas,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    await handleSaveData();
    generateRkasVerificationPdf({
      school,
      items,
      tahunAnggaran,
      signatories,
    });
  };

  const standarMap = new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, s]));
  const komponenMap = new Map(KOMPONEN_BOP_10.map((k) => [k.id, k]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 overflow-y-auto print-modal-wrapper">
      <div className="w-full max-w-6xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[94vh] print-modal-box">
        {/* Modal Top Toolbar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5 no-print">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cetak PDF Verifikasi & Pengesahan RKAS Lembaga ({school.nama})
            </h3>
            <p className="text-xs text-slate-500">
              Dilengkapi pengesahan Komite Sekolah (Kiri), Kepala Sekolah (Tengah), Bendahara (Kanan), dan Kepala Dinas Pendidikan Pemuda dan Olahraga
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveData}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
            >
              {savedNotice ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pejabat Tersimpan</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan Data Pejabat</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Langsung</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Unduh Format PDF (.pdf)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body Split: Left Signatory Form (no-print) + Right Live A4 Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          {/* Left Panel: Signatory Customization */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-5 space-y-4 no-print">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Pengaturan Penandatangan Dokumen
              </h4>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Sesuaikan nama pejabat lembaga dan Kepala Dinas sebelum mengunduh PDF.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Tempat Penetapan
                </label>
                <input
                  type="text"
                  value={tempatTtd}
                  onChange={(e) => setTempatTtd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Tanggal Dokumen
                </label>
                <input
                  type="text"
                  value={tanggalTtd}
                  onChange={(e) => setTanggalTtd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-800">
                1. Sebelah Kiri — Komite Sekolah
              </p>
              <div>
                <label className="block text-[11px] text-slate-600">
                  Nama Ketua Komite Sekolah
                </label>
                <input
                  type="text"
                  value={komiteSekolah}
                  onChange={(e) => setKomiteSekolah(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-800">
                2. Di Tengah — Kepala Sekolah
              </p>
              <div>
                <label className="block text-[11px] text-slate-600">
                  Nama Kepala Sekolah / Satuan PAUD
                </label>
                <input
                  type="text"
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">
                  NIP / NIY Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={nipKepalaSekolah}
                  onChange={(e) => setNipKepalaSekolah(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono-num"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-800">
                3. Sebelah Kanan — Bendahara
              </p>
              <div>
                <label className="block text-[11px] text-slate-600">
                  Nama Bendahara BOP PAUD
                </label>
                <input
                  type="text"
                  value={bendahara}
                  onChange={(e) => setBendahara(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">
                  NIP / NIY Bendahara
                </label>
                <input
                  type="text"
                  value={nipBendahara}
                  onChange={(e) => setNipBendahara(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono-num"
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-800">
                4. Mengetahui — Kepala Dinas Pendidikan Pemuda dan Olahraga
              </p>
              <div>
                <label className="block text-[11px] text-slate-600">
                  Nama Kepala Dinas
                </label>
                <input
                  type="text"
                  value={kepalaDinas}
                  onChange={(e) => setKepalaDinas(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600">
                    Pangkat / Gol.
                  </label>
                  <input
                    type="text"
                    value={pangkatKepalaDinas}
                    onChange={(e) => setPangkatKepalaDinas(e.target.value)}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600">
                    NIP Kepala Dinas
                  </label>
                  <input
                    type="text"
                    value={nipKepalaDinas}
                    onChange={(e) => setNipKepalaDinas(e.target.value)}
                    className="mt-0.5 w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono-num"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live A4 Official Document Preview */}
          <div className="lg:col-span-8 bg-slate-100 p-4 sm:p-8 overflow-y-auto print-sheet-container">
            <div className="mx-auto max-w-[820px] rounded-sm border border-slate-300 bg-white p-6 sm:p-10 text-slate-900 shadow-sm print-sheet">
              {/* Kop Surat */}
              <div className="border-b-2 border-slate-900 pb-3 text-center">
                <p className="text-xs font-bold tracking-wide text-slate-800">
                  PEMERINTAH KABUPATEN JEPARA — DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA
                </p>
                <h2 className="mt-0.5 text-base font-bold uppercase text-slate-950">
                  {school.nama}
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-600 font-mono-num">
                  NPSN: {school.id} · Status: {school.statusSekolah || 'SWASTA'} · Wilayah: {school.wilayah}
                </p>
              </div>

              {/* Document Title */}
              <div className="mt-4 text-center">
                <h3 className="text-sm font-bold text-slate-950">
                  LEMBAR VERIFIKASI DAN PENGESAHAN RKAS DANA BOP PAUD
                </h3>
                <p className="text-xs font-semibold text-slate-700">
                  TAHUN ANGGARAN {tahunAnggaran} (SESUAI JUKNIS BOSP)
                </p>
              </div>

              {/* School Metadata Grid */}
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded border border-slate-300 bg-slate-50/50 p-3 text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Nama Lembaga:</span>
                  <strong className="text-right text-slate-900">{school.nama}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Pagu BOP Tahunan:</span>
                  <strong className="font-mono-num text-slate-900">
                    {formatRupiah(validation.paguTahunan)}
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Jumlah Peserta Didik:</span>
                  <strong className="font-mono-num text-slate-900">
                    {school.jumlahSiswa || 0} Murid
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Total Rencana RKAS:</span>
                  <strong className="font-mono-num text-blue-800">
                    {formatRupiah(validation.totalRencana)} (
                    {validation.persenTerencana.toFixed(1)}%)
                  </strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Alokasi Tahap 1 / 2:</span>
                  <span className="font-mono-num font-semibold text-slate-800">
                    {formatRupiah(validation.totalTahap1)} /{' '}
                    {formatRupiah(validation.totalTahap2)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-600">Status Verifikasi:</span>
                  <strong className="text-emerald-800">
                    {(school.rkasStatus || 'DRAFT').replace(/_/g, ' ')}
                  </strong>
                </div>
              </div>

              {/* Section A: Juknis Compliance */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-slate-900">
                  A. Hasil Verifikasi Ketentuan Operasional Juknis BOSP
                </h4>
                <table className="mt-1.5 w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 px-2.5 py-1.5 text-left">
                        Ketentuan Penggunaan Dana
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right">
                        Nominal
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right">
                        % Pagu
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center">
                        Hasil
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.checks.map((c) => (
                      <tr key={c.kode}>
                        <td className="border border-slate-300 px-2.5 py-1">
                          {c.judul} ({c.aturanText})
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-mono-num">
                          {formatRupiah(c.nominalAktual)}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-mono-num">
                          {c.persenAktual.toFixed(2)}%
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1 text-center font-semibold">
                          {c.lulus ? 'SESUAI' : 'REVISI'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section B: Rincian Kegiatan RKAS */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-slate-900">
                  B. Rincian Kegiatan RKAS (7 Standar Pendidikan & 10 Komponen BOP PAUD)
                </h4>
                <table className="mt-1.5 w-full border-collapse border border-slate-300 text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 px-2 py-1.5 text-center">
                        No
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-left">
                        Komponen & Standar
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-left">
                        Uraian Kegiatan
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">
                        Tahap 1
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">
                        Tahap 2
                      </th>
                      <th className="border border-slate-300 px-2 py-1.5 text-right">
                        Jumlah
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolItems.map((item, idx) => {
                      const komp = komponenMap.get(item.komponenId);
                      const std = standarMap.get(item.standarId);
                      return (
                        <tr key={item.id}>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono-num">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            <div className="font-semibold">
                              K-{komp?.nomor}: {komp?.nama}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {std ? `${std.kode} ${std.nama}` : item.standarId}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-1">
                            <div>{item.uraianKegiatan}</div>
                            <div className="text-[10px] text-slate-500 font-mono-num">
                              {item.volume} {item.satuan} @{' '}
                              {formatRupiah(item.hargaSatuan)}
                              {item.kodeShs ? ` · SHS: ${item.kodeShs}` : ''}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono-num">
                            {formatRupiah(item.tahap1)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono-num">
                            {formatRupiah(item.tahap2)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono-num font-semibold">
                            {formatRupiah(item.jumlahTotal)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold">
                      <td
                        colSpan={3}
                        className="border border-slate-300 px-2 py-1.5 text-right"
                      >
                        JUMLAH TOTAL RKAS BOP PAUD
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num">
                        {formatRupiah(validation.totalTahap1)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num">
                        {formatRupiah(validation.totalTahap2)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono-num">
                        {formatRupiah(validation.totalRencana)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* OFFICIAL 4-PARTY SIGNATURE BLOCK */}
              <div className="mt-8 pt-2 text-[11px] break-inside-avoid">
                {/* Top Row: Left = Komite Sekolah, Center = Kepala Sekolah, Right = Bendahara */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  {/* Left: Komite Sekolah */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-slate-700">Menyetujui,</p>
                      <p className="font-bold text-slate-950">Komite Sekolah</p>
                    </div>
                    <div className="mt-16">
                      <p className="font-bold underline decoration-slate-700 underline-offset-4">
                        {komiteSekolah || '( .................................... )'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-transparent select-none">
                        -
                      </p>
                    </div>
                  </div>

                  {/* Center: Kepala Sekolah */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-slate-700">Mengesahkan,</p>
                      <p className="font-bold text-slate-950">Kepala Sekolah</p>
                    </div>
                    <div className="mt-16">
                      <p className="font-bold underline decoration-slate-700 underline-offset-4">
                        {kepalaSekolah || '( .................................... )'}
                      </p>
                      <p className="mt-0.5 font-mono-num text-[10px] text-slate-700">
                        NIP/NIY. {nipKepalaSekolah || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Bendahara */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="text-slate-700">
                        {tempatTtd}, {tanggalTtd}
                      </p>
                      <p className="font-bold text-slate-950">Bendahara</p>
                    </div>
                    <div className="mt-16">
                      <p className="font-bold underline decoration-slate-700 underline-offset-4">
                        {bendahara || '( .................................... )'}
                      </p>
                      <p className="mt-0.5 font-mono-num text-[10px] text-slate-700">
                        NIP/NIY. {nipBendahara || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Center Row: Mengetahui Kepala Dinas Pendidikan Pemuda dan Olahraga */}
                <div className="mt-8 text-center">
                  <p className="text-slate-700">Mengetahui,</p>
                  <p className="font-bold text-slate-950">
                    Kepala Dinas Pendidikan Pemuda dan Olahraga
                  </p>
                  <div className="mt-16">
                    <p className="font-bold underline decoration-slate-700 underline-offset-4">
                      {kepalaDinas || '( ............................................ )'}
                    </p>
                    {pangkatKepalaDinas && (
                      <p className="mt-0.5 text-[10.5px] text-slate-800">
                        {pangkatKepalaDinas}
                      </p>
                    )}
                    <p className="font-mono-num text-[10px] text-slate-700">
                      NIP. {nipKepalaDinas || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
