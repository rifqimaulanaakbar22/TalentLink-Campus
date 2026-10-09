"use client";

import { Inbox, Play, RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingRows, Skeleton } from "@/components/ui/states";
import { api } from "@/app/_lib/api";
import { useApi } from "@/app/_lib/use-api";
import {
  BudgetBanner,
  BudgetCard,
  RunTokenBars,
  SavingsCard,
  StepShare,
  WorkerShare,
} from "./neraca-token";
import { PageHeader } from "./page-header";

/** Halaman Neraca Token: anggaran, penghematan Jalur Hemat, rincian pemakaian, dan aturan rem anggaran. */
export function NeracaTokenView() {
  const report = useApi(api.getTokenReport);
  const runs = useApi(api.getRuns);
  const reload = () => {
    report.reload();
    runs.reload();
  };
  const runList = runs.data?.runs ?? [];

  return (
    <>
      <PageHeader
        title="Neraca Token"
        description="Pemakaian token Digital Worker dari alokasi API CBN: berapa yang terpakai, berapa sisanya, dan berapa yang dihemat Jalur Hemat."
        actions={
          <Button variant="secondary" onClick={reload} disabled={report.status === "loading"}>
            <RefreshCw aria-hidden className={report.status === "loading" ? "size-4 animate-spin" : "size-4"} />
            Perbarui
          </Button>
        }
      />

      {report.status === "error" && <ErrorState message={report.error} onRetry={report.reload} />}

      {report.status === "loading" && (
        <div role="status" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <span className="sr-only">Memuat Neraca Token…</span>
          <Skeleton className="h-80 rounded-card bg-surface lg:col-span-7" />
          <Skeleton className="h-80 rounded-card bg-surface lg:col-span-5" />
        </div>
      )}

      {report.data && (
        <>
          <BudgetBanner report={report.data} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <BudgetCard report={report.data} className="lg:col-span-7" />
            <SavingsCard report={report.data} className="lg:col-span-5" />
          </div>

          <section aria-labelledby="judul-rincian" className="mt-10">
            <h2 id="judul-rincian" className="text-xl leading-7 font-semibold">
              Rincian pemakaian
            </h2>
            <p className="mt-1 text-[15px] text-ink-muted">Dari mana token terpakai: per penugasan, per worker, dan per langkah.</p>
            {/* Tanpa items-start: kartu grafik ikut setinggi kolom kanan agar tidak ada ruang kosong. */}
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
              <Card className="flex min-w-0 flex-col lg:col-span-8">
                <CardHeader
                  title="Token per penugasan"
                  description="20 penugasan terakhir, dari yang paling lama. Klik batang untuk membuka jejak kerjanya."
                />
                {runs.status === "loading" && <LoadingRows rows={3} label="Memuat penugasan…" />}
                {runs.status === "error" && <ErrorState message={runs.error} onRetry={runs.reload} />}
                {runs.status === "success" &&
                  (runList.length === 0 ? (
                    <EmptyState
                      icon={Inbox}
                      title="Belum ada penugasan"
                      description="Pemakaian token tiap penugasan muncul di sini setelah Digital Worker mulai bekerja."
                      action={
                        <ButtonLink href="/tasks/new">
                          <Play aria-hidden className="size-4" />
                          Tugaskan Netra
                        </ButtonLink>
                      }
                    />
                  ) : (
                    <RunTokenBars runs={runList} />
                  ))}
              </Card>
              <div className="min-w-0 space-y-5 lg:col-span-4">
                <WorkerShare report={report.data} />
                <StepShare report={report.data} />
              </div>
            </div>
          </section>

        </>
      )}
    </>
  );
}
