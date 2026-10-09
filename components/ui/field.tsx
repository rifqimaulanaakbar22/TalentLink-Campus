import { useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/app/_lib/cn";

/** Field bergaris dengan label menempel di garis atas (inspirasi 01). */
export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <div className="relative">
        <label
          htmlFor={id}
          className="absolute -top-2 left-3 bg-surface px-1 text-xs leading-4 font-medium text-brand-700"
        >
          {label}
        </label>
        <textarea
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "block w-full resize-y rounded-field border bg-surface px-4 pt-4 pb-3 text-[15px] leading-5.5 placeholder:text-ink-subtle focus:outline-none focus-visible:outline-none",
            error ? "border-danger focus:ring-4 focus:ring-danger/15" : "border-line focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15",
          )}
          {...props}
        />
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
