// Profil kerja Digital Worker dalam istilah CBN Digital Worker:
// jabatan, penempatan, tingkat kemampuan, knowledge base, hak akses, siklus hidup.
// Data tampilan saja; tidak mengubah kontrak API.
import type { WorkerId } from "./types";

/**
 * Cakupan MVP: Netra dan Jaya, keduanya bertugas.
 * Kanca dikeluarkan dari cakupan. Tipe WorkerId di backend masih memuat "kanca",
 * jadi frontend menyaring daftar worker dengan konstanta ini.
 */
export const DISPLAYED_WORKERS: readonly WorkerId[] = ["netra", "jaya"];

export const LEVELS = [
  { code: "L1", name: "Asisten", scope: "Mencari kandidat dari knowledge base" },
  { code: "L2", name: "Analis", scope: "Menilai dan menjelaskan dengan bukti; kirim pesan butuh persetujuan" },
  { code: "L3", name: "Koordinator", scope: "Menyusun tim lintas unit; naik jika lulus uji ketepatan dan disetujui atasan" },
] as const;

export type Lifecycle = "pelatihan" | "bertugas";

export interface WorkerProfile {
  employeeId: string;
  lifecycle: Lifecycle;
  knowledgeBase: string[];
  access: string;
  deliverable: string;
}

export const WORKER_PROFILE: Partial<Record<WorkerId, WorkerProfile>> = {
  netra: {
    employeeId: "DW-LPPM-01",
    lifecycle: "bertugas",
    knowledgeBase: ["Talent Graph kampus: 80 mahasiswa, ±400 bukti (Sintetis)", "Katalog 20 skill beserta sinonimnya"],
    access: "Membaca data mahasiswa. Tidak bisa mengubah data akademik.",
    deliverable: "Link Brief: shortlist berbukti dan draf undangan",
  },
  jaya: {
    employeeId: "DW-KMHS-01",
    lifecycle: "bertugas",
    knowledgeBase: ["Guidebook lomba yang diunggah", "Talent Graph kampus"],
    access: "Membaca data mahasiswa dan guidebook lomba.",
    deliverable: "Usulan tim lomba yang lolos syarat",
  },
};
