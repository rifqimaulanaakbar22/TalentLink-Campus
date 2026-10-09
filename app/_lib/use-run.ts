"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { RunDetailResponse } from "./types";

const POLL_MS = 1000;

/** Ambil detail run dan polling tiap 1 detik selama status queued atau running (kontrak bagian 4). */
export function useRun(id: number) {
  const [data, setData] = useState<RunDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const detail = await api.getRun(id);
        if (!alive) return;
        setData(detail);
        setError(null);
        if (detail.run.status === "queued" || detail.run.status === "running") timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Gagal memuat run.");
      }
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, tick]);

  /** Muat ulang setelah aksi (approve, klarifikasi, coba lagi); polling otomatis lanjut jika perlu. */
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return { data, error, refresh };
}
