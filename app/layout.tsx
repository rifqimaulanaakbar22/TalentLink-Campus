import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TalentLink Campus",
  description: "Digital Worker AI yang menghubungkan mahasiswa ke riset dan lomba, dengan bukti.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Validasi sesi yang sebenarnya (ke database). Proxy hanya memeriksa ada tidaknya cookie.
  const user = await getCurrentUser();
  const pathname = (await headers()).get("x-tl-pathname") ?? "";
  if (!user && pathname !== "/login") {
    redirect(pathname && pathname !== "/" ? `/login?next=${encodeURIComponent(pathname)}` : "/login");
  }

  return (
    <html lang="id" className={`${outfit.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh md:p-5">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card"
        >
          Lewati ke konten
        </a>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
