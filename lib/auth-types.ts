// Tipe dan konstanta bersama fitur login. Berkas murni tanpa modul server: aman diimpor proxy.ts dan frontend.

/** Nama cookie sesi (httpOnly). Dipakai proxy.ts, jadi berkas ini tidak boleh mengimpor modul database. */
export const SESSION_COOKIE = "tl_session";

export const AUTH_MSG = {
  invalid: "Email atau kata sandi salah.",
  needLogin: "Sesi Anda berakhir. Silakan masuk lagi.",
} as const;

export type UserRole = "dosen" | "kemahasiswaan";

export const ROLE_LABEL: Record<UserRole, string> = {
  dosen: "Dosen peneliti",
  kemahasiswaan: "Staf kemahasiswaan",
};

/** Pengguna yang sedang login. Tidak pernah memuat hash kata sandi. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  roleLabel: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}
