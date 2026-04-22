"use client";

import { useEffect, useState } from "react";
import { getSettings, setSettings } from "@/lib/storage/settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handleStorage = () => {
      const settings = getSettings();
      if (settings.darkMode) {
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
  setSettings({ darkMode: next });
  if (next) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
