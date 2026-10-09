import { CircleCheck, CircleMinus, CircleX, LoaderCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/app/_lib/cn";
import { formatDuration, formatNumber } from "@/app/_lib/format";
import type { RunDetailResponse, StepName, StepView } from "@/app/_lib/types";

const STEP_ORDER: StepName[] = ["parse", "normalize", "search", "score", "explain", "verify", "brief"];

const STEP_LABEL: Record<StepName, string> = {
  parse: "Memahami brief",
  normalize: "Menormalkan skill",
  search: "Mencari kandidat",
  score: "Menghitung skor",
  explain: "Menulis alasan berbukti",
  verify: "Verifikasi ID bukti",
  brief: "Menyusun Link Brief",
};

function Indicator({ step }: { step: StepView | undefined }) {
  const base = "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full";
  if (!step) return <span className={cn(base, "border-2 border-line bg-surface")} aria-hidden />;
  if (step.status === "running")
    return (
      <span className={cn(base, "bg-brand-100 text-brand-600")}>
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
      </span>
    );
  if (step.status === "failed")
    return (
      <span className={cn(base, "bg-danger-bg text-danger")}>
        <CircleX aria-hidden className="size-4" />
      </span>
    );
  if (step.status === "skipped")
    return (
      <span className={cn(base, "bg-panel text-ink-muted")}>
        <CircleMinus aria-hidden className="size-4" />
      </span>
    );
  return (
    <span className={cn(base, "bg-success-bg text-success")}>
      <CircleCheck aria-hidden className="size-4" />
    </span>
  );
}

const STATUS_TEXT = { running: "berjalan", done: "selesai", failed: "gagal", skipped: "dilewati" } as const;

/** Run Timeline (FR-W3): langkah, status, durasi, token, model. Istilah teknis boleh tampil di sini. */
export function RunTimeline({ detail }: { detail: RunDetailResponse }) {
  const byStep = new Map(detail.steps.map((s) => [s.step, s]));
  const halted = detail.run.status === "needs_clarification" || detail.run.status === "failed";
  const estimate = detail.steps.some((s) => s.isEstimate);

  return (
    <Card>
      <CardHeader title="Jejak kerja Netra" description="Setiap langkah tercatat beserta waktu, model, dan tokennya." />
      <ol className="relative" aria-live="polite">
        {STEP_ORDER.map((name, i) => {
          const step = byStep.get(name);
          const last = i === STEP_ORDER.length - 1;
          const tokens = step ? step.inputTokens + step.outputTokens : 0;
          return (
            <li key={name} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!last && <span aria-hidden className="absolute top-7 bottom-0 left-3.5 w-px bg-line" />}
              <Indicator step={step} />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className={cn("font-medium", !step && "text-ink-muted")}>{STEP_LABEL[name]}</span>
                  <span className="font-mono text-xs text-ink-muted">{name}</span>
                  <span className="sr-only">
                    {step ? STATUS_TEXT[step.status] : halted ? "tidak dijalankan" : "menunggu"}
                  </span>
                </p>
                {step?.detail && (
                  <p
                    className={cn(
                      "mt-1 text-[13px] leading-4.5",
                      step.status === "failed" ? "text-danger" : "text-ink-muted",
                    )}
                  >
                    {step.detail}
                  </p>
                )}
                {!step && (
                  <p className="mt-1 text-[13px] leading-4.5 text-ink-muted">
                    {halted ? "Tidak dijalankan" : "Menunggu"}
                  </p>
                )}
                {step && step.status !== "skipped" && step.status !== "running" && (
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-ink-muted">
                    <span>{formatDuration(step.durationMs)}</span>
                    {step.model && (
                      <>
                        <span>
                          {formatNumber(step.inputTokens)} token masuk, {formatNumber(step.outputTokens)} keluar
                        </span>
                        <span>{step.model}</span>
                      </>
                    )}
                    {tokens === 0 && !step.model && <span>tanpa AI</span>}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex items-center justify-between gap-3 rounded-field bg-panel px-4 py-3">
        <div>
          <p className="text-[13px] text-ink-muted">Total token penugasan ini</p>
          <p className="text-xs text-ink-muted">dari Token Ledger{estimate ? ", sebagian berupa estimasi" : ""}</p>
        </div>
        <p className="font-mono text-xl font-semibold">{formatNumber(detail.totalTokens)}</p>
      </div>
    </Card>
  );
}

export function stepProgress(detail: RunDetailResponse) {
  const done = detail.steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  return Math.round((done / STEP_ORDER.length) * 100);
}
