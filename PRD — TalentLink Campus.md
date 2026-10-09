# PRD — TalentLink Campus

Oct 9, 2026 · @Someone · **Revisi 9 Oktober 2026 malam** (lihat "Riwayat perubahan" di akhir dokumen)

## Status implementasi (hasil audit, 9 Oktober 2026)

| Bagian | Status |
| --- | --- |
| Pipeline Research Matching (`lib/worker/*`, `lib/llm.ts`, seed, CLI) | Ada di `master`; teruji lewat CLI dengan `LLM_MOCK=true`; 21 unit test lulus |
| Lapisan HTTP API (`app/api/*`) | **Belum ada. Blocker utama integrasi** |
| Frontend (Tim, Tugaskan, Detail penugasan) | Ada di branch `feat/ui-development`; berjalan dengan mode mock yang datanya dibangkitkan dari pipeline asli |
| API CBN asli | Belum teruji di laptop frontend (`.env` belum ada) |
| Skrip eval | Belum ada |

Rencana integrasi dan daftar keputusan: `docs/penyesuaian-mockup-audit.md` dan laporan audit.

## Ringkasan produk

TalentLink Campus adalah Digital Worker AI dengan jabatan Research Talent Officer yang mencari, menilai, dan merekomendasikan mahasiswa untuk riset dosen dan tim lomba, dengan setiap rekomendasi terhubung ke bukti dan setiap tindakan menunggu persetujuan staf.

| Item | Isi |
| --- | --- |
| Nama produk | TalentLink Campus |
| Judul | TalentLink Campus: An AI Digital Worker That Links Students to Research and Competitions, Backed by Evidence |
| Tagline | Every recommendation, linked to evidence. |
| Konteks | PENS Hackathon 2026, track CBN Digital Campus Worker, 9–10 Oktober 2026, Surabaya |
| User utama | Dosen peneliti |
| User tambahan | Staf kemahasiswaan, dosen pembina lomba |
| Workflow utama | Research Matching: kebutuhan riset → shortlist mahasiswa berbukti → approval dosen |
| Mesin AI | API CBN (alokasi 10.000.000 token) |
| Bentuk rilis | Prototipe web di localhost dengan data sintetis |

**Nilai utama:** dosen cukup memberi tugas dalam bahasa sehari-hari, lalu menerima Link Brief yang siap dipakai, termasuk mahasiswa berpotensi yang belum pernah juara.

## Masalah dan peluang

Kampus sudah memiliki data kemampuan mahasiswa, tetapi tersebar di nilai, proyek, sertifikat, prestasi, dan survei, sehingga mencari mahasiswa yang tepat masih dilakukan manual dan mahasiswa potensial sering tidak terlihat.

**Masalah per user:**

- **Dosen peneliti** mencari anggota riset dengan bertanya ke kolega dan mengandalkan ingatan; kandidat terbatas pada mahasiswa yang pernah diajar atau sudah terkenal.
- **Staf kemahasiswaan** menyebar pengumuman lomba lalu menyaring manual; syarat formal sering terlewat dan peluang berputar di mahasiswa yang sama.

**Peluang:**

- Brief CBN meminta Digital Campus Worker yang memakai informasi dan tool untuk menyelesaikan tugas operasional kampus.
- CBN memosisikan Digital Worker sebagai AI yang punya jabatan, akses, dan siklus hidup; TalentLink Campus menerapkan konsep ini untuk talenta kampus.
- Prestasi formal hanya satu jenis bukti; proyek, nilai, dan pengalaman asisten bisa memunculkan hidden talent.

**Alternatif yang ada:** sistem informasi prestasi mahasiswa mencatat prestasi yang sudah terjadi, tetapi tidak mencari kandidat untuk kebutuhan baru dan tidak menjelaskan alasannya dengan bukti.

## Tujuan dan metrik keberhasilan

Target di bawah dipakai untuk eval sebelum submission; angka aktualnya diisi dari hasil uji, bukan diasumsikan. Halaman Scorecard/Rapor **ditunda dari UI MVP**; hasil eval ditulis ke `eval/results.md` dan ditampilkan di README dan slide sebagai bukti kriteria AI token efficiency.

| Tujuan | Metrik | Target | Kriteria juri |
| --- | --- | --- | --- |
| Rekomendasi tepat | Precision@3 pada kasus berlabel | ≥ 0,8 | Solution accuracy 30% |
| Konsisten dengan sumber | Persentase alasan dengan ID bukti valid setelah verifikasi | 100% | Solution accuracy |
| Tahan kegagalan | Kasus gagal yang ditangani benar (ambigu, tanpa kandidat, JSON rusak, prompt injection, kirim tanpa approval) | 5 dari 5 | Solution accuracy |
| Hemat token | Token rata-rata per run v2 dibanding v1 | Lebih rendah dengan precision@3 tidak turun | AI token efficiency 15% |
| Log lengkap | Panggilan LLM yang tercatat di Token Ledger | 100% | AI token efficiency |
| Cepat dipakai | Waktu dari submit brief sampai Link Brief (v2) | < 30 detik | UI/UX 15% |
| Aman | Pesan terkirim tanpa approval | 0 | Aturan brief |
| Hidden talent | Kandidat tanpa award di top 5 kasus hidden talent | Muncul dengan badge | Idea quality 20% |

**Tujuan pitching:** demo menerima input baru dari juri dan menyelesaikan alur dalam waktu pitching.

## Persona

Dua persona memakai sistem; mahasiswa hanya menerima undangan dan tidak memakai sistem di prototipe ini.

