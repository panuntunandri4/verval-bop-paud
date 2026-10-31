import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  FileSpreadsheet,
  ClipboardCheck,
  Wallet,
  FileBarChart2,
  Share2,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import {
  AccountProfile,
  AppDatabaseState,
  AppNotification,
  BopScheme,
  ReportStatus,
  RkasItem,
  SchoolStatus,
  ShsJeparaItem,
  UserRole,
  getRoleLabel,
} from './types/bop';
import { LoginPage } from './components/LoginPage';
import { DashboardView } from './components/DashboardView';
import { RkasPlanningView, RkasSubMenu } from './components/RkasPlanningView';
import { RkasVerificationView } from './components/RkasVerificationView';
import { PenatausahaanBkuView } from './components/PenatausahaanBkuView';
import { PelaporanBopView } from './components/PelaporanBopView';
import { IntegrasiSpreadsheetView } from './components/IntegrasiSpreadsheetView';
import { ManajemenPenggunaView } from './components/ManajemenPenggunaView';
import { NotificationDrawer } from './components/NotificationDrawer';
import { getAccessToken } from './services/googleAuth';
import {
  FullSheetDatabasePayload,
  syncDatabaseToGoogleSheets,
} from './services/googleSheetsService';

type NavTab =
  | 'dashboard'
  | 'input_rkas'
  | 'rkas'
  | 'verifikasi'
  | 'bku'
  | 'pelaporan'
  | 'integrasi'
  | 'pengguna';

