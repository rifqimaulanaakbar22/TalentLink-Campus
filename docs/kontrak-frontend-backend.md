# Kontrak kerja Frontend dan Backend

Dokumen ini dipakai Rifqi (Frontend) dan Rofiq (Backend & AI) agar bisa bekerja bersamaan tanpa conflict saat merge. Isinya pembagian folder, bentuk data API yang disepakati, urutan merge, dan prompt untuk AI coding assistant masing-masing. Jika ada perubahan kontrak, ubah dokumen ini dulu, kabari di grup, baru ubah kode.

## 1. Keadaan repo per 9 Oktober 2026

| Branch | Isi | Status |
| --- | --- | --- |
| `master` | Scaffold Next.js 16, konfigurasi, `lib/workers.json`, skill frontend-design dan backend-efisien | Bersih |
| `feat/research-matching` (Rofiq) | Skema DB, seed, `lib/llm.ts`, pipeline `lib/worker/*`, unit test score dan verify, CLI | Checkpoint 1 selesai, **belum di-merge** |

Yang belum ada sama sekali: endpoint API, semua halaman UI, design tokens, skill talentlink-ui, maskot, eval, smoke test.

## 2. Pembagian folder

Setiap orang hanya mengubah folder miliknya. Jika butuh perubahan di folder orang lain, minta pemiliknya.

| Folder atau file | Pemilik | Catatan |
| --- | --- | --- |
| `app/page.tsx`, `app/tasks/`, `app/runs/`, `app/scorecard/` | Rifqi | Halaman |
| `app/layout.tsx`, `app/globals.css` | Rifqi | Layout dan Tailwind tokens |
| `app/_lib/` | Rifqi | Klien fetch, fixture mock, helper UI |
| `components/`, `design/`, `public/mascots/` | Rifqi | |
| `.claude/skills/talentlink-ui/` | Rifqi | |
| `app/api/` | Rofiq | Route Handlers |
| `lib/` (termasuk `lib/types.ts`, `lib/api-types.ts`) | Rofiq | Rifqi hanya boleh `import type` dari sini |
| `scripts/`, `drizzle.config.ts` | Rofiq | |
| `.claude/skills/backend-efisien/` | Rofiq | |
| `eval/`, `tests/e2e/`, `README.md`, `tech.md` | Reyhan | |
| `docs/` | Siapa saja, satu berkas satu pemilik | Berkas ini milik bersama; ubah lewat kesepakatan |

**File bersama yang rawan conflict:**

- `package.json` dan `package-lock.json`: hanya Rofiq yang menambah dependensi. Rifqi yang butuh paket baru minta ke Rofiq. Jika tetap conflict di lockfile, ambil versi master lalu jalankan `npm install` untuk membuat ulang lockfile.
- `lib/workers.json`: milik Rofiq. Rifqi cukup membacanya lewat `GET /api/worker`.
- `AGENTS.md` dan `CLAUDE.md`: jangan diubah tanpa kesepakatan. `next dev` bisa menulis ulang blok Next.js di `AGENTS.md`; jika muncul perubahan di sana, jangan di-commit.
- `.env.example`: milik Rofiq.

**Aturan import agar build tidak rusak:**

- Komponen di sisi browser (`"use client"`) tidak boleh mengimpor `lib/db.ts`, `lib/llm.ts`, atau `lib/worker/*`, karena modul itu memakai better-sqlite3.
- Frontend hanya memakai `import type { ... } from "@/lib/types"` dan `"@/lib/api-types"`.

## 3. Urutan merge

1. **Rofiq, segera:** merge `feat/research-matching` ke `master` setelah `npm run lint && npm test` lulus. Rifqi butuh `lib/types.ts` dari branch ini.
2. **Rofiq, commit kecil berikutnya:** buat `lib/api-types.ts` persis seperti bagian 4, lalu merge ke `master` sebelum mengerjakan endpoint. Ini satu-satunya titik sinkron tipe.
3. **Rifqi:** buat branch UI dari `master` yang sudah berisi kedua langkah di atas. Kerjakan semua layar dengan data mock (`NEXT_PUBLIC_API_MOCK=true`).
4. **Rofiq:** kerjakan endpoint di branch `feat/api-runs` sesuai kontrak.
5. **Integrasi pukul 23.00–24.00:** Rofiq merge API dulu, lalu Rifqi menjalankan `git merge origin/master` di branch UI, mematikan mock, memperbaiki selisih, lalu merge.

Sebelum merge ke `master`, selalu jalankan di branch sendiri:

```bash
git fetch origin
git merge origin/master
npm run lint && npm test
```

