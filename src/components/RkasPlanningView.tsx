import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Send,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  FileText,
  FileDown,
  BookOpen,
  Search,
  FilePlus2,
  Table2,
  SlidersHorizontal,
  ShieldAlert,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  BopScheme,
  JUKNIS_REGULASI_LABEL,
  KOMPONEN_BOP_10,
  LARANGAN_BOSP_2026_LIST,
  RkasItem,
  STANDAR_PENDIDIKAN_7,
  ShsJeparaItem,
  checkLaranganBosp2026,
  formatRupiah,
  getMaxHonorPersen,
  validateRkasJuknis,
} from '../types/bop';
import { ConfirmModal } from './ConfirmModal';
import { RkasPdfModal } from './RkasPdfModal';
import { ShsJeparaCatalogModal } from './ShsJeparaCatalogModal';

export type RkasSubMenu = 'input' | 'rincian' | 'pagu';

interface RkasPlanningViewProps {
  currentUser: AccountProfile;
  state: AppDatabaseState;
  selectedNpsn: string;
  activeSubMenu: RkasSubMenu;
  onChangeSubMenu: (sub: RkasSubMenu) => void;
  onChangeSelectedNpsn: (npsn: string) => void;
  onSaveItem: (payload: Partial<RkasItem> & { npsn: string }) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onReopenRkas: (npsn: string) => Promise<void>;
  onUpdateSchoolPagu: (payload: {
    npsn: string;
    jumlahSiswa: number;
    satuanBiaya: number;
    skemaBopDefault: BopScheme;
  }) => Promise<void>;
  onSubmitRkas: (payload: {
    npsn: string;
    berkasSptjmUrl: string;
    berkasRabUrl: string;
    catatanPengajuan: string;
  }) => Promise<void>;
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
  onSaveShsItem?: (
    payload: Omit<ShsJeparaItem, 'id'> & { id?: string }
  ) => Promise<void>;
  onDeleteShsItem?: (shsId: string) => Promise<void>;
}

const SATUAN_PRESETS = [
  'Paket',
  'OB',
  'Siswa',
  'Eksemplar',
  'Set',
  'Bulan',
  'Kegiatan',
  'Unit',
  'Rim',
  'Porsi',
];

