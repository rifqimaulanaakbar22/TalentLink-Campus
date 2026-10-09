// Semua akses data frontend lewat berkas ini. Mode mock: NEXT_PUBLIC_API_MOCK=true di .env.local.
import { ApiRequestError } from "./errors";
import { mockApi } from "./mock-store";
import type {
  ApprovalView,
  ApproveBody,
  CreateRunBody,
  CreateRunResponse,
  EvidenceDetail,
  RunDetailResponse,
  RunListResponse,
  RunStatus,
  SendResponse,
  WorkerResponse,
} from "./types";

export { ApiRequestError };

export const USE_MOCK = process.env.NEXT_PUBLIC_API_MOCK === "true";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiRequestError("Tidak bisa terhubung ke server. Pastikan aplikasi berjalan.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && typeof body.error === "string" && body.error) ||
      (res.status === 404 ? "Data tidak ditemukan." : `Permintaan gagal (kode ${res.status}).`);
    throw new ApiRequestError(message, res.status);
  }
  return body as T;
}

/** Jalankan fungsi mock dengan jeda kecil agar status memuat ikut teruji. */
async function mock<T>(fn: () => T, delay = 300): Promise<T> {
  await wait(delay);
  return structuredClone(fn());
}

const post = (body?: unknown): RequestInit => ({ method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  getWorkers: () => (USE_MOCK ? mock(() => mockApi.getWorkers()) : request<WorkerResponse>("/api/worker")),
  getRuns: () => (USE_MOCK ? mock(() => mockApi.getRuns()) : request<RunListResponse>("/api/runs")),
  getRun: (id: number) =>
    USE_MOCK ? mock(() => mockApi.getRun(id), 120) : request<RunDetailResponse>(`/api/runs/${id}`),
  createRun: (body: CreateRunBody) =>
    USE_MOCK ? mock(() => mockApi.createRun(body), 500) : request<CreateRunResponse>("/api/runs", post(body)),
  clarify: (id: number, answer: string) =>
    USE_MOCK
      ? mock(() => mockApi.clarify(id, answer))
      : request<{ runId: number; status: RunStatus }>(`/api/runs/${id}/clarify`, post({ answer })),
  approve: (id: number, body: ApproveBody) =>
    USE_MOCK ? mock(() => mockApi.approve(id, body)) : request<ApprovalView>(`/api/runs/${id}/approve`, post(body)),
  send: (id: number) =>
    USE_MOCK ? mock(() => mockApi.send(id), 600) : request<SendResponse>(`/api/runs/${id}/send`, post()),
  retry: (id: number) =>
    USE_MOCK
      ? mock(() => mockApi.retry(id))
      : request<{ runId: number; status: RunStatus }>(`/api/runs/${id}/retry`, post()),
  getEvidence: (id: string) =>
    USE_MOCK ? mock(() => mockApi.getEvidence(id), 200) : request<EvidenceDetail>(`/api/evidence/${id}`),
};
