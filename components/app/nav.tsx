"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPlus, Gauge, LayoutGrid, Link2, type LucideIcon } from "lucide-react";
import { cn } from "@/app/_lib/cn";

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/", label: "Tim", icon: LayoutGrid, match: (p) => p === "/" || p.startsWith("/runs") },
  { href: "/tasks/new", label: "Tugaskan", icon: ClipboardPlus, match: (p) => p.startsWith("/tasks") },
  { href: "/tokens", label: "Neraca Token", icon: Gauge, match: (p) => p.startsWith("/tokens") },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="TalentLink Campus, ke Beranda"
      className={cn("inline-flex size-12 items-center justify-center rounded-full bg-brand-500 text-white", className)}
    >
      <Link2 aria-hidden className="size-6" strokeWidth={2.4} />
    </Link>
  );
}

/** Rail ikon vertikal di kiri (inspirasi 03–04). Hanya tampil mulai layar md. Ikon berupa tombol 3D retro. */
export function NavRail() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="hidden w-24 shrink-0 flex-col items-center gap-8 py-7 md:flex">
      <Logo />
      <ul className="flex flex-col items-center gap-5">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="btn-3d-host group flex flex-col items-center gap-2 rounded-2xl"
              >
                <span className={cn("btn-3d flex size-11 items-center justify-center rounded-full border", itemTone(active))}>
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className={cn("text-[11px] leading-4", active ? "font-medium text-brand-700" : "text-ink-muted")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Menu aktif tampil seperti tombol retro yang tertahan ke bawah (is-active di globals.css). */
function itemTone(active: boolean) {
  return active
    ? "is-active border-brand-700 bg-brand-600 text-white [--edge:var(--color-brand-900)]"
    : "border-line bg-surface text-ink-muted group-hover:text-brand-600 hover:text-brand-600";
}

/**
 * Dock melayang di bawah layar untuk HP (di bawah md), seperti aplikasi HP: hanya ikon,
 * namanya tetap terbaca pembaca layar lewat aria-label. Jarak bawah mengikuti safe area iPhone.
 */
export function NavDock() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="dock-in pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="pointer-events-auto flex items-center gap-4 rounded-full border-2 border-line-strong bg-surface px-4 pt-3 pb-4 shadow-[0_6px_0_var(--color-line-strong),0_14px_32px_rgb(16_24_40/0.14)]">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={label}
                className={cn("btn-3d flex size-12 items-center justify-center rounded-full border", itemTone(active))}
              >
                <Icon aria-hidden className="size-5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
