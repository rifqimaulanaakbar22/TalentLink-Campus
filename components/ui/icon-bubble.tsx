import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/_lib/cn";

/** Ikon di lingkaran lembut, pengganti ikon 3D di inspirasi. */
export function IconBubble({
  icon: Icon,
  tone = "default",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: "default" | "brand" | "inverse";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "size-10" : "size-8",
        tone === "default" && "bg-panel text-brand-500",
        tone === "brand" && "bg-brand-50 text-brand-600",
        tone === "inverse" && "bg-white/15 text-white",
        className,
      )}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} strokeWidth={2} />
    </span>
  );
}