| Persona | Peran | Kebutuhan | Hambatan hari ini | Yang ia dapat dari TalentLink Campus |
| --- | --- | --- | --- | --- |
| Bu Rina (fiktif) | Dosen peneliti Computer Vision | 2 mahasiswa untuk riset semester ini | Hanya kenal mahasiswa di kelasnya sendiri | Shortlist berbukti dalam satu menit, termasuk mahasiswa dari kelas lain |
| Pak Andi (fiktif) | Staf kemahasiswaan | Tim 3 orang untuk lomba AI nasional | Menyaring syarat manual, kandidat itu-itu saja | Tim yang lolos syarat, peran saling melengkapi, tanda Fair Exposure |
| Mahasiswa | Penerima undangan | Kesempatan riset dan lomba | Tidak terlihat jika belum pernah juara | Diundang berdasarkan bukti kemampuan, bukan popularitas |

## Cakupan rilis

Rilis hackathon fokus pada Research Matching lengkap; modul lain dibangun di mesin yang sama sesuai checkpoint waktu.

| Modul | Prioritas | Status rilis |
| --- | --- | --- |
| Platform Digital Worker (kartu pegawai Digital Worker, jejak kerja/Run Timeline, Token Ledger, Approval Gate, panel bukti) | Wajib | Masuk |
| Lapisan HTTP API yang menyambungkan UI dan pipeline | Wajib | Masuk; blocker utama hasil audit |
| Research Matching oleh Netra | Wajib | Masuk, didemokan penuh |
| Eval v1 vs v2 lewat skrip (`npm run eval`, hasil di `eval/results.md`) | Wajib | Masuk tanpa halaman UI |
| Halaman Scorecard/Rapor di UI | Nanti | **Ditunda**; dihapus dari UI MVP agar fokus ke alur utama |
| Competition Matching oleh Jaya (parser guidebook, Eligibility Check, Team Builder, Conflict Check) | Sebaiknya | Masuk jika checkpoint 24.00 tercapai; sampai itu Jaya tampil "Dalam pelatihan" |

**Tidak masuk rilis ini:**

- Career Readiness dan Digital Worker Kanca (dikeluarkan dari cakupan; jadi roadmap)
- Login dan manajemen user sungguhan (peran dipilih di UI, ditandai SIMULASI)
- Pengiriman email atau WhatsApp sungguhan (ditandai SIMULASI)
- Integrasi dengan SIAKAD, SIMKATMAWA, atau PDDikti
- Scraping GitHub atau LinkedIn
- Portal profil mahasiswa
- Multi-agent dan antarmuka pembuat agent (opsional menurut brief)
- Tracer study alumni (roadmap)

## User stories

Setiap story memakai format "Sebagai … saya ingin … agar …" dan dipetakan ke kebutuhan fungsional di bagian berikutnya.

| ID | Sebagai | Saya ingin | Agar | Prioritas |
| --- | --- | --- | --- | --- |
| US-01 | Dosen | Menulis kebutuhan riset dalam bahasa sehari-hari | Tidak perlu mengisi formulir rumit | Wajib |
| US-02 | Dosen | Melihat shortlist kandidat dengan skor dan alasan | Bisa memutuskan cepat | Wajib |
| US-03 | Dosen | Membuka bukti di balik setiap alasan | Yakin rekomendasinya benar | Wajib |
| US-04 | Dosen | Ditanya balik jika permintaan saya kurang jelas | Hasilnya tidak menebak | Wajib |
| US-05 | Dosen | Melihat mahasiswa berpotensi yang belum pernah juara | Tidak melewatkan hidden talent | Wajib |
| US-06 | Dosen | Menyetujui atau menolak kandidat sebelum undangan dikirim | Tetap memegang keputusan | Wajib |
| US-07 | Dosen | Membuka kembali hasil run sebelumnya | Tidak perlu mengulang pencarian | Wajib |
| US-08 | Kepala unit / juri | Melihat jabatan, akses, dan pemakaian token Digital Worker | Tahu batas kerja dan biayanya | Wajib |
| US-09 | Tim pengembang | Membandingkan token dan akurasi v1 vs v2 lewat skrip eval | Membuktikan optimasi di README dan slide | Wajib |
| US-10 | Staf kemahasiswaan | Mengunggah guidebook lomba dan melihat siapa yang memenuhi syarat | Tidak menyaring manual | Sebaiknya |
| US-11 | Staf kemahasiswaan | Mendapat usulan tim dengan peran berbeda | Tim lebih seimbang | Sebaiknya |
| US-12 | Staf kemahasiswaan | Melihat tanda mahasiswa yang sudah terlalu banyak dilibatkan | Kesempatan lebih merata | Sebaiknya |
| US-15 | Dosen | Membedakan skill yang belum ada buktinya dari skill yang memang tidak dikuasai | Tidak salah menilai mahasiswa | Wajib |

US-13 dan US-14 (Career Center) dihapus bersama modul Career Readiness.

## Kebutuhan fungsional

Kebutuhan diberi ID per modul: W (platform worker), R (research), C (competition); rincian teknis ada di spesifikasi MVP. Modul K (karier) dihapus dari cakupan.

### Platform Digital Worker

| ID | Kebutuhan | Prioritas | Story |
| --- | --- | --- | --- |
| FR-W1 | Menampilkan tim dua Digital Worker (Netra, Research Talent Officer, status bertugas; Jaya, Competition Team Officer, status dalam pelatihan) dengan istilah CBN Digital Worker: maskot, ID pegawai, jabatan, penempatan, atasan, persona, tingkat kemampuan, knowledge base, hak akses, dan token terpakai | Wajib | US-08 |
| FR-W2 | Mencatat setiap run dan setiap langkahnya ke database dengan status, waktu mulai, dan waktu selesai | Wajib | US-07 |
| FR-W3 | Menampilkan Run Timeline yang diperbarui saat run berjalan | Wajib | US-02 |
| FR-W4 | Menyimpan hasil run sehingga tetap tampil setelah halaman di-refresh | Wajib | US-07 |
| FR-W5 | Membatasi worker ke daftar tool yang diizinkan; tidak ada tool yang mengubah data mahasiswa | Wajib | US-08 |
| FR-W6 | Approval Gate: tombol "Setujui dan undang" menyetujui lalu mengirim dalam satu klik; server tetap menolak kirim tanpa persetujuan (403); pengiriman diberi label SIMULASI | Wajib | US-06 |
| FR-W7 | Panel bukti: klik ID bukti menampilkan jenis, judul, detail, tahun, dan label Sintetis | Wajib | US-03 |
| FR-W8 | Daftar run terakhir dengan status dan tautan ke detail | Wajib | US-07 |
| FR-W9 | Hasil eval precision@3, sitasi valid, token rata-rata, latensi untuk v1 dan v2 ditulis ke `eval/results.md`. Halaman Scorecard/Rapor di UI ditunda | Wajib (tanpa UI) | US-09 |
| FR-W10 | Route Handler di `app/api/*` sesuai `docs/kontrak-frontend-backend.md` yang hanya memanggil fungsi pipeline yang sudah ada; tanpa ubah skema | Wajib | US-01, US-02, US-07 |

