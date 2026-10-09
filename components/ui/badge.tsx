import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/_lib/cn";

export type BadgeTone =
  | "brand"
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "simulasi"
  | "sintetis"
  | "hidden"
  | "fair";

const TONE: Record<BadgeTone, string> = {
  brand: "bg-brand-100 text-brand-900",
  neutral: "bg-panel text-ink-muted border border-line",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  simulasi: "bg-simulasi-bg text-simulasi",
  sintetis: "bg-sintetis-bg text-sintetis",
  hidden: "bg-hidden-bg text-hidden",
  fair: "bg-fair-bg text-fair",
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs leading-4 font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {children}
    </span>
  );
}

/** Label wajib PRD: kuning, selalu terlihat tanpa hover. */
export function SimulasiBadge() {
  return <Badge tone="simulasi">SIMULASI</Badge>;
}

/** Label wajib PRD: abu-abu, selalu terlihat tanpa hover. */
export function SintetisBadge() {
  return <Badge tone="sintetis">Sintetis</Badge>;
}
