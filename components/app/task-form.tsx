"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LoaderCircle, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextAreaField } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/states";
import { api, USE_MOCK } from "@/app/_lib/api";
import { mockWorkerBase } from "@/app/_lib/fixtures";
import { EXAMPLE_BRIEFS } from "@/app/_lib/mock-data";
import type { WorkerId } from "@/app/_lib/types";
import { formCopy } from "@/app/_lib/worker-copy";
import { Mascot } from "./mascot";

const MIN_BRIEF = 15;

/** Form penugasan yang sama untuk semua worker; hanya teks dan batasnya yang berbeda. */
export function TaskForm({ workerId = "netra" }: { workerId?: WorkerId }) {
  const worker = mockWorkerBase.find((w) => w.id === workerId) ?? mockWorkerBase[0];
  const copy = formCopy(workerId, EXAMPLE_BRIEFS);
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [compare, setCompare] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      const mode = copy.allowCompare && compare ? "v1" : "v2";
      const { runId } = await api.createRun({ workerId, brief: brief.trim(), mode });
      router.push(`/runs/${runId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Tugas belum terkirim. Coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12" noValidate>
      <Card className="min-w-0 lg:col-span-8">
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

        {copy.allowCompare && (
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-field bg-panel p-4">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="mt-0.5 size-4 accent-brand-600"
          />
          <span>
            <span className="block text-[15px] font-medium">Jalankan sebagai mode pembanding</span>
            <span className="block text-[13px] leading-4.5 text-ink-muted">
              Semua kandidat dikirim ke AI tanpa penyaringan. Hanya untuk membandingkan biaya token; lihat totalnya di jejak kerja.
            </span>
          </span>
        </label>
        )}

        {submitError && (
          <div className="mt-5">
            <ErrorState message={submitError} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : (
              <Play aria-hidden className="size-5" />
            )}
            {submitting ? copy.submitting : copy.submit}
          </Button>
          <p className="text-[13px] text-ink-muted">{copy.eta}</p>
        </div>
      </Card>

      <div className="min-w-0 space-y-5 lg:col-span-4">
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