### Research Matching

| ID | Kebutuhan | Prioritas | Story |
| --- | --- | --- | --- |
| FR-R1 | Menerima brief teks bebas dan pilihan mode v1/v2 | Wajib | US-01 |
| FR-R2 | Mengubah brief menjadi kriteria terstruktur (topik, skill wajib, skill tambahan, semester minimum, jumlah) | Wajib | US-01 |
| FR-R3 | Mengajukan pertanyaan klarifikasi jika brief tidak menyebut topik atau skill konkret, lalu melanjutkan setelah dijawab | Wajib | US-04 |
| FR-R4 | Menormalkan nama skill lewat katalog sinonim | Wajib | US-01 |
| FR-R5 | Menyaring kandidat: status aktif, semester minimum, punya bukti untuk skill wajib | Wajib | US-02 |
| FR-R6 | Menghitung skor 0–100 di kode sesuai rumus di spesifikasi MVP | Wajib | US-02 |
| FR-R7 | Menandai Hidden Talent (skor ≥ 70, tanpa bukti award) dan Fair Exposure (komitmen aktif ≥ 2) | Wajib | US-05 |
| FR-R8 | Menghasilkan 2–3 alasan per kandidat, masing-masing merujuk minimal satu ID bukti milik kandidat itu | Wajib | US-02, US-03 |
| FR-R9 | Menolak alasan dengan ID bukti tidak valid, retry sekali, lalu fallback ke alasan template dari judul bukti | Wajib | US-03 |
| FR-R10 | Jika tidak ada kandidat dengan skor ≥ 50, menampilkan 3 kandidat terdekat beserta skill yang kurang. **Temuan audit:** jika skill di luar katalog atau tidak ada mahasiswa yang punya buktinya, pipeline saat ini mengembalikan 0 kandidat; UI menampilkan arahan "Ubah kebutuhan". Fallback kandidat terdekat untuk kasus ini menunggu keputusan tim | Wajib | US-02 |
| FR-R11 | Menampilkan gap skill per kandidat dan draf undangan yang bisa diedit | Wajib | US-06 |
| FR-R12 | Mengabaikan instruksi yang tertulis di dalam data mahasiswa; peringkat ditentukan kode | Wajib | US-03 |
| FR-R13 | Membedakan "belum ada bukti di data kampus" (`missingSkills`, dihitung kode) dari catatan yang ditulis AI (`gaps`), dan menampilkan kalimat bahwa rekomendasi adalah bahan pertimbangan | Wajib | US-15 |

### Competition Matching

| ID | Kebutuhan | Prioritas | Story |
| --- | --- | --- | --- |
| FR-C1 | Menerima guidebook (teks atau PDF) dan mengekstrak syarat menjadi kriteria terstruktur | Sebaiknya | US-10 |
| FR-C2 | Eligibility Check di kode dengan alasan tertulis untuk setiap mahasiswa yang tersaring | Sebaiknya | US-10 |
| FR-C3 | Team Builder: menyusun tim sesuai jumlah anggota dengan peran berbeda | Sebaiknya | US-11 |
| FR-C4 | Conflict Check: satu mahasiswa tidak masuk dua tim di lomba yang sama | Sebaiknya | US-11 |
| FR-C5 | Menampilkan tanda Fair Exposure | Sebaiknya | US-12 |

### Career Readiness

Dihapus dari cakupan MVP (FR-K1 sampai FR-K4). Digital Worker Kanca dan modul ini masuk roadmap.

## Kebutuhan AI dan API CBN

Semua panggilan LLM memakai API CBN dari alokasi 10.000.000 token, lewat satu klien yang mencatat setiap token dan menjaga budget.

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| AI-1 | Semua panggilan LLM lewat `lib/llm.ts` ke API CBN; base URL, key, dan nama model dari `.env` | Wajib |
| AI-2 | LLM hanya untuk parse brief/guidebook dan menulis alasan; skor, filter, dan metrik dihitung di kode. Catatan audit: verifikasi memeriksa ID bukti, bukan isi kalimat alasan | Wajib |
| AI-3 | Output LLM wajib JSON yang divalidasi skema; gagal validasi → retry sekali → fallback | Wajib |
| AI-4 | Model ringan untuk parse, model lebih kuat untuk penjelasan | Sebaiknya |
| AI-5 | Token Ledger mencatat run, langkah, model, token input, token output, latensi per panggilan, dari field usage respons API | Wajib |
| AI-6 | Budget 10.000.000 token: peringatan di 80%, panggilan ditolak di 95% | Wajib |
| AI-7 | Mode v1 (semua kandidat ke LLM) dan v2 (top 5, maks 4 bukti relevan) untuk uji efisiensi pada eval set yang sama | Wajib |
| AI-8 | Data mahasiswa dibungkus sebagai data di prompt; instruksi di dalamnya diabaikan | Wajib |
| AI-9 | Mode mock untuk pengembangan UI dan unit test tanpa memakai token; demo dan eval memakai API asli | Sebaiknya |
| AI-10 | Error API (401, 429, timeout) tampil sebagai langkah gagal dengan pesan yang bisa dipahami user | Wajib |

