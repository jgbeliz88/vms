"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg";
};

export function Modal({ open, onClose, title, children, size = "lg" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKey);
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    firstFocusable?.focus();
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-[10px] bg-white p-6 shadow-card dark:bg-[#24303F]",
          size === "md" ? "max-w-xl" : "max-w-3xl"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1C2434] dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] dark:hover:bg-[#333A48]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
