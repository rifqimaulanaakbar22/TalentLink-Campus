"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { authApi } from "@/app/_lib/api";
import type { AuthUser } from "@/lib/auth-types";

function initials(name: string) {
  return name
    .replace(/^(Bu|Pak|Ibu|Bapak)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Identitas pengguna yang login dan tombol Keluar (pengganti chip profil di inspirasi 04). */
export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await authApi.logout();
      // Pindah ke login lalu buang cache RSC agar data pengguna sebelumnya tidak tersisa.
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal keluar. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <p role="alert" className="hidden max-w-48 text-xs text-danger sm:block">
          {error}
        </p>
      )}
      <div className="flex h-12 items-center gap-2.5 rounded-full bg-surface py-1.5 pr-1.5 pl-1.5 shadow-card">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-[13px] font-semibold text-brand-700"
        >
          {initials(user.name)}
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-[13px] font-medium">{user.name}</span>
          <span className="text-xs text-ink-muted">{user.roleLabel}</span>
        </span>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          aria-label={`Keluar dari akun ${user.email}`}
          className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-panel hover:text-ink disabled:opacity-60"
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <LogOut aria-hidden className="size-4" />
          )}
          <span className="hidden sm:inline">{busy ? "Keluar…" : "Keluar"}</span>
        </button>
      </div>
    </div>
  );
}
