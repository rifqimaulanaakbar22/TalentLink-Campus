/**
 * Alamat tujuan setelah login. Hanya path internal yang diterima
 * (mencegah open redirect seperti "//situs-lain.com" atau "https://...").
 */
export function safeNext(value: string | string[] | undefined | null): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  if (v === "/login" || v.startsWith("/login?") || v.startsWith("/api/")) return "/";
  return v;
}