## 4. Kontrak API

Semua respons JSON memakai camelCase, kecuali field di dalam `RunResult` yang mengikuti `lib/types.ts` (misalnya `evidence_ids`). Semua error berbentuk `{ "error": "pesan bahasa Indonesia" }` dengan kode status HTTP yang sesuai.

### Tipe yang dibuat Rofiq di `lib/api-types.ts`

```ts
import type { RunMode, RunResult, RunStatus, StepName, StepStatus, WorkerId, EvidenceType, Grade } from "./types";

export interface ApiError { error: string }

export interface TokenUsageView {
  total: number;          // token terpakai seluruh aplikasi
  budget: number;         // 10_000_000
  percent: number;        // 0..100
  warn: boolean;          // >= 80%
  stop: boolean;          // >= 95%
  byWorker: Record<WorkerId, number>;
}

export interface WorkerCard {
  id: WorkerId;
  nama: string;
  maskot: string;
  arti_nama: string;
  jabatan: string;
  unit: string;
  melapor_ke: string;
  persona: string;
  salam: string;
  level_label: string;
  tools_diizinkan: string[];
  aksi_butuh_approval: string[];
  kpi: string[];
  warna: "indigo" | "orange" | "green";
  avatar: string;
  status: "siap" | "bekerja" | "segera_hadir";
  activeRunId: number | null;
  tokensUsed: number;
}

export interface WorkerResponse { workers: WorkerCard[]; usage: TokenUsageView }

export interface CreateRunBody { workerId: WorkerId; brief: string; mode: RunMode }
export interface CreateRunResponse { runId: number }

export interface RunSummary {
  id: number;
  workerId: WorkerId;
  briefPreview: string;   // maksimal 120 karakter
  mode: RunMode;
  status: RunStatus;
  createdAt: string;      // ISO
  totalTokens: number;
  errorMessage: string | null;
}
export interface RunListResponse { runs: RunSummary[] }

export interface StepView {
  id: number;
  step: StepName;
  status: StepStatus;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  detail: string | null;  // kalimat bersuara worker, siap ditampilkan
  model: string | null;   // hanya untuk langkah yang memanggil LLM
  inputTokens: number;
  outputTokens: number;
  isEstimate: boolean;
}

export interface ApprovalView {
  decision: "approved" | "rejected";
  candidateCodes: string[];
  messageDraft: string | null;
  decidedBy: string;
  decidedAt: string;
  sentAt: string | null;  // terisi setelah kirim SIMULASI
}

export interface RunDetailResponse {
  run: {
    id: number;
    workerId: WorkerId;
    mode: RunMode;
    brief: string;
    status: RunStatus;
    createdAt: string;
    updatedAt: string;
    errorMessage: string | null;
    clarificationQuestion: string | null; // terisi saat status needs_clarification
  };
  steps: StepView[];
  totalTokens: number;
  result: RunResult | null;               // terisi saat awaiting_approval, approved, rejected
  approval: ApprovalView | null;
  budgetWarning: boolean;
}

export interface ClarifyBody { answer: string }
export interface ApproveBody {
  decision: "approved" | "rejected";
  candidateCodes: string[];
  messageDraft: string;
}
export interface SendResponse { sentAt: string; label: "SIMULASI" }

export interface EvidenceDetail {
  id: string;
  type: EvidenceType;
  title: string;
  detail: string;
  grade: Grade | null;
  year: number;
  sourceLabel: string;    // "Sintetis"
  studentCode: string;
  skills: string[];
}

export interface ScorecardModeSummary {
  precisionAt3: number;       // 0..1
  validCitationRate: number;  // 0..1
  avgTokens: number;
  avgLatencyMs: number;
  runs: number;
}
export type ScorecardResponse =
  | { empty: true; hint: string }
  | {
      empty: false;
      generatedAt: string;
      v1: ScorecardModeSummary;
      v2: ScorecardModeSummary;
      cases: { id: string; title: string; mode: RunMode; pass: boolean; note: string }[];
    };
```

### Endpoint

