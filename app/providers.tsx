"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ManifestPathTooltipProvider } from "@/components/ui/ManifestPathTooltip";
import { SessionProvider } from "@/lib/session/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <NextAuthSessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider>
            <ToastProvider>
              <ManifestPathTooltipProvider>{children}</ManifestPathTooltipProvider>
            </ToastProvider>
          </ThemeProvider>
          {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
        </SessionProvider>
      </QueryClientProvider>
    </NextAuthSessionProvider>
  );
}
