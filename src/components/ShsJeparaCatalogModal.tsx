import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  AccountProfile,
  KOMPONEN_BOP_10,
  STANDAR_PENDIDIKAN_7,
  ShsJeparaItem,
  ShsKategori,
  formatRupiah,
} from '../types/bop';

interface ShsJeparaCatalogModalProps {
  open: boolean;
  currentUser: AccountProfile;
  shsItems: ShsJeparaItem[];
  canPickToRkas: boolean;
  onClose: () => void;
  onSelectForRkas: (shs: ShsJeparaItem) => void;
  onSaveShsItem?: (payload: Omit<ShsJeparaItem, 'id'> & { id?: string }) => Promise<void>;
  onDeleteShsItem?: (shsId: string) => Promise<void>;
}

export const ShsJeparaCatalogModal: React.FC<ShsJeparaCatalogModalProps> = ({
  open,
  currentUser,
  shsItems,
  canPickToRkas,
  onClose,
  onSelectForRkas,
  onSaveShsItem,
  onDeleteShsItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [komponenFilter, setKomponenFilter] = useState<string>('ALL');
  const [kategoriFilter, setKategoriFilter] = useState<'ALL' | ShsKategori>('ALL');

  // Admin add-item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [kodeBarang, setKodeBarang] = useState('5.1.02.01.01.0024-09');
  const [kategori, setKategori] = useState<ShsKategori>('SSH');
  const [namaBarangJasa, setNamaBarangJasa] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [satuan, setSatuan] = useState('Paket');
  const [hargaTertinggi, setHargaTertinggi] = useState<number>(150000);
  const [komponenId, setKomponenId] = useState('KOMP-03');
  const [standarId, setStandarId] = useState('STD-03');
  const [savingShs, setSavingShs] = useState(false);
  const [shsError, setShsError] = useState<string | null>(null);

  const komponenMap = useMemo(
    () => new Map(KOMPONEN_BOP_10.map((k) => [k.id, k])),
    []
  );
  const standarMap = useMemo(
    () => new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, s])),
    []
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shsItems.filter((item) => {
      const matchKomp =
        komponenFilter === 'ALL' ? true : item.komponenId === komponenFilter;
      const matchKat =
        kategoriFilter === 'ALL' ? true : item.kategori === kategoriFilter;
      const matchSearch =
        !q ||
        item.namaBarangJasa.toLowerCase().includes(q) ||
        item.kodeBarang.toLowerCase().includes(q) ||
        item.spesifikasi.toLowerCase().includes(q);
      return matchKomp && matchKat && matchSearch;
    });
  }, [shsItems, komponenFilter, kategoriFilter, searchQuery]);

  if (!open) return null;

  const handleAddShsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveShsItem) return;
    setShsError(null);
    setSavingShs(true);
    try {
      await onSaveShsItem({
        kodeBarang,
        kategori,
        namaBarangJasa,
        spesifikasi,
        satuan,
        hargaTertinggi,
        komponenId,
        standarId,
      });
      setNamaBarangJasa('');
      setSpesifikasi('');
      setShowAddForm(false);
    } catch (err) {
      setShsError(
        err instanceof Error ? err.message : 'Gagal menyimpan referensi SHS'
      );
    } finally {
      setSavingShs(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-700 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Referensi Standar Harga Satuan (SHS) Kabupaten Jepara
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Acuan batas tertinggi Standar Satuan Harga (SSH), Standar Biaya Umum (SBU), dan HSPK Disdikpora Kab. Jepara untuk pengisian RKAS BOP PAUD
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.peran === 'admin' && onSaveShsItem && (
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{showAddForm ? 'Tutup Form' : 'Tambah Item SHS Jepara'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Tutup katalog SHS"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional Admin Add Form */}
        {showAddForm && currentUser.peran === 'admin' && (
          <form
            onSubmit={handleAddShsSubmit}
            className="border-b border-slate-200 bg-slate-50 px-6 py-4 space-y-3"
          >
            <div className="text-xs font-bold text-slate-900">
              Tambah Referensi Standar Harga Satuan Kabupaten Jepara Baru
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Kode Barang / Rekening
                </label>
                <input
                  type="text"
                  required
                  value={kodeBarang}
                  onChange={(e) => setKodeBarang(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono-num"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Kelompok Standar
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as ShsKategori)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="SSH">SSH (Standar Satuan Harga)</option>
                  <option value="SBU">SBU (Standar Biaya Umum)</option>
                  <option value="HSPK">HSPK (Harga Satuan Pokok)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Satuan
                </label>
                <input
                  type="text"
                  required
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  placeholder="Unit / Paket / OB / Rim"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Harga Tertinggi (Rp)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={hargaTertinggi}
                  onChange={(e) => setHargaTertinggi(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Uraian Barang / Jasa Standar Jepara
                </label>
                <input
                  type="text"
                  required
                  value={namaBarangJasa}
                  onChange={(e) => setNamaBarangJasa(e.target.value)}
                  placeholder="Contoh: Meja Belajar Kayu Anak PAUD Standar Jepara"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Spesifikasi Teknis
                </label>
                <input
                  type="text"
                  required
                  value={spesifikasi}
                  onChange={(e) => setSpesifikasi(e.target.value)}
                  placeholder="Contoh: Kayu mahoni oven finishing waterbased non-toxic"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Komponen BOP PAUD (1–10)
                </label>
                <select
                  value={komponenId}
                  onChange={(e) => {
                    const nextK = e.target.value;
                    setKomponenId(nextK);
                    const komp = komponenMap.get(nextK);
                    if (komp) setStandarId(komp.defaultStandarId);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  {KOMPONEN_BOP_10.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nomor}. {k.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  7 Standar Pendidikan PAUD
                </label>
                <select
                  value={standarId}
                  onChange={(e) => setStandarId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                >
                  {STANDAR_PENDIDIKAN_7.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kode} {s.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingShs}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingShs ? 'Menyimpan...' : 'Simpan ke Katalog SHS'}
                </button>
              </div>
            </div>
            {shsError && (
              <p className="text-xs text-red-700">{shsError}</p>
            )}
          </form>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-3 bg-white">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang/jasa, kode SHS, spesifikasi..."
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <select
              value={komponenFilter}
              onChange={(e) => setKomponenFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua 10 Komponen BOP PAUD</option>
              {KOMPONEN_BOP_10.map((k) => (
                <option key={k.id} value={k.id}>
                  Komp. {k.nomor}: {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(['ALL', 'SSH', 'SBU', 'HSPK'] as const).map((kat) => (
              <button
                key={kat}
                type="button"
                onClick={() => setKategoriFilter(kat)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  kategoriFilter === kat
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {kat === 'ALL' ? 'Semua' : kat}
              </button>
            ))}
          </div>
        </div>

        {/* SHS Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-5 font-semibold">Kode & Kelompok</th>
                <th className="py-3 px-3 font-semibold">
                  Uraian Standar Barang / Jasa & Spesifikasi
                </th>
                <th className="py-3 px-3 font-semibold">
                  Komponen & Standar PAUD
                </th>
                <th className="py-3 px-3 text-right font-semibold">
                  Satuan & Harga Tertinggi
                </th>
                <th className="py-3 px-5 text-right font-semibold">
                  Tindakan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Tidak ada item Standar Harga Satuan Kabupaten Jepara yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((shs) => {
                  const komp = komponenMap.get(shs.komponenId);
                  const std = standarMap.get(shs.standarId);
                  return (
                    <tr
                      key={shs.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-5 align-top whitespace-nowrap">
                        <div className="font-mono-num font-semibold text-slate-900">
                          {shs.kodeBarang}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Kelompok {shs.kategori} · Kab. Jepara
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top max-w-[320px]">
                        <div className="font-semibold text-slate-900">
                          {shs.namaBarangJasa}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                          {shs.spesifikasi}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top max-w-[210px]">
                        <div className="font-medium text-slate-800">
                          Komp. {komp?.nomor}: {komp?.nama}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {std ? `${std.kode} ${std.nama}` : shs.standarId}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top text-right font-mono-num whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {formatRupiah(shs.hargaTertinggi)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          per {shs.satuan} (Batas Tertinggi)
                        </div>
                      </td>
                      <td className="py-3 px-5 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canPickToRkas && (
                            <button
                              type="button"
                              onClick={() => onSelectForRkas(shs)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                            >
                              <span>Pakai di RKAS</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          {currentUser.peran === 'admin' && onDeleteShsItem && (
                            <button
                              type="button"
                              onClick={() => onDeleteShsItem(shs.id)}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Hapus dari katalog SHS"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
          <span>
            Menampilkan <strong className="font-mono-num">{filteredItems.length}</strong> dari{' '}
            <strong className="font-mono-num">{shsItems.length}</strong> referensi Standar Harga Satuan Kabupaten Jepara
          </span>
          <span>
            Ketentuan: Harga satuan input RKAS sekolah tidak boleh melampaui Batas Tertinggi SHS Kab. Jepara
          </span>
        </div>
      </div>
    </div>
  );
};
