"use client";

import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { USE_MOCK } from "@/app/_lib/api";
import { mockApi } from "@/app/_lib/mock-store";

/** Penanda mode mock + tombol reset data contoh, agar demo bisa diulang dari awal. */
export function MockBadge() {
  if (!USE_MOCK) return null;
  return (
    <span className="hidden items-center gap-1 sm:inline-flex">
      <Badge tone="warning">Mode mock</Badge>
      <button
        type="button"
        onClick={() => {
          mockApi.reset();
          window.location.reload();
        }}
        aria-label="Reset data contoh"
        title="Reset data contoh"
        className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
      >
        <RotateCcw aria-hidden className="size-4" />
      </button>
    </span>
  );
}
