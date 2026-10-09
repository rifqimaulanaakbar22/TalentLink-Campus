// Contoh guidebook lomba SINTETIS untuk demo, test, dan contoh di form Jaya.
// Nama lomba dan penyelenggara fiktif; bukan dokumen resmi.

export const SAMPLE_GUIDEBOOKS = [
  {
    id: "ai-nasional",
    label: "Lomba Inovasi AI Nasional",
    text: `Lomba Inovasi AI Nasional 2026 (sintetis)

Ketentuan peserta:
- Peserta adalah mahasiswa aktif program D4, semester 3 sampai 7.
- Terbuka untuk semua prodi.
- Satu tim terdiri dari 3 orang. Setiap kampus boleh mengirim maksimal 2 tim.

Tema: solusi kecerdasan buatan untuk layanan publik, misalnya deteksi objek dari kamera atau analisis teks pengaduan warga.

Peran yang disarankan dalam tim:
1. Pengembang model AI: menguasai Python dan Deep Learning atau Computer Vision.
2. Pengembang aplikasi: membangun aplikasi web (frontend dan backend) untuk demo.
3. Penulis proposal dan presenter: menulis proposal teknis dan mempresentasikan di babak final.`,
  },
  {
    id: "iot-smart-campus",
    label: "Kompetisi IoT Smart Campus",
    text: `Kompetisi IoT Smart Campus 2026 (sintetis)

Syarat:
- Mahasiswa aktif minimal semester 4.
- Prodi: Teknik Komputer dan Teknik Informatika.
- Tim beranggotakan 3 orang, 1 tim per kampus.

Peserta membangun prototipe pemantauan lingkungan kampus berbasis ESP32 dan Internet of Things,
lengkap dengan dashboard. Tim membutuhkan anggota yang memahami Embedded C dan mikrokontroler,
pengembang backend untuk menerima data sensor, dan satu orang yang mendesain antarmuka dashboard (UI/UX).`,
  },
] as const;
