import { cn } from "@/app/_lib/cn";

/** Chip ID bukti (font mono). Klik membuka panel bukti. */
export function EvidenceChip({
  id,
  onOpen,
  active = false,
}: {
  id: string;
  onOpen?: (id: string) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(id)}
      aria-label={`Buka bukti ${id}`}
      aria-pressed={active}
      className={cn(
        "btn-3d inline-flex h-6 items-center rounded-full px-2 font-mono text-xs leading-4 [--depth:2px]",
        active
          ? "is-active bg-brand-600 text-white [--edge:var(--color-brand-900)]"
          : "bg-brand-50 text-brand-700 [--edge:var(--color-brand-300)] hover:bg-brand-100",
      )}
    >
      {id}
    </button>
  );
}
