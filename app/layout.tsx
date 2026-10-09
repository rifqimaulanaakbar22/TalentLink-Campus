import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { NavRail } from "@/components/app/nav";
import { TopBar } from "@/components/app/top-bar";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TalentLink Campus",
  description: "Digital Worker AI yang menghubungkan mahasiswa ke riset, lomba, dan karier, dengan bukti.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${outfit.variable} ${jetbrains.variable} antialiased`}>
      <body className="min-h-dvh md:p-5">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-card"
        >
          Lewati ke konten
        </a>
        {/* Panel aplikasi putih bersudut besar di atas kanvas abu-abu (inspirasi 03–04) */}
        <div className="mx-auto flex min-h-dvh max-w-360 bg-panel md:min-h-[calc(100dvh-2.5rem)] md:rounded-panel md:shadow-card">
          <NavRail />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main id="konten" className="flex-1 px-4 pb-12 sm:px-8 lg:px-10">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
