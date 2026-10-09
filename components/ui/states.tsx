import { CircleAlert, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/app/_lib/cn";
import { Button } from "./button";
import { IconBubble } from "./icon-bubble";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-panel", className)} />;
}

export function LoadingRows({ rows = 3, label = "Memuat data…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <IconBubble icon={icon} tone="brand" />
      <p className="mt-4 font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-4.5 text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-field bg-danger-bg p-4 sm:flex-row sm:items-center"
    >
      <CircleAlert aria-hidden className="size-5 shrink-0 text-danger" />
      <p className="flex-1 text-[13px] leading-4.5 text-danger">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden className="size-4" />
          Coba lagi
        </Button>
      )}
    </div>
  );
}
