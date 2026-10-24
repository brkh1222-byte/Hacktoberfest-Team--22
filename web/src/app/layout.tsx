import type { Metadata } from "next";
import type { ReactNode } from "react";
import { mn } from "@/lib/i18n/mn";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = { title: mn.brand, description: mn.description };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
