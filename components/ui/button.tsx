import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/app/_lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "bg-surface text-ink border border-line hover:bg-panel",
  ghost: "text-brand-700 hover:bg-brand-50",
  // Tombol putih di atas kartu biru penuh ("View Detail" di inspirasi)
  inverse: "bg-white text-brand-700 hover:bg-brand-50",
  danger: "bg-surface text-danger border border-line hover:bg-danger-bg",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-7 text-[15px]",
};

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function buttonClass({ variant = "primary", size = "md" }: StyleProps = {}, className?: string) {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps) {
  return <button type={type} className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}
