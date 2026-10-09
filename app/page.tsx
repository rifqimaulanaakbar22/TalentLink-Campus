"use client";

import { Inbox, Play, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RunList } from "@/components/app/run-list";
import { TeammateRow, TraineeRow, WorkerBadge } from "@/components/app/worker-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingRows, Skeleton } from "@/components/ui/states";
import { api } from "./_lib/api";
import { formatPercent } from "./_lib/format";
import { useApi } from "./_lib/use-api";
import { DISPLAYED_WORKERS } from "./_lib/worker-profile";

export default function BerandaPage() {
  const workers = useApi(api.getWorkers);
  const runs = useApi(api.getRuns);

  const usage = workers.data?.usage;
  const netra = workers.data?.workers.find((w) => w.id === "netra");
  // Cakupan MVP: Netra dan Jaya. Data worker lain dari backend tidak ditampilkan.
  const others = workers.data?.workers.filter((w) => w.id !== "netra" && DISPLAYED_WORKERS.includes(w.id)) ?? [];
  const teammates = others.filter((w) => w.status !== "segera_hadir");
  const trainees = others.filter((w) => w.status === "segera_hadir");
  const runList = runs.data?.runs ?? [];
  const waiting = runList.filter((r) => r.status === "awaiting_approval" || r.status === "needs_clarification");

  return (
    <>
      <PageHeader
        title="Tim Digital Worker"
        description={
          teammates.length > 0
            ? "Netra bertugas di LPPM dan Jaya di Bagian Kemahasiswaan. Beri tugas dalam bahasa sehari-hari, lalu setujui hasilnya sebelum mahasiswa dihubungi."
            : "Netra bertugas di LPPM. Beri tugas dalam bahasa sehari-hari, lalu setujui hasilnya sebelum mahasiswa dihubungi."
        }
      />

      {usage?.warn && (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-card bg-warning-bg px-5 py-4 text-warning">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p className="text-[15px]">
            Pemakaian token sudah {formatPercent(usage.percent)} dari alokasi. Pada 95% Digital Worker berhenti memanggil AI.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          {workers.status === "error" && <ErrorState message={workers.error} onRetry={workers.reload} />}
          {workers.status === "loading" && <Skeleton className="h-130 rounded-card bg-surface" />}
          {netra && usage && <WorkerBadge worker={netra} usage={usage} />}
        </div>

        <Card className="min-w-0 xl:col-span-4">
          <CardHeader title="Menunggu keputusan Anda" />
          {runs.status === "loading" && <LoadingRows rows={2} label="Memuat penugasan…" />}
          {runs.status === "error" && <ErrorState message={runs.error} onRetry={runs.reload} />}
          {runs.status === "success" &&
            (waiting.length === 0 ? (
              <p className="py-4 text-[15px] text-ink-muted">
                Tidak ada yang menunggu. Hasil kerja Digital Worker akan muncul di sini untuk Anda setujui.
              </p>
            ) : (
              <RunList runs={waiting} showNextStep />
            ))}
        </Card>
      </div>

      <div className="mt-10 grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <section aria-labelledby="judul-riwayat" className="min-w-0 xl:col-span-8">
          <h2 id="judul-riwayat" className="text-xl leading-7 font-semibold">
            Riwayat penugasan
          </h2>
          <p className="mt-1 text-[15px] text-ink-muted">
            Setiap penugasan tersimpan beserta jejak kerja dan buktinya.
          </p>
          <Card className="mt-4">
            {runs.status === "loading" && <LoadingRows rows={4} label="Memuat riwayat…" />}
            {runs.status === "error" && <ErrorState message={runs.error} onRetry={runs.reload} />}
            {runs.status === "success" &&
              (runList.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Belum ada penugasan"
                  description="Tulis kebutuhan riset Anda. Netra menyiapkan shortlist berbukti dalam kurang dari satu menit."
                  action={
                    <ButtonLink href="/tasks/new">
                      <Play aria-hidden className="size-4" />
                      Tugaskan Netra
                    </ButtonLink>
                  }
                />
              ) : (
                <RunList runs={runList} />
              ))}
          </Card>
        </section>

        <section aria-labelledby="judul-rekan" className="min-w-0 xl:col-span-4">
          <h2 id="judul-rekan" className="text-xl leading-7 font-semibold">
            {teammates.length > 0 ? "Juga bertugas" : "Dalam pelatihan"}
          </h2>
          <p className="mt-1 text-[15px] text-ink-muted">Satu mesin dan satu alokasi token dengan Netra.</p>
          <Card className="mt-4 py-1">
            {workers.status === "success" ? (
              <ul className="divide-y divide-line">
                {teammates.map((w) => (
                  <TeammateRow key={w.id} worker={w} />
                ))}
                {trainees.map((w) => (
                  <TraineeRow key={w.id} worker={w} />
                ))}
              </ul>
            ) : (
              <LoadingRows rows={2} label="Memuat worker…" />
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
