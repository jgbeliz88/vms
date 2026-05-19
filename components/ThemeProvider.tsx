"use client";

import { useEffect, useState } from "react";
import { getDarkMode, setDarkMode } from "@/lib/storage/settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getDarkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handleStorage = () => {
      if (getDarkMode()) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [ready]);

  return <>{children}</>;
}

export function toggleDarkMode(next: boolean) {
  setDarkMode(next);
  if (next) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
