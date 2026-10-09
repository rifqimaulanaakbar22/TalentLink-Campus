"use client";

import { useState } from "react";
import { Bot, Check, CircleCheck, CircleX, Lock, SearchX, Send, Sparkles, TriangleAlert, Users } from "lucide-react";
import { Badge, SimulasiBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EvidenceChip } from "@/components/ui/evidence-chip";
import { TextAreaField } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { api } from "@/app/_lib/api";
import { cn } from "@/app/_lib/cn";
import type { RunDetailResponse, RunResult } from "@/app/_lib/types";
import { Mascot } from "./mascot";

type Candidate = RunResult["candidates"][number];

function formatScore(score: number | null) {
  return score === null ? "–" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

/** Alasan template backend menulis "[EV-xxx]" di teks; ID sudah tampil sebagai chip. */
function cleanReason(text: string) {
  return text.replace(/\s*\[EV-[^\]]*\]/g, "").trim();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function CandidateCard({
  candidate,
  rank,
  selected,
  selectable,
  onToggle,
  activeEvidence,
  onOpenEvidence,
}: {
  candidate: Candidate;
  rank: number;
  selected: boolean;
  selectable: boolean;
  onToggle: () => void;
  activeEvidence: string | null;
  onOpenEvidence: (id: string) => void;
}) {
  const c = candidate;
  // Gap dari kode (missingSkills) dipisahkan dari catatan yang ditulis AI (gaps).
  const aiNotes = c.gaps.filter((g) => !c.missingSkills.includes(g));
  return (
    <li
      className={cn(
        "rounded-card border-[1.5px] bg-surface p-5 transition-colors",
        selected ? "border-brand-300 bg-brand-50/40" : "border-transparent shadow-card",
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-panel font-mono text-sm font-semibold">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-lg font-semibold">{c.code}</p>
            {c.hiddenTalent && (
              <Badge tone="hidden" icon={Sparkles}>
                Hidden Talent
              </Badge>
            )}
            {c.fairExposure && (
              <Badge tone="fair" icon={Users}>
                Fair Exposure: sudah banyak dilibatkan
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-ink-muted">
            {c.prodi}, semester {c.semester}
          </p>
        </div>
        <div className="w-24 shrink-0 text-right">
          {c.score === null ? (
            <p className="text-[13px] leading-4.5 text-ink-muted">Tanpa skor; diurutkan AI</p>
          ) : (
            <>
              <p className="font-mono text-2xl leading-8 font-semibold">{formatScore(c.score)}</p>
              <p className="text-xs text-ink-muted">skor dari 100</p>
              <ProgressBar value={c.score} label={`Skor ${c.code}`} className="mt-1.5 h-1.5" />
            </>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {c.reasons.map((r, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-5.5">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="min-w-0">
              {cleanReason(r.text)}{" "}
              <span className="inline-flex flex-wrap gap-1 align-middle">
                {r.evidence_ids.map((id) => (
                  <EvidenceChip key={id} id={id} onOpen={onOpenEvidence} active={activeEvidence === id} />
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {c.reasonSource === "template" && (
        <p className="mt-2 text-xs text-ink-muted">
          Alasan disusun dari judul bukti karena jawaban AI tidak lolos verifikasi.
        </p>
      )}

      {c.missingSkills.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[13px]">
          <span className="text-ink-muted">Belum ada bukti di data kampus:</span>
          {c.missingSkills.map((s) => (
            <Badge key={`m-${s}`} tone="warning">
              {s}
            </Badge>
          ))}
        </div>
      )}
      {aiNotes.length > 0 && (
        <p className="mt-3 text-[13px] leading-4.5 text-ink-muted">
          <span className="font-medium text-ink">Catatan Netra (AI):</span> {aiNotes.join("; ")}.
        </p>
      )}

      {selectable && (
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="size-4 accent-brand-600"
          />
          Pilih {c.code} untuk diundang
        </label>
      )}
    </li>
  );
}

/** Link Brief: shortlist berbukti + Approval Gate (FR-R8–R11, FR-W6). */
export function LinkBrief({
  detail,
  activeEvidence,
  onOpenEvidence,
  onChanged,
}: {
  detail: RunDetailResponse;
  activeEvidence: string | null;
  onOpenEvidence: (id: string) => void;
  onChanged: () => void;
}) {
  const result = detail.result!;
  const status = detail.run.status;
  const approval = detail.approval;
  const awaiting = status === "awaiting_approval";
  const empty = result.candidates.length === 0;

  const [selected, setSelected] = useState<string[]>(
    () => approval?.candidateCodes ?? (result.noMatch ? [] : result.candidates.slice(0, 2).map((c) => c.code)),
  );
  const [draft, setDraft] = useState(approval?.messageDraft ?? result.invitationDraft);
  const [busy, setBusy] = useState<null | "approve" | "reject" | "send">(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (code: string) =>
    setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));

  /** Setujui lalu kirim dalam satu klik. Server tetap menolak kirim tanpa persetujuan (403). */
  async function act(kind: "approve" | "reject" | "send") {
    setBusy(kind);
    setError(null);
    try {
      if (kind !== "send")
        await api.approve(detail.run.id, {
          decision: kind === "approve" ? "approved" : "rejected",
          candidateCodes: selected,
          messageDraft: draft,
        });
      if (kind !== "reject") await api.send(detail.run.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keputusan belum tersimpan. Coba lagi.");
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-start gap-4">
          <Mascot workerId="netra" size={44} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
              Disiapkan Netra
              <span className="inline-flex items-center gap-1 text-xs">
                <Bot aria-hidden className="size-3.5" />
                Digital Worker (AI)
              </span>
            </p>
            <h2 className="text-xl leading-7 font-semibold">Link Brief: {result.topic}</h2>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[13px]">
          {result.requiredSkills.length > 0 && <span className="text-ink-muted">Skill wajib:</span>}
          {result.requiredSkills.map((s) => (
            <Badge key={s} tone="brand">
              {s}
            </Badge>
          ))}
          {result.niceSkills.length > 0 && <span className="ml-2 text-ink-muted">Tambahan:</span>}
          {result.niceSkills.map((s) => (
            <Badge key={s} tone="neutral">
              {s}
            </Badge>
          ))}
          {result.unknownSkills.map((s) => (
            <Badge key={s} tone="warning" icon={TriangleAlert}>
              {s} tidak ada di katalog
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-4.5 text-ink-muted">
          {result.mode === "v1"
            ? "Mode pembanding: urutan kandidat dibuat AI tanpa skor, hanya untuk mengukur biaya token."
            : "Skor dihitung di kode dari bukti, bukan oleh AI. Klik ID bukti untuk melihat sumbernya."}{" "}
          Rekomendasi ini bahan pertimbangan; keputusan tetap di tangan Anda.
        </p>
      </Card>

      {result.noMatch && empty && (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Belum ada mahasiswa dengan bukti untuk kebutuhan ini"
            description={
              result.unknownSkills.length > 0
                ? `${result.unknownSkills.join(", ")} belum ada di katalog skill kampus, jadi Netra tidak bisa mencocokkannya dengan bukti mahasiswa. Coba sebut skill yang lebih umum.`
                : "Tidak ada mahasiswa aktif yang punya bukti untuk skill wajib. Coba longgarkan syarat atau kurangi skill wajib."
            }
            action={
              <ButtonLink href="/tasks/new" variant="secondary">
                Ubah kebutuhan
              </ButtonLink>
            }
          />
        </Card>
      )}

      {result.noMatch && !empty && (
        <div role="status" className="flex gap-3 rounded-card bg-warning-bg px-5 py-4 text-warning">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Tidak ada mahasiswa yang memenuhi</p>
            <p className="mt-1 text-[13px] leading-4.5">
              Tidak ada kandidat dengan skor 50 atau lebih. Berikut {result.candidates.length} kandidat terdekat beserta
              skill yang belum ada buktinya.
            </p>
          </div>
        </div>
      )}

      {!empty && (
        <p className="text-[13px] leading-4.5 text-ink-muted">
          “Belum ada bukti” berarti data kampus belum mencatat skill itu, bukan berarti mahasiswa tidak menguasainya.
        </p>
      )}

      <section aria-label="Kandidat" hidden={empty}>
        <ol className="space-y-4">
          {result.candidates.map((c, i) => (
            <CandidateCard
              key={c.code}
              candidate={c}
              rank={i + 1}
              selected={selected.includes(c.code)}
              selectable={awaiting}
              onToggle={() => toggle(c.code)}
              activeEvidence={activeEvidence}
              onOpenEvidence={onOpenEvidence}
            />
          ))}
        </ol>
      </section>

      <Card>
        <CardHeader
          title="Persetujuan dan undangan"
          description="Tidak ada pesan yang terkirim tanpa persetujuan Anda."
          action={<SimulasiBadge />}
        />

        {awaiting && empty && (
          <div className="space-y-4">
            {error && <ErrorState message={error} />}
            <Button variant="danger" onClick={() => act("reject")} disabled={busy !== null}>
              <CircleX aria-hidden className="size-4" />
              {busy === "reject" ? "Menyimpan…" : "Tutup tanpa mengundang"}
            </Button>
          </div>
        )}

        {awaiting && !empty && (
          <div className="space-y-4">
            {!result.noMatch && (
              <TextAreaField
                label="Draf undangan (bisa diedit)"
                rows={8}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
            <p className="text-[13px] text-ink-muted">
              {selected.length > 0
                ? `${selected.length} kandidat dipilih: ${selected.join(", ")}`
                : "Belum ada kandidat yang dipilih."}
            </p>
            {error && <ErrorState message={error} />}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => act("approve")} disabled={busy !== null || selected.length === 0}>
                <CircleCheck aria-hidden className="size-4" />
                {busy === "approve"
                  ? "Mengirim undangan…"
                  : `Setujui dan undang ${selected.length || ""} mahasiswa`.replace("  ", " ")}
              </Button>
              <Button variant="danger" onClick={() => act("reject")} disabled={busy !== null}>
                <CircleX aria-hidden className="size-4" />
                {busy === "reject" ? "Menyimpan…" : "Tolak shortlist"}
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Lock aria-hidden className="size-3.5" />
              Undangan hanya terkirim setelah Anda menyetujui. Pengiriman disimulasikan.
            </p>
          </div>
        )}

        {status === "approved" && approval && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-field bg-success-bg px-4 py-3 text-success">
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p className="text-[13px] leading-4.5">
                Disetujui untuk <span className="font-mono font-medium">{approval.candidateCodes.join(", ")}</span> oleh{" "}
                {approval.decidedBy}, {formatTime(approval.decidedAt)}.
              </p>
            </div>
            {approval.messageDraft && (
              <pre className="rounded-field bg-panel p-4 font-sans text-[13px] leading-5 whitespace-pre-wrap text-ink-muted">
                {approval.messageDraft}
              </pre>
            )}
            {error && <ErrorState message={error} />}
            {approval.sentAt ? (
              <div
                role="status"
                className="flex flex-wrap items-center gap-3 rounded-field border border-simulasi-bg bg-simulasi-bg/40 px-4 py-3"
              >
                <Send aria-hidden className="size-5 text-simulasi" />
                <p className="flex-1 text-[15px] font-medium text-simulasi">
                  Undangan terkirim (SIMULASI), {formatTime(approval.sentAt)}
                </p>
                <SimulasiBadge />
                <p className="w-full text-xs text-simulasi">Tidak ada email atau WhatsApp yang benar-benar dikirim.</p>
              </div>
            ) : (
              <Button onClick={() => act("send")} disabled={busy !== null}>
                <Send aria-hidden className="size-4" />
                {busy === "send" ? "Mengirim…" : `Kirim undangan ke ${approval.candidateCodes.length} mahasiswa`}
              </Button>
            )}
          </div>
        )}

        {status === "rejected" && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-field bg-panel px-4 py-3 text-ink-muted">
              <CircleX aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p className="text-[13px] leading-4.5">
                Shortlist ditolak{approval ? ` oleh ${approval.decidedBy}, ${formatTime(approval.decidedAt)}` : ""}. Tidak
                ada undangan yang dikirim.
              </p>
            </div>
            <ButtonLink href="/tasks/new" variant="secondary">
              Buat tugas baru
            </ButtonLink>
          </div>
        )}
      </Card>
    </div>
  );
}
