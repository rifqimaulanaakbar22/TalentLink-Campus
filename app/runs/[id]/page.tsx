"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot, Plus, RefreshCw, Search } from "lucide-react";
import { ClarifyBox } from "@/components/app/clarify-box";
import { EvidencePanel } from "@/components/app/evidence-panel";
import { LinkBrief } from "@/components/app/link-brief";
import { Mascot } from "@/components/app/mascot";
import { PageHeader } from "@/components/app/page-header";
import { RunStatusBadge } from "@/components/app/run-status-badge";
import { RunTimeline, stepProgress } from "@/components/app/run-timeline";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/app/_lib/api";
import { formatRelative } from "@/app/_lib/format";
import { useRun } from "@/app/_lib/use-run";
import type { RunDetailResponse } from "@/app/_lib/types";

function WorkingCard({ detail }: { detail: RunDetailResponse }) {
  const current = detail.steps.at(-1);
  return (
    <Card variant="highlight">
      <div className="flex items-start gap-4">
        <Mascot workerId="netra" size={48} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {detail.run.status === "queued" ? "Tugas masuk antrean" : "Netra sedang bekerja"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <Bot aria-hidden className="size-3.5" />
              Digital Worker (AI)
            </span>
          </p>
          <p className="mt-1 text-[15px] text-ink-muted" aria-live="polite">
            {current?.detail ?? "Menyiapkan langkah pertama…"}
          </p>
        </div>
      </div>
      <ProgressBar value={stepProgress(detail)} label="Progres run" className="mt-5" />
      <div className="mt-6 space-y-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </div>
    </Card>
  );
}

function FailedCard({ detail, onDone }: { detail: RunDetailResponse; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function retry() {
    setBusy(true);
    setError(null);
    try {
      await api.retry(detail.run.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Penugasan belum bisa diulang. Coba lagi.");
      setBusy(false);
    }
  }
  return (
    <Card>
      <EmptyState
        icon={RefreshCw}
        title="Netra berhenti karena gangguan"
        description={`${detail.run.errorMessage ?? "Terjadi kesalahan."} Langkah yang sudah selesai tetap tersimpan.`}
        action={
          <Button onClick={retry} disabled={busy}>
            <RefreshCw aria-hidden className={busy ? "size-4 animate-spin" : "size-4"} />
            {busy ? "Mengulang…" : "Coba lagi"}
          </Button>
        }
      />
      {error && <ErrorState message={error} />}
    </Card>
  );
}

export default function DetailRunPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, error, refresh } = useRun(id);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const closeEvidence = useCallback(() => setEvidenceId(null), []);

  if (!Number.isInteger(id) || id <= 0 || (error && !data)) {
    return (
      <>
        <PageHeader title="Penugasan" />
        <Card>
          <EmptyState
            icon={Search}
            title="Penugasan tidak bisa dibuka"
            description={error ?? "Nomor penugasan tidak valid."}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={refresh}>
                  Coba lagi
                </Button>
                <ButtonLink href="/">Ke Beranda</ButtonLink>
              </div>
            }
          />
        </Card>
      </>
    );
  }

  if (!data) {
    return (
      <div role="status" className="space-y-5 pt-6">
        <span className="sr-only">Memuat penugasan…</span>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-125 rounded-card bg-surface lg:col-span-5" />
          <Skeleton className="h-125 rounded-card bg-surface lg:col-span-7" />
        </div>
      </div>
    );
  }

  const { run } = data;
  const [briefMain, ...briefRest] = run.brief.split("\n\nJawaban klarifikasi: ");

  return (
    <>
      <ButtonLink href="/" variant="ghost" size="sm" className="-ml-3 mt-2">
        <ArrowLeft aria-hidden className="size-4" />
        Beranda
      </ButtonLink>
      <PageHeader
        title={`Penugasan #${run.id}`}
        description={`“${briefMain}”`}
        actions={
          <ButtonLink href="/tasks/new" variant="secondary">
            <Plus aria-hidden className="size-4" />
            Tugaskan lagi
          </ButtonLink>
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-muted">
        <RunStatusBadge status={run.status} />
        {run.mode === "v1" && <Badge tone="neutral">Mode pembanding</Badge>}
        <span>Diberikan {formatRelative(run.createdAt)}</span>
        {briefRest.length > 0 && <span>Jawaban klarifikasi Anda: “{briefRest.join(" ")}”</span>}
      </div>

      {error && (
        <div className="mb-5">
          <ErrorState message={`Pembaruan terakhir gagal: ${error}`} onRetry={refresh} />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:sticky lg:top-5 lg:col-span-5">
          <RunTimeline detail={data} />
        </div>
        <div className="lg:col-span-7">
          {(run.status === "queued" || run.status === "running") && <WorkingCard detail={data} />}
          {run.status === "needs_clarification" && (
            <ClarifyBox runId={run.id} question={run.clarificationQuestion ?? ""} onDone={refresh} />
          )}
          {run.status === "failed" && <FailedCard detail={data} onDone={refresh} />}
          {data.result && (
            <LinkBrief
              key={run.status === "awaiting_approval" ? "awaiting" : "decided"}
              detail={data}
              activeEvidence={evidenceId}
              onOpenEvidence={setEvidenceId}
              onChanged={refresh}
            />
          )}
        </div>
      </div>

      <EvidencePanel evidenceId={evidenceId} onClose={closeEvidence} />
    </>
  );
}
