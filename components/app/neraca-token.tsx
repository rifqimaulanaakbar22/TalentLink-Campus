"use client";

// Bagian-bagian halaman Neraca Token (/tokens). Satu elemen mencolok: kartu Anggaran token.
import Link from "next/link";
import { Lock, LockOpen, OctagonX, Play } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/app/_lib/cn";
import { formatNumber, formatPercent } from "@/app/_lib/format";
import {
  BUDGET_STATUS,
  PATH_COPY,
  PATH_ORDER,
  TOKEN_STEP_LABEL,
  budgetStatus,
  runsLeft,
  shareOf,
  type BudgetStatus,
} from "@/app/_lib/token-path";
import type { RunSummary, TokenReport } from "@/app/_lib/types";
import { DISPLAYED_WORKERS } from "@/app/_lib/worker-profile";
import { workerName } from "@/app/_lib/worker-copy";
import { Mascot } from "./mascot";

const DOT: Record<BudgetStatus, string> = { aman: "bg-success", menipis: "bg-[#F59E0B]", berhenti: "bg-danger" };
const FILL_ON_BLUE: Record<BudgetStatus, string> = { aman: "bg-white", menipis: "bg-[#FCD34D]", berhenti: "bg-[#FCA5A5]" };

/** Banner di atas halaman saat anggaran menipis atau habis. */
export function BudgetBanner({ report }: { report: TokenReport }) {
  const status = budgetStatus(report.usage);
  if (status === "aman") return null;
  const stop = status === "berhenti";
  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex items-start gap-3 rounded-card px-5 py-4",
        stop ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning",
      )}
    >
      {stop ? <OctagonX aria-hidden className="mt-0.5 size-5 shrink-0" /> : <Lock aria-hidden className="mt-0.5 size-5 shrink-0" />}
      <p className="text-[15px]">
        {stop
          ? "Batas berhenti tercapai. Penugasan baru ditahan dan Digital Worker berhenti memanggil AI sampai alokasi token ditambah."
          : `Pemakaian sudah ${formatPercent(report.usage.percent)} dari alokasi. Jalur Pembanding dikunci; penugasan tetap jalan lewat Jalur Hemat.`}
      </p>
    </div>
  );
}

