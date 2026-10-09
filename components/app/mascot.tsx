import type { WorkerId } from "@/app/_lib/types";
import { cn } from "@/app/_lib/cn";

// Cakupan MVP: Netra dan Jaya. Worker lain memakai cincin netral.
const RING: Partial<Record<WorkerId, string>> = {
  netra: "ring-netra/30",
  jaya: "ring-jaya/30",
};

const NAME: Partial<Record<WorkerId, string>> = { netra: "Netra", jaya: "Jaya" };

/** Avatar maskot worker. Warna worker hanya sebagai cincin tipis (aturan PRD). */
export function Mascot({
  workerId,
  size = 56,
  decorative = false,
  className,
}: {
  workerId: WorkerId;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG statis kecil, tidak perlu optimasi gambar
    <img
      src={`/mascots/${workerId}.svg`}
      width={size}
      height={size}
      alt={decorative ? "" : `Maskot ${NAME[workerId] ?? "Digital Worker"}`}
      className={cn("shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-surface", RING[workerId] ?? "ring-line", className)}
    />
  );
}