const SESSION_STORAGE_KEY = 'sim_bop_paud_session_token';

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [currentUser, setCurrentUser] = useState<AccountProfile | null>(null);
  const [dbState, setDbState] = useState<AppDatabaseState | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [rkasSubMenu, setRkasSubMenu] = useState<RkasSubMenu>('input');
  const [selectedNpsn, setSelectedNpsn] = useState<string>('20600001');
  const [notifDrawerOpen, setNotifDrawerOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const apiRequest = useCallback(
    async <T = any>(
      path: string,
      options: RequestInit = {},
      overrideToken?: string
    ): Promise<T> => {
      const tokenToUse = overrideToken ?? sessionToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
      }

      const res = await fetch(path, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 && tokenToUse) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionToken(null);
          setCurrentUser(null);
          setDbState(null);
        }
        throw new Error(data.error || `Permintaan gagal (HTTP ${res.status})`);
      }
      return data as T;
    },
    [sessionToken]
  );

  // Restore session on mount if token exists
  useEffect(() => {
    if (!sessionToken || currentUser) return;
    let cancelled = false;
    setAuthLoading(true);
    apiRequest<{ user: AccountProfile; state: AppDatabaseState }>('/api/state')
      .then((res) => {
        if (cancelled) return;
        setCurrentUser(res.user);
        setDbState(res.state);
        if (res.user.peran === 'sekolah') {
          setSelectedNpsn(res.user.id);
        } else {
          const firstSchool = res.state.accounts.find(
            (a) => a.peran === 'sekolah'
          );
          if (firstSchool) setSelectedNpsn(firstSchool.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken, currentUser, apiRequest]);

  // Real-time WebSocket connection & auto-reconnect
  useEffect(() => {
    if (!sessionToken || !currentUser) return;

    let unmounted = false;

    const connectWs = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token: sessionToken }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state:init' || msg.type === 'state:updated') {
            setDbState(msg.state);
          } else if (msg.type === 'notification:created' && msg.notification) {
            setLiveToast(msg.notification);
          } else if (
            msg.type === 'presence:update' &&
            Array.isArray(msg.onlineUsers)
          ) {
            setOnlineCount(Math.max(1, msg.onlineUsers.length));
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimerRef.current = window.setTimeout(connectWs, 3000);
        }
      };
    };

    connectWs();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionToken, currentUser]);

  // Auto-dismiss live notification toast after 6s
  useEffect(() => {
    if (!liveToast) return;
    const t = window.setTimeout(() => setLiveToast(null), 6000);
    return () => clearTimeout(t);
  }, [liveToast]);

  // Debounced client-side Auto-Sync to Google Sheets when OAuth token & autoSyncGoogleSheets are active
  const lastAutoSyncedHashRef = useRef<string>('');
  useEffect(() => {
    if (
      !dbState ||
      !dbState.sheetConfig.autoSyncGoogleSheets ||
      !dbState.sheetConfig.spreadsheetId
    ) {
      return;
    }

    const dataFingerprint = JSON.stringify({
      a: dbState.accounts.length,
      r: dbState.rkasItems,
      v: dbState.verificationLogs.length,
      b: dbState.bkuTransactions,
      s: dbState.shsItems.length,
    });

    if (!lastAutoSyncedHashRef.current) {
      lastAutoSyncedHashRef.current = dataFingerprint;
      return;
    }
    if (lastAutoSyncedHashRef.current === dataFingerprint) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        await syncDatabaseToGoogleSheets(
          dbState.sheetConfig.spreadsheetId,
          dbState
        );
        lastAutoSyncedHashRef.current = dataFingerprint;
      } catch {
        // Silent background retry on next state mutation
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [dbState]);

  const handleLogin = async (id: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await apiRequest<{
        token: string;
        user: AccountProfile;
        state: AppDatabaseState;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ id, password }),
      });

      sessionStorage.setItem(SESSION_STORAGE_KEY, res.token);
      setSessionToken(res.token);
      setCurrentUser(res.user);
      setDbState(res.state);
      setActiveTab('dashboard');

      if (res.user.peran === 'sekolah') {
        setSelectedNpsn(res.user.id);
        setRkasSubMenu('input');
      } else {
        const firstSchool = res.state.accounts.find(
          (a) => a.peran === 'sekolah'
        );
        if (firstSchool) setSelectedNpsn(firstSchool.id);
        setRkasSubMenu('rincian');
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal masuk ke aplikasi.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout network error
    } finally {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionToken(null);
      setCurrentUser(null);
      setDbState(null);
    }
  };

  const unreadCount = useMemo(() => {
    if (!dbState || !currentUser) return 0;
    return dbState.notifications.filter(
      (n) => !n.dibacaOleh.includes(currentUser.id)
    ).length;
  }, [dbState, currentUser]);

  if (!currentUser || !dbState) {
    return (
      <LoginPage
        onLogin={handleLogin}
        error={authError}
        loading={authLoading}
      />
    );
  }

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    visible: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dasbor Visualisasi',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'input_rkas',
      label: 'Input Perencanaan / RKAS',
      icon: FilePlus2,
      visible: true,
    },
    {
      id: 'rkas',
      label: 'Perencanaan RKAS',
      icon: FileSpreadsheet,
      visible: true,
    },
    {
      id: 'verifikasi',
      label:
        currentUser.peran === 'sekolah'
          ? 'Status Verval RKAS'
          : 'Verifikasi RKAS Dinas',
      icon: ClipboardCheck,
      visible: true,
    },
    {
      id: 'bku',
      label: 'Penatausahaan (BKU)',
      icon: Wallet,
      visible: true,
    },
    {
      id: 'pelaporan',
      label: 'Pelaporan BOP PAUD',
      icon: FileBarChart2,
      visible: true,
    },
    {
      id: 'integrasi',
      label: 'Google Sheets & Apps Script',
      icon: Share2,
      visible: true,
    },
    {
      id: 'pengguna',
      label: 'Hak Akses & NPSN',
      icon: Users,
      visible: currentUser.peran === 'admin',
    },
  ];

  const handleSelectNavTab = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (tabId === 'input_rkas') {
      setRkasSubMenu('input');
    } else if (tabId === 'rkas') {
      setRkasSubMenu('rincian');
    }
  };

  const currentTabLabel =
    navItems.find((n) => n.id === activeTab)?.label || 'Dasbor';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar Navigation (264px) */}
      <aside className="hidden lg:flex lg:w-[264px] lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-slate-200 no-print">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-sm font-bold tracking-tight text-white">
            SIM VERVAL BOP PAUD
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            Permendikdasmen 8/2026 · TA {dbState.tahunAnggaran}
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNavTab(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-700 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="font-semibold text-white truncate">
            {currentUser.nama}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 truncate">
            {getRoleLabel(currentUser.peran)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
            <span>ID: {currentUser.id}</span>
            <span>{onlineCount} sesi aktif</span>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/50">
          <div className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <span className="text-sm font-bold text-white">
                  SIM VERVAL BOP PAUD
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="space-y-1 p-3">
                {navItems
                  .filter((i) => i.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectNavTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${
                          activeTab === item.id
                            ? 'bg-blue-700 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[264px] min-w-0">
        {/* Top Bar Contract: Contextual Breadcrumb Left — Actions Right */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5 lg:px-8 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 truncate">
              <span className="font-semibold text-slate-900 truncate">
                {currentUser.peran === 'sekolah'
                  ? `NPSN ${currentUser.id}`
                  : 'Verifikator Admin Dinas'}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-700 truncate">
                {currentTabLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('integrasi')}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'integrasi'
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Sheets &amp; Apps Script</span>
            </button>

            <button
              type="button"
              onClick={() => setNotifDrawerOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Notifikasi</span>
              {unreadCount > 0 && (
                <span className="ml-0.5 font-mono-num font-bold text-blue-700">
                  ({unreadCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Live Real-Time Toast Banner */}
        {liveToast && (
          <div className="mx-5 mt-4 lg:mx-8 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-4 shadow-xs no-print">
            <div className="text-xs text-blue-950">
              <strong className="font-bold">{liveToast.judul}: </strong>
              <span>{liveToast.pesan}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab(liveToast.linkTab);
                  if (liveToast.npsnTerkait) {
                    setSelectedNpsn(liveToast.npsnTerkait);
                  }
                  setLiveToast(null);
                }}
                className="text-xs font-bold text-blue-700 hover:underline whitespace-nowrap"
              >
                Lihat
              </button>
              <button
                type="button"
                onClick={() => setLiveToast(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Workspace */}
        <main className="flex-1 p-5 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              state={dbState}
              onSelectSchoolAndTab={(npsn, tab) => {
                setSelectedNpsn(npsn);
                if (tab === 'input_rkas') {
                  setRkasSubMenu('input');
                  setActiveTab('input_rkas');
                } else if (tab === 'rkas') {
                  setRkasSubMenu('rincian');
                  setActiveTab('rkas');
                } else {
                  setActiveTab(tab);
                }
              }}
            />
          )}

          {(activeTab === 'rkas' || activeTab === 'input_rkas') && (
            <RkasPlanningView
              currentUser={currentUser}
              state={dbState}
              selectedNpsn={selectedNpsn}
              activeSubMenu={rkasSubMenu}
              onChangeSubMenu={(sub) => {
                setRkasSubMenu(sub);
                setActiveTab(sub === 'input' ? 'input_rkas' : 'rkas');
              }}
              onChangeSelectedNpsn={setSelectedNpsn}
              onSaveItem={async (payload: Partial<RkasItem> & { npsn: string }) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/rkas/items',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onDeleteItem={async (itemId: string) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  `/api/rkas/items/${encodeURIComponent(itemId)}`,
                  { method: 'DELETE' }
                );
                setDbState(res.state);
              }}
              onReopenRkas={async (npsn: string) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/rkas/reopen',
                  {
                    method: 'POST',
                    body: JSON.stringify({ npsn }),
                  }
                );
                setDbState(res.state);
              }}
              onUpdateSchoolPagu={async (payload: {
                npsn: string;
                jumlahSiswa: number;
                satuanBiaya: number;
                skemaBopDefault: BopScheme;
              }) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/schools/pagu',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onSubmitRkas={async (payload) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/rkas/submit',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onSaveSignatories={async (payload) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/schools/signatories',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onSaveShsItem={async (
                payload: Omit<ShsJeparaItem, 'id'> & { id?: string }
              ) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/shs',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onDeleteShsItem={async (shsId: string) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  `/api/shs/${encodeURIComponent(shsId)}`,
                  { method: 'DELETE' }
                );
                setDbState(res.state);
              }}
            />
          )}

          {activeTab === 'verifikasi' && (
            <RkasVerificationView
              currentUser={currentUser}
              state={dbState}
              selectedNpsn={selectedNpsn}
              onChangeSelectedNpsn={setSelectedNpsn}
              onVerifyItem={async (itemId, statusItem, catatanVerifikator) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/rkas/verify-item',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      itemId,
                      statusItem,
                      catatanVerifikator,
                    }),
                  }
                );
                setDbState(res.state);
              }}
              onVerifySchoolRkas={async (npsn, keputusan, catatan) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/rkas/verify',
                  {
                    method: 'POST',
                    body: JSON.stringify({ npsn, keputusan, catatan }),
                  }
                );
                setDbState(res.state);
              }}
              onSaveSignatories={async (payload) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/schools/signatories',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
            />
          )}

          {activeTab === 'bku' && (
            <PenatausahaanBkuView
              currentUser={currentUser}
              state={dbState}
              selectedNpsn={selectedNpsn}
              onChangeSelectedNpsn={setSelectedNpsn}
              onAddTransaction={async (payload) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/bku/transactions',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onDeleteTransaction={async (txId) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  `/api/bku/transactions/${encodeURIComponent(txId)}`,
                  { method: 'DELETE' }
                );
                setDbState(res.state);
              }}
            />
          )}

          {activeTab === 'pelaporan' && (
            <PelaporanBopView
              currentUser={currentUser}
              state={dbState}
              selectedNpsn={selectedNpsn}
              onChangeSelectedNpsn={setSelectedNpsn}
              onSubmitReport={async (npsn, tahap) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/reports/submit',
                  {
                    method: 'POST',
                    body: JSON.stringify({ npsn, tahap }),
                  }
                );
                setDbState(res.state);
              }}
              onVerifyReport={async (
                npsn: string,
                statusLaporan: ReportStatus,
                catatan: string
              ) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/reports/verify',
                  {
                    method: 'POST',
                    body: JSON.stringify({ npsn, statusLaporan, catatan }),
                  }
                );
                setDbState(res.state);
              }}
            />
          )}

          {activeTab === 'integrasi' && (
            <IntegrasiSpreadsheetView
              currentUser={currentUser}
              state={dbState}
              onSaveSheetConfig={async (payload) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/sheets/config',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onImportAccountsFromSheet={async (rows) => {
                const res = await apiRequest<{
                  importedCount: number;
                  state: AppDatabaseState;
                }>('/api/users/import-rows', {
                  method: 'POST',
                  body: JSON.stringify({ rows }),
                });
                setDbState(res.state);
                return res.importedCount;
              }}
              onPullFullFromSheets={async (payload: FullSheetDatabasePayload) => {
                const res = await apiRequest<{
                  counts: {
                    accounts: number;
                    rkasItems: number;
                    bkuTransactions: number;
                    shsItems: number;
                  };
                  state: AppDatabaseState;
                }>('/api/sheets/pull-all', {
                  method: 'POST',
                  body: JSON.stringify({
                    spreadsheetId: payload.metadata.spreadsheetId,
                    spreadsheetTitle: payload.metadata.title,
                    spreadsheetUrl: payload.metadata.spreadsheetUrl,
                    accountsRows: payload.accountsRows,
                    rkasRows: payload.rkasRows,
                    verifRows: payload.verifRows,
                    bkuRows: payload.bkuRows,
                    shsRows: payload.shsRows,
                  }),
                });
                setDbState(res.state);
                return res.counts;
              }}
              onAppsScriptPull={async (appsScriptWebAppUrl: string) => {
                const res = await apiRequest<{
                  message: string;
                  state: AppDatabaseState;
                }>('/api/appscript/pull', {
                  method: 'POST',
                  body: JSON.stringify({ appsScriptWebAppUrl }),
                });
                setDbState(res.state);
                return res.message;
              }}
              onAppsScriptPush={async (appsScriptWebAppUrl: string) => {
                const res = await apiRequest<{
                  message: string;
                  state: AppDatabaseState;
                }>('/api/appscript/push', {
                  method: 'POST',
                  body: JSON.stringify({ appsScriptWebAppUrl }),
                });
                setDbState(res.state);
                return res.message;
              }}
              onTestWebhookPing={async () => {
                const res = await apiRequest<{ message: string }>(
                  '/api/external/v1/webhook',
                  {
                    method: 'POST',
                    headers: { 'x-api-key': 'bop-paud-sync-2027' },
                    body: JSON.stringify({
                      source: 'Uji Integrasi Dasbor',
                      action: 'PING_VERVAL_SYNC',
                      npsn: selectedNpsn,
                    }),
                  }
                );
                return res.message;
              }}
            />
          )}

          {activeTab === 'pengguna' && currentUser.peran === 'admin' && (
            <ManajemenPenggunaView
              currentUser={currentUser}
              state={dbState}
              onSaveAccount={async (payload: {
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
              }) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  '/api/users',
                  {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  }
                );
                setDbState(res.state);
              }}
              onDeleteAccount={async (accountId: string) => {
                const res = await apiRequest<{ state: AppDatabaseState }>(
                  `/api/users/${encodeURIComponent(accountId)}`,
                  { method: 'DELETE' }
                );
                setDbState(res.state);
              }}
              onActivateProductionMode={async (payload) => {
                const res = await apiRequest<{
                  message: string;
                  state: AppDatabaseState;
                }>('/api/admin/production-reset', {
                  method: 'POST',
                  body: JSON.stringify(payload),
                });
                setDbState(res.state);
                setCurrentUser((prev) =>
                  prev ? { ...prev, nama: payload.adminName || prev.nama } : prev
                );
                return res.message;
              }}
              onImportCsvRows={async (rows) => {
                const res = await apiRequest<{
                  importedCount: number;
                  state: AppDatabaseState;
                }>('/api/users/import-rows', {
                  method: 'POST',
                  body: JSON.stringify({ rows }),
                });
                setDbState(res.state);
                return res.importedCount;
              }}
            />
          )}
        </main>
      </div>

      {/* Real-time Notification Drawer */}
      <NotificationDrawer
        open={notifDrawerOpen}
        notifications={dbState.notifications}
        currentUserId={currentUser.id}
        onClose={() => setNotifDrawerOpen(false)}
        onMarkRead={async (notificationId, markAll) => {
          const res = await apiRequest<{ state: AppDatabaseState }>(
            '/api/notifications/mark-read',
            {
              method: 'POST',
              body: JSON.stringify({ notificationId, markAll }),
            }
          );
          setDbState(res.state);
        }}
        onNavigate={(tab, npsnTerkait) => {
          setActiveTab(tab);
          if (npsnTerkait) {
            setSelectedNpsn(npsnTerkait);
          }
        }}
      />
    </div>
  );
}
