import type { LucideIcon } from "lucide-react";
import { Card } from "./card";
import { IconBubble } from "./icon-bubble";

/** Kartu angka besar ("Focus Time", "Mental Energy" di inspirasi). */
export function StatTile({
  icon,
  label,
  value,
  unit,
  caption,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-3">
        <IconBubble icon={icon} />
        <h2 className="text-lg font-medium">{label}</h2>
      </div>
      <p className="mt-5 flex flex-wrap items-baseline gap-1.5">
        <span className="text-4xl leading-10 font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-[15px] text-ink-muted">{unit}</span>}
      </p>
      {caption && <p className="mt-2 text-[13px] leading-4.5 text-ink-muted">{caption}</p>}
      {children && <div className="mt-auto pt-4">{children}</div>}
    </Card>
  );
}
