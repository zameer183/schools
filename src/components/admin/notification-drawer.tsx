'use client';

import { LogOut, Settings, UserCircle2, X } from 'lucide-react';

export type AdminNotice = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

export function NotificationDrawer({
  open,
  notices,
  onClose,
  onMarkAllRead
}: {
  open: boolean;
  notices: AdminNotice[];
  onClose: () => void;
  onMarkAllRead: () => void;
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/25 ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-md border-l border-slate-200 bg-white shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-headline text-2xl font-bold text-[#073f43]">Notifications</h3>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-sm text-slate-500">{notices.filter((n) => !n.read).length} unread</p>
          <button onClick={onMarkAllRead} className="text-sm font-semibold text-[#0f5954] hover:underline">
            Mark all as read
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto p-4">
          {notices.map((notice) => (
            <div key={notice.id} className={`rounded-2xl border p-4 ${notice.read ? 'border-slate-200 bg-white' : 'border-teal-200 bg-teal-50/40'}`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">{notice.title}</p>
                <span className="text-xs text-slate-500">{notice.time}</span>
              </div>
              <p className="text-sm text-slate-600">{notice.message}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 p-4 text-sm text-slate-500">
          <div className="mb-2 flex items-center gap-2"><UserCircle2 className="h-4 w-4" /> Profile</div>
          <div className="mb-2 flex items-center gap-2"><Settings className="h-4 w-4" /> Preferences</div>
          <div className="flex items-center gap-2"><LogOut className="h-4 w-4" /> Use header logout button</div>
        </div>
      </aside>
    </>
  );
}
