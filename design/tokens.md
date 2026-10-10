# Design tokens TalentLink Campus

Sumber: `design/inspiration/01–04`. Tokens ini diterapkan di `app/globals.css` (Tailwind 4 `@theme`) dan dirangkum untuk AI di `.claude/skills/talentlink-ui/SKILL.md`.

## Yang diambil dari inspirasi

| Inspirasi | Yang diambil |
| --- | --- |
| 03, 04 Dashboard overview | Kanvas abu-abu lembut, satu panel aplikasi putih bersudut besar, rail ikon di kiri dengan ikon di lingkaran lembut, judul halaman besar, susunan bento dengan ukuran kartu berbeda |
| 02 Widget | Kartu putih tanpa garis tebal, bayangan sangat tipis, ikon di gelembung bulat, angka besar, tombol pill, kartu sorotan bergaris biru dengan cahaya halus, kartu biru penuh dengan pola sirkuit |
| 01 Login | Field bergaris dengan label menempel di garis atas (notched label), tombol pill di tengah, pemisah tipis |
| 05 Login terbelah dua | Kartu login dua panel di tengah layar, judul sambutan besar berwarna brand, field dengan ikon, pemisah "atau" lalu pilihan masuk alternatif. Foto diganti panel `brand-600` berpola sirkuit; tombol media sosial diganti kartu akun demo; latar biru penuh diganti kanvas abu-abu tema |

## Yang sengaja tidak diambil (aturan anti AI slop di PRD)

- Ikon 3D dan gambar otak 3D diganti ikon Lucide di gelembung bulat dan maskot worker.
- Gradien biru di tombol dan kartu diganti warna solid. Kartu sorotan tetap memakai pola garis tipis.
- Biru terang inspirasi (#1BA8EC) gagal kontras AA dengan teks putih (2,67), jadi hanya dipakai untuk dekorasi. Tombol dan teks memakai `brand-600` (#0277B6, kontras 4,86).
- Tidak ada search bar global dan foto profil, karena aplikasi tidak punya login.

## Warna

| Token | Nilai | Pakai untuk |
| --- | --- | --- |
| `canvas` | #EEF0F3 | Latar luar di belakang panel |
| `panel` | #F7F8FA | Latar panel aplikasi |
| `surface` | #FFFFFF | Kartu |
| `line` | #E7EAEE | Garis tipis, pemisah |
| `ink` | #16191D | Judul dan teks utama |
| `ink-muted` | #5F6773 | Teks sekunder (kontras 5,6 di putih) |
| `ink-subtle` | #8A94A6 | Placeholder dan teks dekoratif saja, bukan teks penting |
| `brand-50` | #F0F9FF | Latar chip dan gelembung ikon aktif |
| `brand-100` | #E0F2FE | Latar badge brand |
| `brand-300` | #7DD3FC | Garis kartu sorotan |
| `brand-500` | #1BA8EC | Progress bar, ring, ikon, grafik |
| `brand-600` | #0277B6 | Tombol utama, tautan, kartu biru penuh |
| `brand-700` | #036AA3 | Hover tombol, teks chip |
| `brand-900` | #0C4A6E | Teks di latar brand terang |
| `netra` | #4F46E5 | Aksen tipis Netra (indigo) |
| `jaya` | #EA580C | Aksen tipis Jaya (oranye) |
| `success` / `success-bg` | #067647 / #DCFAE6 | Langkah selesai, disetujui |
| `danger` / `danger-bg` | #B42318 / #FEE4E2 | Gagal, ditolak |
| `warning` / `warning-bg` | #93370D / #FEF0C7 | Peringatan budget |
| `simulasi` / `simulasi-bg` | #713F12 / #FEF08A | Label SIMULASI (kuning, wajib PRD) |
| `sintetis` / `sintetis-bg` | #374151 / #E5E7EB | Label Sintetis (abu-abu, wajib PRD) |
| `hidden` / `hidden-bg` | #075985 / #E0F2FE | Badge Hidden Talent |
| `fair` / `fair-bg` | #5B21B6 / #EDE9FE | Badge Fair Exposure |

## Tipografi

- Sans: **Outfit** (geometris, mirip inspirasi) untuk semua teks dan angka besar di stat tile.
- Mono: **JetBrains Mono** untuk ID bukti, kode mahasiswa, token, durasi, dan skor.

| Peran | Ukuran / tinggi baris | Berat |
| --- | --- | --- |
| Judul halaman | 32 / 40 | 600, tracking rapat |
| Judul kartu | 18 / 26 | 500 |
| Angka stat | 36 / 40 | 600 |
| Isi | 15 / 22 | 400 |
| Kecil / label | 13 / 18 | 400–500 |
| Mikro (badge) | 12 / 16 | 500 |

## Bentuk, jarak, bayangan

| Token | Nilai |
| --- | --- |
| Radius kartu | 20px (`rounded-card`) |
| Radius panel aplikasi | 32px (`rounded-panel`) |
| Radius field | 12px (`rounded-field`) |
| Tombol, chip, badge | pill penuh |
| Padding kartu | 24px (20px di layar kecil) |
| Jarak antar kartu | 20px |
| `shadow-card` | `0 1px 2px rgb(16 24 40 / .04), 0 6px 20px rgb(16 24 40 / .04)` |
| `shadow-glow` | `0 0 0 4px rgb(27 168 236 / .10), 0 10px 30px rgb(27 168 236 / .12)` (hanya kartu sorotan) |
| `line-strong` | `#cdd4dd`, sisi bawah tombol 3D netral dan bayangan keras kartu saat disorot |

## Gaya retro arcade

Inspirasi 06 adalah set tombol game retro dari stok gambar berlisensi (bertanda air), jadi **tidak disimpan** di `design/inspiration/`. Yang diambil hanya polanya: tombol tebal dengan sisi bawah lebih gelap yang tenggelam saat ditekan. Warna tombol tema tetap sama.

| Unsur | Nilai |
| --- | --- |
| Sisi tombol | Bayangan keras `0 4px 0` (tombol kecil 3px, chip 2px), tanpa blur. Warna: `brand-900` untuk tombol `brand-600` dan tombol putih di kartu biru; `line-strong` untuk tombol putih |
| Kilap atas | `inset 0 2px 0 rgb(255 255 255 / .22)` |
| Ditekan | Turun setebal sisi dalam 40ms; aktif (menu dibuka) tertahan turun |
| Gerak | `steps(2)` untuk tombol, `steps(3)` kartu, `steps(4)` muncul saat scroll dan dock, agar terasa 8-bit |
| Dock HP | Pill putih, garis 2px `line-strong`, bayangan `0 6px 0 line-strong` + bayangan lembut agar terpisah dari konten |

## Pola komponen

- **Kartu biasa:** putih, tanpa border, `shadow-card`.
- **Kartu sorotan:** border 1,5px `brand-300` + `shadow-glow`. Maksimal satu per layar (worker aktif, kandidat terpilih).
- **Kartu biru penuh:** `brand-600` + pola sirkuit putih 10% opasitas. Maksimal satu per layar.
- **Gelembung ikon:** lingkaran 40px, latar `panel`, ikon `brand-500` 20px.
- **Tombol utama:** pill `brand-600`, teks putih 15px medium, sisi 3D `brand-900`. Tombol sekunder: pill putih bergaris `line`, sisi 3D `line-strong`. Lihat "Gaya retro arcade".
- **Field:** border `line`, fokus `brand-500`, label kecil menempel di garis atas.
- **Fokus keyboard:** ring 2px `brand-500` dengan offset 2px, selalu terlihat.