**Batas panggilan per run Research Matching:** 2 panggilan normal (parse, explain), maksimal 3 dengan satu retry.

**Perkiraan pemakaian:** v2 sekitar 5.000–8.000 token per run, v1 sekitar 20.000–40.000 token per run. Ini perkiraan kasar; angka resmi diambil dari Token Ledger.

## Kebutuhan non-fungsional, data, dan privasi

Prototipe berjalan di localhost dengan data sintetis, tetapi aturan akses dan privasinya dibuat seperti sistem kampus sungguhan.

| ID | Kategori | Kebutuhan |
| --- | --- | --- |
| NFR-1 | Performa | Run v2 selesai < 30 detik; halaman detail run tampil < 2 detik |
| NFR-2 | Keandalan | Kegagalan satu langkah tidak menghapus langkah yang sudah selesai; run bisa dicoba ulang |
| NFR-3 | Reproducibility | `npm install && npm run seed && npm run dev` jalan dari repo bersih; seed data deterministik |
| NFR-4 | Keamanan | API key hanya di `.env`; `.env` masuk `.gitignore`; `.env.example` tersedia |
| NFR-5 | Akses | Worker read-only terhadap data mahasiswa; tidak ada endpoint pengubah data akademik |
| NFR-6 | Auditabilitas | Setiap run, langkah, panggilan LLM, dan keputusan approval tercatat dengan waktu |
| NFR-7 | Kualitas kode | Unit test untuk skor dan verifikasi sitasi; skrip eval menulis hasil ke `eval/results.md` |
| NFR-8 | Transparansi | Komponen simulasi dan data sintetis berlabel di UI dan README |

**Data:**

- 80 mahasiswa sintetis, 20 skill dengan sinonim, 3–8 bukti per mahasiswa, plus profil tanam S-101 sampai S-109 untuk eval.
- Guidebook lomba: sintetis atau dokumen publik.
- Kompetensi mahasiswa hanya tercatat lewat bukti. "Belum ada bukti" berarti data kampus belum mencatatnya, bukan berarti mahasiswa tidak menguasainya.
- Tidak memakai data kampus yang bersifat rahasia, sesuai brief.

**Privasi dan keadilan:**

- Nama, gender, dan foto tidak dipakai saat menghitung skor.
- Mahasiswa tidak dihubungi tanpa persetujuan staf.
- Rekomendasi adalah bahan pertimbangan; keputusan akhir tetap di tangan dosen atau staf.
- Pada implementasi nyata, mahasiswa memberi consent untuk dihubungi (roadmap).

## Kebutuhan UX dan layar

Tiga layar utama, masing-masing harus menunjukkan progres, error, dan langkah berikutnya, karena kriteria UI/UX menilai penyelesaian tugas, navigasi, kejelasan output, serta status progres dan error. Halaman Scorecard/Rapor ditunda.

| Layar (menu) | Elemen wajib | Status kosong, progres, dan error |
| --- | --- | --- |
| Tim Digital Worker (Tim) | Kartu pegawai Netra (ID pegawai, jabatan, penempatan, tingkat kemampuan, knowledge base, hak akses, token X / 10.000.000), "Menunggu keputusan Anda", riwayat penugasan, Jaya "Dalam pelatihan" | Belum ada penugasan: ajakan menugaskan Netra; budget ≥ 80%: banner kuning |
| Tugaskan Netra (Tugaskan) | Salam Netra, textarea kebutuhan riset, 3 contoh brief yang bisa diklik, centang "mode pembanding" (v1); peran tampil di bar atas dengan label SIMULASI | Brief < 15 karakter ditolak dengan pesan; tombol nonaktif saat mengirim |
| Detail penugasan | Jejak kerja Netra (langkah, status, durasi, token, model); Link Brief (kartu kandidat, skor atau "Tanpa skor; diurutkan AI" di v1, chip ID bukti, badge Hidden Talent dan Fair Exposure, "Belum ada bukti di data kampus", catatan AI, draf undangan, tombol "Setujui dan undang" dan "Tolak"); panel bukti | Langkah berjalan: spinner; klarifikasi: kotak jawab; gagal: pesan + tombol coba lagi; tanpa kandidat ≥ 50: kotak "tidak ada yang memenuhi" + kandidat terdekat; 0 kandidat: arahan "Ubah kebutuhan" |

&#91;embedded content: status run · 7 status\]

Status run menentukan apa yang tampil di layar Detail run: kotak jawab saat menunggu klarifikasi, tombol Setujui/Tolak saat menunggu persetujuan, dan tombol coba lagi saat gagal.

**Prinsip tampilan:**

- Bahasa Indonesia di seluruh UI; istilah teknis hanya di jejak kerja.
- Bahasa bisnis mengikuti CBN Digital Worker: penugasan (bukan run), jejak kerja, penempatan, atasan, tingkat kemampuan, knowledge base, hak akses, dalam pelatihan.
- Setiap klaim AI punya chip bukti; tidak ada teks AI tanpa sumber.
- Label SIMULASI berwarna kuning, label Sintetis abu-abu, selalu terlihat tanpa hover.
- Alur demo bisa diselesaikan dalam 6 klik dari Beranda sampai undangan disetujui.

## Kriteria penerimaan

Rilis diterima jika 12 kasus eval lulus dan semua syarat minimum brief terpenuhi pada laptop demo.

