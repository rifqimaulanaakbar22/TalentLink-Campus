"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPlus, LayoutGrid, Link2, type LucideIcon } from "lucide-react";
import { cn } from "@/app/_lib/cn";

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/", label: "Tim", icon: LayoutGrid, match: (p) => p === "/" || p.startsWith("/runs") },
  { href: "/tasks/new", label: "Tugaskan", icon: ClipboardPlus, match: (p) => p.startsWith("/tasks") },
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

/** Rail ikon vertikal di kiri (inspirasi 03–04). Hanya tampil mulai layar md. */
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
                className="group flex flex-col items-center gap-1.5 rounded-2xl"
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full transition-colors",
                    active
                      ? "bg-brand-100 text-brand-600"
                      : "bg-surface text-ink-muted shadow-card group-hover:text-brand-600",
                  )}
                >
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

/** Navigasi pill horizontal untuk layar kecil. */
export function NavMobile() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="md:hidden">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] whitespace-nowrap",
                  active ? "bg-brand-100 font-medium text-brand-700" : "bg-surface text-ink-muted shadow-card",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
