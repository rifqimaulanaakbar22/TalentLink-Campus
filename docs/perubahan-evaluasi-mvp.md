# Perubahan: Evaluasi disederhanakan menjadi "Rapor Netra"

> **Status 9 Oktober 2026 malam: halaman Rapor dihapus sementara dari UI** (lihat `docs/perubahan-cakupan-netra-jaya.md`). Dokumen ini disimpan sebagai rancangan jika Rapor dikembalikan setelah MVP.

Tanggal: 9 Oktober 2026 · Oleh: Rifqi (frontend) · Branch: `feat/ui-development`

> **Peringatan untuk Rofiq dan Reyhan.** Perubahan di dokumen ini baru menyentuh frontend. Backend, skema database, dan kontrak API **tidak diubah**. Tetapi beberapa ide di bagian 4 **bisa mengubah ERD** (`database-erd.md`) jika nanti disetujui. Jangan ubah skema sebelum dibahas bersama.

## 1. Apa yang berubah

Halaman Scorecard diganti menjadi **Rapor Netra** (menu "Rapor"). Istilah metrik teknis diganti empat pertanyaan yang dijawab "Terpenuhi" atau "Belum":

| Dulu (istilah teknis) | Sekarang (pertanyaan) | Syarat terpenuhi |
| --- | --- | --- |
| Precision@3 | Apakah Netra memilih mahasiswa yang tepat? Ditulis "9 dari 10 kandidat teratas memang tepat" | Minimal 8 dari 10 (precision@3 ≥ 0,8) |
| Sitasi valid | Apakah setiap alasan punya bukti? | Semua alasan (100%) |
| Token rata-rata v1 vs v2 | Apakah hemat biaya AI? | Token mode hemat lebih kecil dari mode pembanding |
| Latensi rata-rata | Apakah cukup cepat? | Kurang dari 30 detik |

Ringkasan di atas halaman berbunyi "Netra lulus X dari 12 soal uji". Daftar soal uji tetap ada, tanpa tabel perbandingan v1 vs v2 dan tanpa glosarium istilah.

Yang dihapus dari tampilan: tabel v1 vs v2, kotak "Cara membaca", kartu "Pengembangan kemampuan". Syarat naik ke L3 sekarang cukup ditulis "lulus semua syarat di Rapor Netra" di kartu pegawai.

## 2. Dampak ke backend: tidak ada

- **Kontrak API tetap.** `GET /api/scorecard` masih mengembalikan `ScorecardResponse` yang sama (bagian 4 `docs/kontrak-frontend-backend.md`). Frontend hanya menghitung ulang cara menampilkan angkanya.
- **Berkas eval tetap.** `eval/results.json` dari `npm run eval` tetap memakai field `v1`, `v2` (precisionAt3, validCitationRate, avgTokens, avgLatencyMs, runs) dan `cases`.
- **Tidak ada berkas backend yang disentuh.** `lib/`, `app/api/`, `scripts/`, skema Drizzle, dan `package.json` tidak berubah.
- **Route tetap `/scorecard`.** Hanya label menu dan judul halaman yang berganti.

Syarat untuk Reyhan: setiap `cases[].title` dan `cases[].note` ditulis dalam bahasa sehari-hari, karena sekarang tampil apa adanya ke juri. Contoh: "Brief ambigu membuat Netra bertanya balik", bukan "AC-07 needs_clarification".

## 3. Perubahan frontend lain yang perlu diketahui backend

Semua ini tetap memakai endpoint yang ada di kontrak:

| Perubahan | Endpoint yang dipakai | Catatan untuk backend |
| --- | --- | --- |
| Tombol "Setujui dan undang" memanggil approve lalu send berurutan | `POST /approve` lalu `POST /send` | `/send` tetap wajib menolak 403 tanpa approval |
| Form tugas hanya untuk Netra, mode v1 jadi centang "mode pembanding" | `POST /api/runs` | Body tetap `{ workerId, brief, mode }` |
| Kartu pegawai menampilkan ID pegawai, knowledge base, hak akses | Tidak ada; data statis di `app/_lib/worker-profile.ts` | Boleh dipindah ke `lib/workers.json` nanti (lihat 4b) |
| Istilah UI: penugasan, jejak kerja, rapor | Tidak ada | Pesan error dari API sebaiknya memakai istilah yang sama |

## 4. Ide lanjutan yang **bisa mengubah ERD** (belum dikerjakan)

Hanya dikerjakan jika tim setuju setelah checkpoint 24.00.

| Ide | Kenapa berguna | Dampak ke ERD / kontrak |
| --- | --- | --- |
| a. Simpan hasil eval di database, bukan `eval/results.json` | Riwayat rapor dari waktu ke waktu | **Tabel baru** `eval_runs` (id, created_at, mode, precision_at_3, valid_citation_rate, avg_tokens, avg_latency_ms) dan `eval_cases` (eval_run_id, case_id, title, pass, note). Endpoint `/api/scorecard` berubah sumber datanya |
| b. Profil kerja worker dari backend | Satu sumber data untuk kartu pegawai | **Tanpa tabel baru** jika ditambahkan ke `lib/workers.json`; tipe `WorkerCard` di kontrak bertambah `employeeId`, `knowledgeBase`, `access` |
| c. Riwayat tingkat kemampuan worker (L1 → L2 → L3) | Bukti siklus hidup ala CBN | **Tabel baru** `worker_levels` (worker_id, level, decided_by, decided_at, reason) |
| d. Statistik sitasi per penugasan | Rapor bisa menghitung "alasan dibuang" dari data asli | **Tanpa tabel baru**; field `citationStats` di `runs.result_json`, tetapi `RunResult` di `lib/types.ts` berubah |
| e. Rapor dari pemakaian nyata: tingkat persetujuan dosen | KPI bisnis yang mudah dipahami pimpinan | **Tanpa tabel baru**; dihitung dari tabel `approvals`. Kontrak `/api/scorecard` bertambah field |

Rofiq: tolong cocokkan daftar ini dengan `database-erd.md` (berkas itu belum ada di repo frontend). Jika salah satu ide disetujui, ubah ERD dan kontrak dulu, kabari Rifqi, baru ubah kode.

## 5. Berkas yang berubah

- `app/scorecard/page.tsx`: halaman Rapor Netra.
- `components/app/nav.tsx`: label menu "Rapor".
- `components/app/task-form.tsx`, `app/_lib/worker-profile.ts`: teks yang merujuk rapor.
- `.claude/skills/talentlink-ui/SKILL.md`: istilah "Rapor Netra".
- `docs/perubahan-evaluasi-mvp.md`: dokumen ini.
