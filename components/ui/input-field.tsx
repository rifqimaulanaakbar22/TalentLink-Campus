import { useId, type ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/_lib/cn";

/**
 * Input satu baris bergaris dengan label menempel di garis atas dan ikon di depan
 * (inspirasi 01 dan 05). Pasangan dari TextAreaField.
 */
export function InputField({
  label,
  icon: Icon,
  hint,
  error,
  trailing,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string;
  /** Elemen di ujung kanan, misalnya tombol tampilkan kata sandi. */
  trailing?: React.ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <div
        className={cn(
          "relative flex h-13 items-center gap-3 rounded-field border bg-surface px-4 transition-[border-color,box-shadow]",
          "focus-within:ring-4",
          error
            ? "border-danger focus-within:ring-danger/15"
            : "border-line focus-within:border-brand-500 focus-within:ring-brand-500/15",
        )}
      >
        <label
          htmlFor={id}
          className={cn(
            "absolute -top-2 left-3 bg-surface px-1 text-xs leading-4 font-medium",
            error ? "text-danger" : "text-brand-700",
          )}
        >
          {label}
        </label>
        {Icon && <Icon aria-hidden className={cn("size-5 shrink-0", error ? "text-danger" : "text-ink-muted")} />}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-subtle focus:outline-none focus-visible:outline-none"
          {...props}
        />
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
