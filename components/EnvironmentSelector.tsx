"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

const PRE_URL = process.env.NEXT_PUBLIC_VMS_PRE_SELECTOR_URL ?? "";
const PRO_URL = process.env.NEXT_PUBLIC_VMS_PRO_SELECTOR_URL ?? "";

function getActiveEnv(): "pre" | "pro" | null {
  if (typeof window === "undefined") return null;
  const href = window.location.href;
  if (PRE_URL && href.startsWith(PRE_URL)) return "pre";
  if (PRO_URL && href.startsWith(PRO_URL)) return "pro";
  return null;
}

export function EnvironmentSelector() {
  const [active, setActive] = useState<"pre" | "pro" | null>(null);

  useEffect(() => {
    setActive(getActiveEnv());
  }, []);

  const handleClick = (target: "pre" | "pro") => {
    if (active === target) return;
    const url = target === "pre" ? PRE_URL : PRO_URL;
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] p-1 text-xs font-semibold dark:border-[#2E3A47] dark:bg-[#1A222C]">
      <button
        type="button"
        onClick={() => handleClick("pre")}
        className={cn(
          "rounded-full px-3 py-1 transition-colors",
          active === "pre"
            ? "bg-brand-500 text-white"
            : "text-[#64748B] hover:bg-white dark:text-[#8899A8] dark:hover:bg-[#333A48]"
        )}
        aria-pressed={active === "pre"}
      >
        PRE
      </button>
      <button
        type="button"
        onClick={() => handleClick("pro")}
        className={cn(
          "rounded-full px-3 py-1 transition-colors",
          active === "pro"
            ? "bg-brand-500 text-white"
            : "text-[#64748B] hover:bg-white dark:text-[#8899A8] dark:hover:bg-[#333A48]"
        )}
        aria-pressed={active === "pro"}
      >
        PRO
      </button>
    </div>
  );
}
