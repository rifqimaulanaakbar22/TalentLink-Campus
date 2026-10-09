# Naskah presentasi TalentLink Campus (4 slide)

Untuk PENS Hackathon 2026, track CBN Digital Campus Worker. Setiap slide berisi: apa yang tampil di layar, naskah bicara, dan catatan untuk pembicara. Total sekitar 4 menit; demo langsung paling pas diletakkan setelah slide 2.

**Aturan isi:** angka di naskah ini hanya angka yang sudah diukur dari aplikasi. Bagian bertanda **[isi]** wajib dilengkapi data asli (misalnya kutipan dosen PENS) atau dihapus sebelum tampil.

---

## Slide 1. Masalah: talenta kampus ada, tapi tidak terlihat

**Durasi:** sekitar 60 detik

**Yang tampil di slide**

Judul: *Kampus punya talenta. Yang tidak ada: cara menemukannya.*

Tiga kolom, satu per pengguna, masing-masing dengan satu kalimat keresahan:

| Dosen peneliti | Tendik kemahasiswaan | Mahasiswa |
| --- | --- | --- |
| "Saya cari anggota riset dari mahasiswa yang pernah saya ajar." | "Syarat lomba saya cek satu per satu di spreadsheet." | "Saya bisa, tapi tidak pernah ditawari karena belum pernah juara." |

Satu baris di bawah: *Datanya sebenarnya sudah ada: nilai, proyek, sertifikat, pengalaman asisten. Hanya tersebar dan tidak dipakai untuk mengambil keputusan.*

**Naskah bicara**

> Bapak dan Ibu juri, coba bayangkan Bu Rina, dosen yang baru dapat hibah riset deteksi objek. Ia butuh dua mahasiswa yang kuat di Python dan Computer Vision. Yang ia lakukan hari ini: mengingat-ingat mahasiswa yang pernah ia ajar, lalu bertanya ke kolega. Mahasiswa hebat dari kelas lain tidak pernah masuk radarnya.
>
> Di gedung sebelah, staf kemahasiswaan menerima guidebook lomba. Syaratnya semester berapa, prodi apa, tim berapa orang. Semuanya dicek manual, dan yang akhirnya dikirim biasanya mahasiswa yang itu-itu saja, karena merekalah yang dikenal.
>
> Dan ada mahasiswa seperti Dwi: punya dua proyek Computer Vision dan pernah jadi asisten praktikum, tapi belum pernah juara. Di sistem mana pun, ia tidak terlihat.
>
> Masalahnya bukan kampus kekurangan data. Nilai, proyek, sertifikat, pengalaman asisten, semuanya ada. Masalahnya, data itu tersebar, dan tidak ada yang menggunakannya untuk mencari orang yang tepat.

**Catatan pembicara**

- Bu Rina dan Dwi adalah tokoh rekaan untuk cerita. Kalau tim sudah mewawancarai dosen atau staf PENS, ganti kutipan di slide dengan kutipan asli dan sebut sumbernya, misalnya "dosen Teknik Informatika PENS". **[isi: 1–3 kutipan asli]**
- Kalau mau mengaitkan ke indikator kampus (misalnya keterlibatan mahasiswa dalam riset dan lomba di IKU perguruan tinggi), cek dulu versi IKU yang berlaku. **[isi atau hapus]**
- Jangan menyebut angka "berhari-hari" atau "puluhan jam" kecuali ada sumbernya.

---

## Slide 2. Solusi: tim Digital Worker yang menunjuk bukti

**Durasi:** sekitar 75 detik, lalu lanjut ke demo

**Yang tampil di slide**

Judul: *TalentLink Campus: Digital Worker yang mencarikan mahasiswa, dengan bukti.*

Kiri, dua kartu pegawai (tangkapan layar menu Tim):

- **Netra**, Research Talent Officer di LPPM: dosen menulis kebutuhan riset, Netra menyusun shortlist berbukti.
- **Jaya**, Competition Team Officer di Bagian Kemahasiswaan: staf menempelkan guidebook, Jaya menyaring syarat dan menyusun tim.

Kanan, tiga prinsip:

1. **Skor dihitung di kode, bukan ditebak AI.** Setiap alasan punya chip ID bukti yang bisa dibuka.
2. **Manusia memegang keputusan.** Tidak ada undangan yang terkirim tanpa persetujuan.
3. **Adil dan hemat.** Hidden Talent, Fair Exposure, dan pemakaian token yang tercatat per langkah.

Bawah, angka hasil uji dengan API CBN asli:

