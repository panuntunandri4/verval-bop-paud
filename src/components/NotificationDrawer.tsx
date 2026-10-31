import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { AppNotification } from '../types/bop';

interface NotificationDrawerProps {
  open: boolean;
  notifications: AppNotification[];
  currentUserId: string;
  onClose: () => void;
  onMarkRead: (notificationId?: string, markAll?: boolean) => Promise<void>;
  onNavigate: (
    tab: AppNotification['linkTab'],
    npsnTerkait?: string
  ) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  notifications,
  currentUserId,
  onClose,
  onMarkRead,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!open) return null;

  const displayed = notifications.filter((n) =>
    filter === 'unread' ? !n.dibacaOleh.includes(currentUserId) : true
  );

  const getIcon = (tipe: AppNotification['tipe']) => {
    switch (tipe) {
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
      case 'ALERT':
        return <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />;
      default:
        return <Info className="h-4 w-4 shrink-0 text-blue-700" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Notifikasi Otomatis Verifikasi & BOSP
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup panel notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-2.5 bg-slate-50">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-0.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Dibaca (
              {
                notifications.filter(
                  (n) => !n.dibacaOleh.includes(currentUserId)
                ).length
              }
              )
            </button>
          </div>

          <button
            type="button"
            onClick={() => onMarkRead(undefined, true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
          {displayed.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                Tidak ada notifikasi
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Pemberitahuan otomatis akan muncul secara real-time saat ada pengajuan atau verifikasi berkas RKAS/BKU.
              </p>
            </div>
          ) : (
            displayed.map((n) => {
              const isUnread = !n.dibacaOleh.includes(currentUserId);
              return (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${
                    isUnread ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(n.tipe)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">
                          {n.judul}
                        </p>
                        {isUnread && (
                          <span className="text-[11px] font-semibold text-blue-700 shrink-0">
                            Baru
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {n.pesan}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono-num">
                          {new Date(n.createdAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await onMarkRead(n.id, false);
                            onNavigate(n.linkTab, n.npsnTerkait);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                        >
                          <span>Buka Berkas</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
