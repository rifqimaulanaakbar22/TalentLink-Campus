# tech.md — TalentLink Campus

Dokumen *usage disclosure* untuk PENS Hackathon 2026, track CBN Digital Campus Worker. Isinya: AI coding assistant yang dipakai, library, template dan boilerplate, serta pekerjaan yang diselesaikan selama event (9–10 Oktober 2026). Gambaran produk ada di [README.md](README.md).

> Bagian bertanda **[konfirmasi tim]** berisi hal yang tidak bisa dipastikan dari repo dan wajib dicek atau dilengkapi tim sebelum submission.

---

## 1. AI coding assistant

### 1.1 Tool yang dipakai

| Tool | Bukti di repo | Dipakai untuk |
| --- | --- | --- |
| **OpenCode** dengan model dari gateway CBN | `opencode.json` sempat ter-commit lalu dihapus dari tracking (commit `52641df`, 9 Okt 17:07). Isinya provider `cbn-hackathon` (`https://litellm-hackathon.digdaya.ai/v1`) dengan model `qwen3-coder-flash`, `qwen3.7-plus`, `qwen3.8-flash`, `qwen3.8-omni-flash`, `deepseek-v4.1-flash` | **[konfirmasi tim]** Siapa yang memakainya, untuk bagian apa, dan berapa token CBN yang terpakai |
| Agent lain yang membaca `AGENTS.md` (mis. Antigravity, disebut di PRD) | `AGENTS.md` berisi aturan proyek untuk AI assistant | **[konfirmasi tim]** Dipakai atau tidak |

### 1.2 Cara AI assistant dikendalikan

Aturan dibuat sekali dan dibaca setiap sesi, supaya AI tidak mengubah arsitektur sembarangan dan konteks tetap kecil (hemat token).

| Lapis | Berkas | Isi |
| --- | --- | --- |
| Instruksi proyek | `AGENTS.md` | Baca PRD dan spesifikasi sebelum mengubah arsitektur; AI **tidak boleh** menjalankan `git commit/push/merge/rebase`, cukup menyarankan perintahnya; pesan commit Conventional Commits berbahasa Indonesia; LLM hanya lewat `lib/llm.ts`; test dulu untuk logika inti; jangan membaca atau menulis `.env`; baca dokumentasi Next.js 16 di `node_modules/next/dist/docs/` sebelum memakai API Next |
| Hook git | `.githooks/commit-msg` | Membuang baris atribusi AI (`Co-Authored-By` dan sejenisnya) dari pesan commit (berlaku untuk semua tool) |

Atribusi AI di pesan commit sengaja dimatikan agar riwayat commit rapi. **Pemakaian AI tetap diungkap lengkap di dokumen ini**, sesuai kewajiban brief.

### 1.3 Skill yang dipasang

| Skill | Sumber | Dipakai untuk |
| --- | --- | --- |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills), dipasang dengan `npx skills add` (tercatat di `skills-lock.json`), lisensi Apache 2.0 | Arah visual yang khas, menghindari tampilan generik AI |
| `talentlink-ui` (skill proyek) | Ditulis tim | Design tokens TalentLink, daftar komponen yang wajib dipakai, istilah UI, larangan "AI slop" |
| `backend-efisien` (skill proyek) | Ditulis tim | Aturan backend: batas panggilan LLM, validasi Zod, query tanpa N+1, rem anggaran, keamanan sesi |

PRD juga merencanakan skill `webapp-testing` (anthropics/skills) dan `test-driven-development` (obra/superpowers), tetapi keduanya **tidak terpasang** di repo.

### 1.4 Pekerjaan yang dibantu AI dan kontrol manusia

| Area | Peran AI | Kontrol manusia |
| --- | --- | --- |
| Dokumen produk (PRD, spesifikasi MVP, kontrak, ERD, dokumen fitur) | Menyusun draf dan memperbarui setelah keputusan tim | Keputusan cakupan dan prioritas oleh tim; riwayat perubahan dicatat di PRD |
| Backend dan pipeline AI (`lib/`, `app/api/`, `scripts/`) | Menulis kode mengikuti spesifikasi, rumus skor, dan skill `backend-efisien` | Rumus skor, prompt, dan aturan anggaran ditetapkan di spesifikasi; diuji dengan unit test dan CLI |
| Frontend (`app/`, `components/`) | Menulis halaman dan komponen mengikuti `talentlink-ui` dan `frontend-design` | Design tokens diekstrak dari inspirasi Dribbble oleh tim; setiap layar dibandingkan dengan inspirasi |
| Test (`lib/**/*.test.ts`) | Menulis test untuk logika inti dan kriteria penerimaan | `npm test` wajib lulus sebelum commit; commit dilakukan manusia |
| Git | Tidak ada; AI hanya menyarankan perintah | Semua commit, merge, dan PR oleh anggota tim |

Setiap anggota diminta membaca dan memahami kode yang dihasilkan AI, karena brief meminta setiap anggota mampu menjelaskan kontribusinya.

---

## 2. Libraries

Versi yang terpasang dari `package-lock.json`:

### 2.1 Dependensi aplikasi

