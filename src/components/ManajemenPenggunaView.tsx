import React, { useState } from 'react';
import {
  UserPlus,
  Upload,
  Download,
  Shield,
  ShieldCheck,
  Building2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  SchoolStatus,
  UserRole,
  formatRupiah,
  getMaxHonorPersen,
  getRoleLabel,
} from '../types/bop';
import { ConfirmModal } from './ConfirmModal';

interface ManajemenPenggunaViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  onSaveAccount: (payload: {
    id: string;
    nama: string;
    peran: UserRole;
    kataSandi: string;
    wilayah: string;
    statusSekolah?: SchoolStatus;
    jenjang?: 'TK' | 'KB' | 'TPA' | 'SPS';
    jumlahSiswa?: number;
    satuanBiaya?: number;
    paguTahunan?: number;
  }) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
  onActivateProductionMode: (payload: {
    adminName: string;
    newAdminPassword?: string;
    tahunAnggaran: number;
    clearSampleData: boolean;
  }) => Promise<string>;
  onImportCsvRows: (rows: string[][]) => Promise<number>;
}

function parseCsvText(csvText: string): string[][] {
  return csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cols: string[] = [];
      let cur = '';
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') quoted = !quoted;
        else if (c === ',' && !quoted) {
          cols.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      cols.push(cur.trim());
      return cols;
    });
}

