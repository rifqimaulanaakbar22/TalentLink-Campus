# Penyesuaian mockup terhadap audit integrasi

Tanggal: 9 Oktober 2026 · Oleh: Rifqi (frontend) · Branch: `feat/ui-development`

Mockup frontend disesuaikan dengan hasil audit integrasi frontend–backend. Tujuannya: saat mode mock dimatikan dan API backend tersambung, tampilan tidak berubah perilaku.

> **Tidak ada perubahan backend, kontrak API, atau ERD.** Semua perubahan ada di `app/_lib/`, `components/app/`, dan dokumen ini. `lib/`, `scripts/`, skema database, dan `package.json` tidak disentuh.

## 1. Data mock sekarang berasal dari pipeline backend

Sebelumnya data mock ditulis tangan sehingga ID bukti dan skornya tidak sama dengan seed (contoh: S-106 di mock memakai EV-465, di seed EV-468). Sekarang `app/_lib/mock-fixtures.json` dibangkitkan dari `lib/worker/run.ts` dengan `LLM_MOCK=true` pada seed standar.

| Skenario | Brief contoh | Hasil dari pipeline |
| --- | --- | --- |
| `cv` | Python dan Computer Vision | S-101 (100), S-102, S-103, S-109 (Fair Exposure), S-104 (90, Hidden Talent) |
| `iot` | IoT dan ESP32 | S-106 (100, Hidden Talent), S-075, S-073, S-028, S-060 |
| `nlp` | NLP dan Python | S-031, S-013, S-033, S-016, S-029 |
| `lowmatch` | Unity, NLP, ESP32, Public Speaking | Tidak ada skor ≥ 50; 3 kandidat terdekat S-074, S-010, S-007 |
| `unknown` | Skill di luar katalog, misalnya blockchain | 0 kandidat, mengikuti jalur kode `run.ts` (dirakit manual karena mock parse backend mengubahnya jadi klarifikasi) |

Yang diambil apa adanya dari backend: kandidat, skor, Hidden Talent, Fair Exposure, `missingSkills`, alasan dan `evidence_ids`, detail bukti (dari tabel evidence, students, skills), dan teks jejak kerja tiap langkah.

Yang disesuaikan agar mirip keluaran LLM asli: topik dan draf undangan diringkas, karena mock parse backend memakai brief utuh sebagai topik. Angka token per langkah adalah perkiraan dari PRD, karena mock backend mencatat 0 token.

## 2. Perilaku mock disamakan dengan backend

| Perilaku | Backend (`lib/worker/run.ts`) | Mockup sekarang |
| --- | --- | --- |
| Skill di luar katalog | 0 kandidat, explain dilewati, `noMatch: true` | Sama; tampil pesan "Belum ada mahasiswa dengan bukti" + tombol Ubah kebutuhan + Tutup tanpa mengundang |
| Tidak ada skor ≥ 50 | 3 kandidat terdekat | Sama (skenario `lowmatch`) |
| Mode v1 | Langkah skor dilewati, `score: null`, Hidden Talent tidak dihitung | Sama; kartu menulis "Tanpa skor; diurutkan AI" |
| Coba lagi setelah gagal | Parse tidak diulang karena kriteria sudah tersimpan | Sama |
| Pesan 429 | "Batas permintaan API CBN tercapai, coba lagi sebentar" | Sama |
| Persen budget | 0–100, satu desimal (`getTokenUsage`) | Sama |
| Teks langkah berjalan | Dari `steps.start(...)` | Sama |

## 3. Temuan audit yang diperbaiki di frontend

| Temuan | Perbaikan |
| --- | --- |
| Alasan template berisi "[EV-449]" sekaligus chip EV-449 | Teks "[EV-…]" dibuang di tampilan; ID tetap tampil sebagai chip |
| "Berikut 0 kandidat terdekat" | Kasus 0 kandidat punya tampilan sendiri dengan arahan |
| Tidak ada data dibedakan dari tidak punya kompetensi | Label "Belum ada bukti di data kampus" untuk `missingSkills` (dihitung kode), "Catatan Netra (AI)" untuk `gaps` (ditulis AI), plus kalimat penjelas di atas daftar kandidat |
| Belum ada pernyataan bahwa rekomendasi bukan keputusan final | "Rekomendasi ini bahan pertimbangan; keputusan tetap di tangan Anda." di kepala Link Brief |
| Skor null di v1 tampil "–" tanpa penjelasan | Diganti "Tanpa skor; diurutkan AI" |

## 4. Usulan perilaku API untuk Rofiq (belum ada di backend)

