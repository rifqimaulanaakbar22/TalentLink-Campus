import {
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  LoaderCircle,
  MessageCircleQuestion,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { RUN_STATUS_LABEL } from "@/app/_lib/format";
import type { RunStatus } from "@/app/_lib/types";

const STYLE: Record<RunStatus, { tone: BadgeTone; icon: LucideIcon; spin?: boolean }> = {
  queued: { tone: "neutral", icon: Clock },
  running: { tone: "brand", icon: LoaderCircle, spin: true },
  needs_clarification: { tone: "warning", icon: MessageCircleQuestion },
  awaiting_approval: { tone: "brand", icon: Hourglass },
  approved: { tone: "success", icon: CircleCheck },
  rejected: { tone: "neutral", icon: CircleX },
  failed: { tone: "danger", icon: TriangleAlert },
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const { tone, icon: Icon, spin } = STYLE[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden className={spin ? "size-3.5 animate-spin" : "size-3.5"} />
      {RUN_STATUS_LABEL[status]}
    </Badge>
  );
}