| Library | Versi | Dipakai untuk |
| --- | --- | --- |
| `next` | 16.4.0 | Framework (App Router, Route Handlers, `proxy.ts`, `after()` untuk pipeline di background, `next/font`) |
| `react`, `react-dom` | 19.3.0 | UI |
| `@libsql/client` | 0.18.0 | Akses database SQLite lokal (`file:`) atau Turso, async |
| `drizzle-orm` | 0.45.4 | Definisi skema tabel (`lib/schema.ts`) |
| `zod` | 4.6.5 | Validasi body API dan validasi JSON output LLM |
| `lucide-react` | 1.54.0 | Satu set ikon |
| `better-sqlite3` | 13.0.3 | Driver SQLite awal; **tidak lagi diimpor** sejak migrasi ke libSQL, tetapi masih tercantum di `package.json` dan `next.config.ts` |

### 2.2 Dependensi pengembangan

| Library | Versi | Dipakai untuk |
| --- | --- | --- |
| `typescript` | 5.9.3 | Bahasa seluruh repo |
| `tailwindcss`, `@tailwindcss/turbopack` | 4.3.3 | Styling; design tokens di `app/globals.css` (`@theme`) |
| `vitest` | 5.0.3 | Unit dan integration test (99 test) |
| `tsx` | 4.23.15 | Menjalankan `scripts/seed.ts` dan `scripts/cli.ts` |
| `drizzle-kit` | 0.31.11 | `npm run db:studio` |
| `eslint`, `eslint-config-next` | 9.39.5, 16.4.0 | Lint |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/better-sqlite3` | | Tipe TypeScript |

### 2.3 Yang sengaja dibangun tanpa library

| Kebutuhan | Implementasi | Alasan |
| --- | --- | --- |
| Klien LLM | `fetch` langsung ke `/chat/completions` di `lib/llm.ts` | Satu pintu untuk pencatatan token, rem anggaran, retry, dan mode mock; tanpa SDK |
| Hash kata sandi dan token sesi | `crypto.scrypt`, `randomBytes`, SHA-256 bawaan Node | Tanpa dependensi baru |
| Sesi login | Tabel `sessions` + cookie httpOnly | Logout benar-benar mencabut sesi di server; tanpa secret tambahan |
| Data sintetis | PRNG `mulberry32` ber-seed tetap di `lib/seed.ts` | Seed deterministik untuk eval |
| Grafik Neraca Token | Komponen React + CSS | Tanpa library grafik |

### 2.4 Layanan eksternal

| Layanan | Dipakai untuk |
| --- | --- |
| API CBN (gateway LiteLLM kompatibel OpenAI) | LLM aplikasi: `qwen3.8-flash` untuk parse, `qwen3.7-plus` untuk explain |
| Google Fonts lewat `next/font` | Font Outfit (teks) dan JetBrains Mono (ID bukti dan angka) |
| Turso (opsional) | Database terkelola untuk deploy Vercel; belum dipakai di demo |

---

## 3. Templates and boilerplate

| Template / sumber | Yang diambil | Lokasi |
| --- | --- | --- |
| `create-next-app` (Next.js 16, TypeScript, Tailwind, App Router, ESLint) | Kerangka proyek, konfigurasi TypeScript dan ESLint, aset bawaan `public/*.svg`, `app/favicon.ico` | Commit `020ab36` |
| Blok aturan agent Next.js | Blok `BEGIN:nextjs-agent-rules` di `AGENTS.md` ditulis otomatis oleh `next dev` | `AGENTS.md` |
| Inspirasi Dribbble (5 tangkapan layar) | Hanya acuan visual, bukan kode: palet, tipografi, radius, bayangan, tata letak login terbelah dua | `design/inspiration/`, diringkas di `design/tokens.md` |
| Skill `frontend-design` (anthropics/skills) | Panduan desain untuk AI assistant | Folder skill proyek |
| Maskot Netra dan Jaya | SVG dibuat untuk proyek ini | `public/mascots/` |

Tidak ada template UI berbayar, starter kit dashboard, atau library komponen (seperti shadcn/ui) yang dipakai. Komponen dasar (`Card`, `Button`, `Badge`, `InputField`, `EvidenceChip`, dan lainnya) ditulis sendiri di `components/ui/`.

---

## 4. Work completed during the event

Waktu dalam WIB, diambil dari riwayat commit. Event berjalan 9 Oktober 2026 sore sampai 10 Oktober 2026 pagi.

### 4.1 Linimasa

| Waktu | Pekerjaan | Oleh |
| --- | --- | --- |
| 9 Okt 17.04–17.18 | Inisialisasi repo dari `create-next-app`, hook `commit-msg`, `AGENTS.md`, PRD, dan spesifikasi MVP | Rifqi |
| 9 Okt 18.08 | Skill `frontend-design` dan `backend-efisien` dipasang | Rifqi |
| 9 Okt 18.08 | **Checkpoint 1:** pipeline Research Matching (parse → normalize → search → score → explain → verify → brief), skema DB, seed dengan profil tanam, `lib/llm.ts` + Token Ledger, unit test skor dan verifikasi, CLI shortlist berbukti | Rofiq |
| 9 Okt 18.32 | Kontrak kerja frontend–backend | Rifqi |
| 9 Okt 21.38–21.53 | Design tokens dari inspirasi, skill `talentlink-ui`, komponen dasar, lapisan data dan mode mock, layout dan maskot, Beranda tim Digital Worker, form Tugaskan, Detail penugasan (jejak kerja, Link Brief, panel bukti), dokumen bisnis | Rifqi |
| 9 Okt 22.12 | Tipe kontrak API, ERD, endpoint runs, approval, kirim SIMULASI, bukti, worker | Rofiq |
| 9 Okt 22.35–22.48 | Perbaikan: thinking Qwen dimatikan agar explain < 30 detik, Token Ledger bertahan saat seed ulang, alias skill | Rofiq |
| 9 Okt 23.24–10 Okt 00.04 | **Competition Matching Jaya:** kontrak aditif, UI Jaya, parser guidebook, Eligibility Check, Team Builder, Conflict Check | Rofiq |
| 10 Okt 00.51–00.56 | **Login dan logout** (tabel `users`/`sessions`, scrypt, proteksi semua API, halaman login, akun demo), PR #1 | Rifqi |
| 10 Okt 02.14–02.17 | **Neraca Token dan Jalur Hemat** (laporan token, rem anggaran 409, pilihan jalur di form, halaman `/tokens`), PR #2 | Rifqi |
| 10 Okt 03.06–03.39 | Skill di luar katalog dihentikan lebih awal, jawaban klarifikasi pendek diterima, komposisi Beranda dan Tugaskan | Rofiq |
| 10 Okt 04.31 | Migrasi database ke `@libsql/client` (siap Turso), panduan deploy Vercel, template env, naskah presentasi | Rofiq |
| 10 Okt 06.02 | Test disesuaikan dengan akses database async | Rifqi |
| 10 Okt 07.06–07.07 | Gaya retro arcade (tombol 3D, kartu terangkat, muncul saat scroll) dan dock navigasi HP | Rifqi |
| 10 Okt | README dan `tech.md`; verifikasi ulang: 99/99 test, lint, dan type-check lulus | Tim |

### 4.2 Yang selesai

- **Netra (Research Matching)** end-to-end dari UI dan CLI: klarifikasi brief ambigu, skor di kode, Hidden Talent, Fair Exposure, alasan berbukti dengan verifikasi ID, fallback template, Link Brief, Approval Gate, kirim SIMULASI.
- **Jaya (Competition Matching)**: ekstraksi syarat dari teks guidebook, Eligibility Check dengan alasan tertulis, Team Builder, Conflict Check lintas unit.
- **Platform Digital Worker**: kartu pegawai, jejak kerja yang diperbarui saat berjalan, riwayat penugasan yang bertahan setelah refresh, panel bukti, Token Ledger.
- **Login/logout** dengan sesi di database dan akun demo sintetis.
- **Neraca Token dan Jalur Hemat** dengan rem anggaran di server.
- **Penanganan kegagalan**: brief ambigu, tanpa kandidat, JSON rusak, ID bukti palsu, prompt injection, kirim tanpa persetujuan, error API CBN (401, 429, timeout) tampil sebagai langkah gagal dengan tombol coba lagi.
- **99 test otomatis**; uji `curl` dan Playwright manual untuk login dan Neraca Token.
- Uji dengan API CBN asli: Jalur Hemat 2.109 token vs Jalur Pembanding 15.608 token untuk brief yang sama (sekitar 86% lebih hemat), satu penugasan Netra sekitar 17 detik.

### 4.3 Yang belum selesai

| Item | Status |
| --- | --- |
| Skrip `npm run eval` (12 kasus, precision@3, sitasi valid, v1 vs v2) dan `eval/results.md` | Belum dibuat |
| Smoke test Playwright di `tests/e2e/` | Uji dijalankan manual; skrip belum di-commit |
| Halaman Scorecard/Rapor | Ditunda dari UI MVP (keputusan tim) |
| Digital Worker Kanca (Career Readiness) | Dikeluarkan dari cakupan; roadmap |
| Membersihkan dependensi `better-sqlite3` yang tidak terpakai | Belum |

---

## 5. Token usage (AI coding assistant)

Token API CBN yang dipakai **aplikasi** tercatat otomatis di tabel `token_ledger` dan terlihat di halaman Neraca Token (lihat [README bagian 8](README.md#8-token-usage)).

Token yang dipakai **AI coding assistant** tidak tercatat di Token Ledger. Lengkapi tabel ini sebelum submission:

| Tool | Sumber token | Perkiraan pemakaian |
| --- | --- | --- |
| OpenCode (provider `cbn-hackathon`) | Token CBN dari gateway LiteLLM, satu alokasi dengan aplikasi **[konfirmasi tim]** | **[konfirmasi tim: angka dari dashboard pemakaian CBN, jika ada]** |

Catatan: jika OpenCode memakai key CBN yang sama dengan aplikasi, token coding assistant ikut mengurangi alokasi 10.000.000 tetapi **tidak** muncul di Neraca Token, karena Neraca hanya membaca Token Ledger aplikasi.
