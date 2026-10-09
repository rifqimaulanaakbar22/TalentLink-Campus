"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

/** Muat data sekali saat komponen tampil; reload() untuk tombol Coba lagi. */
export function useApi<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ApiState<T>>({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    load()
      .then((data) => alive && setState({ status: "success", data, error: null }))
      .catch((err: unknown) =>
        alive &&
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.",
        }),
      );
    return () => {
      alive = false;
    };
    // load sengaja tidak masuk dependensi: fungsi dari objek api bersifat stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
