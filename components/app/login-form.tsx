"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, Lock, LogIn, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input-field";
import { authApi } from "@/app/_lib/api";
import type { UserRole } from "@/lib/auth-types";
import { Mascot } from "./mascot";

export interface DemoAccount {
  email: string;
  name: string;
  roleLabel: string;
  role: UserRole;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WORKER_OF: Record<UserRole, "netra" | "jaya"> = { dosen: "netra", kemahasiswaan: "jaya" };

type FieldErrors = { email?: string; password?: string };

export function LoginForm({
  next,
  demoAccounts,
  demoPassword,
}: {
  next: string;
  demoAccounts: DemoAccount[];
  demoPassword: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!email.trim()) e.email = "Email wajib diisi.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Format email belum benar, contoh: nama@kampus.test.";
    if (!password) e.password = "Kata sandi wajib diisi.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (e.email || e.password) return;
    setBusy(true);
    try {
      await authApi.login({ email: email.trim(), password });
      // Muat penuh agar layout membaca sesi baru dan menampilkan kerangka aplikasi.
      window.location.assign(next);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Belum bisa masuk. Coba lagi.");
      setPassword("");
      setBusy(false);
      passwordRef.current?.focus();
    }
  }

  function fillDemo(a: DemoAccount) {
    setEmail(a.email);
    setPassword(demoPassword);
    setErrors({});
    setFormError(null);
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-5">
        <InputField
          label="Email"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@kampus.test"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
          }}
          error={errors.email}
          readOnly={busy}
          autoFocus
        />
        <InputField
          ref={passwordRef}
          label="Kata sandi"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          placeholder="Kata sandi"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
          }}
          onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
          error={errors.password}
          hint={capsLock ? "Caps Lock sedang aktif." : undefined}
          readOnly={busy}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              aria-pressed={showPassword}
              className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-panel hover:text-ink"
            >
              {showPassword ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
            </button>
          }
        />

        <p className="text-right text-[13px] text-ink-muted">Lupa kata sandi? Hubungi admin LPPM.</p>

        {formError && (
          <p role="alert" className="rounded-field bg-danger-bg px-4 py-3 text-[13px] leading-4.5 text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <LogIn aria-hidden className="size-5" />}
          {busy ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>

      {demoAccounts.length > 0 && (
        <section aria-labelledby="judul-demo" className="mt-8">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-line" />
            <h2 id="judul-demo" className="text-[13px] text-ink-muted">
              atau pakai akun demo
            </h2>
            <span aria-hidden className="h-px flex-1 bg-line" />
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {demoAccounts.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(a)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-field border border-line bg-surface p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-60"
                >
                  <Mascot workerId={WORKER_OF[a.role]} size={32} decorative className="ring-1 ring-offset-1" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-ink-muted">{a.roleLabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <Badge tone="sintetis">Sintetis</Badge>
            Klik akun untuk mengisi email dan kata sandi, lalu tekan Masuk.
          </p>
        </section>
      )}
    </>
  );
}