| Method | Path | Body | Sukses | Error |
| --- | --- | --- | --- | --- |
| GET | `/api/worker` | | 200 `WorkerResponse` | |
| POST | `/api/runs` | `CreateRunBody` | 201 `CreateRunResponse` | 400 brief < 15 karakter; 400 worker belum tersedia |
| GET | `/api/runs` | | 200 `RunListResponse`, 20 terbaru | |
| GET | `/api/runs/:id` | | 200 `RunDetailResponse` | 404 |
| POST | `/api/runs/:id/clarify` | `ClarifyBody` | 200 `{ runId, status: "queued" }` | 409 jika status bukan `needs_clarification` |
| POST | `/api/runs/:id/approve` | `ApproveBody` | 200 `ApprovalView` | 409 jika status bukan `awaiting_approval` |
| POST | `/api/runs/:id/send` | | 200 `SendResponse` | 403 `{ "error": "Butuh persetujuan dosen" }` |
| POST | `/api/runs/:id/retry` | | 200 `{ runId, status: "queued" }` | 409 jika status bukan `failed` |
| GET | `/api/evidence/:id` | | 200 `EvidenceDetail` | 404 |
| GET | `/api/scorecard` | | 200 `ScorecardResponse` | |

### Perilaku yang dipegang kedua pihak

- Frontend polling `GET /api/runs/:id` setiap 1 detik selama status `queued` atau `running`, lalu berhenti.
- Status menentukan tampilan detail run:

| Status | Tampilan |
| --- | --- |
| `queued`, `running` | Timeline dengan spinner di langkah berjalan |
| `needs_clarification` | Kotak jawab berisi `clarificationQuestion` |
| `awaiting_approval` | Link Brief + tombol Setujui dan Tolak |
| `approved` | Link Brief + tombol kirim undangan SIMULASI, lalu "Undangan terkirim (SIMULASI)" setelah `sentAt` terisi |
| `rejected` | Link Brief dengan keterangan ditolak |
| `failed` | `errorMessage` + tombol Coba lagi |

- `result.noMatch === true` berarti tidak ada kandidat dengan skor ≥ 50. Frontend menampilkan kotak "tidak ada yang memenuhi" dan 3 kandidat terdekat beserta `missingSkills`.
- `reasonSource === "template"` berarti alasan dibuat dari judul bukti karena LLM gagal. Frontend boleh memberi keterangan kecil.
- Chip ID bukti memanggil `GET /api/evidence/:id` dan membuka panel bukti.
- Endpoint tidak pernah mengubah tabel students dan evidence.

### Tambahan: Competition Matching oleh Jaya (aditif, 9 Oktober 2026 malam)

Perubahan ini **hanya menambah** field opsional. Tipe dan endpoint di atas tetap berlaku, jadi kode yang sudah ada tidak rusak.

- `POST /api/runs` dengan `workerId: "jaya"` dan `brief` berisi **teks guidebook lomba** (15–20.000 karakter). `mode` diabaikan; Jaya selalu memakai jalur hemat (v2). PDF belum didukung.
- Jaya memakai **7 nama langkah yang sama** dengan Netra, dengan arti berikut. Kalimat `detail` tiap langkah memakai suara Jaya.

| `step` | Arti untuk Jaya |
| --- | --- |
| `parse` | Membaca guidebook: nama lomba, jumlah anggota, jumlah tim, syarat semester dan prodi, peran tim |
| `normalize` | Memetakan skill tiap peran ke katalog |
| `search` | Eligibility Check: menyaring mahasiswa yang tidak memenuhi syarat, dengan alasan tertulis |
| `score` | Team Builder: menilai kandidat per peran dan menyusun tim |
| `explain` | Menulis alasan berbukti per anggota dan draf undangan seleksi |
| `verify` | Validasi sitasi + Conflict Check |
| `brief` | Usulan tim siap diputuskan |

- `result.candidates` berisi **semua anggota tim yang diusulkan**, urut per tim lalu per peran. `score` adalah skor peran 0–100. Link Brief, chip bukti, Setujui, dan kirim SIMULASI berlaku sama.
- Tambahan di `lib/types.ts`:

```ts
interface ResultCandidate {
  // ...field yang sudah ada
  role?: string;   // hanya Jaya: peran di tim, misalnya "Pengembang Model AI"
  team?: number;   // hanya Jaya: nomor tim, mulai 1
}

interface RunResult {
  // ...field yang sudah ada
  competition?: CompetitionSummary; // hanya ada untuk run Jaya
}

interface CompetitionSummary {
  competitionName: string;
  teamSize: number;
  teamCount: number;
  rules: string[];          // syarat yang dipakai, kalimat siap tampil
  screenedCount: number;    // jumlah mahasiswa yang diperiksa
  eligibleCount: number;
  excluded: { code: string; reasons: string[] }[]; // tersaring + alasan tertulis (AC-14)
  teams: {
    team: number;
    members: { code: string; role: string; roleScore: number }[];
    missingRoles: string[]; // peran yang tidak terisi karena tidak ada kandidat berbukti
  }[];
  conflicts: {
    code: string;
    kind: "double_team" | "research_invite" | "fair_exposure";
    message: string;        // kalimat siap tampil
  }[];
}
```

