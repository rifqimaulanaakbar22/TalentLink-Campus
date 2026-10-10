import { SintetisBadge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth-types";
import { MockBadge } from "./mock-badge";
import { Logo } from "./nav";
import { UserMenu } from "./user-menu";

/** Bar atas: identitas produk di kiri, pengguna yang login dan tombol Keluar di kanan. */
export function TopBar({ user }: { user: AuthUser | null }) {
  return (
    <header className="px-4 pt-5 pb-2 sm:px-8 md:pt-7 lg:px-10">
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
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  );
}
