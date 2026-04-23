"use client";

import { useSession } from "@/lib/session/provider";

export function NoPermission() {
  const { logout } = useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        You don&apos;t have permission to view this page.
      </p>
      <button
        onClick={logout}
        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Log out
      </button>
    </div>
  );
}
