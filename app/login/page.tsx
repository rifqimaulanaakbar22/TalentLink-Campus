import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Link2, LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/app/login-form";
import { Mascot } from "@/components/app/mascot";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/session";
import { safeNext } from "../_lib/safe-next";

export const metadata: Metadata = { title: "Masuk | TalentLink Campus" };

const TEAM = [
  { id: "netra" as const, name: "Netra", job: "Research Talent Officer di LPPM" },
  { id: "jaya" as const, name: "Jaya", job: "Competition Team Officer di Bagian Kemahasiswaan" },
];

/** Halaman login: kartu terbelah dua (inspirasi 05) dengan tema TalentLink. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  const demoAccounts = DEMO_ACCOUNTS.map((a) => ({ ...a, roleLabel: ROLE_LABEL[a.role] }));

  return (
    <main
      id="konten"
      className="flex min-h-dvh items-center justify-center px-4 py-8 md:min-h-[calc(100dvh-2.5rem)] md:py-0"
    >
      <div className="grid w-full max-w-240 overflow-hidden rounded-panel bg-surface shadow-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Panel identitas: pengganti foto di inspirasi */}
        <section
          aria-label="Tentang TalentLink Campus"
          className="pattern-circuit flex flex-col bg-brand-600 px-8 py-8 text-white md:px-10 md:py-12"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-white text-brand-600">
              <Link2 aria-hidden className="size-6" strokeWidth={2.4} />
            </span>
            <span className="text-lg font-semibold">TalentLink Campus</span>
          </div>

          <p className="mt-8 text-[28px] leading-9 font-semibold tracking-tight md:mt-14 md:text-[34px] md:leading-10">
            Setiap rekomendasi terhubung ke bukti.
          </p>
          <p className="mt-3 max-w-sm text-[15px] leading-5.5 text-white/90">
            Tim Digital Worker kampus mencarikan mahasiswa untuk riset dan lomba. Anda tetap memegang keputusan.
          </p>

          <ul className="mt-8 hidden space-y-3 md:block">
            {TEAM.map((w) => (
              <li key={w.id} className="flex items-center gap-3 rounded-field bg-white/10 px-3 py-2.5">
                <span className="rounded-full bg-white p-0.5">
                  <Mascot workerId={w.id} size={36} decorative className="ring-0 ring-offset-0" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{w.name}</span>
                  <span className="block text-[13px] text-white/85">{w.job}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-auto hidden pt-10 text-xs text-white/80 md:block">
            Data mahasiswa di prototipe ini sintetis.
          </p>
        </section>

        {/* Form */}
        <section aria-labelledby="judul-login" className="px-6 py-8 sm:px-10 md:py-12">
          <h1 id="judul-login" className="text-[34px] leading-10 font-semibold tracking-tight text-brand-600 sm:text-[40px] sm:leading-12">
            Selamat datang
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-[15px] text-ink-muted">
            <LockKeyhole aria-hidden className="size-4" />
            Masuk dengan email kampus Anda.
          </p>
          <div className="mt-8">
            <LoginForm next={next} demoAccounts={demoAccounts} demoPassword={DEMO_PASSWORD} />
          </div>
          <p className="mt-8 border-t border-line pt-5 text-[13px] leading-4.5 text-ink-muted">
            Belum punya akun? Akun dibuat oleh admin LPPM atau Bagian Kemahasiswaan.
          </p>
        </section>
      </div>
    </main>
  );
}
