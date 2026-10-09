// Teks UI per Digital Worker. Komponen dan gaya sama untuk semua worker; hanya isi kalimatnya yang berbeda.
import { ListChecks, Mail, Sparkles, SquareMousePointer, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import type { StepName, WorkerId } from "./types";

export const WORKER_NAME: Record<WorkerId, string> = { netra: "Netra", jaya: "Jaya", kanca: "Kanca" };

export const workerName = (id: WorkerId) => WORKER_NAME[id] ?? "Digital Worker";

/** Worker yang sudah bisa diberi tugas lewat form. */
export const ASSIGNABLE_WORKERS: readonly WorkerId[] = ["netra", "jaya"];

export function parseWorker(value: string | string[] | undefined): WorkerId {
  const v = Array.isArray(value) ? value[0] : value;
  return v && (ASSIGNABLE_WORKERS as readonly string[]).includes(v) ? (v as WorkerId) : "netra";
}

/**
 * Contoh guidebook SINTETIS untuk form Jaya. Salinan dari lib/worker/competition/guidebooks.ts
 * (frontend hanya boleh import type dari lib/, lihat kontrak bagian 2).
 */
const JAYA_EXAMPLES = [
  {
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
];

/** Satu jenis hasil kerja yang diterima pemberi tugas. */
export interface Deliverable {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface FormCopy {
  pageTitle: string;
  pageDescription: string;
  fieldLabel: string;
  placeholder: string;
  hint: string;
  rows: number;
  maxLength: number;
  minHint: string;
  examplesIntro: string;
  examples: { label: string; text: string }[];
  steps: string[];
  submit: string;
  submitting: string;
  eta: string;
  /** Pilihan Jalur Hemat atau Jalur Pembanding (v1) hanya untuk Netra. */
  allowCompare: boolean;
  /** Isi kartu "Yang akan Anda terima" di samping form. */
  deliverables: Deliverable[];
  /** Alasan worker tanpa pilihan jalur selalu memakai Jalur Hemat. */
  fixedPathReason?: string;
}

export function formCopy(id: WorkerId, researchExamples: string[]): FormCopy {
  if (id === "jaya") {
    return {
      pageTitle: "Tugaskan Jaya",
      pageDescription:
        "Tempel isi guidebook lomba. Jaya menyaring syarat, menyusun tim dengan peran berbeda, lalu menunggu persetujuan Anda.",
      fieldLabel: "Isi guidebook lomba",
      placeholder: "Tempel bagian syarat peserta, jumlah anggota tim, tema, dan peran yang dibutuhkan.",
      hint: "Teks saja, maksimal 20.000 karakter. Sertakan syarat semester, prodi, dan jumlah anggota tim jika ada.",
      rows: 12,
      maxLength: 20000,
      minHint: "Tempel isi guidebook, minimal 15 karakter. Sertakan jumlah anggota tim dan bidang lomba.",
      examplesIntro: "Belum punya guidebook? Pakai contoh sintetis:",
      examples: JAYA_EXAMPLES,
      steps: [
        "Membaca guidebook: syarat peserta, jumlah anggota, dan peran tim.",
        "Menyaring mahasiswa yang tidak memenuhi syarat, dengan alasan tertulis.",
        "Menyusun tim di kode agar setiap peran diisi orang yang punya bukti.",
        "Memeriksa konflik: tidak dobel tim dan tidak bentrok dengan tugas riset Netra.",
        "Menunggu persetujuan Anda sebelum mengirim undangan seleksi.",
      ],
      submit: "Tugaskan Jaya",
      submitting: "Menugaskan Jaya…",
      eta: "Usulan tim biasanya siap dalam kurang dari 30 detik.",
      allowCompare: false,
      deliverables: [
        { icon: Users, title: "Usulan tim per peran", text: "Setiap peran diisi mahasiswa yang punya bukti, dan tidak ada yang masuk dua tim." },
        { icon: ListChecks, title: "Daftar yang tersaring", text: "Mahasiswa yang tidak memenuhi syarat lomba tercatat beserta alasan tertulisnya." },
        { icon: TriangleAlert, title: "Peringatan konflik", text: "Tanda jika mahasiswa baru disetujui untuk riset Netra atau sudah banyak dilibatkan." },
        { icon: Mail, title: "Draf undangan seleksi", text: "Bisa Anda edit, dan baru terkirim setelah Anda menyetujui." },
      ],
      fixedPathReason: "Syarat peserta dan susunan tim dihitung di kode; AI hanya membaca guidebook dan menulis alasan.",
    };
  }
  return {
    pageTitle: "Tugaskan Netra",
    pageDescription:
      "Tulis kebutuhan riset dalam bahasa sehari-hari. Netra menyiapkan Link Brief berbukti dan menunggu persetujuan Anda.",
    fieldLabel: "Kebutuhan riset Anda",
    placeholder: "Contoh: Saya butuh 2 mahasiswa yang kuat Python dan Computer Vision untuk riset deteksi objek.",
    hint: "Sebutkan topik, skill, jumlah orang, dan semester minimum jika ada.",
    rows: 5,
    maxLength: 4000,
    minHint: "Tulis minimal 15 karakter. Sebutkan topik riset atau skill yang dibutuhkan.",
    examplesIntro: "Belum tahu harus menulis apa? Pakai salah satu contoh:",
    examples: researchExamples.map((text) => ({ label: text, text })),
    steps: [
      "Memahami kebutuhan Anda, dan bertanya balik jika belum jelas.",
      "Menelusuri nilai, proyek, dan pengalaman asisten mahasiswa aktif.",
      "Menghitung skor di kode, bukan menebak dengan AI.",
      "Menulis alasan yang masing-masing menunjuk bukti.",
      "Menunggu persetujuan Anda sebelum mengundang mahasiswa.",
    ],
    submit: "Tugaskan Netra",
    submitting: "Menugaskan Netra…",
    eta: "Link Brief biasanya siap dalam kurang dari 30 detik.",
    allowCompare: true,
    deliverables: [
      { icon: ListChecks, title: "Shortlist berskor", text: "Lima kandidat teratas dengan skor 0–100 yang dihitung di kode dari nilai, proyek, dan pengalaman." },
      { icon: SquareMousePointer, title: "Alasan yang menunjuk bukti", text: "Setiap alasan punya chip ID bukti yang bisa Anda buka untuk melihat sumbernya." },
      { icon: Sparkles, title: "Hidden Talent dan Fair Exposure", text: "Mahasiswa berpotensi yang belum pernah juara ikut terlihat, dan yang sudah sering dilibatkan diberi tanda." },
      { icon: Mail, title: "Draf undangan riset", text: "Bisa Anda edit, dan baru terkirim setelah Anda menyetujui." },
    ],
  };
}

/** Label langkah di jejak kerja. Nama langkah sama untuk semua worker (kontrak bagian 4). */
export function stepLabels(id: WorkerId): Record<StepName, string> {
  if (id === "jaya") {
    return {
      parse: "Membaca guidebook",
      normalize: "Memetakan skill peran",
      search: "Memeriksa syarat peserta",
      score: "Menyusun tim",
      explain: "Menulis alasan berbukti",
      verify: "Verifikasi bukti dan konflik",
      brief: "Menyusun usulan tim",
    };
  }
  return {
    parse: "Memahami brief",
    normalize: "Menormalkan skill",
    search: "Mencari kandidat",
    score: "Menghitung skor",
    explain: "Menulis alasan berbukti",
    verify: "Verifikasi ID bukti",
    brief: "Menyusun Link Brief",
  };
}