export const ManajemenPenggunaView: React.FC<ManajemenPenggunaViewProps> = ({
  currentUser,
  state,
  onSaveAccount,
  onDeleteAccount,
  onActivateProductionMode,
  onImportCsvRows,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExisting, setEditingExisting] = useState(false);
  const [id, setId] = useState('');
  const [nama, setNama] = useState('');
  const [peran, setPeran] = useState<UserRole>('sekolah');
  const [kataSandi, setKataSandi] = useState('');
  const [wilayah, setWilayah] = useState('Kec. Jepara');
  const [statusSekolah, setStatusSekolah] = useState<SchoolStatus>('SWASTA');
  const [jenjang, setJenjang] = useState<'TK' | 'KB' | 'TPA' | 'SPS'>('TK');
  const [jumlahSiswa, setJumlahSiswa] = useState(60);
  const [satuanBiaya, setSatuanBiaya] = useState(600000);

  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [prodAdminName, setProdAdminName] = useState(currentUser.nama);
  const [prodAdminPassword, setProdAdminPassword] = useState('');
  const [prodTahunAnggaran, setProdTahunAnggaran] = useState(
    state.tahunAnggaran
  );
  const [prodClearSample, setProdClearSample] = useState(true);
  const [prodBusy, setProdBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AccountProfile | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      const count = await onImportCsvRows(rows);
      setNotice({
        type: 'success',
        text: `Berhasil mengimpor / memperbarui ${count} akun dari berkas CSV "${file.name}".`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengimpor CSV akun.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadCsvTemplate = () => {
    const lines = [
      'NPSN/ID,"Nama,",Peran (sekolah/admin),KataSandi,Wilayah,StatusSekolah,JumlahSiswa,PaguTahunan',
      ...state.accounts.map((a) =>
        [
          a.id,
          `"${a.nama}"`,
          a.peran,
          a.kataSandi || a.id,
          `"${a.wilayah}"`,
          a.statusSekolah || '-',
          a.jumlahSiswa || 0,
          a.paguTahunan || 0,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VERVAL_ARKAS_${state.tahunAnggaran}_Akun.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openEditModal = (acc: AccountProfile) => {
    setEditingExisting(true);
    setId(acc.id);
    setNama(acc.nama);
    setPeran(acc.peran);
    setKataSandi('');
    setWilayah(acc.wilayah || 'Kec. Jepara');
    setStatusSekolah(acc.statusSekolah || 'SWASTA');
    setJenjang(acc.jenjang || 'TK');
    setJumlahSiswa(acc.jumlahSiswa || 60);
    setSatuanBiaya(acc.satuanBiaya || 600000);
    setModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSaveAccount({
        id,
        nama,
        peran,
        kataSandi: kataSandi.trim() ? kataSandi.trim() : editingExisting ? '***' : id,
        wilayah,
        statusSekolah: peran === 'sekolah' ? statusSekolah : undefined,
        jenjang: peran === 'sekolah' ? jenjang : undefined,
        jumlahSiswa: peran === 'sekolah' ? jumlahSiswa : undefined,
        satuanBiaya: peran === 'sekolah' ? satuanBiaya : undefined,
        paguTahunan:
          peran === 'sekolah' ? jumlahSiswa * satuanBiaya : undefined,
      });
      setModalOpen(false);
      setNotice({
        type: 'success',
        text: `Akun ${nama} (${id}) berhasil disimpan.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan akun.',
      });
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await onDeleteAccount(deleteTarget.id);
      setNotice({
        type: 'success',
        text: `Akun ${deleteTarget.nama} (${deleteTarget.id}) beserta data terkait berhasil dihapus.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus akun.',
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleExecuteProductionMode = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdBusy(true);
    setNotice(null);
    try {
      const msg = await onActivateProductionMode({
        adminName: prodAdminName.trim() || currentUser.nama,
        newAdminPassword: prodAdminPassword.trim() || undefined,
        tahunAnggaran: prodTahunAnggaran,
        clearSampleData: prodClearSample,
      });
      setProdModalOpen(false);
      setProdAdminPassword('');
      setNotice({ type: 'success', text: msg });
    } catch (err) {
      setNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal mengaktifkan Mode Produksi.',
      });
    } finally {
      setProdBusy(false);
    }
  };

  const schoolCount = state.accounts.filter((a) => a.peran === 'sekolah').length;

  return (
    <div className="space-y-6">
      {/* Header & Bulk Actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Manajemen Hak Akses Multi-User &amp; Persiapan Produksi Resmi
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Sekolah login menggunakan Nomor NPSN · Dinas menggunakan 1 Level Admin (Verifikator Admin) · Mendukung impor CSV{' '}
            <span className="font-mono-num">VERVAL_ARKAS</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setProdAdminName(currentUser.nama);
              setProdTahunAnggaran(state.tahunAnggaran);
              setProdModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Mode Produksi &amp; Sandi Admin</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsvTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV VERVAL_ARKAS</span>
          </button>

          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0">
            <Upload className="h-3.5 w-3.5" />
            <span>Impor CSV Akun</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setEditingExisting(false);
              setId('');
              setNama('');
              setPeran('sekolah');
              setKataSandi('');
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs font-medium ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Accounts Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-3 px-4 font-semibold">NPSN / ID Login</th>
              <th className="py-3 px-3 font-semibold">Nama Satuan / Pejabat</th>
              <th className="py-3 px-3 font-semibold">Hak Akses &amp; Level</th>
              <th className="py-3 px-3 font-semibold">Wilayah Kerja</th>
              <th className="py-3 px-3 font-semibold">Status &amp; Batas Honor</th>
              <th className="py-3 px-3 text-right font-semibold">
                Pagu Tahunan BOP
              </th>
              <th className="py-3 px-4 text-right font-semibold">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {state.accounts.map((acc: AccountProfile) => {
              const isSelf =
                acc.id.toLowerCase() === currentUser.id.toLowerCase();
              return (
                <tr key={acc.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono-num font-semibold text-slate-900">
                    {acc.id}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {acc.peran === 'sekolah' ? (
                        <Building2 className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      )}
                      <span>{acc.nama}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {getRoleLabel(acc.peran)}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{acc.wilayah}</td>
                  <td className="py-3 px-3 text-slate-600">
                    {acc.peran === 'sekolah' ? (
                      <span>
                        {acc.statusSekolah} · Honor Maks{' '}
                        {getMaxHonorPersen(acc.statusSekolah)}%
                      </span>
                    ) : (
                      <span>Otoritas Dinas Pendidikan</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-semibold text-slate-900">
                    {acc.peran === 'sekolah'
                      ? formatRupiah(acc.paguTahunan || 0)
                      : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Ubah</span>
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(acc)}
                          className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingExisting
                  ? `Perbarui Akun (${id})`
                  : 'Tambah Akun Sekolah (NPSN) atau Admin Dinas'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Hak Akses Pengguna
                </label>
                <select
                  value={peran}
                  onChange={(e) => setPeran(e.target.value as UserRole)}
                  disabled={editingExisting}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs disabled:bg-slate-100"
                >
                  <option value="sekolah">
                    Sekolah — Login menggunakan Nomor NPSN
                  </option>
                  <option value="admin">
                    Dinas — 1 Level Admin (Verifikator Admin)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {peran === 'sekolah'
                      ? 'Nomor NPSN (8 Digit)'
                      : 'ID Verifikator Admin'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingExisting}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={
                      peran === 'sekolah' ? '20318001' : 'admin_disdikpora'
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {editingExisting
                      ? 'Kata Sandi Baru (Kosongkan jika tetap)'
                      : 'Kata Sandi Login'}
                  </label>
                  <input
                    type="password"
                    required={!editingExisting}
                    value={kataSandi}
                    onChange={(e) => setKataSandi(e.target.value)}
                    placeholder={
                      editingExisting
                        ? 'Biarkan kosong bila tidak diubah'
                        : 'Kata sandi akun'
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {peran === 'sekolah'
                    ? 'Nama Satuan Pendidikan PAUD'
                    : 'Nama Lengkap & Jabatan Admin Dinas'}
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder={
                    peran === 'sekolah'
                      ? 'TK Negeri Pembina Jepara'
                      : 'Pejabat Verifikator Disdikpora'
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Wilayah / Kecamatan
                </label>
                <input
                  type="text"
                  required
                  value={wilayah}
                  onChange={(e) => setWilayah(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              {peran === 'sekolah' && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Status Satuan
                    </label>
                    <select
                      value={statusSekolah}
                      onChange={(e) =>
                        setStatusSekolah(e.target.value as SchoolStatus)
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="NEGERI">NEGERI (Honor Maks. 20%)</option>
                      <option value="SWASTA">SWASTA (Honor Maks. 40%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Jenjang PAUD
                    </label>
                    <select
                      value={jenjang}
                      onChange={(e) =>
                        setJenjang(
                          e.target.value as 'TK' | 'KB' | 'TPA' | 'SPS'
                        )
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="TK">TK</option>
                      <option value="KB">KB</option>
                      <option value="TPA">TPA</option>
                      <option value="SPS">SPS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Jumlah Murid
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={jumlahSiswa}
                      onChange={(e) =>
                        setJumlahSiswa(Number(e.target.value) || 0)
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono-num"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Satuan Biaya BOP PAUD / Murid / Tahun
                    </label>
                    <input
                      type="number"
                      step={10000}
                      value={satuanBiaya}
                      onChange={(e) =>
                        setSatuanBiaya(Number(e.target.value) || 600000)
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-slate-500">
                      Pagu Otomatis
                    </span>
                    <span className="mt-2 block font-mono-num text-xs font-bold text-blue-700">
                      {formatRupiah(jumlahSiswa * satuanBiaya)}
                    </span>
                  </div>
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
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production Mode & Clean Sample Data Modal */}
      {prodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Persiapan Mode Produksi Resmi (Non-Demo)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProdModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleExecuteProductionMode}
              className="mt-4 space-y-4 text-xs"
            >
              <p className="text-slate-600 leading-relaxed">
                Gunakan pengaturan ini sebelum membagikan tautan aplikasi publik
                kepada satuan pendidikan agar kata sandi Admin Dinas aman dan
                seluruh data contoh awal dibersihkan.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700">
                    Nama / Jabatan Verifikator Admin
                  </label>
                  <input
                    type="text"
                    required
                    value={prodAdminName}
                    onChange={(e) => setProdAdminName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">
                    Tahun Anggaran Aktif
                  </label>
                  <input
                    type="number"
                    min={2025}
                    max={2035}
                    required
                    value={prodTahunAnggaran}
                    onChange={(e) =>
                      setProdTahunAnggaran(Number(e.target.value) || 2027)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">
                  Kata Sandi Baru Admin Dinas ({currentUser.id})
                </label>
                <input
                  type="password"
                  value={prodAdminPassword}
                  onChange={(e) => setProdAdminPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru yang kuat (kosongkan bila tidak diubah)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodClearSample}
                  onChange={(e) => setProdClearSample(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                <span className="text-amber-950 leading-relaxed">
                  <strong className="font-semibold block">
                    Hapus seluruh akun sekolah contoh ({schoolCount} satuan)
                    beserta simulasi RKAS &amp; BKU
                  </strong>
                  <span>
                    Katalog Standar Harga Satuan (SHS) Kabupaten Jepara dan akun
                    Admin Dinas tetap dipertahankan. Setelah dibersihkan, Anda
                    dapat langsung mengimpor CSV{' '}
                    <code className="font-mono-num">VERVAL_ARKAS</code> atau
                    menarik data riil dari Google Sheets.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setProdModalOpen(false)}
                  disabled={prodBusy}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={prodBusy}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {prodBusy
                    ? 'Memproses...'
                    : 'Terapkan Pengaturan Produksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Individual Account */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Akun Pengguna"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus akun "${deleteTarget.nama}" (ID: ${deleteTarget.id})? Seluruh item RKAS dan transaksi BKU milik satuan tersebut juga akan dihapus.`
            : ''
        }
        variant="danger"
        confirmLabel="Ya, Hapus Akun"
        loading={deleteBusy}
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
