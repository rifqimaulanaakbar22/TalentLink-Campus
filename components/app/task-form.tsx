"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, LoaderCircle, Lock, OctagonX, Play } from "lucide-react";
import { Badge, SimulasiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { TextAreaField } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/states";
import { api, USE_MOCK } from "@/app/_lib/api";
import { mockWorkerBase } from "@/app/_lib/fixtures";
import { EXAMPLE_BRIEFS } from "@/app/_lib/mock-data";
import type { RunMode, WorkerId } from "@/app/_lib/types";
import { useApi } from "@/app/_lib/use-api";
import { formCopy } from "@/app/_lib/worker-copy";
import { Mascot } from "./mascot";
import { FixedPath, PathPicker } from "./path-picker";

const MIN_BRIEF = 15;

/** Form penugasan yang sama untuk semua worker; hanya teks dan batasnya yang berbeda. */
export function TaskForm({ workerId = "netra" }: { workerId?: WorkerId }) {
  const worker = mockWorkerBase.find((w) => w.id === workerId) ?? mockWorkerBase[0];
  const copy = formCopy(workerId, EXAMPLE_BRIEFS);
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [mode, setMode] = useState<RunMode>("v2");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Neraca Token: perkiraan token per jalur dan rem anggaran. Jika gagal dimuat, form tetap bisa dipakai.
  const tokens = useApi(api.getTokenReport);
  const report = tokens.data;
  const stopped = report?.usage.stop ?? false;
  // Jalur Pembanding yang dikunci tidak pernah dikirim, walaupun sempat dipilih sebelum data anggaran tiba.
  const effectiveMode: RunMode = copy.allowCompare && !report?.comparisonLocked ? mode : "v2";
  const length = brief.trim().length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (length < MIN_BRIEF) {
      setFieldError(copy.minHint);
      return;
    }
    if (length > copy.maxLength) {
      setFieldError(`Teks terlalu panjang. Maksimal ${copy.maxLength.toLocaleString("id-ID")} karakter.`);
      return;
    }
    setFieldError(undefined);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { runId } = await api.createRun({ workerId, brief: brief.trim(), mode: effectiveMode });
      router.push(`/runs/${runId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Tugas belum terkirim. Coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    // Layar lebar: dua kolom 7:5 yang berakhir di garis bawah yang sama.
    // Layar sedang: form selebar penuh, lalu dua kartu penjelasan berdampingan 1:1.
    <form onSubmit={submit} className="grid grid-cols-1 gap-5 xl:grid-cols-12" noValidate>
      <Card className="flex min-w-0 flex-col xl:col-span-7">
        <div className="flex items-start gap-3">
          <Mascot workerId={worker.id} size={48} />
          <div className="rounded-field rounded-tl-sm bg-panel px-4 py-3">
            <p className="text-[15px] leading-5.5">{worker.salam}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
              <Bot aria-hidden className="size-3.5" />
              {worker.nama}, {worker.jabatan}. Digital Worker (AI).
            </p>
          </div>
        </div>

        <TextAreaField
          label={copy.fieldLabel}
          className="mt-6"
          rows={copy.rows}
          value={brief}
          onChange={(e) => {
            setBrief(e.target.value);
            if (fieldError) setFieldError(undefined);
          }}
          placeholder={copy.placeholder}
          error={fieldError}
          hint={copy.hint}
        />

        <p className="mt-5 text-[13px] text-ink-muted">{copy.examplesIntro}</p>
        <ul className={`mt-2 grid grid-cols-1 gap-2 ${copy.examples.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {copy.examples.map((ex) => (
            <li key={ex.label}>
              <button
                type="button"
                onClick={() => {
                  setBrief(ex.text);
                  setFieldError(undefined);
                }}
                className="h-full w-full rounded-field border border-line bg-surface p-3 text-left text-[13px] leading-4.5 text-ink-muted transition-colors hover:border-brand-300 hover:text-ink"
              >
                {ex.label}
              </button>
            </li>
          ))}
        </ul>

        {copy.allowCompare ? (
          <PathPicker value={effectiveMode} onChange={setMode} report={report} />
        ) : (
          <FixedPath workerName={worker.nama} reason={copy.fixedPathReason ?? ""} />
        )}

        {stopped && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-field bg-danger-bg p-4 text-danger">
            <OctagonX aria-hidden className="mt-0.5 size-5 shrink-0" />
            <p className="text-[13px] leading-4.5">
              Anggaran token sudah mencapai batas berhenti, jadi penugasan baru ditahan sampai alokasi ditambah.{" "}
              <Link href="/tokens" className="font-medium underline">
                Lihat Neraca Token
              </Link>
            </p>
          </div>
        )}

        {submitError && (
          <div className="mt-5">
            <ErrorState message={submitError} />
          </div>
        )}

        <div className="mt-auto pt-6">
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <Button type="submit" size="lg" disabled={submitting || stopped}>
              {submitting ? (
                <LoaderCircle aria-hidden className="size-5 animate-spin" />
              ) : (
                <Play aria-hidden className="size-5" />
              )}
              {submitting ? copy.submitting : copy.submit}
            </Button>
            <p className="text-[13px] text-ink-muted">{copy.eta}</p>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:col-span-5 xl:flex xl:flex-col">
        <Card variant="feature">
          <h2 className="text-lg font-semibold">Cara {worker.nama} bekerja</h2>
          <ol className="mt-4 space-y-3 text-[13px] leading-4.5">
            {copy.steps.map((text, i) => (
              <li key={text} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-white/90">{text}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="flex flex-1 flex-col">
          <CardHeader title="Yang akan Anda terima" description={`Hasil kerja ${worker.nama} untuk Anda periksa sebelum memutuskan.`} />
          <ul className="space-y-4">
            {copy.deliverables.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-panel text-brand-600">
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{title}</span>
                  <span className="block text-[13px] leading-4.5 text-ink-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-5">
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Lock aria-hidden className="size-4 text-ink-muted" />
              <p className="flex-1 text-[13px] leading-4.5 text-ink-muted">Tidak ada pesan yang terkirim tanpa persetujuan Anda.</p>
              <SimulasiBadge />
            </div>
          </div>
        </Card>

        {USE_MOCK && workerId === "netra" && (
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-medium">
              Skenario demo <Badge tone="warning">Mode mock</Badge>
            </h2>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-4.5 text-ink-muted">
              <li>Tulis brief tanpa skill, misalnya “cari mahasiswa yang bagus untuk riset”. Netra bertanya balik.</li>
              <li>Sebut “Unity dan Public Speaking” untuk melihat 3 kandidat terdekat saat tidak ada yang memenuhi.</li>
              <li>Sebut “blockchain” untuk skill di luar katalog. Backend saat ini mengembalikan 0 kandidat.</li>
              <li>Tambahkan “simulasi gagal” untuk melihat gangguan API dan tombol Coba lagi.</li>
            </ul>
          </Card>
        )}
      </div>
    </form>
  );
}