- `kind: "research_invite"` artinya mahasiswa itu baru disetujui dalam penugasan riset Netra. Ini peringatan, bukan pengecualian.
- `GET /api/worker`: Jaya berstatus `siap` / `bekerja` seperti Netra setelah modul ini di-merge.

## 5. Mock untuk frontend

Rifqi bekerja tanpa menunggu API dengan cara berikut:

- `app/_lib/api.ts` berisi semua fungsi fetch (`getWorkers`, `createRun`, `getRun`, dst.) dengan tipe dari `lib/api-types.ts`.
- Jika `NEXT_PUBLIC_API_MOCK=true` di `.env.local`, fungsi itu membaca `app/_lib/fixtures.ts`, bukan memanggil `/api`.
- Fixture wajib mencakup tujuh status run, satu hasil `noMatch`, kandidat dengan `hiddenTalent` dan `fairExposure`, satu langkah gagal, dan run mock yang bergerak dari `running` ke `awaiting_approval` dalam beberapa detik agar animasi timeline bisa diuji.
- Kode fixture memakai kode mahasiswa tanam (S-101, S-104, S-109, dst.) dan ID bukti berformat `EV-001`.

## 6. Prompt untuk AI coding assistant Rifqi (Frontend)

```
Kamu membantu Rifqi (Frontend Engineer) membangun UI TalentLink Campus untuk PENS Hackathon 2026.
Baca dulu: CLAUDE.md, docs/kontrak-frontend-backend.md, .claude/skills/frontend-design/SKILL.md,
bagian "Kebutuhan UX dan layar" dan "Frontend: aturan anti AI slop" di "PRD — TalentLink Campus.md",
serta bagian "Layar dan alur user" dan "Tim Digital Worker" di spesifikasi MVP.
Ini Next.js 16: baca panduan di node_modules/next/dist/docs/ sebelum memakai API Next.

ATURAN
- Hanya ubah folder milik Rifqi di bagian 2 kontrak. Jangan ubah lib/, app/api/, package.json.
  Jika butuh paket baru, berhenti dan sebutkan paketnya agar Rifqi meminta ke Rofiq.
- Dari lib/ hanya boleh import type. Jangan jalankan git commit, push, atau merge. Jangan baca .env.
- Semua teks UI berbahasa Indonesia yang wajar, ditulis seperti manusia.

LANGKAH 0, WAJIB SEBELUM MENULIS UI APA PUN
Berhenti dan minta Rifqi mengirim inspirasi desain dari Dribbble: 3–5 link beserta screenshot,
disimpan di design/inspiration/. Tanyakan juga bagian mana yang ia sukai dari tiap inspirasi
(warna, tipografi, kepadatan data, gaya kartu, navigasi). JANGAN membuat komponen, halaman,
atau design tokens sebelum inspirasi itu ada dan sudah kamu lihat.

LANGKAH 1, setelah inspirasi diterima
- Analisis inspirasi lalu tulis design/tokens.md: palet netral + aksen maskot tipis
  (Netra indigo, Jaya oranye, Kanca hijau, tanpa gradien), skala tipografi, spacing, radius, bayangan.
  Satu font sans untuk teks dan satu font mono untuk ID bukti dan angka (next/font).
- Terapkan tokens di app/globals.css (Tailwind 4 @theme).
- Tulis .claude/skills/talentlink-ui/SKILL.md: tokens, pola komponen, dan daftar larangan AI slop dari PRD.
- Tunjukkan ringkasan tokens ke Rifqi dan tunggu persetujuannya.

LANGKAH 2, fondasi data
- app/_lib/api.ts dan app/_lib/fixtures.ts sesuai bagian 5 kontrak, tipe dari lib/api-types.ts.

LANGKAH 3, layar (urut, satu per satu; setelah tiap layar tunjukkan ke Rifqi untuk dibandingkan dengan inspirasi)
1. Layout: navigasi Beranda, Beri tugas, Scorecard; label "Digital Worker (AI)".
2. Beranda: Tim Digital Worker (3 kartu: avatar maskot, nama, jabatan, unit, atasan, level, tools, akses,
   status, token terpakai; Jaya dan Kanca "Segera hadir"), progress bar "Token terpakai aplikasi: X / 10.000.000"
   dengan banner kuning di >= 80%, tombol "Beri tugas", daftar run terakhir (gagal ditandai merah + alasan).
   Status kosong: ajakan membuat tugas pertama.
3. Tugas baru: pilih worker (dengan salam worker), textarea brief, 3 contoh brief yang bisa diklik,
   toggle v1/v2, validasi brief < 15 karakter, tombol nonaktif saat mengirim, lalu pindah ke detail run.
4. Detail run: Run Timeline di kiri (langkah, status, durasi, token, model; spinner saat berjalan),
   Link Brief di kanan (kartu kandidat, skor menonjol, alasan dengan chip ID bukti font mono,
   badge Hidden Talent dan Fair Exposure, gap skill, draf undangan yang bisa diedit, tombol Setujui/Tolak),
   panel bukti saat chip diklik (jenis, judul, detail, nilai, tahun, label Sintetis abu-abu).
   Semua status di tabel kontrak harus punya tampilan, termasuk kotak klarifikasi, noMatch, gagal + Coba lagi,
   dan "Undangan terkirim (SIMULASI)" dengan label kuning. Polling 1 detik sesuai kontrak.
   Data harus tetap tampil setelah refresh.
5. Scorecard: tabel v1 vs v2 (precision@3, sitasi valid, token rata-rata, latensi) dan daftar kasus lulus/gagal.
   Status kosong: petunjuk menjalankan npm run eval.

SYARAT SETIAP LAYAR
- Status kosong, memuat, dan error ada. Kontras WCAG AA, fokus keyboard terlihat, ikon Lucide saja.
- Label SIMULASI kuning dan Sintetis abu-abu selalu terlihat tanpa hover.
- Alur demo Beranda -> Tugas baru -> Link Brief -> Setujui selesai dalam 6 klik.
- npm run lint && npm run build lulus.
Setelah tiap layar selesai: berhenti, ringkas perubahan, dan tulis perintah git yang disarankan
(branch feat/ui-*, Conventional Commits berbahasa Indonesia).
```

