"use client";

import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/auth-types";
import { NavDock, NavRail } from "./nav";
import { TopBar } from "./top-bar";

/** Halaman tanpa kerangka aplikasi (navigasi dan bar atas). */
const BARE_PAGES = new Set(["/login"]);

/**
 * Kerangka aplikasi: panel putih bersudut besar di atas kanvas abu-abu (inspirasi 03–04).
 * Halaman login tampil tanpa kerangka. Diputuskan di klien agar tetap benar saat navigasi
 * sisi klien, karena root layout tidak dirender ulang di antara halaman.
 */
export function AppShell({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_PAGES.has(pathname)) return <>{children}</>;
  return (
    <div className="mx-auto flex min-h-dvh max-w-360 bg-panel md:min-h-[calc(100dvh-2.5rem)] md:rounded-panel md:shadow-card">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        {/* Di HP, ruang bawah untuk dock navigasi yang melayang. */}
        <main id="konten" className="flex-1 px-4 pb-36 sm:px-8 md:pb-12 lg:px-10">
          {children}
        </main>
      </div>
      <NavDock />
    </div>
  );
}