export const RkasPlanningView: React.FC<RkasPlanningViewProps> = ({
  currentUser,
  state,
  selectedNpsn,
  activeSubMenu,
  onChangeSubMenu,
  onChangeSelectedNpsn,
  onSaveItem,
  onDeleteItem,
  onReopenRkas,
  onUpdateSchoolPagu,
  onSubmitRkas,
  onSaveSignatories,
  onSaveShsItem,
  onDeleteShsItem,
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

  const schoolItems = useMemo(
    () =>
      activeSchool
        ? state.rkasItems.filter((i) => i.npsn === activeSchool.id)
        : [],
    [state.rkasItems, activeSchool]
  );

  const validation = useMemo(
    () =>
      activeSchool
        ? validateRkasJuknis(activeSchool, state.rkasItems)
        : null,
    [activeSchool, state.rkasItems]
  );

  const shsCatalog = useMemo(() => state.shsItems || [], [state.shsItems]);

  const [filterKomponen, setFilterKomponen] = useState<string>('ALL');
  const [shsCatalogOpen, setShsCatalogOpen] = useState(false);

  // Dedicated Inline RKAS Input Form State (Permendikdasmen No. 8 Tahun 2026)
  const [editingItem, setEditingItem] = useState<RkasItem | null>(null);
  const [skemaBop, setSkemaBop] = useState<BopScheme>('REGULER');
  const [bulanPelaksanaan, setBulanPelaksanaan] = useState<string>(
    'Januari - Desember'
  );
  const [selectedShsId, setSelectedShsId] = useState<string>('');
  const [selectedKodeShs, setSelectedKodeShs] = useState<string>('');
  const [batasHargaShs, setBatasHargaShs] = useState<number | undefined>(
    undefined
  );
  const [shsInlineSearch, setShsInlineSearch] = useState<string>('');
  const [showAllKomponenShs, setShowAllKomponenShs] = useState<boolean>(false);

  const [komponenId, setKomponenId] = useState('KOMP-03');
  const [standarId, setStandarId] = useState('STD-03');
  const [uraianKegiatan, setUraianKegiatan] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [volume, setVolume] = useState<number>(1);
  const [satuan, setSatuan] = useState('Paket');
  const [hargaSatuan, setHargaSatuan] = useState<number>(650000);
  const [tahap1, setTahap1] = useState<number>(325000);
  const [tahap2, setTahap2] = useState<number>(325000);
  const [saving, setSaving] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // School Pagu & Dapodik Configuration State
  const [paguSiswa, setPaguSiswa] = useState<number>(
    activeSchool?.jumlahSiswa || 60
  );
  const [paguSatuanBiaya, setPaguSatuanBiaya] = useState<number>(
    activeSchool?.satuanBiaya || 600000
  );
  const [paguSkema, setPaguSkema] = useState<BopScheme>(
    activeSchool?.skemaBopDefault || 'REGULER'
  );
  const [savingPagu, setSavingPagu] = useState(false);
  const [paguNotice, setPaguNotice] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RkasItem | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [berkasSptjmUrl, setBerkasSptjmUrl] = useState('');
  const [berkasRabUrl, setBerkasRabUrl] = useState('');
  const [catatanPengajuan, setCatatanPengajuan] = useState('');

  useEffect(() => {
    if (!activeSchool) return;
    setPaguSiswa(activeSchool.jumlahSiswa || 60);
    setPaguSatuanBiaya(activeSchool.satuanBiaya || 600000);
    setPaguSkema(activeSchool.skemaBopDefault || 'REGULER');
    setSkemaBop(activeSchool.skemaBopDefault || 'REGULER');
  }, [activeSchool]);

  const standarMap = useMemo(
    () => new Map(STANDAR_PENDIDIKAN_7.map((s) => [s.id, s])),
    []
  );
  const komponenMap = useMemo(
    () => new Map(KOMPONEN_BOP_10.map((k) => [k.id, k])),
    []
  );

  // Simulated validation BEFORE saving so school sees live Permendikdasmen No. 8 Tahun 2026 impact
  const simulatedValidation = useMemo(() => {
    if (!activeSchool) return null;
    const draftTotal = Math.max(0, volume * hargaSatuan);
    const simulatedItem: RkasItem = {
      id: editingItem?.id || 'SIMULATED-DRAFT-ITEM',
      npsn: activeSchool.id,
      tahunAnggaran: state.tahunAnggaran,
      skemaBop,
      bulanPelaksanaan,
      standarId,
      komponenId,
      uraianKegiatan: uraianKegiatan || 'Simulasi Kegiatan',
      spesifikasi: spesifikasi || '-',
      volume,
      satuan,
      hargaSatuan,
      jumlahTotal: draftTotal,
      tahap1,
      tahap2,
      statusItem: 'MENUNGGU',
      updatedAt: '',
    };

    const baseItems = editingItem
      ? state.rkasItems.map((i) =>
          i.id === editingItem.id ? simulatedItem : i
        )
      : uraianKegiatan.trim() || draftTotal > 0
      ? [...state.rkasItems, simulatedItem]
      : state.rkasItems;

    return validateRkasJuknis(activeSchool, baseItems);
  }, [
    activeSchool,
    volume,
    hargaSatuan,
    editingItem,
    state.tahunAnggaran,
    state.rkasItems,
    skemaBop,
    bulanPelaksanaan,
    standarId,
    komponenId,
    uraianKegiatan,
    spesifikasi,
    satuan,
    tahap1,
    tahap2,
  ]);

  if (!activeSchool || !validation) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Belum ada satuan pendidikan yang dipilih.
      </div>
    );
  }

  const isLockedForSchool =
    currentUser.peran === 'sekolah' &&
    (activeSchool.rkasStatus === 'DIAJUKAN' ||
      activeSchool.rkasStatus === 'DISAHKAN');

  const applyShsReferenceToForm = (shs: ShsJeparaItem, currentVol = 1) => {
    setSelectedShsId(shs.id);
    setSelectedKodeShs(shs.kodeBarang);
    setBatasHargaShs(shs.hargaTertinggi);
    setKomponenId(shs.komponenId);
    setStandarId(shs.standarId);
    setUraianKegiatan(shs.namaBarangJasa);
    setSpesifikasi(shs.spesifikasi);
    setSatuan(shs.satuan);
    const nextVol = Math.max(1, currentVol);
    setVolume(nextVol);
    setHargaSatuan(shs.hargaTertinggi);
    const total = nextVol * shs.hargaTertinggi;
    const half = Math.floor(total / 2);
    setTahap1(half);
    setTahap2(total - half);
    setFormError(null);
    setFormSuccess(null);
  };

  const clearShsReferenceInForm = () => {
    setSelectedShsId('');
    setSelectedKodeShs('');
    setBatasHargaShs(undefined);
  };

  const resetFormForNewEntry = () => {
    setEditingItem(null);
    setShsInlineSearch('');
    setShowAllKomponenShs(false);
    clearShsReferenceInForm();
    setSkemaBop(activeSchool.skemaBopDefault || 'REGULER');
    setBulanPelaksanaan('Januari - Desember');
    setKomponenId('KOMP-03');
    setStandarId('STD-03');
    setUraianKegiatan('');
    setSpesifikasi('');
    setVolume(1);
    setSatuan('Paket');
    setHargaSatuan(500000);
    setTahap1(250000);
    setTahap2(250000);
    setFormError(null);
  };

  const openInputFromCatalog = (shs: ShsJeparaItem) => {
    setShsCatalogOpen(false);
    setEditingItem(null);
    setShsInlineSearch('');
    setShowAllKomponenShs(false);
    applyShsReferenceToForm(shs, 1);
    onChangeSubMenu('input');
  };

  const loadItemIntoEditForm = (item: RkasItem) => {
    setEditingItem(item);
    setShsInlineSearch('');
    setShowAllKomponenShs(false);
    setSkemaBop(item.skemaBop || activeSchool.skemaBopDefault || 'REGULER');
    setBulanPelaksanaan(item.bulanPelaksanaan || 'Januari - Desember');
    setSelectedShsId(item.shsId || '');
    setSelectedKodeShs(item.kodeShs || '');
    setBatasHargaShs(item.batasHargaShs);
    setKomponenId(item.komponenId);
    setStandarId(item.standarId);
    setUraianKegiatan(item.uraianKegiatan);
    setSpesifikasi(item.spesifikasi);
    setVolume(item.volume);
    setSatuan(item.satuan);
    setHargaSatuan(item.hargaSatuan);
    setTahap1(item.tahap1);
    setTahap2(item.tahap2);
    setFormError(null);
    setFormSuccess(null);
    onChangeSubMenu('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKomponenChange = (nextKompId: string) => {
    setKomponenId(nextKompId);
    const found = KOMPONEN_BOP_10.find((k) => k.id === nextKompId);
    if (found) {
      setStandarId(found.defaultStandarId);
    }
    if (selectedShsId) {
      const shsObj = shsCatalog.find((s) => s.id === selectedShsId);
      if (shsObj && shsObj.komponenId !== nextKompId) {
        clearShsReferenceInForm();
      }
    }
  };

  const applyAllocationSplit = (
    mode: '50_50' | '100_T1' | '100_T2',
    customTotal?: number
  ) => {
    const total = customTotal !== undefined ? customTotal : volume * hargaSatuan;
    if (mode === '100_T1') {
      setTahap1(total);
      setTahap2(0);
      setBulanPelaksanaan('Januari - Juni');
    } else if (mode === '100_T2') {
      setTahap1(0);
      setTahap2(total);
      setBulanPelaksanaan('Juli - Desember');
    } else {
      const half = Math.floor(total / 2);
      setTahap1(half);
      setTahap2(total - half);
      setBulanPelaksanaan('Januari - Desember');
    }
  };

  const handleVolumeOrPriceChange = (nextVol: number, nextPrice: number) => {
    setVolume(nextVol);
    setHargaSatuan(nextPrice);
    const total = nextVol * nextPrice;
    if (bulanPelaksanaan === 'Januari - Juni') {
      setTahap1(total);
      setTahap2(0);
    } else if (bulanPelaksanaan === 'Juli - Desember') {
      setTahap1(0);
      setTahap2(total);
    } else {
      const half = Math.floor(total / 2);
      setTahap1(half);
      setTahap2(total - half);
    }
  };

  const isExceedingShsCeiling =
    batasHargaShs !== undefined && hargaSatuan > batasHargaShs;

  const liveLaranganWarning = checkLaranganBosp2026(
    uraianKegiatan,
    spesifikasi
  );

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (liveLaranganWarning) {
      setFormError(liveLaranganWarning);
      return;
    }

    if (isExceedingShsCeiling && batasHargaShs !== undefined) {
      setFormError(
        `Harga satuan (${formatRupiah(
          hargaSatuan
        )}) melebihi Batas Tertinggi Standar Harga Satuan (SHS) Kabupaten Jepara sebesar ${formatRupiah(
          batasHargaShs
        )}.`
      );
      return;
    }

    const total = volume * hargaSatuan;
    if (total <= 0) {
      setFormError('Volume dan Harga Satuan wajib lebih besar dari Rp 0.');
      return;
    }

    if (Math.abs(tahap1 + tahap2 - total) > 1) {
      setFormError(
        `Alokasi Tahap 1 (${formatRupiah(tahap1)}) + Tahap 2 (${formatRupiah(
          tahap2
        )}) harus sama dengan Jumlah Total (${formatRupiah(total)}).`
      );
      return;
    }

    setSaving(true);
    try {
      const wasEditing = Boolean(editingItem);
      const savedName = uraianKegiatan;
      await onSaveItem({
        id: editingItem?.id,
        npsn: activeSchool.id,
        skemaBop,
        bulanPelaksanaan,
        standarId,
        komponenId,
        shsId: selectedShsId || undefined,
        kodeShs: selectedKodeShs || undefined,
        batasHargaShs,
        uraianKegiatan,
        spesifikasi,
        volume,
        satuan,
        hargaSatuan,
        tahap1,
        tahap2,
      });
      resetFormForNewEntry();
      setFormSuccess(
        wasEditing
          ? `Rincian kegiatan "${savedName}" berhasil diperbarui sesuai ${JUKNIS_REGULASI_LABEL}.`
          : `Kegiatan "${savedName}" (${formatRupiah(
              total
            )}) berhasil ditambahkan ke RKAS ${activeSchool.nama}.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan kegiatan RKAS'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockRkas = async () => {
    setReopening(true);
    setFormError(null);
    try {
      await onReopenRkas(activeSchool.id);
      setFormSuccess(
        `Mode penyusunan / perubahan RKAS berhasil dibuka sesuai ${JUKNIS_REGULASI_LABEL}. Silakan tambahkan atau sesuaikan kegiatan.`
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal membuka kunci RKAS'
      );
    } finally {
      setReopening(false);
    }
  };

  const handleSavePaguSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPagu(true);
    setPaguNotice(null);
    try {
      await onUpdateSchoolPagu({
        npsn: activeSchool.id,
        jumlahSiswa: paguSiswa,
        satuanBiaya: paguSatuanBiaya,
        skemaBopDefault: paguSkema,
      });
      setPaguNotice(
        `Parameter Pagu BOP PAUD (${paguSiswa} murid × ${formatRupiah(
          paguSatuanBiaya
        )} = ${formatRupiah(
          paguSiswa * paguSatuanBiaya
        )}) berhasil disimpan sesuai ${JUKNIS_REGULASI_LABEL}.`
      );
    } catch (err) {
      setPaguNotice(
        err instanceof Error ? err.message : 'Gagal memperbarui pagu sekolah'
      );
    } finally {
      setSavingPagu(false);
    }
  };

  const inlineFilteredShs = shsCatalog.filter((item) => {
    const matchKomp = showAllKomponenShs
      ? true
      : item.komponenId === komponenId;
    const q = shsInlineSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      item.namaBarangJasa.toLowerCase().includes(q) ||
      item.kodeBarang.toLowerCase().includes(q) ||
      item.spesifikasi.toLowerCase().includes(q);
    return matchKomp && matchQ;
  });

  const displayedItems = schoolItems.filter((item) =>
    filterKomponen === 'ALL' ? true : item.komponenId === filterKomponen
  );

  const maxHonorPct = getMaxHonorPersen(activeSchool.statusSekolah);
  const maxHonorRp = Math.floor((validation.paguTahunan * maxHonorPct) / 100);
  const currentKomponenStat = validation.perKomponen.find(
    (p) => p.komponen.id === komponenId
  );

  return (
    <div className="space-y-6">
      {/* Top School Identity, Regulatory Banner & Sub-Menu Perencanaan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono-num font-semibold text-blue-700">
                Acuan Regulasi: {JUKNIS_REGULASI_LABEL}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num font-semibold text-slate-800">
                NPSN {activeSchool.id}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Status:{' '}
                <strong className="font-semibold text-slate-800">
                  {activeSchool.statusSekolah || 'SWASTA'}
                </strong>{' '}
                (Honor Maks. {maxHonorPct}%)
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeSchool.wilayah}</span>
            </div>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Perencanaan & Input RKAS BOP PAUD — {activeSchool.nama}
            </h2>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-num text-slate-600">
              <span>
                Pagu {activeSchool.skemaBopDefault || 'REGULER'}:{' '}
                <strong className="text-slate-900">
                  {formatRupiah(validation.paguTahunan)}
                </strong>{' '}
                ({activeSchool.jumlahSiswa || 0} Murid)
              </span>
              <span>
                Terencana:{' '}
                <strong className="text-blue-700">
                  {formatRupiah(validation.totalRencana)} (
                  {validation.persenTerencana.toFixed(1)}%)
                </strong>
              </span>
              <span>
                Sisa Pagu Tersedia:{' '}
                <strong
                  className={
                    validation.sisaPagu < 0
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }
                >
                  {formatRupiah(validation.sisaPagu)}
                </strong>
              </span>
            </div>

            {activeSchool.catatanDinas && (
              <p className="mt-2 text-xs text-slate-600">
                <strong className="font-semibold text-slate-800">
                  Catatan Verifikator Admin Dinas:
                </strong>{' '}
                {activeSchool.catatanDinas}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {currentUser.peran === 'admin' && (
              <select
                value={activeSchool.id}
                onChange={(e) => onChangeSelectedNpsn(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.nama} ({s.statusSekolah})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShsCatalogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100/80 whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-700" />
              <span>Referensi SHS Kab. Jepara ({shsCatalog.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <FileDown className="h-3.5 w-3.5 text-blue-700" />
              <span>Cetak PDF Verifikasi</span>
            </button>

            {!isLockedForSchool && (
              <button
                type="button"
                disabled={!validation.siapDiajukan}
                onClick={() => {
                  setBerkasSptjmUrl(
                    activeSchool.berkasSptjmUrl ||
                      `SPTJM_BOP_${activeSchool.id}_${state.tahunAnggaran}.pdf`
                  );
                  setBerkasRabUrl(
                    activeSchool.berkasRabUrl ||
                      `RAB_ARKAS_${activeSchool.id}_${state.tahunAnggaran}.xlsx`
                  );
                  setCatatanPengajuan('');
                  setSubmitModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Ajukan Verifikasi ke Dinas</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Perencanaan Sub-Menu Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onChangeSubMenu('input')}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeSubMenu === 'input'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Input Perencanaan / RKAS</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeSubMenu('rincian')}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeSubMenu === 'rincian'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Kertas Kerja & Rincian RKAS ({schoolItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeSubMenu('pagu')}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeSubMenu === 'pagu'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Pagu Dapodik & Juknis Permendikdasmen 8/2026</span>
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Status Dokumen:{' '}
            <strong className="font-semibold text-slate-900">
              {(activeSchool.rkasStatus || 'DRAFT').replace(/_/g, ' ')}
            </strong>
          </div>
        </div>
      </div>

      {/* Unlock / Perubahan RKAS Banner when School RKAS is DIAJUKAN or DISAHKAN */}
      {isLockedForSchool && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-xs text-amber-950">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold">
                RKAS Satuan Pendidikan Berstatus {activeSchool.rkasStatus}
              </p>
              <p className="mt-0.5 text-amber-900 leading-relaxed">
                Sesuai mekanisme{' '}
                <strong>{JUKNIS_REGULASI_LABEL}</strong>, apabila sekolah perlu
                menambahkan kegiatan baru atau melakukan pergeseran/perubahan
                RKAS, klik tombol di samping untuk membuka kembali mode Input
                Perencanaan / RKAS.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={reopening}
            onClick={handleUnlockRkas}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>
              {reopening
                ? 'Membuka Mode Input...'
                : activeSchool.rkasStatus === 'DISAHKAN'
                ? 'Buka Input Perubahan / Pergeseran RKAS'
                : 'Tarik Pengajuan & Buka Input RKAS'}
            </span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-MENU 1: MENU INPUT PERENCANAAN / RKAS (PERMENDIKDASMEN 8/2026)    */}
      {/* ===================================================================== */}
      {activeSubMenu === 'input' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            {/* Left 8 Cols: Full Structured RKAS Input Form */}
            <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingItem
                      ? `Ubah Kegiatan RKAS — ${editingItem.uraianKegiatan}`
                      : 'Formulir Input Perencanaan / Kegiatan RKAS BOP PAUD'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Susun rencana kegiatan anggaran sekolah mengacu pada{' '}
                    <strong className="font-semibold text-slate-700">
                      {JUKNIS_REGULASI_LABEL}
                    </strong>{' '}
                    dan Standar Harga Satuan (SHS) Kabupaten Jepara
                  </p>
                </div>
                {editingItem && (
                  <button
                    type="button"
                    onClick={resetFormForNewEntry}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal Ubah (Buat Baru)
                  </button>
                )}
              </div>

              {formSuccess && (
                <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{formSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeSubMenu('rincian')}
                    className="font-semibold text-emerald-800 underline whitespace-nowrap"
                  >
                    Lihat Kertas Kerja
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveForm} className="mt-5 space-y-5">
                {/* Step 1: Skema BOP, 10 Komponen & 7 Standar Pendidikan */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Skema Sumber Dana BOP PAUD (Permendikdasmen 8/2026)
                    </label>
                    <select
                      value={skemaBop}
                      disabled={isLockedForSchool}
                      onChange={(e) => setSkemaBop(e.target.value as BopScheme)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="REGULER">
                        BOP PAUD Reguler (Operasional Rutin Satuan)
                      </option>
                      <option value="KINERJA">
                        BOP PAUD Kinerja (Apresiasi Satuan Berkinerja Baik)
                      </option>
                      <option value="AFIRMASI">
                        BOP PAUD Afirmasi (Dukungan Satuan Daerah Khusus)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Periode / Jadwal Pelaksanaan Kegiatan
                    </label>
                    <select
                      value={bulanPelaksanaan}
                      disabled={isLockedForSchool}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulanPelaksanaan(val);
                        if (val === 'Januari - Juni') {
                          applyAllocationSplit('100_T1');
                        } else if (val === 'Juli - Desember') {
                          applyAllocationSplit('100_T2');
                        } else {
                          applyAllocationSplit('50_50');
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="Januari - Desember">
                        Januari – Desember (Tahap 1 & Tahap 2)
                      </option>
                      <option value="Januari - Juni">
                        Januari – Juni (Semester 1 / Tahap 1)
                      </option>
                      <option value="Juli - Desember">
                        Juli – Desember (Semester 2 / Tahap 2)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      10 Komponen Penggunaan Dana BOP PAUD
                    </label>
                    <select
                      value={komponenId}
                      disabled={isLockedForSchool}
                      onChange={(e) => handleKomponenChange(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    >
                      {KOMPONEN_BOP_10.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nomor}. {k.nama}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {komponenId === 'KOMP-10' ? (
                        <span className="font-medium text-blue-800">
                          Status {activeSchool.statusSekolah || 'SWASTA'}: Batas
                          honorarium otomatis maks. {maxHonorPct}% Pagu (
                          {formatRupiah(maxHonorRp)}) · Saat ini teralokasi{' '}
                          {formatRupiah(currentKomponenStat?.nominal || 0)}
                        </span>
                      ) : komponenId === 'KOMP-02' ? (
                        <span className="font-medium text-emerald-800">
                          Wajib Minimal 5% Pagu (
                          {formatRupiah(
                            Math.ceil(validation.paguTahunan * 0.05)
                          )}
                          ) · Saat ini teralokasi{' '}
                          {formatRupiah(currentKomponenStat?.nominal || 0)}
                        </span>
                      ) : komponenId === 'KOMP-08' ? (
                        <span className="font-medium text-amber-800">
                          Maksimal 20% Pagu untuk pemeliharaan ringan (
                          {formatRupiah(
                            Math.floor(validation.paguTahunan * 0.2)
                          )}
                          ) · Saat ini teralokasi{' '}
                          {formatRupiah(currentKomponenStat?.nominal || 0)}
                        </span>
                      ) : (
                        komponenMap.get(komponenId)?.aturanKetentuan
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      7 Standar Nasional Pendidikan PAUD
                    </label>
                    <select
                      value={standarId}
                      disabled={isLockedForSchool}
                      onChange={(e) => setStandarId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    >
                      {STANDAR_PENDIDIKAN_7.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.kode} {s.nama}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {standarMap.get(standarId)?.deskripsi}
                    </p>
                  </div>
                </div>

                {/* Step 2: Integrated Standar Harga Satuan (SHS) Kabupaten Jepara Picker */}
                <div className="rounded-lg border border-blue-200 bg-slate-50 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <BookOpen className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                      <span>
                        Isi Otomatis dari Standar Harga Satuan (SHS) Kabupaten
                        Jepara
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllKomponenShs((prev) => !prev)
                        }
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {showAllKomponenShs
                          ? 'Filter Sesuai Komponen Terpilih'
                          : 'Tampilkan Semua Komponen SHS'}
                      </button>
                      {selectedShsId && (
                        <button
                          type="button"
                          onClick={clearShsReferenceInForm}
                          className="font-medium text-slate-600 hover:text-red-600"
                        >
                          Reset ke Input Manual
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="relative sm:col-span-5">
                      <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        disabled={isLockedForSchool}
                        value={shsInlineSearch}
                        onChange={(e) => setShsInlineSearch(e.target.value)}
                        placeholder="Cari buku, APE, ATK, PMT, honor..."
                        className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <select
                        value={selectedShsId}
                        disabled={isLockedForSchool}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          if (!nextId) {
                            clearShsReferenceInForm();
                            return;
                          }
                          const found = shsCatalog.find((s) => s.id === nextId);
                          if (found) {
                            applyShsReferenceToForm(found, volume);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      >
                        <option value="">
                          -- Pilih Referensi Barang/Jasa SHS Kab. Jepara (
                          {inlineFilteredShs.length} item) atau ketik manual di
                          bawah --
                        </option>
                        {inlineFilteredShs.map((shs) => (
                          <option key={shs.id} value={shs.id}>
                            [{shs.kategori}] {shs.namaBarangJasa} — Maks{' '}
                            {formatRupiah(shs.hargaTertinggi)} / {shs.satuan}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedKodeShs && batasHargaShs !== undefined && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 pt-0.5">
                      <span>
                        Kode Barang SHS Jepara:{' '}
                        <strong className="font-mono-num text-slate-900">
                          {selectedKodeShs}
                        </strong>
                      </span>
                      <span>
                        Plafon Harga Satuan Tertinggi:{' '}
                        <strong className="font-mono-num text-blue-800">
                          {formatRupiah(batasHargaShs)} / {satuan}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Step 3: Uraian Kegiatan & Spesifikasi */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Nama / Uraian Kegiatan RKAS
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLockedForSchool}
                      value={uraianKegiatan}
                      onChange={(e) => setUraianKegiatan(e.target.value)}
                      placeholder="Contoh: Pengadaan Buku Bacaan Bergambar Pojok Baca PAUD atau PMT Pangan Lokal"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Spesifikasi Teknis / Rincian Komponen Belanja
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isLockedForSchool}
                      value={spesifikasi}
                      onChange={(e) => setSpesifikasi(e.target.value)}
                      placeholder="Contoh: Buku cerita anak terkurasi Kemendikdasmen kertas art paper full color"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {liveLaranganWarning && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span>{liveLaranganWarning}</span>
                  </div>
                )}

                {/* Step 4: Volume, Satuan, Harga Satuan */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Volume
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      disabled={isLockedForSchool}
                      value={volume}
                      onChange={(e) =>
                        handleVolumeOrPriceChange(
                          Number(e.target.value) || 0,
                          hargaSatuan
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Satuan
                    </label>
                    <input
                      type="text"
                      list="rkas-satuan-presets"
                      required
                      disabled={isLockedForSchool}
                      value={satuan}
                      onChange={(e) => setSatuan(e.target.value)}
                      placeholder="Paket / OB / Eksemplar"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    />
                    <datalist id="rkas-satuan-presets">
                      {SATUAN_PRESETS.map((st) => (
                        <option key={st} value={st} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Harga Satuan (Rp)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      required
                      disabled={isLockedForSchool}
                      value={hargaSatuan}
                      onChange={(e) =>
                        handleVolumeOrPriceChange(
                          volume,
                          Number(e.target.value) || 0
                        )
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs font-mono-num text-slate-900 focus:outline-none disabled:bg-slate-100 ${
                        isExceedingShsCeiling
                          ? 'border-red-500 bg-red-50/40 focus:border-red-600'
                          : 'border-slate-300 focus:border-blue-600'
                      }`}
                    />
                    {batasHargaShs !== undefined && (
                      <p
                        className={`mt-1 text-[11px] font-mono-num ${
                          isExceedingShsCeiling
                            ? 'font-semibold text-red-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {isExceedingShsCeiling
                          ? `Melebihi batas SHS Jepara (${formatRupiah(
                              batasHargaShs
                            )})`
                          : `Sesuai SHS Jepara (≤ ${formatRupiah(
                              batasHargaShs
                            )})`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 5: Alokasi Pencairan Tahap 1 & Tahap 2 */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      Rencana Penyaluran Tahap 1 (Jan–Jun) & Tahap 2 (Jul–Des)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLockedForSchool}
                        onClick={() => applyAllocationSplit('50_50')}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Bagi 50% : 50%
                      </button>
                      <button
                        type="button"
                        disabled={isLockedForSchool}
                        onClick={() => applyAllocationSplit('100_T1')}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        100% Tahap 1
                      </button>
                      <button
                        type="button"
                        disabled={isLockedForSchool}
                        onClick={() => applyAllocationSplit('100_T2')}
                        className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        100% Tahap 2
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <span className="block text-[11px] text-slate-500">
                        Jumlah Total Kegiatan
                      </span>
                      <span className="mt-1.5 block font-mono-num text-base font-bold text-slate-900">
                        {formatRupiah(volume * hargaSatuan)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Alokasi Tahap 1 (Jan–Jun)
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={isLockedForSchool}
                        value={tahap1}
                        onChange={(e) => {
                          const t1 = Number(e.target.value) || 0;
                          setTahap1(t1);
                          setTahap2(Math.max(0, volume * hargaSatuan - t1));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono-num disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Alokasi Tahap 2 (Jul–Des)
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={isLockedForSchool}
                        value={tahap2}
                        onChange={(e) => setTahap2(Number(e.target.value) || 0)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono-num disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={resetFormForNewEntry}
                    disabled={isLockedForSchool}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Bersihkan Formulir
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      isLockedForSchool ||
                      isExceedingShsCeiling ||
                      Boolean(liveLaranganWarning)
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>
                      {saving
                        ? 'Menyimpan ke RKAS...'
                        : editingItem
                        ? 'Simpan Perubahan Kegiatan RKAS'
                        : 'Simpan & Tambahkan ke RKAS Sekolah'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right 4 Cols: Live Simulation Panel for Permendikdasmen No. 8 Tahun 2026 */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Simulasi Kepatuhan {JUKNIS_REGULASI_LABEL}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Kalkulasi otomatis dampak rincian yang sedang diinput terhadap
                  pagu sekolah
                </p>

                {simulatedValidation && (
                  <div className="mt-4 space-y-2.5">
                    {simulatedValidation.checks.map((chk) => (
                      <div
                        key={chk.kode}
                        className={`rounded-lg border p-3 ${
                          chk.lulus
                            ? 'border-slate-200 bg-slate-50/70'
                            : 'border-red-200 bg-red-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {chk.judul}
                          </span>
                          {chk.lulus ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between font-mono-num text-xs">
                          <strong className="text-slate-900">
                            {formatRupiah(chk.nominalAktual)}
                          </strong>
                          <span className="text-slate-600">
                            {chk.persenAktual.toFixed(1)}%
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-[11px] leading-snug ${
                            chk.lulus
                              ? 'text-slate-600'
                              : 'font-medium text-red-700'
                          }`}
                        >
                          {chk.pesanStatus}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs space-y-2">
                <div className="font-bold text-slate-900">
                  Rambu Larangan BOSP ({JUKNIS_REGULASI_LABEL})
                </div>
                <ul className="space-y-1.5 text-slate-600 leading-relaxed">
                  {LARANGAN_BOSP_2026_LIST.map((larangan, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono-num text-red-600 font-bold">
                        {idx + 1}.
                      </span>
                      <span>{larangan}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Preview of Current Saved RKAS Items right under Input Form */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Kegiatan RKAS Tersimpan ({schoolItems.length} Baris)
                </h3>
                <p className="text-xs text-slate-500">
                  Total Terencana: {formatRupiah(validation.totalRencana)} ·
                  Sisa Pagu: {formatRupiah(validation.sisaPagu)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeSubMenu('rincian')}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Buka Kertas Kerja Lengkap →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-4 font-semibold">Komponen & Skema</th>
                    <th className="py-2.5 px-3 font-semibold">Uraian Kegiatan</th>
                    <th className="py-2.5 px-3 text-right font-semibold">
                      Vol × Harga
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold">
                      Jumlah Total
                    </th>
                    {!isLockedForSchool && (
                      <th className="py-2.5 px-4 text-right font-semibold">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {schoolItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isLockedForSchool ? 4 : 5}
                        className="py-8 text-center text-slate-500"
                      >
                        Belum ada rincian kegiatan. Silakan isi formulir Input
                        Perencanaan / RKAS di atas untuk mulai menyusun anggaran.
                      </td>
                    </tr>
                  ) : (
                    schoolItems.map((item) => {
                      const komp = komponenMap.get(item.komponenId);
                      const std = standarMap.get(item.standarId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900">
                              K-{komp?.nomor}: {komp?.nama}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {std ? `${std.kode} ${std.nama}` : item.standarId}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono-num">
                              {item.skemaBop || 'REGULER'} ·{' '}
                              {item.bulanPelaksanaan || 'Januari - Desember'}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top">
                            <div className="font-medium text-slate-900">
                              {item.uraianKegiatan}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.spesifikasi}
                            </div>
                          </td>
                          <td className="py-3 px-3 align-top text-right font-mono-num text-slate-600 whitespace-nowrap">
                            {item.volume} {item.satuan} ×{' '}
                            {formatRupiah(item.hargaSatuan)}
                          </td>
                          <td className="py-3 px-3 align-top text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                            {formatRupiah(item.jumlahTotal)}
                          </td>
                          {!isLockedForSchool && (
                            <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => loadItemIntoEditForm(item)}
                                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                                  title="Ubah kegiatan di formulir atas"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                  title="Hapus kegiatan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-MENU 2: KERTAS KERJA & RINCIAN RKAS LENGKAP                       */}
      {/* ===================================================================== */}
      {activeSubMenu === 'rincian' && (
        <div className="space-y-6">
          {/* Real-Time Juknis BOSP Operational Rules Validator */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Validasi Otomatis Ketentuan {JUKNIS_REGULASI_LABEL} & SHS Kab.
                  Jepara
                </h3>
                <p className="text-xs text-slate-500">
                  Seluruh indikator wajib berstatus Memenuhi Syarat sebelum
                  berkas RKAS dapat diajukan ke Verifikator Admin Dinas
                </p>
              </div>
              {!isLockedForSchool && (
                <button
                  type="button"
                  onClick={() => {
                    resetFormForNewEntry();
                    onChangeSubMenu('input');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Input Kegiatan RKAS Baru</span>
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {validation.checks.map((chk) => (
                <div
                  key={chk.kode}
                  className={`rounded-lg border p-3.5 ${
                    chk.lulus
                      ? 'border-slate-200 bg-slate-50/70'
                      : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {chk.judul}
                    </span>
                    {chk.lulus ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                  </div>
                  <p className="mt-1.5 font-mono-num text-sm font-bold text-slate-900">
                    {formatRupiah(chk.nominalAktual)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({chk.persenAktual.toFixed(1)}%)
                    </span>
                  </p>
                  <p
                    className={`mt-1 text-[11px] leading-snug ${
                      chk.lulus ? 'text-slate-600' : 'font-medium text-red-700'
                    }`}
                  >
                    {chk.pesanStatus}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 10 Komponen Filter Bar & RKAS Items Table */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Kertas Kerja Rincian Kegiatan RKAS (7 Standar Pendidikan & 10
                  Komponen BOP PAUD)
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  Tahap 1: {formatRupiah(validation.totalTahap1)} · Tahap 2:{' '}
                  {formatRupiah(validation.totalTahap2)} · Sisa Pagu:{' '}
                  {formatRupiah(validation.sisaPagu)}
                </p>
              </div>

              <select
                value={filterKomponen}
                onChange={(e) => setFilterKomponen(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="ALL">Semua 10 Komponen Penggunaan Dana</option>
                {KOMPONEN_BOP_10.map((k) => (
                  <option key={k.id} value={k.id}>
                    Komponen {k.nomor}: {k.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-3 px-4 font-semibold">
                      Standar, Komponen & Skema
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      Uraian Kegiatan, Spesifikasi & Kode SHS Jepara
                    </th>
                    <th className="py-3 px-3 text-right font-semibold">
                      Vol & Harga Satuan
                    </th>
                    <th className="py-3 px-3 text-right font-semibold">
                      Jumlah Total
                    </th>
                    <th className="py-3 px-3 text-right font-semibold">
                      Tahap 1 / Tahap 2
                    </th>
                    <th className="py-3 px-3 font-semibold">Status Verval</th>
                    {!isLockedForSchool && (
                      <th className="py-3 px-4 text-right font-semibold">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isLockedForSchool ? 6 : 7}
                        className="py-10 text-center text-slate-500"
                      >
                        Belum ada kegiatan RKAS pada komponen ini. Buka tab{' '}
                        <button
                          type="button"
                          onClick={() => onChangeSubMenu('input')}
                          className="font-semibold text-blue-700 underline"
                        >
                          Input Perencanaan / RKAS
                        </button>{' '}
                        untuk menambahkan rincian anggaran.
                      </td>
                    </tr>
                  ) : (
                    displayedItems.map((item) => {
                      const std = standarMap.get(item.standarId);
                      const komp = komponenMap.get(item.komponenId);
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4 align-top max-w-[240px]">
                            <div className="font-semibold text-slate-900">
                              Komp. {komp?.nomor}: {komp?.nama}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {std ? `${std.kode} ${std.nama}` : item.standarId}
                            </div>
                            <div className="mt-1 font-mono-num text-[11px] text-slate-600">
                              {item.skemaBop || 'REGULER'} ·{' '}
                              {item.bulanPelaksanaan || 'Januari - Desember'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top max-w-[300px]">
                            <div className="font-medium text-slate-900">
                              {item.uraianKegiatan}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {item.spesifikasi}
                            </div>
                            {item.kodeShs && (
                              <div className="mt-1 font-mono-num text-[11px] text-blue-700">
                                Ref. SHS Jepara: {item.kodeShs}
                                {item.batasHargaShs
                                  ? ` · Maks ${formatRupiah(
                                      item.batasHargaShs
                                    )}`
                                  : ''}
                              </div>
                            )}
                            {item.catatanVerifikator && (
                              <div className="mt-1 text-[11px] font-medium text-red-700">
                                Catatan Dinas: {item.catatanVerifikator}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 align-top text-right font-mono-num text-slate-700 whitespace-nowrap">
                            <div>
                              {item.volume} {item.satuan}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              @ {formatRupiah(item.hargaSatuan)}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                            {formatRupiah(item.jumlahTotal)}
                          </td>
                          <td className="py-3.5 px-3 align-top text-right font-mono-num text-[11px] text-slate-600 whitespace-nowrap">
                            <div>T1: {formatRupiah(item.tahap1)}</div>
                            <div>T2: {formatRupiah(item.tahap2)}</div>
                          </td>
                          <td className="py-3.5 px-3 align-top whitespace-nowrap">
                            {item.statusItem === 'SESUAI' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Sesuai</span>
                              </span>
                            ) : item.statusItem === 'REVISI' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>Revisi</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Menunggu</span>
                            )}
                          </td>
                          {!isLockedForSchool && (
                            <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => loadItemIntoEditForm(item)}
                                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                                  title="Ubah rincian"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                  title="Hapus rincian"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-MENU 3: PAGU DAPODIK & PANDUAN PERMENDIKDASMEN NO. 8 TAHUN 2026   */}
      {/* ===================================================================== */}
      {activeSubMenu === 'pagu' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-900">
              Pengaturan Pagu & Data Murid Dapodik
            </h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Sesuaikan jumlah peserta didik terdata Dapodik (cut-off 31
              Agustus) dan skema pendanaan sesuai{' '}
              <strong>{JUKNIS_REGULASI_LABEL}</strong>.
            </p>

            {paguNotice && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900">
                {paguNotice}
              </div>
            )}

            <form onSubmit={handleSavePaguSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Skema Utama Dana BOP PAUD
                </label>
                <select
                  value={paguSkema}
                  disabled={isLockedForSchool}
                  onChange={(e) => setPaguSkema(e.target.value as BopScheme)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 disabled:bg-slate-100"
                >
                  <option value="REGULER">BOP PAUD Reguler</option>
                  <option value="KINERJA">BOP PAUD Kinerja</option>
                  <option value="AFIRMASI">
                    BOP PAUD Afirmasi (Daerah Khusus)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Jumlah Peserta Didik Dapodik
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    disabled={isLockedForSchool}
                    value={paguSiswa}
                    onChange={(e) => setPaguSiswa(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Satuan Biaya / Murid / Tahun (Rp)
                  </label>
                  <input
                    type="number"
                    min={100000}
                    step={10000}
                    required
                    disabled={isLockedForSchool}
                    value={paguSatuanBiaya}
                    onChange={(e) =>
                      setPaguSatuanBiaya(Number(e.target.value) || 600000)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono-num disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    Estimasi Pagu Tahunan BOP PAUD:
                  </span>
                  <strong className="font-mono-num text-sm text-blue-700">
                    {formatRupiah(paguSiswa * paguSatuanBiaya)}
                  </strong>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Batas Honorarium ({activeSchool.statusSekolah || 'SWASTA'}{' '}
                    Maks. {maxHonorPct}%):
                  </span>
                  <span className="font-mono-num font-semibold text-slate-800">
                    {formatRupiah(
                      Math.floor(
                        (paguSiswa * paguSatuanBiaya * maxHonorPct) / 100
                      )
                    )}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPagu || isLockedForSchool}
                className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {savingPagu
                  ? 'Menyimpan Parameter Pagu...'
                  : 'Simpan Parameter Pagu Perencanaan'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-900">
              Rekapitulasi Alokasi per 10 Komponen ({JUKNIS_REGULASI_LABEL})
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Prinsip Pengelolaan BOSP: Fleksibel, Efektif, Efisien, Akuntabel,
              dan Transparan
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">No</th>
                    <th className="py-2.5 px-3 font-semibold">
                      Komponen Penggunaan Dana BOP PAUD
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Batas Juknis</th>
                    <th className="py-2.5 px-3 text-right font-semibold">
                      Alokasi RKAS
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {validation.perKomponen.map((row) => (
                    <tr key={row.komponen.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono-num text-slate-500">
                        {String(row.komponen.nomor).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {row.komponen.nama}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.catatanBatas || 'Sesuai Kebutuhan'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                        {formatRupiah(row.nominal)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono-num font-semibold ${
                          row.lulus ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {row.persenPagu.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submit RKAS Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-700" />
              <h3 className="text-base font-bold text-slate-900">
                Ajukan Berkas RKAS BOP PAUD ke Verifikator Admin Dinas
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Seluruh ketentuan <strong>{JUKNIS_REGULASI_LABEL}</strong> telah
              terpenuhi. Notifikasi otomatis akan dikirimkan secara real-time ke
              Verifikator Admin Dinas Pendidikan Pemuda dan Olahraga Kabupaten
              Jepara.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama / Tautan Berkas SPTJM Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={berkasSptjmUrl}
                  onChange={(e) => setBerkasSptjmUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nama / Tautan Lampiran Kertas Kerja RAB
                </label>
                <input
                  type="text"
                  value={berkasRabUrl}
                  onChange={(e) => setBerkasRabUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Pengantar Sekolah
                </label>
                <textarea
                  rows={2}
                  value={catatanPengajuan}
                  onChange={(e) => setCatatanPengajuan(e.target.value)}
                  placeholder="Contoh: Mohon verifikasi RKAS BOP PAUD sesuai Juknis Permendikdasmen No. 8 Tahun 2026 & SHS Kab. Jepara"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onSubmitRkas({
                    npsn: activeSchool.id,
                    berkasSptjmUrl,
                    berkasRabUrl,
                    catatanPengajuan,
                  });
                  setSubmitModalOpen(false);
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Kirim Pengajuan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Item Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Rincian Kegiatan RKAS?"
        description={`Anda akan menghapus kegiatan "${
          deleteTarget?.uraianKegiatan
        }" senilai ${formatRupiah(
          deleteTarget?.jumlahTotal || 0
        )}. Tindakan ini akan memperbarui perhitungan persentase ${JUKNIS_REGULASI_LABEL} secara langsung.`}
        confirmLabel="Hapus Kegiatan"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteItem(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />

      {/* Standar Harga Satuan (SHS) Kabupaten Jepara Catalog Modal */}
      <ShsJeparaCatalogModal
        open={shsCatalogOpen}
        currentUser={currentUser}
        shsItems={shsCatalog}
        canPickToRkas={!isLockedForSchool}
        onClose={() => setShsCatalogOpen(false)}
        onSelectForRkas={openInputFromCatalog}
        onSaveShsItem={onSaveShsItem}
        onDeleteShsItem={onDeleteShsItem}
      />

      {/* Official PDF Verification & Signatory Modal */}
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