## 7. Prompt untuk AI coding assistant Rofiq (Backend, lanjutan setelah checkpoint 1)

```
Lanjutkan backend TalentLink Campus. Pipeline di lib/worker/ sudah lolos checkpoint CLI di branch
feat/research-matching. Baca CLAUDE.md, .claude/skills/backend-efisien/SKILL.md, dan
docs/kontrak-frontend-backend.md. Kontrak itu mengikat: bentuk respons harus persis sama.
Ini Next.js 16: baca panduan di node_modules/next/dist/docs/ sebelum menulis Route Handler.

ATURAN
- Hanya ubah lib/, app/api/, scripts/, package.json. Jangan sentuh halaman app/, app/_lib/, components/, design/.
- Jangan jalankan git commit, push, atau merge. Jangan baca .env.
- Validasi Zod di setiap endpoint; pesan error berbahasa Indonesia.

TUGAS
1. Buat lib/api-types.ts persis seperti bagian 4 kontrak. Berhenti dan minta Rofiq meng-commit dan
   merge berkas ini ke master lebih dulu, karena frontend bergantung padanya.
2. Route Handlers di app/api/ sesuai tabel endpoint kontrak, termasuk /send (403 tanpa approval)
   dan /retry. Pipeline berjalan di background dengan after() dari next/server; POST /api/runs
   langsung membalas runId. GET /api/runs/:id harus < 2 detik karena dipolling tiap 1 detik.
   clarificationQuestion diambil dari criteria_json saat status needs_clarification.
   StepView menggabungkan run_steps dengan token_ledger per langkah.
3. Error API CBN (401, 429, timeout, budget habis) menjadi langkah failed dengan errorMessage yang dipahami user.
4. Test dengan LLM_MOCK=true: brief ambigu, tanpa kandidat >= 50, JSON rusak, ID bukti palsu,
   prompt injection S-107, send tanpa approval (403), clarify/approve/retry di status yang salah (409),
   GET ulang setelah selesai mengembalikan data utuh.
5. Uji satu run v2 dan satu run v1 dengan API asli untuk brief yang sama; laporkan token dari ledger
   dan latensi (target v2 < 30 detik).

SELESAI JIKA npm run lint && npm test lulus dan alur buat run -> polling -> approve -> send berjalan via curl.
Berhenti, ringkas perubahan, dan tulis perintah git yang disarankan (branch feat/api-runs).
```

## 8. Checklist integrasi pukul 24.00

- [ ] `master` berisi pipeline, `lib/api-types.ts`, endpoint, dan semua layar.
- [ ] `NEXT_PUBLIC_API_MOCK` dimatikan dan alur demo jalan dengan API asli.
- [ ] Refresh di detail run tidak menghilangkan timeline, Link Brief, dan token.
- [ ] Kirim tanpa approval ditolak dengan pesan "Butuh persetujuan dosen".
- [ ] `npm run lint && npm test && npm run build` lulus di `master`.
