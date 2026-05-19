"use client";

import { useEffect, useState } from "react";

const PRE_URL = process.env.NEXT_PUBLIC_VMS_PRE_SELECTOR_URL ?? "";
const PRO_URL = process.env.NEXT_PUBLIC_VMS_PRO_SELECTOR_URL ?? "";

function getActiveEnv(): "pre" | "pro" | null {
  if (typeof window === "undefined") return null;
  const currentOrigin = window.location.origin;
  console.log("[EnvironmentSelector]", { PRE_URL, PRO_URL, currentOrigin });
  try {
    if (PRE_URL && new URL(PRE_URL).origin === currentOrigin) return "pre";
    if (PRO_URL && new URL(PRO_URL).origin === currentOrigin) return "pro";
  } catch {
    return null;
  }
  return null;
}

const activeClass = "rounded-full px-3 py-1 bg-brand-500 text-white";
const inactiveClass =
  "rounded-full px-3 py-1 transition-colors text-[#64748B] hover:bg-white dark:text-[#8899A8] dark:hover:bg-[#333A48]";

export function EnvironmentSelector() {
  const [active, setActive] = useState<"pre" | "pro" | null>(null);

  useEffect(() => {
    setActive(getActiveEnv());
  }, []);

  return (
    <div className="flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] p-1 text-xs font-semibold dark:border-[#2E3A47] dark:bg-[#1A222C]">
      {active === "pre" ? (
        <span className={activeClass} aria-current="true">PRE</span>
      ) : (
        <a href={PRE_URL} target="_blank" rel="noopener noreferrer" className={inactiveClass}>
          PRE
        </a>
      )}
      {active === "pro" ? (
        <span className={activeClass} aria-current="true">PRO</span>
      ) : (
        <a href={PRO_URL} target="_blank" rel="noopener noreferrer" className={inactiveClass}>
          PRO
        </a>
      )}
    </div>
  );
}
