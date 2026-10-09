---
name: talentlink-ui
description: Design system TalentLink Campus. Pakai setiap kali membuat atau mengubah halaman di app/, komponen di components/, atau styling apa pun.
---

# TalentLink UI

Tema diambil dari `design/inspiration/` (dashboard biru langit yang lembut). Nilai lengkap dan alasannya ada di `design/tokens.md`. Tokens sudah tersedia sebagai kelas Tailwind dari `app/globals.css`.

## Pakai komponen yang sudah ada

| Kebutuhan | Komponen |
| --- | --- |
| Kartu putih | `Card` (`components/ui/card.tsx`), judul kartu `CardHeader` |
| Kartu sorotan bergaris biru | `Card variant="highlight"`, maksimal satu per layar |
| Kartu biru penuh dengan pola sirkuit | `Card variant="feature"`, maksimal satu per layar |
| Tombol | `Button` / `ButtonLink`, varian `primary`, `secondary`, `ghost`, `inverse`, `danger` |
| Label status | `Badge` dengan tone; `SimulasiBadge`, `SintetisBadge` |
| Ikon di lingkaran | `IconBubble` |
| Angka besar | `StatTile` |
| Progress | `ProgressBar` (wajib `label` untuk pembaca layar) |
| Kosong / memuat / error | `EmptyState`, `LoadingRows`, `Skeleton`, `ErrorState` (dengan `onRetry`) |
| Textarea | `TextAreaField` (label menempel di garis atas) |
| Input satu baris | `InputField` (`components/ui/input-field.tsx`): label di garis atas, ikon di depan, slot `trailing` untuk tombol |
| Chip ID bukti | `EvidenceChip` (font mono) |
| Judul halaman | `PageHeader` (`components/app/page-header.tsx`) |
| Kartu pegawai worker | `WorkerBadge`, `TraineeRow` (`components/app/worker-badge.tsx`) |
| Kerangka aplikasi | `AppShell` (`components/app/app-shell.tsx`); halaman di `BARE_PAGES` (misalnya `/login`) tampil tanpa kerangka |
| Pengguna yang login | `UserMenu` di bar atas: inisial, nama, peran, tombol Keluar |
| Pilihan jalur kerja | `PathPicker` (Netra) dan `FixedPath` (Jaya) di `components/app/path-picker.tsx`; teks dan perkiraan di `app/_lib/token-path.ts` |
| Bagian Neraca Token | `BudgetCard`, `SavingsCard`, `RunTokenBars`, `WorkerShare`, `StepShare` di `components/app/neraca-token.tsx`. Tidak ada bagian "Aturan anggaran" atau kartu simulasi anggaran |
| Maskot worker | `Mascot` |
| Status run | `RunStatusBadge` |

Data selalu lewat `app/_lib/api.ts` dan state lewat `useApi` (`app/_lib/use-api.ts`). Label teks status ada di `app/_lib/format.ts`.

## Kelas token

- Latar: `bg-canvas` (luar), `bg-panel` (panel aplikasi, gelembung ikon), `bg-surface` (kartu).
- Teks: `text-ink`, `text-ink-muted`. `text-ink-subtle` hanya untuk placeholder dan dekorasi.
- Brand: `brand-500` untuk dekorasi (ikon, ring, progress). `brand-600` untuk tombol dan latar teks putih. `brand-700` untuk teks tautan dan chip.
- Status: `success`, `danger`, `warning`, masing-masing punya pasangan `-bg`.
- Label wajib: `simulasi` (kuning) dan `sintetis` (abu-abu), selalu terlihat tanpa hover.
- Badge kandidat: `hidden` (Hidden Talent), `fair` (Fair Exposure).
- Warna worker `netra` dan `jaya` hanya sebagai cincin atau garis tipis, tidak pernah sebagai latar luas. Cakupan MVP hanya Netra dan Jaya (`DISPLAYED_WORKERS` di `app/_lib/worker-profile.ts`).
- Bentuk: `rounded-card` (20px), `rounded-panel` (32px), `rounded-field` (12px), `rounded-full` untuk tombol, chip, badge.
- Bayangan: `shadow-card` di kartu biasa, `shadow-glow` hanya di kartu sorotan.
- Font: `font-sans` (Outfit) untuk teks, `font-mono` (JetBrains Mono) untuk ID bukti, kode mahasiswa, token, durasi, skor.

## Skala teks

- Judul halaman: `PageHeader` (32/40 semibold).
- Judul bagian: `text-xl leading-7 font-semibold`.
- Judul kartu: `text-lg font-medium`.
- Isi: `text-[15px] leading-5.5`.
- Kecil: `text-[13px] leading-4.5 text-ink-muted`.
- Badge: `text-xs`.

## Tata letak

- Satu layar memakai susunan bento: ukuran kartu berbeda, jarak `gap-5`, bagian dipisah `mt-10`.
- Grid mulai satu kolom di layar kecil, dua kolom di `sm`, tiga kolom di `lg`. Cek angka besar tidak terpotong di lebar 768.
- Rail navigasi tampil mulai `md`; di bawahnya navigasi pill di top bar.

## Halaman login