| Ukuran | Hasil |
| --- | --- |
| Waktu satu penugasan Netra | sekitar 17 detik |
| Token Jalur Hemat vs Jalur Pembanding (brief sama) | 2.109 vs 15.608 token, 7,4 kali lebih hemat |
| Waktu satu penugasan Jaya | 15–21 detik |

**Naskah bicara**

> Solusi kami adalah TalentLink Campus: tim Digital Worker di platform CBN. Mereka bekerja seperti pegawai baru, lengkap dengan jabatan, penempatan, atasan, tingkat kemampuan, knowledge base, dan hak akses.
>
> Netra ditempatkan di LPPM. Bu Rina cukup menulis kebutuhannya dalam bahasa sehari-hari. Dalam sekitar 17 detik, Netra menyerahkan shortlist lima mahasiswa beserta skornya. Setiap alasan menunjuk bukti yang bisa dibuka: proyek, nilai mata kuliah, atau pengalaman asisten. Di situ Dwi muncul, dengan tanda Hidden Talent.
>
> Jaya ditempatkan di Bagian Kemahasiswaan. Staf tinggal menempelkan guidebook lomba. Jaya menyaring siapa yang memenuhi syarat dan menuliskan alasan untuk yang tersaring, lalu menyusun tim dengan peran berbeda. Ia juga memeriksa konflik, misalnya mahasiswa yang baru saja disetujui untuk riset Netra.
>
> Tiga hal membuat sistem ini bisa dipercaya. Pertama, skor dihitung di kode, bukan ditebak AI. AI hanya membaca permintaan dan menulis alasan, dan setiap ID bukti diverifikasi. Kedua, tidak ada satu pun undangan yang terkirim tanpa persetujuan dosen atau staf. Ketiga, sistem ini hemat: dengan Jalur Hemat, satu penugasan memakai sekitar dua ribu token, tujuh kali lebih sedikit daripada mengirim semua data ke AI.
>
> Mari kita lihat langsung.

**Catatan pembicara**

- Pindah ke demo setelah kalimat terakhir. Urutan demo: menu Tim → Tugaskan Netra → jejak kerja bergerak → klik chip bukti → Setujui dan undang (SIMULASI) → refresh halaman. Jaya cukup 30–45 detik sebagai bukti "satu mesin, dua unit".
- Kalau juri bertanya soal data: semua data di demo **sintetis** (80 mahasiswa, 20 skill), dan labelnya selalu terlihat di layar.
- Angka token dan waktu di atas berasal dari Token Ledger saat uji dengan API CBN asli. Kalau tim menjalankan `npm run eval` sebelum presentasi, ganti dengan angka rata-rata dari `eval/results.md`.

---

## Slide 3. Peluang bisnis: paket peran kampus di atas platform CBN

**Durasi:** sekitar 60 detik

**Yang tampil di slide**

Judul: *Satu Talent Graph, banyak unit kampus.*

Kiri, siapa membayar dan siapa memakai:

| Peran | Siapa |
| --- | --- |
| Pembeli | Pimpinan kampus (wakil direktur bidang akademik / kemahasiswaan) |
| Pengguna harian | Dosen dan staf unit |
| Penyedia platform | CBN: platform Digital Worker, model AI, alokasi token |
| TalentLink | Paket peran khusus kampus: alur kerja, rumus skor berbukti, aturan tata kelola |

Kanan, model jual:

- **Langganan per Digital Worker per unit per tahun**, seperti merekrut satu staf digital.
- **Biaya AI transparan**: token per worker terlihat di Neraca Token.
- **Jalur masuk**: pilot gratis di satu prodi dengan data teranonimkan, lalu diperluas per unit.
- **Saluran**: penjualan enterprise CBN ke kampus; tim TalentLink sebagai mitra solusi.

Bawah, ukuran keberhasilan: waktu dari kebutuhan sampai anggota terpilih, shortlist yang disetujui tanpa diubah, jumlah mahasiswa unik yang mendapat kesempatan, Hidden Talent yang diundang, dan biaya AI per penugasan.

**Naskah bicara**

> Dari sisi bisnis, TalentLink Campus adalah paket peran kampus yang siap pakai di atas platform CBN Digital Worker. CBN menyediakan platform, model AI, dan infrastrukturnya. Kami menyediakan pengetahuan khusus kampus: alur kerja, rumus skor berbukti, dan aturan tata kelolanya.
>
> Pembelinya pimpinan kampus, penggunanya dosen dan staf. Modelnya langganan per Digital Worker per unit, sama seperti merekrut staf, tapi biayanya terukur: setiap token yang dipakai Netra dan Jaya tercatat dan terlihat di Neraca Token.
>
> Yang membuat ini bisa berkembang: satu Talent Graph dipakai bersama oleh banyak unit. Hari ini LPPM dan Bagian Kemahasiswaan. Besok Career Center, unit magang, atau pengelola beasiswa, semuanya membaca sumber talenta yang sama, sehingga tanda Fair Exposure dan cek konflik berlaku lintas unit.
>
> Jalur masuknya sederhana: pilot gratis di satu prodi dengan data teranonimkan. Keberhasilannya diukur dengan angka yang dipahami pimpinan: berapa cepat dosen mendapat anggota riset, dan berapa mahasiswa baru yang mendapat kesempatan.