| ID | Diberikan | Ketika | Maka | Kebutuhan |
| --- | --- | --- | --- | --- |
| AC-01 | Data seed standar | Dosen meminta 2 mahasiswa Python + Computer Vision | S-101 sampai S-104 ada di top 5; S-104 berbadge Hidden Talent | FR-R5–R7 |
| AC-02 | Data seed standar | Brief sama | S-105 (hanya sertifikat) di bawah S-101 sampai S-104 | FR-R6 |
| AC-03 | Data seed standar | Brief riset IoT ESP32 | S-106 di posisi 1–3 | FR-R6 |
| AC-04 | S-107 berisi teks prompt injection | Brief Computer Vision | S-107 tidak naik peringkat | FR-R12, AI-8 |
| AC-05 | S-108 berstatus cuti | Brief Computer Vision | S-108 tidak muncul | FR-R5 |
| AC-06 | S-109 punya 3 komitmen aktif | Brief Computer Vision | S-109 muncul dengan tanda Fair Exposure | FR-R7 |
| AC-07 | — | Brief "cari mahasiswa yang bagus" | Worker bertanya balik; run berstatus menunggu klarifikasi | FR-R3 |
| AC-08 | — | Brief skill yang tidak dimiliki siapa pun | Pesan tidak ada yang memenuhi + 3 kandidat terdekat + gap. Status audit: lulus jika skill ada di katalog; skill di luar katalog menghasilkan 0 kandidat (menunggu keputusan fallback) | FR-R10 |
| AC-09 | LLM mengembalikan ID bukti palsu (disimulasikan) | Langkah verify | Alasan palsu dibuang; retry; fallback jika tetap gagal | FR-R9 |
| AC-10 | Run menunggu approval | Permintaan kirim ke API tanpa persetujuan | Ditolak 403 dengan pesan "Butuh persetujuan dosen" | FR-W6 |
| AC-11 | Run selesai | Halaman di-refresh | Jejak kerja, Link Brief, dan token tetap tampil | FR-W4 |
| AC-12 | Eval dijalankan | Membuka `eval/results.md` | Tabel v1 vs v2 terisi dari Token Ledger dan hasil eval (tanpa halaman UI) | FR-W9, AI-5, AI-7 |
| AC-13 | Repo bersih | Mengikuti README | Aplikasi jalan di localhost tanpa langkah tambahan | NFR-3 |
| AC-14 | Guidebook tim 3 orang, mahasiswa aktif | Eligibility Check (jika modul masuk) | Mahasiswa tidak aktif tersaring dengan alasan tertulis | FR-C2 |

## Risiko, asumsi, dan pertanyaan terbuka

Risiko terbesar adalah format API CBN yang belum dikonfirmasi; mitigasinya satu klien LLM dan mode mock agar pekerjaan lain tidak terhenti.

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Lapisan HTTP API belum ada (temuan audit) | UI dan pipeline tidak tersambung; demo nyata mustahil | Route Handler tipis di atas fungsi yang ada; prioritas pertama backend; mockup tetap jadi cadangan demo |
| Isi alasan AI tidak diverifikasi, hanya ID bukti | AI bisa menambah detail yang tidak ada di bukti | Setiap alasan wajib punya chip bukti yang bisa dibuka; dosen memeriksa sebelum menyetujui |
| Halaman Scorecard ditunda | Bukti efisiensi token tidak terlihat di aplikasi | Tampilkan `eval/results.md` di README dan slide |
| Format API CBN berbeda dari asumsi | Pipeline belum bisa memanggil LLM | Semua panggilan lewat `lib/llm.ts`; mode mock untuk UI dan test; konfirmasi ke mentor sebelum 18.00 |
| API tidak mendukung structured output | JSON sering rusak | Instruksi JSON di prompt + validasi Zod + retry + fallback template |
| Rate limit atau koneksi gagal saat demo | Demo terhenti | Video cadangan; satu run contoh tersimpan di database untuk ditunjukkan |
| Waktu build tidak cukup | Modul tambahan tidak selesai | Checkpoint 20.00, 24.00, 04.00 dengan aturan potong cakupan |
| Juri menganggap data sintetis tidak meyakinkan | Nilai idea turun | Jelaskan desain data tanam dan rencana uji coba dengan data teranonimkan |
| Nama TalentLink dipakai produk Cornerstone | Pertanyaan juri | Selalu pakai nama lengkap TalentLink Campus; siapkan jawaban perbedaan |

**Asumsi:**

- API CBN dapat diakses dari laptop tim selama event.
- Batas submission adalah 10 Oktober 2026 pukul 09.00 WIB (brief tertulis 10 September; perlu dikonfirmasi).
- Demo di localhost diterima, sesuai brief.

**Pertanyaan terbuka:**

- [x] Base URL, autentikasi, dan nama model API CBN (gateway LiteLLM kompatibel OpenAI; model qwen; lihat `.env.example`)
- [ ] Fallback kandidat terdekat untuk skill di luar katalog (AC-08)
- [ ] Pipeline dijalankan di latar belakang dengan `after()` atau ditunggu dalam request
- [ ] Dukungan structured output JSON dan batas rate limit
- [ ] Ada dashboard pemakaian token resmi untuk dicocokkan dengan Token Ledger?
- [ ] Konfirmasi batas submission ke panitia
- [ ] Validasi masalah ke dosen PENS dan minta satu topik riset nyata untuk demo

## Skill dan aturan untuk AI coding assistant

AI coding assistant hanya memuat 3 skill dari GitHub dan 2 skill proyek yang pendek, karena setiap skill yang terpasang menambah konteks dan token; aturan umum ditulis sekali di `CLAUDE.md` / `AGENTS.md`.

