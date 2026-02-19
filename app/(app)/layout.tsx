import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

function getAiOnlineStatus() {
  const provider = process.env.AI_PROVIDER;
  if (provider === "mock") return false;

  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return hasKey;
}

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  const aiOnline = getAiOnlineStatus();

  return (
    <AppShell aiOnline={aiOnline}>{children}</AppShell>
  );
}
