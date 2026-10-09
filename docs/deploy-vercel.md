# Panduan deploy TalentLink Campus ke Vercel

Panduan ini untuk tim (Rofiq, Rifqi, Reyhan). Baca bagian 1 dulu: aplikasi **tidak bisa** langsung di-deploy ke Vercel apa adanya.

## 1. Kenapa tidak bisa langsung "Deploy"

TalentLink Campus menyimpan semua data di **satu file SQLite** (`data/talentlink.db`, lewat `better-sqlite3`): akun dan sesi login, penugasan, jejak kerja, Token Ledger, dan approval.

Di Vercel, kode berjalan sebagai *serverless function*:

| Sifat Vercel | Akibat untuk aplikasi ini |
| --- | --- |
| Sistem berkas hanya baca, kecuali `/tmp` | `data/talentlink.db` tidak bisa dibuat atau ditulis; API langsung error 500 |
| `/tmp` hilang saat instance baru dibuat, dan tiap instance punya `/tmp` sendiri | Kalau database dipindah ke `/tmp`: login tiba-tiba keluar, riwayat penugasan dan Token Ledger hilang acak |

Jadi untuk Vercel, database harus pindah ke layanan terkelola. Pilihan paling dekat adalah **Turso** (libSQL, kompatibel SQLite): skema, query, `json_each`, dan `json_group_array` yang kita pakai tetap berlaku, dan tersedia lewat Vercel Marketplace.

**Pilih jalur:**

| Jalur | Perubahan kode | Cocok untuk |
| --- | --- | --- |
| **A. Vercel + Turso** (panduan utama, bagian 2–8) | Ya: migrasi akses database ke `@libsql/client`, sekitar 2–4 jam termasuk test | URL publik permanen |
| **B. Tanpa Vercel, tanpa ubah kode** (bagian 9) | Tidak | Butuh link publik cepat untuk demo atau juri |

> **Saran untuk hackathon:** jangan migrasi database menjelang presentasi. Untuk demo pakai jalur B; kerjakan jalur A setelah presentasi, di branch terpisah.

## 2. Sebelum mulai: amankan akun demo

Akun demo dibuat otomatis dengan kata sandi `talentlink2026`, dan kata sandi itu tertulis di `lib/auth.ts` serta `docs/api.md`. Begitu aplikasi punya URL publik, **siapa pun yang membaca repo bisa login dan memakai token CBN tim**.

Wajib sebelum deploy publik:

1. Ubah `DEMO_PASSWORD` di `lib/auth.ts` agar dibaca dari environment variable (misalnya `DEMO_PASSWORD`), dan tolak login demo jika variabel itu kosong di production.
2. Isi kata sandi baru hanya di pengaturan Vercel, jangan di repo.
3. Kalau database lama sudah berisi akun demo dengan kata sandi lama, hapus baris akun itu atau ganti hash-nya setelah migrasi data.
4. Rem anggaran di Neraca Token tetap aktif (peringatan 80%, berhenti 95%), tapi jangan jadikan itu satu-satunya pengaman.

Opsional: aktifkan perlindungan akses di Vercel (Settings → Deployment Protection) supaya hanya orang tertentu yang bisa membuka URL. Cek fitur yang tersedia di paket akun kalian.

## 3. Siapkan akun

1. **Vercel:** daftar di vercel.com dengan akun GitHub.
2. **Siapa yang membuat proyek:** repo `rifqimaulanaakbar22/TalentLink-Campus` milik akun pribadi Rifqi. Paling mudah, **Rifqi yang meng-import repo ke Vercel**, karena aplikasi GitHub Vercel harus terpasang di akun pemilik repo. Anggota lain cukup diberi akses ke proyek Vercel jika paketnya mengizinkan.
3. **Turso:** tambahkan dari Vercel Marketplace (Storage → Turso), lalu sambungkan ke proyek. Integrasi ini otomatis membuat environment variable `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`. Pilih region database yang dekat dengan region function Vercel (misalnya Singapura) supaya polling tetap cepat.

Batas paket gratis Turso dan Vercel bisa berubah. Cek halaman harga masing-masing sebelum memilih.

## 4. Migrasi kode ke Turso (jalur A)

Kerjakan di branch baru, misalnya `feat/deploy-turso`.

### 4.1 Gambaran perubahan

