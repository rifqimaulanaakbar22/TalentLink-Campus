"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextAreaField } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/app/_lib/api";
import type { WorkerId } from "@/app/_lib/types";
import { workerName } from "@/app/_lib/worker-copy";
import { Mascot } from "./mascot";

/** Kotak jawab saat worker bertanya balik (FR-R3). */
export function ClarifyBox({
  runId,
  workerId = "netra",
  question,
  onDone,
}: {
  runId: number;
  workerId?: WorkerId;
  question: string;
  onDone: () => void;
}) {
  const name = workerName(workerId);
  const jaya = workerId === "jaya";
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (answer.trim().length < 3) {
      setError(jaya ? "Tulis jawaban singkat, misalnya jumlah anggota tim dan bidang lomba." : "Tulis jawaban singkat, misalnya topik atau skill yang dibutuhkan.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.clarify(runId, answer);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim jawaban.");
      setBusy(false);
    }
  }

  return (
    <Card variant="highlight">
      <div className="flex items-start gap-4">
        <Mascot workerId={workerId} size={48} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{name} butuh klarifikasi</span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
              <Bot aria-hidden className="size-3.5" />
              Digital Worker (AI)
            </span>
          </p>
          <p className="mt-2 rounded-field rounded-tl-sm bg-brand-50 px-4 py-3 text-[15px] leading-5.5 text-brand-900">
            {question}
          </p>
          <p className="mt-2 text-[13px] text-ink-muted">
            {jaya
              ? "Jaya hanya memakai syarat yang tertulis di guidebook. Jawaban Anda melanjutkan penugasan ini."
              : "Netra tidak menebak skill yang tidak disebut. Jawaban Anda melanjutkan penugasan ini."}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <TextAreaField
          label="Jawaban Anda"
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={
            jaya
              ? "Contoh: Tim 3 orang untuk lomba aplikasi AI, butuh pengembang model, pengembang web, dan presenter."
              : "Contoh: Computer Vision dan Python, untuk riset deteksi objek."
          }
        />
        {error && <ErrorState message={error} />}
        <Button type="submit" disabled={busy}>
          <Send aria-hidden className="size-4" />
          {busy ? "Mengirim…" : "Kirim jawaban"}
        </Button>
      </form>
    </Card>
  );
}
