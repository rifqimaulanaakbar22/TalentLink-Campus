# Perubahan: cakupan MVP hanya Netra dan Jaya, halaman Rapor ditunda

Tanggal: 9 Oktober 2026 malam · Oleh: Rifqi (frontend) · Branch: `feat/ui-development`

> **Untuk Rofiq dan Reyhan.** Perubahan ini hanya menyentuh frontend dan dokumen. Backend, skema database, dan kontrak API **tidak diubah dan tidak wajib diubah**. Bagian 3 berisi pembersihan backend yang boleh dikerjakan nanti, jika tim setuju.

## 1. Keputusan

| Keputusan | Akibat |
| --- | --- |
| Digital Worker **Kanca** dan modul Career Readiness dikeluarkan dari cakupan | Tim Digital Worker di MVP: Netra (bertugas) dan Jaya (dalam pelatihan). Kanca menjadi roadmap |
| Halaman **Rapor/Scorecard** dihapus dari UI untuk sementara | Hasil eval v1 vs v2 tetap dibuat lewat `npm run eval` dan ditampilkan di `eval/results.md`, README, dan slide |
| PRD diperbarui | Lihat "Riwayat perubahan" di akhir PRD |

**Risiko yang diterima:** kriteria juri AI token efficiency (15%) tidak lagi punya halaman di aplikasi. Mitigasinya, tabel v1 vs v2 dari skrip eval wajib ada di README dan slide.

## 2. Perubahan frontend

| Berkas | Perubahan |
| --- | --- |
| `app/scorecard/page.tsx` | Dihapus; rute `/scorecard` tidak ada lagi |
| `components/app/nav.tsx` | Menu "Rapor" dihapus; navigasi tinggal Tim dan Tugaskan |
| `app/_lib/api.ts` | Fungsi `getScorecard` dihapus; frontend tidak lagi memanggil `/api/scorecard` |
| `app/_lib/fixtures.ts` | Data Kanca dan contoh hasil eval dihapus |
| `app/_lib/worker-profile.ts` | Profil Kanca dihapus; konstanta `DISPLAYED_WORKERS = ["netra", "jaya"]` |
| `app/page.tsx` | Daftar "Dalam pelatihan" hanya menampilkan worker di `DISPLAYED_WORKERS`, sehingga data Kanca dari backend diabaikan |
| `components/app/mascot.tsx`, `worker-badge.tsx` | Aman jika menerima worker di luar cakupan |
| `public/mascots/kanca.svg`, warna `--color-kanca` | Dihapus |
| `components/app/task-form.tsx` | Teks mode pembanding tidak lagi merujuk Rapor |

Tipe di `app/_lib/types.ts` (salinan kontrak) **tidak diubah**, termasuk `ScorecardResponse` dan `WorkerId` yang masih memuat `"kanca"`, supaya tetap sama dengan kontrak dan `lib/types.ts`.

## 3. Dampak ke backend dan ERD

**Tidak ada yang rusak.** Frontend menyaring Kanca sendiri, dan endpoint `/api/scorecard` hanya tidak dipanggil.

Pembersihan opsional, kerjakan hanya jika disepakati:

| Lokasi backend | Isi sekarang | Opsi | Dampak ERD |
| --- | --- | --- | --- |
| `lib/workers.json` | Ada entri `kanca` | Hapus entri | Tidak ada |
| `lib/types.ts` | `WorkerId = "netra" \| "jaya" \| "kanca"` | Hapus `"kanca"` | Tidak ada; kontrak dan `app/_lib/types.ts` ikut disesuaikan |
| `lib/schema.ts` | Enum `worker_id` memuat `"kanca"` | Hapus nilai enum | DDL di `lib/db.ts` tidak punya CHECK untuk `worker_id`, jadi **tidak perlu migrasi**. Cukup perbarui teks ERD jika ERD mencantumkan nilai `worker_id` |
| `lib/llm.ts` | `byWorker` memuat `kanca` | Ikuti perubahan `WorkerId` | Tidak ada |
| `GET /api/scorecard` di kontrak | Masih ada | Boleh tidak dibuat untuk MVP | Tidak ada; skrip eval tetap menulis `eval/results.json` dan `eval/results.md` |

Rofiq: tolong cocokkan dengan `database-erd.md`. Jika ERD menyebut Kanca, Career Readiness, atau tabel survei karier, tandai sebagai roadmap.

## 4. Yang tetap

- Pipeline Research Matching, rumus skor, verifikasi, seed, dan profil tanam.
- Kontrak endpoint utama: worker, runs, run detail, clarify, approve, send, retry, evidence.
- Jaya tetap tampil "Dalam pelatihan" sampai Competition Matching selesai.
- Mode pembanding v1 tetap ada di form, karena dipakai untuk mengukur token.
