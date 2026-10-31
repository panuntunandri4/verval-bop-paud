import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  BkuTransaction,
  KOMPONEN_BOP_10,
  formatRupiah,
} from '../types/bop';
import { ConfirmModal } from './ConfirmModal';

interface PenatausahaanBkuViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  selectedNpsn: string;
  onChangeSelectedNpsn: (npsn: string) => void;
  onAddTransaction: (payload: {
    npsn: string;
    tanggal: string;
    nomorBukti: string;
    jenis: 'PENERIMAAN' | 'PENGELUARAN';
    tahap: 1 | 2;
    rkasItemId?: string;
    uraian: string;
    nominal: number;
    pajakPphPpn: number;
    penerimaToko: string;
  }) => Promise<void>;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

export const PenatausahaanBkuView: React.FC<PenatausahaanBkuViewProps> = ({
  currentUser,
  state,
  selectedNpsn,
  onChangeSelectedNpsn,
  onAddTransaction,
  onDeleteTransaction,
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

  const schoolRkasItems = useMemo(
    () =>
      activeSchool
        ? state.rkasItems.filter((i) => i.npsn === activeSchool.id)
        : [],
    [state.rkasItems, activeSchool]
  );

  const schoolTx = useMemo(() => {
    if (!activeSchool) return [];
    return state.bkuTransactions
      .filter((t) => t.npsn === activeSchool.id)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [state.bkuTransactions, activeSchool]);

  const ledgerWithBalance = useMemo(() => {
    let saldo = 0;
    return schoolTx.map((tx) => {
      if (tx.jenis === 'PENERIMAAN') saldo += tx.nominal;
      else saldo -= tx.nominal;
      return { ...tx, saldoBerjalan: saldo };
    });
  }, [schoolTx]);

  const summary = useMemo(() => {
    const masuk = schoolTx
      .filter((t) => t.jenis === 'PENERIMAAN')
      .reduce((s, t) => s + t.nominal, 0);
    const keluar = schoolTx
      .filter((t) => t.jenis === 'PENGELUARAN')
      .reduce((s, t) => s + t.nominal, 0);
    const pajak = schoolTx.reduce((s, t) => s + (t.pajakPphPpn || 0), 0);
    return { masuk, keluar, saldo: masuk - keluar, pajak };
  }, [schoolTx]);

  const [modalOpen, setModalOpen] = useState(false);
  const [jenis, setJenis] = useState<'PENERIMAAN' | 'PENGELUARAN'>('PENGELUARAN');
  const [tahap, setTahap] = useState<1 | 2>(1);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [nomorBukti, setNomorBukti] = useState('KWT-005/BOP/2027');
  const [rkasItemId, setRkasItemId] = useState('');
  const [uraian, setUraian] = useState('');
  const [nominal, setNominal] = useState<number>(1000000);
  const [pajakPphPpn, setPajakPphPpn] = useState<number>(0);
  const [penerimaToko, setPenerimaToko] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BkuTransaction | null>(null);

  if (!activeSchool) return null;

  const komponenMap = new Map(KOMPONEN_BOP_10.map((k) => [k.id, k]));

  const handleSelectRkasItem = (itemId: string) => {
    setRkasItemId(itemId);
    const item = schoolRkasItems.find((i) => i.id === itemId);
    if (item) {
      const alreadySpent = schoolTx
        .filter((t) => t.rkasItemId === item.id)
        .reduce((s, t) => s + t.nominal, 0);
      const remaining = Math.max(0, item.jumlahTotal - alreadySpent);
      setUraian(`Realisasi: ${item.uraianKegiatan}`);
      setNominal(remaining > 0 ? Math.min(remaining, item.tahap1 || remaining) : 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await onAddTransaction({
        npsn: activeSchool.id,
        tanggal,
        nomorBukti,
        jenis,
        tahap,
        rkasItemId: jenis === 'PENGELUARAN' ? rkasItemId || undefined : undefined,
        uraian,
        nominal,
        pajakPphPpn,
        penerimaToko,
      });
      setModalOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan transaksi BKU'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & School Switcher */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-mono-num">
            NPSN {activeSchool.id} · Status RKAS:{' '}
            {activeSchool.rkasStatus?.replace(/_/g, ' ')}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Penatausahaan & Buku Kas Umum (BKU) — {activeSchool.nama}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            onClick={() => {
              setFormError(null);
              setJenis(
                activeSchool.rkasStatus === 'DISAHKAN'
                  ? 'PENGELUARAN'
                  : 'PENERIMAAN'
              );
              if (schoolRkasItems[0]) {
                handleSelectRkasItem(schoolRkasItems[0].id);
              }
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Catat Transaksi BKU</span>
          </button>
        </div>
      </div>

      {activeSchool.rkasStatus !== 'DISAHKAN' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <strong className="font-semibold">
              Perhatian Aturan Penatausahaan BOSP:
            </strong>{' '}
            RKAS satuan pendidikan ini berstatus{' '}
            <strong>{activeSchool.rkasStatus}</strong>. Penerimaan salur rekening
            dapat dicatat, namun pencatatan belanja realisasi oleh sekolah wajib
            menunggu RKAS disahkan Dinas Pendidikan.
          </div>
        </div>
      )}

      {/* BKU Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <span className="text-xs text-slate-500">Total Penerimaan Salur</span>
          <p className="mt-1.5 text-xl font-bold font-mono-num text-emerald-700">
            {formatRupiah(summary.masuk)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <span className="text-xs text-slate-500">Total Belanja Realisasi</span>
          <p className="mt-1.5 text-xl font-bold font-mono-num text-blue-700">
            {formatRupiah(summary.keluar)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <span className="text-xs text-slate-500">Saldo Kas BKU Saat Ini</span>
          <p className="mt-1.5 text-xl font-bold font-mono-num text-slate-900">
            {formatRupiah(summary.saldo)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <span className="text-xs text-slate-500">Pajak PPh/PPN Terpungut</span>
          <p className="mt-1.5 text-xl font-bold font-mono-num text-slate-700">
            {formatRupiah(summary.pajak)}
          </p>
        </div>
      </div>

      {/* BKU Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">
            Buku Kas Umum (BKU) Real-Time ({ledgerWithBalance.length} Transaksi)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">Tanggal & No. Bukti</th>
                <th className="py-3 px-3 font-semibold">Uraian & Penyedia</th>
                <th className="py-3 px-3 font-semibold">Komponen BOP</th>
                <th className="py-3 px-3 text-right font-semibold">
                  Penerimaan (Debit)
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Pengeluaran (Kredit)
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Saldo Berjalan
                </th>
                <th className="py-3 px-4 text-right font-semibold">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ledgerWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Belum ada transaksi pada Buku Kas Umum satuan pendidikan ini.
                  </td>
                </tr>
              ) : (
                ledgerWithBalance.map((tx) => {
                  const komp = tx.komponenId
                    ? komponenMap.get(tx.komponenId)
                    : undefined;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono-num whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {tx.tanggal}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tx.nomorBukti} · Tahap {tx.tahap}
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-[280px]">
                        <div className="font-medium text-slate-900">
                          {tx.uraian}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tx.penerimaToko}
                          {tx.pajakPphPpn > 0
                            ? ` · Pajak: ${formatRupiah(tx.pajakPphPpn)}`
                            : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {komp ? `K-${komp.nomor}: ${komp.nama}` : 'Salur Kas'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-emerald-700 whitespace-nowrap">
                        {tx.jenis === 'PENERIMAAN' ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <ArrowDownLeft className="h-3 w-3" />
                            {formatRupiah(tx.nominal)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-blue-700 whitespace-nowrap">
                        {tx.jenis === 'PENGELUARAN' ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <ArrowUpRight className="h-3 w-3" />
                            {formatRupiah(tx.nominal)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {formatRupiah(tx.saldoBerjalan)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tx)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Hapus transaksi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add BKU Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Catat Transaksi Buku Kas Umum (BKU)
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setJenis('PENERIMAAN')}
                  className={`rounded-md py-1.5 text-xs font-semibold ${
                    jenis === 'PENERIMAAN'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Penerimaan Dana Salur
                </button>
                <button
                  type="button"
                  onClick={() => setJenis('PENGELUARAN')}
                  className={`rounded-md py-1.5 text-xs font-semibold ${
                    jenis === 'PENGELUARAN'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Pengeluaran Belanja RKAS
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Tanggal Bukti
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nomor Bukti / Kuitansi
                  </label>
                  <input
                    type="text"
                    required
                    value={nomorBukti}
                    onChange={(e) => setNomorBukti(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Tahap Salur
                  </label>
                  <select
                    value={tahap}
                    onChange={(e) => setTahap(Number(e.target.value) === 2 ? 2 : 1)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value={1}>Tahap 1 (Jan–Jun)</option>
                    <option value={2}>Tahap 2 (Jul–Des)</option>
                  </select>
                </div>
              </div>

              {jenis === 'PENGELUARAN' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Hubungkan ke Rincian Kegiatan RKAS
                  </label>
                  <select
                    value={rkasItemId}
                    onChange={(e) => handleSelectRkasItem(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">-- Pilih Kegiatan RKAS --</option>
                    {schoolRkasItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.komponenId}] {i.uraianKegiatan} (Pagu:{' '}
                        {formatRupiah(i.jumlahTotal)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Uraian Transaksi
                </label>
                <input
                  type="text"
                  required
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  placeholder="Contoh: Pembayaran Belanja Buku Pojok Baca SIPLah"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={nominal}
                    onChange={(e) => setNominal(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Pajak PPh/PPN (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pajakPphPpn}
                    onChange={(e) => setPajakPphPpn(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Toko / Penerima
                  </label>
                  <input
                    type="text"
                    required
                    value={penerimaToko}
                    onChange={(e) => setPenerimaToko(e.target.value)}
                    placeholder="Nama penyedia / guru"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  {saving ? 'Menyimpan...' : 'Simpan ke BKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Transaksi BKU?"
        description={`Transaksi "${deleteTarget?.uraian}" sebesar ${formatRupiah(
          deleteTarget?.nominal || 0
        )} akan dihapus dari Buku Kas Umum.`}
        confirmLabel="Hapus Transaksi"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteTransaction(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