- Inspirasi `design/inspiration/05-login-split.jpg`: kartu terbelah dua di tengah kanvas abu-abu. Panel kiri `bg-brand-600 pattern-circuit` (bukan foto, bukan gradien); panel kanan form putih.
- Judul "Selamat datang" besar memakai `text-brand-600`, bukan biru terang inspirasi (kontras gagal).
- Tanpa tombol Google atau media sosial. Pemisah "atau pakai akun demo" diikuti kartu akun demo berlabel Sintetis.
- Pesan login gagal selalu "Email atau kata sandi salah." (jangan bocorkan email mana yang terdaftar).
- Setelah login atau saat sesi berakhir, pakai navigasi penuh agar layout membaca ulang sesi.

## Neraca Token dan Jalur Hemat

- Halaman `/tokens`. Satu elemen mencolok: kartu Anggaran token (`Card variant="feature"`). Kartu lain tenang.
- Status anggaran dari `budgetStatus()`: Aman (hijau), Menipis (kuning, 80%), Berhenti (merah, 95%). Banner kuning atau merah selalu menyertakan tautan ke Neraca Token.
- Warna jalur di grafik: Jalur Hemat `bg-brand-500`, Jalur Pembanding `bg-ink-subtle`. Jangan memakai warna status untuk jalur.
- Angka token selalu `font-mono` dengan `formatNumber`. Tulis temuan sebagai kalimat ("Jalur Hemat memakai 80% lebih sedikit token…"), bukan stat tile.
- Kartu jalur yang dikunci memakai `disabled` pada radio dan badge "Dikunci"; jangan menyembunyikan pilihannya.
- Kartu grafik di samping kolom kartu kecil memakai `flex flex-col` dan grid tanpa `items-start`, dengan area grafik `flex-1`, agar tingginya seimbang dan tidak menyisakan ruang kosong.

## Bahasa bisnis (mengikuti konsep CBN Digital Worker)

Pakai istilah ini di UI, bukan istilah sistem:

| Istilah sistem | Tulis di UI |
| --- | --- |
| run | penugasan |
| Run Timeline | Jejak kerja Netra |
| Scorecard | Ditunda dari UI MVP. Jika dikembalikan: "Rapor Netra", hasil ditulis sebagai pertanyaan ya/belum |
| mode v2 / v1 | Jalur Hemat / Jalur Pembanding (`PATH_COPY` di `app/_lib/token-path.ts`) |
| token usage, budget | Neraca Token, anggaran token, sisa anggaran |
| unit, melapor_ke | penempatan, atasan ("LPPM, melapor ke Kepala LPPM") |
| level | tingkat kemampuan (L1 Asisten, L2 Analis, L3 Koordinator) |
| data yang dibaca worker | knowledge base |
| tools_diizinkan | hak akses |
| worker belum aktif | dalam pelatihan |
| hasil kerja | Link Brief (deliverable) |

Profil kerja (ID pegawai, knowledge base, akses, siklus hidup) ada di `app/_lib/worker-profile.ts`.

## Arahan dari skill frontend-design

- Satu elemen mencolok per layar: kartu pegawai Netra di Beranda, kartu "Cara Netra bekerja" di Tugaskan. Elemen lain tenang.
- Jangan menyambung metadata dengan titik tengah ("A · B · C"). Pakai jarak antar item atau kalimat dengan koma.
- Font mono hanya untuk ID bukti, kode mahasiswa, ID pegawai, skor, dan jumlah token. Bukan untuk label kecil lain.
- Jangan pakai stat tile angka besar sebagai pola bawaan. Tulis temuan sebagai kalimat jika lebih jelas.
- Tombol menyebut hasilnya ("Tugaskan Netra", "Setujui dan undang 2 mahasiswa"), bukan "Submit" atau "Jalankan".
- Pesan error menjelaskan apa yang terjadi dan apa yang harus dilakukan. Status kosong mengajak bertindak.

## Larangan (aturan anti AI slop dari PRD)

- Tanpa gradien, termasuk gradien biru atau ungu-biru. Pakai `Card variant="feature"` jika butuh sorotan.
- Tanpa glassmorphism, tanpa emoji atau ikon 3D. Ikon hanya Lucide.
- Tanpa hero ala landing page, tanpa lorem ipsum, tanpa grid kartu identik di semua layar.
- Tanpa `rounded-3xl` dan bayangan tebal di semua elemen.
- Teks putih tidak boleh di atas `brand-500` (kontras gagal). Pakai `brand-600`.
- Jangan menampilkan teks AI tanpa chip bukti.
- Istilah teknis (nama tool, nama model, nama langkah) hanya di Run Timeline. Di tempat lain pakai `TOOL_LABEL` dan `RUN_STATUS_LABEL`.

## Setiap komponen dan layar wajib

- Status kosong, memuat, dan error, dengan tombol Coba lagi jika bisa diulang.
- Teks UI Bahasa Indonesia yang wajar, ditulis seperti manusia.
- Kontras minimal WCAG AA, fokus keyboard terlihat (sudah global di `globals.css`), `aria-label` pada tombol ikon.
- Label "Digital Worker (AI)" di setiap kartu dan pesan dari worker.
- Dibandingkan dengan `design/inspiration/` sebelum commit.