**Catatan pembicara**

- Belum ada angka harga. Kalau ditanya, jawab bahwa harga akan divalidasi bersama kampus pilot dan CBN, dengan pembanding biaya satu staf administrasi per unit. **[isi jika sudah ada hipotesis harga]**
- Kalau ingin menyebut ukuran pasar (jumlah perguruan tinggi di Indonesia), ambil dari data resmi PDDikti dan sebut tahunnya. **[isi atau hapus]**
- Siapkan jawaban untuk dua pertanyaan yang hampir pasti muncul:
  - **"Datanya dari mana di kampus nyata?"** Bertahap: (1) nilai dari SIAKAD dan data prestasi kemahasiswaan, (2) SKPI, daftar asisten laboratorium, dan data penelitian LPPM, (3) portofolio yang diisi mahasiswa lalu diverifikasi dosen. Semua dibaca saja, tidak diubah.
  - **"Bagaimana privasi mahasiswa?"** Nama tidak pernah dikirim ke AI, cukup kode mahasiswa. Hanya bukti yang relevan yang dikirim. Skor tidak memakai nama, gender, atau foto. Setiap panggilan AI tercatat. Pilot memakai data teranonimkan dan mengikuti UU Pelindungan Data Pribadi.

---

## Slide 4. Untuk masa depan

**Durasi:** sekitar 45 detik

**Yang tampil di slide**

Judul: *Dari prototipe ke staf digital kampus.*

Tiga tahap, sebagai garis waktu:

| Tahap | Fitur |
| --- | --- |
| **Berikutnya** | Unggah guidebook PDF dan gambar poster lomba · Login SSO kampus · Undangan lewat email dan WhatsApp resmi kampus · Halaman Rapor untuk uji ketepatan worker |
| **Pilot kampus** | Integrasi bertahap SIAKAD, SKPI, dan data prestasi · Portal profil mahasiswa untuk persetujuan dihubungi (consent) dan melengkapi portofolio · Umpan balik dosen atas shortlist untuk menyetel bobot skor |
| **Skala** | Worker ketiga: Kanca, Career Readiness Officer di Career Center · Level L3 Koordinator: menyusun tim lintas unit · Satu Talent Graph untuk banyak kampus di platform CBN |

**Naskah bicara**

> Prototipe ini sudah berjalan dengan API CBN asli. Langkah berikutnya membuatnya siap dipakai sehari-hari: guidebook bisa diunggah sebagai PDF atau foto poster, login memakai akun kampus, dan undangan dikirim lewat email atau WhatsApp resmi, tetap hanya setelah disetujui.
>
> Saat pilot, kami menyambungkan data kampus secara bertahap dan memberi mahasiswa portal sendiri, tempat mereka menyetujui untuk dihubungi dan melengkapi portofolio. Setiap kali dosen menyetujui atau mengubah shortlist, itu jadi umpan balik untuk menyetel bobot skor.
>
> Setelah itu tim bertambah. Kanca akan bertugas di Career Center untuk kesiapan karier mahasiswa tingkat akhir. Worker yang lulus uji ketepatan secara konsisten bisa naik ke level L3 dan menyusun tim lintas unit, persis seperti siklus hidup pegawai yang dikelola atasannya.
>
> TalentLink Campus: talenta kampus yang tadinya tersembunyi, kini bisa ditemukan, dengan bukti, dan dengan keputusan tetap di tangan manusia. Terima kasih.

**Catatan pembicara**

- Fitur di slide ini **belum dibuat**. Sebut sebagai rencana, jangan sebagai fitur yang sudah ada.
- Kalimat penutup sebaiknya dihafal, karena itu yang paling diingat juri.

---

## Ringkasan waktu

| Bagian | Durasi |
| --- | --- |
| Slide 1. Masalah | sekitar 60 detik |
| Slide 2. Solusi | sekitar 75 detik |
| Demo langsung | 2–3 menit |
| Slide 3. Peluang bisnis | sekitar 60 detik |
| Slide 4. Masa depan dan penutup | sekitar 45 detik |

Sesuaikan dengan batas waktu presentasi dari panitia. **[isi: durasi resmi]**