| Sekarang (`better-sqlite3`) | Sesudah (`@libsql/client`) |
| --- | --- |
| Sinkron: `db.prepare(sql).get(...)` | Asinkron: `await db.execute({ sql, args })`, lalu `result.rows[0]` |
| `.all(...)` | `(await db.execute(...)).rows` |
| `.run(...).lastInsertRowid` | `Number((await db.execute(...)).lastInsertRowid)` |
| `db.transaction(() => { ... })()` | `await db.batch([...], "write")` atau `const tx = await db.transaction("write")` |
| `conn.exec(DDL)` | `await db.executeMultiple(DDL)`, sekali saat koneksi pertama |
| `PRAGMA journal_mode = DELETE` | Tidak diperlukan untuk database remote; hapus |

Berkas yang terdampak (12 berkas, sekitar 56 query):

- `lib/db.ts`: buat klien libSQL.
- `lib/service.ts`, `lib/auth.ts`, `lib/tokens.ts`, `lib/llm.ts`: semua fungsi yang membaca atau menulis database menjadi `async`.
- `lib/worker/run.ts`, `lib/worker/competition/run.ts`, `lib/worker/search.ts`, `lib/worker/normalize.ts`, `lib/worker/dispatch.ts`.
- `lib/seed.ts`, `scripts/seed.ts`, `scripts/cli.ts`.
- Route Handler di `app/api/` dan halaman server yang memanggil fungsi di atas: tambahkan `await`.
- Test di `lib/**/*.test.ts`: tambahkan `await`.

### 4.2 Langkah

```bash
npm install @libsql/client
```

Contoh `lib/db.ts` versi libSQL. URL `file:` membuat development lokal tetap memakai file, tanpa akun Turso:

```ts
import { createClient, type Client } from "@libsql/client";

const g = globalThis as unknown as { __tlClient?: Client; __tlReady?: Promise<void> };

export function getClient(): Client {
  g.__tlClient ??= createClient({
    url: process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH || "data/talentlink.db"}`,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return g.__tlClient;
}

