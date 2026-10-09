import { cn } from "@/app/_lib/cn";

export function ProgressBar({
  value,
  label,
  tone = "brand",
  className,
}: {
  /** 0..100 */
  value: number;
  label: string;
  tone?: "brand" | "warning" | "danger";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 10) / 10}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-panel", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "brand" && "bg-brand-500",
          tone === "warning" && "bg-[#F59E0B]",
          tone === "danger" && "bg-danger",
        )}
        // Bar minimal 2% agar pemakaian kecil tetap terlihat
        style={{ width: `${pct === 0 ? 0 : Math.max(pct, 2)}%` }}
      />
    </div>
  );
}
