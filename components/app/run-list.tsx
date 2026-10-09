import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatRelative } from "@/app/_lib/format";
import type { RunStatus, RunSummary } from "@/app/_lib/types";
import { RunStatusBadge } from "./run-status-badge";

/** Kalimat ajakan sesuai status, agar user tahu langkah berikutnya. */
const NEXT_STEP: Partial<Record<RunStatus, string>> = {
  awaiting_approval: "Tinjau Link Brief dan beri keputusan",
  needs_clarification: "Jawab pertanyaan Netra agar tugas berlanjut",
  failed: "Buka lalu coba lagi",
};

/** Daftar penugasan (FR-W8). Penugasan gagal ditandai merah beserta alasannya. */
export function RunList({ runs, showNextStep = false }: { runs: RunSummary[]; showNextStep?: boolean }) {
  return (
    <ul className="-mx-2 divide-y divide-line">
      {runs.map((run) => (
        <li key={run.id}>
          <Link
            href={`/runs/${run.id}`}
            className="group flex items-center gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-panel"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] leading-5.5">{run.briefPreview}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-4.5 text-ink-muted">
                <span>Penugasan #{run.id}</span>
                <span>{formatRelative(run.createdAt)}</span>
                <span>{formatNumber(run.totalTokens)} token</span>
                {run.mode === "v1" && <Badge tone="neutral">Mode pembanding</Badge>}
              </p>
              {showNextStep && NEXT_STEP[run.status] && (
                <p className="mt-1 text-[13px] font-medium text-brand-700">{NEXT_STEP[run.status]}</p>
              )}
              {run.status === "failed" && run.errorMessage && (
                <p className="mt-1 text-[13px] leading-4.5 text-danger">{run.errorMessage}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!showNextStep && <RunStatusBadge status={run.status} />}
              <ChevronRight aria-hidden className="size-4 text-ink-muted" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