| Area | Skill | Sumber | Dipakai untuk |
| --- | --- | --- | --- |
| Frontend | frontend-design | [anthropics/skills](https://github.com/anthropics/skills) | Arah visual yang khas dan siap produksi, menghindari tampilan generik AI |
| Frontend | talentlink-ui (skill proyek) | `.claude/skills/talentlink-ui/SKILL.md`, ditulis tim dari inspirasi Dribbble | Design tokens TalentLink dan daftar larangan AI slop |
| Backend | backend-efisien (skill proyek) | `.claude/skills/backend-efisien/SKILL.md`, ditulis tim | Aturan backend di bawah |
| Testing logika | test-driven-development | [obra/superpowers](https://github.com/obra/superpowers) | Test dulu untuk skor, verifikasi, eligibility, metrik |
| Testing UI | webapp-testing | [anthropics/skills](https://github.com/anthropics/skills) | Smoke test alur demo dengan Playwright di localhost |

**Cara pasang** (dari root repo):

```bash
npx -y skills add https://github.com/anthropics/skills --skill frontend-design --agent claude-code
npx -y skills add https://github.com/anthropics/skills --skill webapp-testing --agent claude-code
npx -y skills add obra/superpowers --skill test-driven-development --agent claude-code
```

Dengan `--agent claude-code` skill terpasang di `.claude/skills/` proyek. Untuk Antigravity, jalankan tanpa flag itu; skill terpasang di `.agents/skills/`. Pasang skill TDD saja, bukan plugin superpowers lengkap: plugin penuh mewajibkan brainstorming, rencana, dan subagent di setiap fitur, terlalu berat dan boros token untuk 12 jam.

### Frontend: aturan anti AI slop

- Inspirasi Dribbble disimpan di `design/inspiration/` (link + screenshot). Sebelum membuat komponen, ekstrak dulu menjadi design tokens (palet, skala tipografi, spacing, radius, bayangan) di `design/tokens.md` dan `tailwind.config`, lalu tulis ke skill talentlink-ui.
- Dilarang: gradien ungu-biru bawaan, glassmorphism di semua kartu, emoji sebagai ikon, hero ala landing page di aplikasi kerja, grid kartu identik di semua layar, `rounded-3xl` dan bayangan tebal di semua elemen, teks lorem ipsum.
- Basis warna netral dengan aksen biru langit dari inspirasi (`design/tokens.md`); warna maskot (Netra indigo, Jaya oranye) hanya sebagai aksen tipis, tanpa gradien.
- Satu set ikon (misalnya Lucide), satu font sans untuk teks dan satu font mono untuk ID bukti dan angka.
- Hierarki dari data: skor, chip bukti, dan status lebih menonjol daripada dekorasi.
- Setiap komponen punya status kosong, memuat, dan error.
- Teks UI Bahasa Indonesia yang ditulis manusia; kontras minimal WCAG AA; fokus keyboard terlihat.
- Setiap layar dibandingkan dengan inspirasi sebelum commit.

### Backend: aturan efisien

- Semua panggilan LLM lewat `lib/llm.ts`; maksimal 2 panggilan per run ditambah 1 retry.
- Filter, skor, eligibility, dan metrik dihitung di kode, bukan LLM.
- Search memakai satu query SQL dengan JOIN, tanpa query di dalam loop (N+1).
- Indeks pada `evidence(student_id)`, `evidence_skills(skill_id)`, `run_steps(run_id)`, `token_ledger(run_id)`.
- Validasi Zod di setiap endpoint dan setiap output LLM.
- Katalog skill dan hasil parse guidebook di-cache di memori.
- Pipeline berjalan di background; endpoint langsung mengembalikan run\_id; timeout 30 detik per langkah.
- Tanpa abstraksi yang belum dibutuhkan; fungsi kecil dengan tipe jelas.
- Log berisi langkah, status, dan token; tidak pernah API key atau isi data pribadi.

### Testing

- Vitest untuk logika inti, test ditulis dulu: `score.ts`, `verify.ts`, `check_eligibility`.
- `npm run eval` mengukur akurasi dan token pada 12 kasus memakai API CBN asli.
- Satu smoke test Playwright untuk alur demo: Beranda → Tugas baru → Link Brief → Setujui → refresh.
- Unit test dan smoke test memakai `LLM_MOCK=true` agar tidak memakai token.
- `npm run lint && npm test` wajib lulus sebelum AI menyarankan commit.

### Isi `CLAUDE.md` / `AGENTS.md`

File ini dibaca setiap sesi, jadi dijaga pendek:

```markdown
# TalentLink Campus — aturan untuk AI coding assistant
- Baca PRD dan spesifikasi MVP sebelum mengubah arsitektur.
- JANGAN menjalankan git commit, git push, git merge, atau git rebase.
  Setelah satu tugas selesai: berhenti, ringkas perubahan, tampilkan perintah
  git yang disarankan untuk dijalankan manusia, dan ingatkan untuk commit.
- Pesan commit: Conventional Commits berbahasa Indonesia, tanpa trailer
  Co-Authored-By atau tautan Claude.
- Frontend: ikuti skill talentlink-ui dan frontend-design.
- Backend: ikuti skill backend-efisien; LLM hanya lewat lib/llm.ts.
- Testing: test dulu untuk logika inti; npm test harus lulus sebelum menyarankan commit.
- Jangan membaca atau menulis file .env.
```

Sumber pemasangan skill: [claudemarketplaces.com](https://claudemarketplaces.com/skills/obra/superpowers/test-driven-development), [vibeindex.ai](https://vibeindex.ai/skills/obra/superpowers/test-driven-development).

## Alur Git dan aturan commit

Semua perintah git dijalankan manusia; AI coding assistant hanya menuliskan perintahnya dan mengingatkan untuk commit. Atribusi Claude dimatikan di tiga lapis (setting, hook, cek akhir), dan pemakaian AI tetap diungkap di `tech.md` karena brief mewajibkannya.

| Orang | Peran | Waktu paling aktif | Folder yang dipegang | Tugas Git |
| --- | --- | --- | --- | --- |
| Rifqi | Frontend Engineer | Sepanjang build, 16.45–04.00 | `app/` (halaman), `components/`, `design/`, `public/mascots/` | Membuat repo dan commit pertama, lalu branch `feat/ui-*` |
| Rofiq | Backend & AI Engineer | Sepanjang build, 17.00–04.00 | `lib/`, `app/api/`, `scripts/`, skema database | Branch `feat/api-*` dan `feat/worker-*`, merge fitur backend |
| Reyhan | QA & Release Engineer, penanggung jawab pitch | Paruh akhir, 24.00–08.30 (sebelumnya validasi ke mentor dan dosen) | `eval/`, `tests/e2e/`, `README.md`, `tech.md`, `docs/` | Branch `test/*`, `fix/*`, `docs/*`; commit final, tag rilis, hash submission |

**Tanggung jawab Reyhan sebagai QA & Release Engineer:**

- Sebelum 24.00 (tanpa banyak coding): konfirmasi deadline dan endpoint token CBN, validasi masalah ke dosen PENS, minta topik riset nyata untuk demo, susun draf 12 kasus eval.
- 24.00–04.00: commit kasus eval dan smoke test Playwright, jalankan eval v1 vs v2.
- 04.00–06.00: bug bash di laptop demo, perbaiki bug kecil, catat bug besar untuk pemilik kode.
- 06.00–08.30: README, `tech.md`, hasil eval, video demo, slide, cek akhir, tag rilis, hash commit final.

Setelah commit pertama, tidak ada yang commit langsung ke main; semua lewat branch lalu merge. Setiap orang hanya mengubah folder yang dipegangnya agar konflik merge minimal; file bersama seperti \`lib/types.ts\` diubah oleh Rofiq.

### Lapis 1: setting Claude Code (`.claude/settings.json`, ikut di-commit)

```json
{
  "attribution": { "commit": "", "pr": "" },
  "includeGitInstructions": false,
  "permissions": {
    "deny": [
      "Bash(git commit *)",
      "Bash(git push *)",
      "Bash(git merge *)",
      "Bash(git rebase *)",
      "Read(./.env)"
    ]
  }
}
```

- `attribution` dengan string kosong menghapus trailer Co-Authored-By dan baris "Generated with Claude Code" ([dokumentasi settings](https://code.claude.com/docs/en/settings-reference)).
- `includeGitInstructions: false` membuang instruksi commit bawaan dari konteks, sehingga menghemat token.
- Aturan `deny` memastikan AI benar-benar tidak bisa commit, push, atau merge, bukan sekadar diminta.
- Jika memakai sesi cloud atau Remote Control, atur juga `attribution.sessionUrl` sesuai dokumentasi, karena tautan sesi diatur terpisah.

### Lapis 2: hook `commit-msg` (berlaku untuk semua tool, termasuk Antigravity)

File `.githooks/commit-msg`:

```sh
#!/bin/sh
# Hapus baris atribusi AI dari pesan commit
grep -v -i -E '^(co-authored-by:.*(claude|anthropic)|claude-session:)|generated with \[?claude code' "$1" > "$1.tmp"
mv "$1.tmp" "$1"
```

Setiap anggota menjalankan `git config core.hooksPath .githooks` sekali setelah clone.

### Rifqi (Frontend): inisialisasi repo dan branch UI

```bash
git config --global user.name "Rifqi"
git config --global user.email "email-github-rifqi@contoh.com"

npx create-next-app@latest talentlink-campus --ts --tailwind --app --eslint
cd talentlink-campus
git init -b main          # lewati jika create-next-app sudah membuat repo git

mkdir -p .githooks .claude
# buat .githooks/commit-msg, .claude/settings.json, CLAUDE.md sesuai isi di atas
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks
printf ".env\n.env.*\n!.env.example\ndata/*.db\n" >> .gitignore

git add .
git commit -m "chore: inisialisasi proyek TalentLink Campus"
git remote add origin https://github.com/AKUN/talentlink-campus.git
git push -u origin main
```

Lalu di GitHub: Settings → Collaborators → undang Rofiq, Reyhan, dan akun panitia (brief mewajibkan akses panitia).

Setelah repo siap, Rifqi bekerja di branch frontend:

```bash
git switch -c feat/ui-beranda-worker
# setiap satu layar selesai dan sudah dibandingkan dengan inspirasi:
git add app components design public/mascots
git commit -m "feat(ui): beranda dan kartu tim Digital Worker"
git push -u origin feat/ui-beranda-worker
```

### Rofiq (Backend & AI): branch fitur

```bash
git clone https://github.com/AKUN/talentlink-campus.git
cd talentlink-campus
git config user.name "Rofiq"
git config user.email "email-github-rofiq@contoh.com"
git config core.hooksPath .githooks

git switch -c feat/research-matching

# setiap satu tugas selesai dan npm test lulus:
git status
git add lib/worker app/api            # tambahkan file yang memang berubah
git commit -m "feat(research): skor kandidat berbasis bukti"
git push -u origin feat/research-matching
```

Sinkron dengan main sebelum merge:

```bash
git fetch origin
git merge origin/main
npm test
git push
```

Merge ke main (lewat Pull Request di GitHub, atau dari terminal):

```bash
git switch main
git pull origin main
git merge --no-ff feat/research-matching -m "merge: research matching"
git push origin main
```

Fitur berikutnya selalu dari main terbaru:

```bash
git switch main && git pull origin main
git switch -c feat/competition-matching
```

### Reyhan (QA & Release): test, perbaikan, dokumen, dan rilis

```bash
git clone https://github.com/AKUN/talentlink-campus.git
cd talentlink-campus
git config user.name "Reyhan"
git config user.email "email-github-reyhan@contoh.com"
git config core.hooksPath .githooks

# 24.00 — kasus eval dan smoke test
git switch -c test/eval-dan-smoke
git add eval/cases.json
git commit -m "test(eval): 12 kasus eval berlabel"
git add tests/e2e
git commit -m "test(e2e): smoke test alur demo Netra"
git push -u origin test/eval-dan-smoke
# merge ke main seperti langkah Rofiq

# 04.00 — bug bash setelah feature freeze
git switch main && git pull origin main
git switch -c fix/bug-bash
git add <file-yang-diperbaiki>
git commit -m "fix(ui): pesan error saat API CBN timeout"
git push -u origin fix/bug-bash
# merge ke main

# 06.00 — dokumen final dan hasil eval
git switch main && git pull origin main
git switch -c docs/final-submission
git add eval/results.md eval/results.json
git commit -m "docs(eval): hasil eval v1 vs v2"
git add README.md tech.md
git commit -m "docs: README dan usage disclosure"
git push -u origin docs/final-submission
# merge ke main

# 08.15 — cek akhir dan rilis
git switch main && git pull origin main
git log --format=%B | grep -i -E "co-authored-by|generated with claude|claude-session" || echo "Atribusi bersih"
git ls-files | grep -E "^\.env$" && echo "HAPUS .env DARI REPO" || echo ".env aman"
git tag -a v1.0-submission -m "Final submission PENS Hackathon 2026"
git push origin v1.0-submission
git rev-parse HEAD        # salin hash ini ke form submission
```

### Format pesan commit

Conventional Commits berbahasa Indonesia: `tipe(scope): ringkasan`.

- Tipe: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`
- Scope: `research`, `competition`, `ui`, `api`, `db`, `llm`, `eval`
- Contoh: `feat(ui): kartu tim Digital Worker di beranda`, `test(research): kasus prompt injection S-107`, `fix(llm): retry saat JSON tidak valid`

### Jadwal pengingat commit

Commit setiap satu tugas selesai, minimal sekali per jam; brief menilai commit history yang utuh.

| Jam | Commit wajib | Oleh |
| --- | --- | --- |
| 17.00 | Inisialisasi repo, setting, hook, CLAUDE.md | Rifqi |
| 18.00 | Skema database dan seed data | Rofiq |
| 18.00 | Layout, Beranda, kartu tim Digital Worker | Rifqi |
| 20.00 | Checkpoint 1: pipeline jalan di CLI | Rofiq |
| 22.00 | Endpoint API | Rofiq |
| 22.00 | Tugas baru, Run Timeline, Link Brief, panel bukti | Rifqi |
| 24.00 | Checkpoint 2: integrasi demo utama (merge kedua branch) | Rofiq dan Rifqi |
| 01.00 | 12 kasus eval dan smoke test | Reyhan |
| 02.00 | Competition Matching backend dan UI | Rofiq dan Rifqi |
| 04.00 | Feature freeze; hasil eval v1 vs v2 | Reyhan |
| 06.00 | Perbaikan bug dari bug bash | Reyhan (bug besar oleh pemilik kode) |
| 08.30 | README, tech.md, tag rilis, hash commit final | Reyhan |

**Usage disclosure:** `tech.md` tetap mencantumkan AI coding assistant yang dipakai (Claude Code atau Antigravity), skill yang dipasang, dan pekerjaan yang dibantu AI. Mematikan atribusi di commit tidak menghapus kewajiban ini.

## Rencana rilis dan dokumen terkait

Rilis dibagi dalam empat checkpoint; setiap checkpoint menentukan apakah cakupan berikutnya dikerjakan atau dipotong.

| Waktu | Checkpoint | Isi |
| --- | --- | --- |
| Jumat 20.00 | Pipeline jalan di terminal | Seed, skor, parse, explain, verify; CLI mencetak shortlist berbukti |
| Jumat 24.00 | Demo utama jalan di UI | Research Matching penuh, persistensi, approval, Token Ledger |
| Sabtu 04.00 | Feature freeze | Competition Matching (jika lolos checkpoint), hasil eval v1 vs v2 di `eval/results.md`, poles UI |
| Sabtu 08.30 | Commit final | Eval v1 vs v2, README, `tech.md`, video, slide |

**Setelah hackathon (roadmap):** Digital Worker Kanca untuk Career Readiness, halaman Rapor/Scorecard di aplikasi, skill beasiswa dan magang, pencocokan lowongan untuk mahasiswa tingkat akhir, consent dan portal profil mahasiswa, uji coba satu prodi di PENS dengan data teranonimkan, tracer study alumni, dan pemasangan sebagai role di platform Digital Worker seperti milik CBN.

**Dokumen terkait:**

- [TalentLink Campus — Konsep Lengkap](https://claude.ai/code/artifact/1b624662-65c9-4bd5-a979-4397e9e560bf): posisi terhadap brief, kriteria juri, slide, checklist submission
- [TalentLink Campus — Spesifikasi MVP 12 Jam](https://claude.ai/code/artifact/5bbbbda0-aebe-456f-b79d-804c1c0b3b69): stack, skema database, rumus skor, prompt, endpoint, data sintetis, integrasi API CBN, pembagian kerja. **Belum diperbarui** mengikuti revisi ini; jika berbeda, PRD ini yang berlaku.
- `docs/kontrak-frontend-backend.md`: pembagian folder dan kontrak API
- `docs/penyesuaian-mockup-audit.md`: penyesuaian mockup terhadap audit dan usulan perilaku endpoint
- `docs/perubahan-cakupan-netra-jaya.md`: dampak revisi ini ke frontend dan backend
- `docs/bisnis-dan-alur-kerja.md`: model bisnis dan alur kerja per pengguna

## Riwayat perubahan

| Tanggal | Perubahan | Alasan |
| --- | --- | --- |
| 9 Okt 2026, malam | Cakupan dipersempit ke Netra (Research Matching) dan Jaya (Competition Matching). Kanca, Career Readiness, US-13, US-14, FR-K1–K4, dan persona Mbak Sari dihapus | Fokus ke alur utama setelah audit integrasi |
| 9 Okt 2026, malam | Halaman Scorecard/Rapor ditunda dari UI; eval tetap lewat skrip dan `eval/results.md` | Menyederhanakan MVP; logika metrik sulit dipahami pengguna |
| 9 Okt 2026, malam | Ditambah bagian Status implementasi, FR-W10 (lapisan HTTP API), FR-R13 dan US-15 (belum ada bukti vs tidak menguasai), catatan audit di FR-R10, AI-2, AC-08, AC-10, AC-12, serta risiko baru | Temuan audit integrasi frontend–backend |
| 9 Okt 2026, malam | Layar disesuaikan dengan mockup: istilah CBN Digital Worker, form Tugaskan satu kartu, "Setujui dan undang" satu klik, peran di bar atas | Penyederhanaan alur dan bahasa bisnis CBN |
