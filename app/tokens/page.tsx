import type { Metadata } from "next";
import { NeracaTokenView } from "@/components/app/neraca-token-view";

export const metadata: Metadata = { title: "Neraca Token | TalentLink Campus" };

export default function NeracaTokenPage() {
  return <NeracaTokenView />;
}
