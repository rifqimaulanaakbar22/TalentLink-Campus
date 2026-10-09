"use client";

import Link from "next/link";
import { Inbox, Play, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RunList } from "@/components/app/run-list";
import { WorkerBadge } from "@/components/app/worker-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingRows, Skeleton } from "@/components/ui/states";
import { api } from "./_lib/api";
import { formatPercent } from "./_lib/format";
import { useApi } from "./_lib/use-api";
import { DISPLAYED_WORKERS } from "./_lib/worker-profile";

export default function BerandaPage() {
  const workers = useApi(api.getWorkers);
  const runs = useApi(api.getRuns);

  const usage = workers.data?.usage;
  // Cakupan MVP: Netra dan Jaya, urut sesuai DISPLAYED_WORKERS. Data worker lain dari backend tidak ditampilkan.
  const team = DISPLAYED_WORKERS.flatMap((id) => workers.data?.workers.find((w) => w.id === id) ?? []);
  const teammates = team.filter((w) => w.id !== "netra" && w.status !== "segera_hadir");
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
            {usage.stop
              ? "Anggaran token sudah mencapai batas berhenti. Penugasan baru ditahan sampai alokasi ditambah."
              : `Pemakaian token sudah ${formatPercent(usage.percent)} dari alokasi, jadi Jalur Pembanding dikunci. Pada 95% Digital Worker berhenti memanggil AI.`}{" "}
            <Link href="/tokens" className="font-medium underline">
              Lihat Neraca Token
            </Link>
          </p>
        </div>
      )}

      {/* Baris 1: kartu pegawai Netra dan Jaya, lebar dan tinggi sama */}
      <section aria-label="Kartu pegawai Digital Worker" className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {workers.status === "error" && (
          <div className="xl:col-span-2">
            <ErrorState message={workers.error} onRetry={workers.reload} />
          </div>
        )}
        {workers.status === "loading" &&
          DISPLAYED_WORKERS.map((id) => <Skeleton key={id} className="h-150 rounded-card bg-surface" />)}
        {usage && team.map((w) => <WorkerBadge key={w.id} worker={w} usage={usage} />)}
      </section>

      {/* Baris 2: riwayat dan keputusan yang menunggu, porsi 1:1 */}
      <div className="mt-10 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section aria-labelledby="judul-riwayat" className="flex min-w-0 flex-col">
          <h2 id="judul-riwayat" className="text-xl leading-7 font-semibold">
            Riwayat penugasan
          </h2>
          <p className="mt-1 text-[15px] text-ink-muted">Setiap penugasan tersimpan beserta jejak kerja dan buktinya.</p>
          <Card className="mt-4 flex-1">
            {runs.status === "loading" && <LoadingRows rows={4} label="Memuat riwayat…" />}
            {runs.status === "error" && <ErrorState message={runs.error} onRetry={runs.reload} />}
            {runs.status === "success" &&
              (runList.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Belum ada penugasan"
                  description="Tugaskan Netra untuk mencari anggota riset, atau Jaya untuk menyusun tim lomba. Hasilnya siap dalam kurang dari satu menit."
                  action={
                    <ButtonLink href="/tasks/new">
                      <Play aria-hidden className="size-4" />
                      Beri tugas
                    </ButtonLink>
                  }
                />
              ) : (
                // Daftar panjang digulir di dalam kartu agar tinggi kedua kolom tetap seimbang.
                <div className="xl:max-h-120 xl:overflow-y-auto xl:pr-1">
                  <RunList runs={runList} />
                </div>
              ))}
          </Card>
        </section>

        <section aria-labelledby="judul-menunggu" className="flex min-w-0 flex-col">
          <h2 id="judul-menunggu" className="text-xl leading-7 font-semibold">
            Menunggu keputusan Anda
          </h2>
          <p className="mt-1 text-[15px] text-ink-muted">
            Hasil kerja {teammates.length > 0 ? "Netra dan Jaya" : "Netra"} yang perlu Anda setujui atau jawab.
          </p>
          <Card className="mt-4 flex-1">
            {runs.status === "loading" && <LoadingRows rows={2} label="Memuat penugasan…" />}
            {runs.status === "error" && <ErrorState message={runs.error} onRetry={runs.reload} />}
            {runs.status === "success" &&
              (waiting.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Tidak ada yang menunggu"
                  description="Hasil kerja Digital Worker akan muncul di sini untuk Anda setujui."
                />
              ) : (
                <div className="xl:max-h-120 xl:overflow-y-auto xl:pr-1">
                  <RunList runs={waiting} showNextStep />
                </div>
              ))}
          </Card>
        </section>
      </div>
    </>
  );
}
