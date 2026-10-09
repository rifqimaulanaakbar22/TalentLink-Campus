import { UserRound } from "lucide-react";
import { SimulasiBadge, SintetisBadge } from "@/components/ui/badge";
import { MockBadge } from "./mock-badge";
import { Logo, NavMobile } from "./nav";

/** Bar atas: identitas produk di kiri, peran simulasi di kanan (pengganti search + profil di inspirasi). */
export function TopBar() {
  return (
    <header className="flex flex-col gap-4 px-4 pt-5 pb-2 sm:px-8 md:pt-7 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="size-10 md:hidden" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">TalentLink Campus</p>
            <p className="hidden truncate text-[13px] text-ink-muted sm:block">
              Setiap rekomendasi terhubung ke bukti.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MockBadge />
          <span className="hidden lg:inline-flex">
            <SintetisBadge />
          </span>
          <div className="flex h-12 items-center gap-2.5 rounded-full bg-surface py-1.5 pr-4 pl-1.5 shadow-card">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <UserRound aria-hidden className="size-5" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-[13px] font-medium">Dosen peneliti</span>
              <span className="text-xs text-ink-muted">Peran tanpa login</span>
            </span>
            <SimulasiBadge />
          </div>
        </div>
      </div>
      <NavMobile />
    </header>
  );
}
