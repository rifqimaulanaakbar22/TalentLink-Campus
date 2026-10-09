"use client";

import { useEffect, useRef, useState } from "react";
import { FileSearch, X } from "lucide-react";
import { Badge, SintetisBadge } from "@/components/ui/badge";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { api } from "@/app/_lib/api";
import type { EvidenceDetail } from "@/app/_lib/types";

const TYPE_LABEL: Record<EvidenceDetail["type"], string> = {
  course: "Mata kuliah",
  project: "Proyek",
  certificate: "Sertifikat",
  award: "Prestasi",
  assistant: "Asisten praktikum",
  research: "Riset",
};

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: EvidenceDetail };

/** Panel bukti (FR-W7): satu klik memperlihatkan dari mana sebuah klaim berasal. */
export function EvidencePanel({ evidenceId, onClose }: { evidenceId: string | null; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!evidenceId) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tampilan saat bukti berganti
    setState({ status: "loading" });
    api
      .getEvidence(evidenceId)
      .then((data) => alive && setState({ status: "ok", data }))
      .catch((err: unknown) =>
        alive && setState({ status: "error", message: err instanceof Error ? err.message : "Gagal memuat bukti." }),
      );
    return () => {
      alive = false;
    };
  }, [evidenceId, attempt]);

  useEffect(() => {
    if (!evidenceId) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [evidenceId, onClose]);

  if (!evidenceId) return null;

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-bukti"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface shadow-card sm:w-105 sm:rounded-l-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <FileSearch aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-[13px] text-ink-muted">Panel bukti</p>
              <p id="judul-bukti" className="font-mono text-lg font-semibold">
                {evidenceId}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup panel bukti"
            className="flex size-10 items-center justify-center rounded-full text-ink-muted hover:bg-panel"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {state.status === "loading" && (
            <div role="status" className="space-y-3">
              <span className="sr-only">Memuat bukti…</span>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {state.status === "error" && (
            <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} />
          )}
          {state.status === "ok" && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{TYPE_LABEL[state.data.type]}</Badge>
                <SintetisBadge />
              </div>
              <h3 className="mt-4 text-xl leading-7 font-semibold">{state.data.title}</h3>
              <p className="mt-2 text-[15px] leading-5.5 text-ink-muted">{state.data.detail}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 rounded-field bg-panel p-4 text-[13px]">
                <div>
                  <dt className="text-ink-muted">Milik mahasiswa</dt>
                  <dd className="font-mono font-medium">{state.data.studentCode}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Tahun</dt>
                  <dd className="font-mono font-medium">{state.data.year}</dd>
                </div>
                {state.data.grade && (
                  <div>
                    <dt className="text-ink-muted">Nilai</dt>
                    <dd className="font-mono font-medium">{state.data.grade}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-ink-muted">Sumber</dt>
                  <dd className="font-medium">{state.data.sourceLabel}</dd>
                </div>
              </dl>
              <p className="mt-6 text-[13px] font-medium">Skill yang dibuktikan</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {state.data.skills.map((s) => (
                  <li key={s} className="rounded-full bg-panel px-2.5 py-1 text-xs text-ink-muted">
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[13px] leading-4.5 text-ink-muted">
                Netra memakai bukti ini sebagai dasar alasan. Data ini sintetis dan dibuat untuk prototipe.
              </p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
