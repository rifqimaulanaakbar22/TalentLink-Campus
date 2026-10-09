import { ArrowUpRight, LoaderCircle, Lock, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/app/_lib/cn";
import { formatNumber, formatPercent, TOOL_LABEL } from "@/app/_lib/format";
import type { TokenUsageView, WorkerCard } from "@/app/_lib/types";
import { LEVELS, WORKER_PROFILE } from "@/app/_lib/worker-profile";
import { Mascot } from "./mascot";

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-[13px] text-ink-muted">{term}</dt>
      <dd className="text-[15px] leading-5.5">{children}</dd>
    </div>
  );
}

/**
 * Kartu pegawai Digital Worker (konsep CBN: jabatan, penempatan, tingkat kemampuan,
 * knowledge base, hak akses). Satu-satunya elemen mencolok di Beranda.
 */
export function WorkerBadge({ worker, usage }: { worker: WorkerCard; usage: TokenUsageView }) {
  const profile = WORKER_PROFILE[worker.id];
  if (!profile) return null;
  const levelIndex = LEVELS.findIndex((l) => worker.level_label.startsWith(l.code));
  const level = LEVELS[levelIndex] ?? LEVELS[1];
  const busy = worker.status === "bekerja";

  return (
    <section
      aria-labelledby={`nama-${worker.id}`}
      className="grid overflow-hidden rounded-card bg-surface shadow-card md:grid-cols-[260px_1fr]"
    >
      {/* Sisi identitas, seperti kartu pegawai */}
      <div className="pattern-circuit flex flex-col items-center bg-brand-600 px-6 py-8 text-center text-white">
        <span className="rounded-full bg-white p-1.5">
          <Mascot workerId={worker.id} size={104} className="ring-0 ring-offset-0" />
        </span>
        <h2 id={`nama-${worker.id}`} className="mt-5 text-[28px] leading-8 font-semibold">
          {worker.nama}
        </h2>
        <p className="mt-1 text-[15px] text-white/90">{worker.jabatan}</p>
        <p className="mt-3 font-mono text-[13px] text-white/80">{profile.employeeId}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-medium text-brand-700">
          {busy ? (
            <>
              <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
              Sedang mengerjakan tugas
            </>
          ) : (
            <>
              <span aria-hidden className="size-2 rounded-full bg-success" />
              Bertugas, siap menerima tugas
            </>
          )}
        </span>
        <p className="mt-auto pt-6 text-xs text-white/80">Digital Worker (AI), bukan staf manusia</p>
      </div>

      {/* Sisi profil kerja */}
      <div className="flex flex-col px-6 py-5 sm:px-8">
        <p className="rounded-field rounded-tl-sm bg-panel px-4 py-3 text-[15px] leading-5.5">“{worker.salam}”</p>

        <dl className="mt-2 divide-y divide-line">
          <Row term="Penempatan">
            {worker.unit}, melapor ke {worker.melapor_ke}
          </Row>
          <Row term="Tingkat kemampuan">
            <span className="font-medium">
              {level.code} {level.name}
            </span>
            <span className="block text-[13px] leading-4.5 text-ink-muted">{level.scope}</span>
            <span className="mt-2 flex gap-1.5" aria-label={`Level ${levelIndex + 1} dari ${LEVELS.length}`}>
              {LEVELS.map((l, i) => (
                <span
                  key={l.code}
                  title={`${l.code} ${l.name}`}
                  className={cn("h-1.5 w-10 rounded-full", i <= levelIndex ? "bg-brand-500" : "bg-line")}
                />
              ))}
            </span>
          </Row>
          <Row term="Knowledge base">
            <ul className="space-y-0.5">
              {profile.knowledgeBase.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </Row>
          <Row term="Hak akses">
            {profile.access}
            <span className="mt-2 flex flex-wrap gap-1.5">
              {worker.tools_diizinkan.map((t) => (
                <span key={t} className="rounded-full bg-panel px-2.5 py-1 text-xs text-ink-muted">
                  {TOOL_LABEL[t] ?? t}
                </span>
              ))}
            </span>
          </Row>
          <Row term="Butuh persetujuan">
            <span className="inline-flex items-center gap-1.5">
              <Lock aria-hidden className="size-4 text-ink-muted" />
              {worker.aksi_butuh_approval.map((a) => TOOL_LABEL[a] ?? a).join(", ")}
            </span>
          </Row>
          <Row term="Pemakaian token">
            <span className="font-mono">{formatNumber(usage.total)}</span> dari{" "}
            <span className="font-mono">{formatNumber(usage.budget)}</span> token alokasi CBN
            <ProgressBar
              value={usage.percent}
              label="Pemakaian token aplikasi"
              tone={usage.stop ? "danger" : usage.warn ? "warning" : "brand"}
              className="mt-2"
            />
            <span className="mt-1 block text-[13px] text-ink-muted">
              {formatPercent(usage.percent, 2)} terpakai, dicatat per langkah di Token Ledger.
            </span>
          </Row>
        </dl>

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <ButtonLink href="/tasks/new" size="lg">
            <Play aria-hidden className="size-4" />
            Tugaskan {worker.nama}
          </ButtonLink>
          {worker.activeRunId !== null && (
            <ButtonLink href={`/runs/${worker.activeRunId}`} variant="secondary" size="lg">
              Lihat tugas yang berjalan
              <ArrowUpRight aria-hidden className="size-4" />
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}

/** Baris ringkas untuk worker yang masih dalam pelatihan (siklus hidup CBN). */
export function TraineeRow({ worker }: { worker: WorkerCard }) {
  const profile = WORKER_PROFILE[worker.id];
  if (!profile) return null;
  return (
    <li className="flex items-start gap-3 py-4">
      <Mascot workerId={worker.id} size={44} decorative />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{worker.nama}</span>
          <Badge tone="neutral">Dalam pelatihan</Badge>
        </p>
        <p className="text-[13px] leading-4.5">{worker.jabatan}</p>
        <p className="mt-1 text-[13px] leading-4.5 text-ink-muted">
          Akan ditempatkan di {worker.unit} untuk menghasilkan {profile.deliverable.toLowerCase()}.
        </p>
      </div>
    </li>
  );
}
