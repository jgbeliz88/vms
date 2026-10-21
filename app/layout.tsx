import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "VMS",
  description: "Action console for API-driven workflows"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plexMono.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
