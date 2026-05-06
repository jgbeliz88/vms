"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SlideOverPanel({
  open,
  onClose,
  title,
  subtitle,
  submitLabel,
  onSubmit,
  submitDisabled,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: () => void;
  submitDisabled?: boolean;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-card dark:bg-[#24303F]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5 dark:border-[#2E3A47]">
          <div>
            <div className="text-[15px] font-semibold text-[#1C2434] dark:text-white">{title}</div>
            <div className="mt-0.5 text-xs text-[#64748B]">{subtitle}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#333A48]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          {children}
          <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4 dark:border-[#2E3A47]">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={onSubmit} disabled={submitDisabled}>{submitLabel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