/** Kartu utama: terpakai, sisa, dan meteran dengan garis batas peringatan dan berhenti. */
export function BudgetCard({ report, className }: { report: TokenReport; className?: string }) {
  const { usage, warnAt, stopAt } = report;
  const status = budgetStatus(usage);
  const pct = Math.min(100, Math.max(0, usage.percent));
  const marks = [
    { at: warnAt, align: "-translate-x-1/2" },
    { at: stopAt, align: "-translate-x-full" },
  ];

  return (
    <Card variant="feature" className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Anggaran token</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-medium text-ink">
          <span aria-hidden className={cn("size-2 rounded-full", DOT[status])} />
          {BUDGET_STATUS[status].label}
        </span>
      </div>

      <p className="mt-5 text-[13px] text-white/80">Terpakai dari alokasi API CBN</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[40px] leading-12 font-semibold tracking-tight">{formatNumber(usage.total)}</span>
        <span className="text-[15px] text-white/85">
          dari <span className="font-mono">{formatNumber(usage.budget)}</span> token
        </span>
      </p>

      <div className="relative mt-4 pb-6">
        <div
          role="progressbar"
          aria-label="Pemakaian anggaran token"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct * 10) / 10}
          aria-valuetext={`${formatPercent(usage.percent, 2)} terpakai`}
          className="h-3 overflow-hidden rounded-full bg-white/20"
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", FILL_ON_BLUE[status])}
            style={{ width: `${pct === 0 ? 0 : Math.max(pct, 1.5)}%` }}
          />
        </div>
        {marks.map(({ at, align }) => {
          const left = Math.min(100, shareOf(at, usage.budget));
          return (
            <div key={at} aria-hidden>
              <span className="absolute top-0 h-3 w-0.5 bg-white/80" style={{ left: `${left}%` }} />
              <span className={cn("absolute top-4 font-mono text-xs text-white/85", align)} style={{ left: `${left}%` }}>
                {formatPercent(shareOf(at, usage.budget), 0)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[15px] leading-5.5">
        {status === "berhenti" ? (
          "Batas berhenti sudah tercapai. Penugasan baru ditahan sampai alokasi token ditambah."
        ) : (
          <>
            Sisa <span className="font-mono font-medium">{formatNumber(report.remaining)}</span> token sebelum batas berhenti,
            cukup untuk sekitar <span className="font-mono font-medium">{formatNumber(runsLeft(report, "v2"))}</span> penugasan
            Jalur Hemat
            {!report.comparisonLocked && (
              <>
                {" "}
                atau <span className="font-mono font-medium">{formatNumber(runsLeft(report, "v1"))}</span> penugasan Jalur
                Pembanding
              </>
            )}
            .
          </>
        )}
      </p>
      <p className="mt-2 text-[13px] leading-4.5 text-white/80">
        Setiap panggilan AI dicatat di Token Ledger: {formatNumber(report.calls)} panggilan sejauh ini
        {report.estimatedCalls > 0 &&
          `, ${formatNumber(report.estimatedCalls)} di antaranya perkiraan karena gateway tidak mengirim jumlah token`}
        .
      </p>
    </Card>
  );
}

/** Perbandingan rata-rata token Jalur Hemat dan Jalur Pembanding. */
export function SavingsCard({ report, className }: { report: TokenReport; className?: string }) {
  const { byMode, savings, comparisonLocked } = report;
  const max = Math.max(byMode.v1.avgPerRun, byMode.v2.avgPerRun, 1);
  // LLM_MOCK mencatat panggilan dengan 0 token, jadi belum ada angka untuk dibandingkan.
  const zeroTokens = report.calls > 0 && report.usage.total === 0;

  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader
        title="Penghematan Jalur Hemat"
        description="Rata-rata token per penugasan Netra yang sudah menghasilkan Link Brief."
        className="mb-4"
      />
      {savings ? (
        <p className="text-[15px] leading-5.5">
          {savings.percent > 0 ? (
            <>
              Jalur Hemat memakai <span className="font-mono font-semibold">{formatPercent(savings.percent)}</span> lebih
              sedikit token daripada Jalur Pembanding.
            </>
          ) : (
            "Pada data ini Jalur Hemat belum lebih hemat daripada Jalur Pembanding. Periksa jejak kerja penugasan terakhir."
          )}
        </p>
      ) : (
        <p className="text-[15px] leading-5.5 text-ink-muted">
          {zeroTokens
            ? "Penugasan tercatat 0 token karena AI berjalan dalam mode uji tanpa memanggil API CBN. Selisihnya muncul setelah memakai API asli."
            : "Belum bisa dibandingkan. Jalankan brief yang sama sekali lewat Jalur Hemat dan sekali lewat Jalur Pembanding; selisihnya muncul di sini."}
        </p>
      )}

      <div className="mt-5 space-y-4">
        {PATH_ORDER.map((mode) => {
          const s = byMode[mode];
          return (
            <div key={mode}>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] leading-4.5">
                <span className="font-medium text-ink">{PATH_COPY[mode].name}</span>
                <span className="text-ink-muted">
                  {s.runs > 0 ? (
                    <>
                      <span className="font-mono text-ink">{formatNumber(s.avgPerRun)}</span> token, {s.runs} penugasan
                    </>
                  ) : (
                    "belum ada penugasan"
                  )}
                </span>
              </p>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-panel">
                <div
                  className={cn("h-full rounded-full", mode === "v2" ? "bg-brand-500" : "bg-ink-subtle")}
                  style={{ width: `${s.avgPerRun === 0 ? 0 : Math.max((s.avgPerRun / max) * 100, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {savings && savings.tokens > 0 && (
        <p className="mt-4 text-[13px] leading-4.5 text-ink-muted">
          Sudah menghemat sekitar <span className="font-mono text-ink">{formatNumber(savings.tokens)}</span> token dibanding
          jika {byMode.v2.runs} penugasan Jalur Hemat dijalankan lewat Jalur Pembanding.
        </p>
      )}
      {!savings && !zeroTokens && !comparisonLocked && (
        <ButtonLink href="/tasks/new" variant="secondary" size="sm" className="mt-4 self-start">
          <Play aria-hidden className="size-4" />
          Tugaskan Netra
        </ButtonLink>
      )}

      <p className="mt-auto flex items-start gap-2 border-t border-line pt-4 text-[13px] leading-4.5 text-ink-muted">
        {comparisonLocked ? (
          <Lock aria-hidden className="mt-px size-4 shrink-0 text-warning" />
        ) : (
          <LockOpen aria-hidden className="mt-px size-4 shrink-0 text-success" />
        )}
        {comparisonLocked
          ? "Jalur Pembanding dikunci karena pemakaian sudah melewati batas peringatan."
          : "Jalur Pembanding terbuka sampai pemakaian mencapai batas peringatan."}
      </p>
    </Card>
  );
}

/** Batang token untuk 20 penugasan terakhir, dari yang paling lama. */
export function RunTokenBars({ runs }: { runs: RunSummary[] }) {
  const ordered = [...runs].sort((a, b) => a.id - b.id);
  const max = Math.max(...ordered.map((r) => r.totalTokens), 1);
  const priciest = ordered.reduce<RunSummary | null>((top, r) => (!top || r.totalTokens > top.totalTokens ? r : top), null);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        {PATH_ORDER.map((mode) => (
          <span key={mode} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-sm", mode === "v2" ? "bg-brand-500" : "bg-ink-subtle")} />
            {PATH_COPY[mode].name}
          </span>
        ))}
      </div>
      {/* Tinggi grafik mengikuti kartu (min 12rem), jadi kartu setinggi kolom di sebelahnya. */}
      <ul aria-label="Token per penugasan" className="flex min-h-48 flex-1 gap-1 sm:gap-2">
        {ordered.map((run) => {
          return (
            <li key={run.id} className="flex max-w-16 min-w-0 flex-1 flex-col">
              <Link
                href={`/runs/${run.id}`}
                title={`Penugasan #${run.id}: ${formatNumber(run.totalTokens)} token`}
                aria-label={`Penugasan #${run.id} untuk ${workerName(run.workerId)}, ${PATH_COPY[run.mode].name}, ${formatNumber(run.totalTokens)} token`}
                className="group flex w-full flex-1 flex-col justify-end rounded-t-md border-b border-line"
              >
                {/* Tinggi batang lewat flex-grow (sisa : token), tidak butuh tinggi induk yang pasti. */}
                <span aria-hidden style={{ flexGrow: max - run.totalTokens }} />
                <span
                  className={cn(
                    "w-full rounded-t-md transition-opacity group-hover:opacity-75",
                    run.totalTokens === 0 ? "min-h-0.5 bg-line" : run.mode === "v1" ? "min-h-1 bg-ink-subtle" : "min-h-1 bg-brand-500",
                  )}
                  style={{ flexGrow: run.totalTokens }}
                />
              </Link>
              <span aria-hidden className="mt-1.5 hidden text-center font-mono text-[11px] text-ink-muted sm:block">
                #{run.id}
              </span>
            </li>
          );
        })}
      </ul>
      {ordered.length > 1 && (
        <p aria-hidden className="mt-2 flex justify-between font-mono text-xs text-ink-muted sm:hidden">
          <span>#{ordered[0].id}</span>
          <span>#{ordered.at(-1)?.id}</span>
        </p>
      )}
      {priciest && priciest.totalTokens > 0 && (
        <p className="mt-4 text-[13px] leading-4.5 text-ink-muted">
          Paling banyak memakai token:{" "}
          <Link href={`/runs/${priciest.id}`} className="font-medium text-brand-700 hover:underline">
            penugasan #{priciest.id}
          </Link>{" "}
          lewat {PATH_COPY[priciest.mode].name}, <span className="font-mono text-ink">{formatNumber(priciest.totalTokens)}</span>{" "}
          token.
        </p>
      )}
    </div>
  );
}

/** Pembagian token per Digital Worker, plus token yang tidak lagi terhubung ke penugasan. */
export function WorkerShare({ report }: { report: TokenReport }) {
  const total = Math.max(report.usage.total, 1);
  return (
    <Card className="min-w-0">
      <CardHeader title="Per Digital Worker" className="mb-4" />
      <ul className="space-y-4">
        {DISPLAYED_WORKERS.map((id) => {
          const n = report.usage.byWorker[id] ?? 0;
          return (
            <li key={id} className="flex items-center gap-3">
              <Mascot workerId={id} size={36} decorative />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{workerName(id)}</span>
                  <span className="font-mono text-[13px]">{formatNumber(n)}</span>
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${n === 0 ? 0 : Math.max((n / total) * 100, 2)}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {report.unassigned > 0 && (
        <p className="mt-4 border-t border-line pt-4 text-[13px] leading-4.5 text-ink-muted">
          <span className="font-mono text-ink">{formatNumber(report.unassigned)}</span> token tidak lagi terhubung ke penugasan,
          misalnya penugasan yang terhapus saat data diisi ulang. Tetap dihitung dalam anggaran.
        </p>
      )}
    </Card>
  );
}

/** Token per langkah yang memanggil AI. */
export function StepShare({ report }: { report: TokenReport }) {
  return (
    <Card className="min-w-0">
      <CardHeader
        title="Per langkah kerja"
        description="Hanya langkah yang memanggil AI. Pencarian dan skor dihitung di kode tanpa token."
        className="mb-3"
      />
      {report.byStep.length === 0 ? (
        <p className="py-2 text-[13px] text-ink-muted">Belum ada panggilan AI yang tercatat.</p>
      ) : (
        <ul className="divide-y divide-line">
          {report.byStep.map((s) => (
            <li key={s.step} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-[15px] leading-5.5">{TOKEN_STEP_LABEL[s.step] ?? "Langkah lain"}</span>
                <span className="block text-xs text-ink-muted">{formatNumber(s.calls)} panggilan</span>
              </span>
              <span className="font-mono text-[13px]">{formatNumber(s.tokens)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