/** Buat tabel sekali per proses sebelum query pertama. */
export async function getDb(): Promise<Client> {
  const db = getClient();
  g.__tlReady ??= db.executeMultiple(DDL);
  await g.__tlReady;
  return db;
}
```

Lalu ubah setiap pemakaian `getSqlite().prepare(...)` sesuai tabel 4.1. Setelah semua berkas selesai:

1. Hapus `better-sqlite3` dari `serverExternalPackages` di `next.config.ts`. Kalau tidak dipakai lagi, hapus juga dari `dependencies`.
2. Jalankan `npm run lint && npm test && npm run build`. Semuanya harus lulus.
3. Uji lokal dengan `npm run dev`. Database tetap file lokal karena `TURSO_DATABASE_URL` kosong.

Migrasi ini menyentuh hampir semua backend. Minta review dari anggota tim lain sebelum merge.

## 5. Isi database Turso

Pilih salah satu:

**a. Seed baru** (database kosong, data sintetis standar):

```bash
TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run seed
```

Salin URL dan token dari dashboard Turso atau pengaturan Vercel. Jangan simpan di repo.

**b. Bawa data lokal** (riwayat penugasan dan Token Ledger ikut pindah), memakai Turso CLI:

```bash
sqlite3 data/talentlink.db .dump > dump.sql
turso db shell <nama-database> < dump.sql
rm dump.sql   # berisi hash kata sandi dan data run; jangan di-commit
```

Setelah impor, ganti kata sandi akun demo (lihat bagian 2).

## 6. Buat proyek di Vercel

1. Vercel → **Add New → Project** → pilih repo `TalentLink-Campus` → **Import**.
2. Framework Preset: **Next.js** (terdeteksi otomatis). Build Command: `npm run build`. Output: bawaan.
3. **Node.js Version:** pilih 22.x (Settings → General), sama seperti lokal.
4. **Environment Variables** (Settings → Environment Variables), untuk Production dan Preview:

| Nama | Nilai | Catatan |
| --- | --- | --- |
| `CBN_API_BASE_URL` | URL gateway dari panitia | Diakhiri `/v1` |
| `CBN_API_KEY` | Key dari panitia | Tandai **Sensitive** |
| `CBN_MODEL_PARSE` | misalnya `qwen3.8-flash` | Sesuai daftar model resmi |
| `CBN_MODEL_EXPLAIN` | misalnya `qwen3.7-plus` | |
| `TOKEN_BUDGET_TOTAL` | `10000000` | |
| `TOKEN_BUDGET_WARN` | `0.8` | |
| `TOKEN_BUDGET_STOP` | `0.95` | |
| `LLM_MOCK` | `false` | `true` hanya untuk preview tanpa token |
| `DEMO_PASSWORD` | kata sandi baru | Setelah perubahan di bagian 2 |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | otomatis dari integrasi Turso | Jangan diketik ulang di repo |

**Jangan** isi `NEXT_PUBLIC_API_MOCK=true`. Variabel `NEXT_PUBLIC_*` ditanam saat build; kalau `true`, frontend memakai data contoh, bukan API.

5. **Region function:** pilih region terdekat dengan pengguna dan database (misalnya Singapura), di Settings → Functions.
6. Klik **Deploy**.

Setiap kali environment variable diubah, lakukan **Redeploy** supaya nilainya terpakai.

## 7. Pipeline di background (`after()`)

`POST /api/runs`, `/clarify`, dan `/retry` membalas dulu, lalu menjalankan pipeline dengan `after()` dari `next/server`. Vercel mendukung pola ini (memakai `waitUntil`). Satu penugasan butuh 15–22 detik, jauh di bawah batas durasi function. Batas paket Hobby saat panduan ini ditulis adalah 300 detik; cek halaman limits Vercel untuk angka terbaru.

Jika ingin batas eksplisit, tambahkan di route handler yang memicu pipeline:

```ts
export const maxDuration = 60;
```

## 8. Periksa setelah deploy

Jalankan alur ini di URL Vercel:

- [ ] Halaman `/login` tampil; login dengan akun demo dan kata sandi baru berhasil.
- [ ] Beranda menampilkan kartu Netra dan Jaya dengan angka token dari ledger.
- [ ] Tugaskan Netra dengan brief Computer Vision. Jejak kerja bergerak dan Link Brief muncul dalam sekitar 30 detik.
- [ ] Klik chip ID bukti; panel bukti terbuka dengan label Sintetis.
- [ ] Setujui dan undang; status "Undangan terkirim (SIMULASI)".
- [ ] Refresh halaman detail; semua tetap ada.
- [ ] Tugaskan Jaya dengan contoh guidebook; usulan tim muncul.
- [ ] Buka Neraca Token; token dari penugasan tadi tercatat.
- [ ] Keluar, lalu login lagi dari browser lain; riwayat tetap sama. Ini membuktikan data tersimpan di Turso, bukan di instance.

Pantau error di Vercel → proyek → **Logs**. Baris `[api] error tak terduga` berasal dari `lib/http.ts`.

### Masalah umum

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| Semua API error 500, log berisi `EROFS`, `SQLITE_CANTOPEN`, atau `unable to open database file` | Kode masih memakai file SQLite | Selesaikan migrasi bagian 4 |
| Login berhasil lalu tiba-tiba keluar, atau riwayat hilang | Database di `/tmp` atau per instance | Pastikan `TURSO_DATABASE_URL` terisi dan kode memakai libSQL |
| Langkah parse gagal "Konfigurasi API CBN belum diisi" | Env `CBN_*` belum diisi atau belum redeploy | Isi, lalu Redeploy |
| "API key CBN tidak valid" | Key salah atau kedaluwarsa | Ganti `CBN_API_KEY`, lalu Redeploy |
| Error 504 `FUNCTION_INVOCATION_TIMEOUT` | Function melebihi batas durasi | Cek latensi API CBN; atur `maxDuration` (bagian 7) |
| Frontend menampilkan data contoh, bukan data asli | `NEXT_PUBLIC_API_MOCK=true` saat build | Hapus atau set `false`, lalu Redeploy |
| Polling terasa lambat | Region function dan database berjauhan | Samakan region (bagian 3 dan 6) |

## 9. Jalur B: link publik tanpa Vercel dan tanpa ubah kode

Untuk demo atau juri, kode yang ada sekarang bisa langsung dipakai:

| Pilihan | Cara singkat | Catatan |
| --- | --- | --- |
| **Laptop + Cloudflare Tunnel** | `npm run build && npm start`, lalu `cloudflared tunnel --url http://localhost:3000` | Gratis, link langsung jadi. Laptop harus menyala selama dipakai |
| **Server dengan disk tetap** (Railway, Render, Fly.io, atau VPS) | Deploy sebagai Node.js server (`npm run build`, `npm start`) dengan volume disk untuk folder `data/`, dan `DATABASE_PATH` mengarah ke volume itu | Tidak perlu migrasi. Cek syarat paket gratisnya; sebagian butuh paket berbayar untuk disk tetap |

Aturan keamanan di bagian 2 tetap berlaku untuk kedua pilihan, karena keduanya juga membuat aplikasi bisa diakses publik.
