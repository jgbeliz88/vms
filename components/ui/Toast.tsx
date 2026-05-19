"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
};

type ToastContextValue = {
  notify: (toast: Omit<ToastMessage, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    if (toast.variant !== "error") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 5000);
    }
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[320px] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 rounded-[10px] border bg-white p-4 shadow-card dark:bg-[#24303F]",
              toast.variant === "success" && "border-[#219653]/30",
              toast.variant === "error" && "border-[#D34053]/30",
              toast.variant === "info" && "border-brand-500/30",
              !toast.variant && "border-[#E2E8F0] dark:border-[#2E3A47]"
            )}
            role="status"
            aria-live="polite"
          >
            {toast.variant === "success" && <CheckCircle size={16} className="mt-0.5 shrink-0 text-[#219653]" />}
            {toast.variant === "error" && <XCircle size={16} className="mt-0.5 shrink-0 text-[#D34053]" />}
            {toast.variant === "info" && <Info size={16} className="mt-0.5 shrink-0 text-brand-500" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#1C2434] dark:text-white">
                {toast.title}
              </div>
              {toast.description ? (
                <div className="mt-0.5 text-xs text-[#64748B] dark:text-[#8899A8]">
                  {toast.description}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-[#64748B] hover:text-[#1C2434] dark:text-[#8899A8] dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