Mockup mengasumsikan perilaku ini. Mohon dikonfirmasi atau dikoreksi saat membuat Route Handler:

- **`POST /api/runs/:id/clarify`**: jawaban ditambahkan ke `runs.brief_text` sebagai `"\n\nJawaban klarifikasi: …"`, lalu `runResearchMatching` dijalankan ulang. Halaman detail memecah brief di penanda itu untuk menampilkan jawaban dosen.
- **`POST /api/runs/:id/retry`**: cukup panggil `runResearchMatching` lagi; `criteria_json` yang tersimpan membuat parse dilewati. Baris `run_steps` lama boleh tetap ada; frontend menampilkan baris terakhir per nama langkah.
- **`GET /api/runs/:id`**: token per langkah dari `token_ledger` di-join per `(run_id, step)`. Retry explain tercatat dengan step `verify`.

## 5. Yang belum diubah karena butuh keputusan tim

Lihat bagian I laporan audit. Tidak dikerjakan di mockup:

- Fallback kandidat terdekat saat skill di luar katalog (perlu ubah `run.ts`; terkait AC-08).
- Rincian skor per skill di kartu kandidat (perlu field baru di `RunResult`).
- Statistik sitasi untuk halaman Rapor yang sekarang ditunda (perlu field baru di `RunResult`).

## 6. Cara membangkitkan ulang `mock-fixtures.json`

Jalankan jika seed atau pipeline berubah. Pakai database sementara agar `data/talentlink.db` tidak tertimpa.

```bash
export DATABASE_PATH=/tmp/fixtures.db LLM_MOCK=true
npm run seed
npx tsx gen-fixtures.mts app/_lib/mock-fixtures.json
```

Isi `gen-fixtures.mts` (simpan di luar repo atau di folder sementara):

```ts
import fs from "node:fs";
import { getSqlite } from "./lib/db";
import { createRun, runResearchMatching } from "./lib/worker/run";

const out = process.argv[2];
const db = getSqlite();
const briefs: Record<string, string> = {
  cv: "Butuh 2 mahasiswa Python dan Computer Vision untuk riset deteksi objek",
  iot: "Butuh mahasiswa IoT dan ESP32 untuk riset pemantauan kualitas air",
  nlp: "Butuh mahasiswa NLP dan Python untuk riset analisis sentimen",
  lowmatch: "Butuh mahasiswa Unity, NLP, ESP32 dan Public Speaking untuk riset",
};
const scenarios: Record<string, unknown> = {};
const ids = new Set<string>();
for (const [key, brief] of Object.entries(briefs)) {
  const id = createRun({ brief, mode: "v2" });
  const status = await runResearchMatching(id);
  const run = db.prepare("SELECT result_json FROM runs WHERE id = ?").get(id) as { result_json: string };
  const steps = db.prepare("SELECT step, status, detail FROM run_steps WHERE run_id = ? ORDER BY id").all(id);
  const result = JSON.parse(run.result_json);
  for (const c of result.candidates) for (const e of c.evidenceIds) ids.add(e);
  scenarios[key] = { status, result, steps };
}
const evStmt = db.prepare(
  `SELECT e.id, e.type, e.title, e.detail, e.grade, e.year, e.source_label AS sourceLabel, s.code AS studentCode,
          (SELECT json_group_array(k.name) FROM evidence_skills es JOIN skills k ON k.id = es.skill_id
           WHERE es.evidence_id = e.id) AS skills
   FROM evidence e JOIN students s ON s.id = e.student_id WHERE e.id = ?`,
);
const evidence: Record<string, unknown> = {};
for (const id of [...ids].sort()) {
  const row = evStmt.get(id) as Record<string, unknown> & { skills: string };
  evidence[id] = { ...row, skills: JSON.parse(row.skills) };
}
const active = (db.prepare("SELECT count(*) AS n FROM students WHERE status = 'aktif'").get() as { n: number }).n;
fs.writeFileSync(out, JSON.stringify({ activeStudents: active, scenarios, evidence }, null, 2));
```

## 7. Pengujian

- `npx tsc --noEmit`, `npm run lint`, `npm test`: lulus.
- Uji alur Playwright (di luar repo, mode mock): 20 cek lulus, termasuk ID bukti tidak tampil ganda, 0 kandidat untuk skill di luar katalog, 3 kandidat terdekat, mode v1 tanpa skor, coba lagi tanpa mengulang parse, dan tanpa scroll horizontal di layar 390 px.
- Belum diuji: API backend sungguhan (Route Handler belum ada) dan API CBN asli.
