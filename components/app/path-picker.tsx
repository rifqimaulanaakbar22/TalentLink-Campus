"use client";

import Link from "next/link";
import { Leaf, Lock, Scale, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconBubble } from "@/components/ui/icon-bubble";
import { cn } from "@/app/_lib/cn";
import { formatNumber } from "@/app/_lib/format";
import { PATH_COPY, PATH_ORDER, perRunEstimate, runsLeft } from "@/app/_lib/token-path";
import type { RunMode, TokenReport } from "@/app/_lib/types";

const ICON: Record<RunMode, LucideIcon> = { v2: Leaf, v1: Scale };

/**
 * Jalur Hemat: pilihan jalur kerja Netra. Perkiraan token dan status kunci diambil dari Neraca Token,
 * jadi pilihan ini selalu sejalan dengan rem anggaran di server.
 */
export function PathPicker({
  value,
  onChange,
  report,
}: {
  value: RunMode;
  onChange: (mode: RunMode) => void;
  report: TokenReport | null;
}) {
  const locked = report?.comparisonLocked ?? false;
  return (
    <fieldset className="mt-6">
      <legend className="text-[15px] font-medium">Jalur kerja</legend>
      <p className="mt-0.5 text-[13px] leading-4.5 text-ink-muted">
        Menentukan seberapa banyak data yang dikirim ke AI, jadi menentukan biaya token.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PATH_ORDER.map((mode) => {
          const copy = PATH_COPY[mode];
          const Icon = ICON[mode];
          const disabled = mode === "v1" && locked;
          const selected = value === mode;
          const estimate = perRunEstimate(report, mode);
          return (
            <label
              key={mode}
              className={cn(
                "flex flex-col rounded-field border p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-500/30",
                selected ? "border-brand-500 bg-brand-50" : "border-line",
                disabled ? "cursor-not-allowed bg-panel" : "cursor-pointer hover:border-brand-300",
              )}
            >
              <input
                type="radio"
                name="jalur-kerja"
                value={mode}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(mode)}
                className="sr-only"
              />
              <span className="flex flex-wrap items-center gap-2">
                <Icon aria-hidden className={cn("size-4", selected ? "text-brand-600" : "text-ink-muted")} />
                <span className="font-medium">{copy.name}</span>
                {disabled ? (
                  <Badge tone="neutral" icon={Lock}>
                    Dikunci
                  </Badge>
                ) : (
                  mode === "v2" && <Badge tone="brand">{copy.tag}</Badge>
                )}
                <span
                  aria-hidden
                  className={cn(
                    "ml-auto flex size-4.5 items-center justify-center rounded-full border-2",
                    selected ? "border-brand-600" : "border-line",
                  )}
                >
                  {selected && <span className="size-2 rounded-full bg-brand-600" />}
                </span>
              </span>
              <span className="mt-1.5 text-[13px] leading-4.5 text-ink-muted">{copy.how}</span>
              <span className="mt-3 text-[13px] leading-4.5">
                Sekitar <span className="font-mono font-medium">{formatNumber(estimate.tokens)}</span> token per penugasan
                <span className="block text-xs text-ink-muted">
                  {estimate.fromLedger
                    ? `Rata-rata ${report?.byMode[mode].runs} penugasan di Token Ledger`
                    : "Perkiraan awal; angka asli muncul setelah ada penugasan"}
                </span>
              </span>
              {disabled && (
                <span className="mt-2 text-xs text-warning">
                  Dikunci karena pemakaian token sudah melewati batas peringatan.
                </span>
              )}
            </label>
          );
        })}
      </div>
      {report && (
        <p className="mt-3 text-[13px] leading-4.5 text-ink-muted">
          Sisa anggaran cukup untuk sekitar <span className="font-mono">{formatNumber(runsLeft(report, "v2"))}</span>{" "}
          penugasan Jalur Hemat.{" "}
          <Link href="/tokens" className="font-medium text-brand-700 hover:underline">
            Buka Neraca Token
          </Link>
        </p>
      )}
    </fieldset>
  );
}

/** Worker tanpa pilihan jalur (Jaya selalu Jalur Hemat). */
export function FixedPath({ workerName, reason }: { workerName: string; reason: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-field bg-panel p-4">
      <IconBubble icon={Leaf} tone="brand" size="sm" />
      <p className="text-[13px] leading-4.5 text-ink-muted">
        <span className="block text-[15px] leading-5.5 font-medium text-ink">Jalur kerja: Jalur Hemat</span>
        {workerName} selalu memakai Jalur Hemat. {reason}
      </p>
    </div>
  );
}
