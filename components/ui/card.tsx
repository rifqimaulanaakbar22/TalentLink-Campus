import type { HTMLAttributes } from "react";
import { cn } from "@/app/_lib/cn";

type CardVariant = "default" | "highlight" | "feature";

const VARIANT: Record<CardVariant, string> = {
  // Kartu putih tanpa garis, bayangan sangat tipis (inspirasi 02–04)
  default: "bg-surface shadow-card",
  // Kartu sorotan bergaris biru dengan cahaya halus. Maksimal satu per layar.
  highlight: "bg-surface border-[1.5px] border-brand-300 shadow-glow [--lift-base:var(--shadow-glow)] [--lift-edge:var(--color-brand-300)]",
  // Kartu biru penuh dengan pola sirkuit, pengganti gradien. Maksimal satu per layar.
  feature: "bg-brand-600 text-white pattern-circuit shadow-card [--lift-edge:var(--color-brand-900)]",
};

export function Card({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { variant?: CardVariant }) {
  // reveal: muncul bertahap saat di-scroll; card-lift: terangkat dengan bayangan keras saat disorot (globals.css).
  return <section className={cn("reveal card-lift rounded-card p-5 sm:p-6", VARIANT[variant], className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-lg leading-6.5 font-medium">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-4.5 text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
