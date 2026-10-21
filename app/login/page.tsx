"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn("microsoft-entra-id", { callbackUrl: "/" });
    } catch {
      setError("Unable to connect. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] dark:bg-[#1A222C] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4">
          <svg width="56" height="56" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="44" height="44" rx="12.5" fill="#3C50E0"/>
            <path d="M20 15.5 L20 32.5 L34 24 Z" fill="#FFFFFF"/>
          </svg>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight text-[#1C2434] dark:text-white">VMS</h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B] dark:text-[#8899A8]">Video Management System</p>
            <p className="mt-3 text-sm text-[#64748B]">Use your Microsoft account to sign in</p>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-8 shadow-card dark:border-[#2E3A47] dark:bg-[#24303F]">
          {error && (
            <div className="mb-4 rounded-md border border-[#D34053]/30 bg-[#FEE2E2] px-4 py-2.5">
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          <Button onClick={handleLogin} disabled={loading} className="w-full justify-center">
            {!loading && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="16" height="16" className="mr-2 shrink-0">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            )}
            {loading ? "Redirecting…" : "Sign in with Microsoft"}
          </Button>
        </div>
      </div>
    </div>
  );
}
