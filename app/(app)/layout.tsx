import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";

function getAiProvider() {
  return process.env.AI_PROVIDER === "mock" ? "mock" : "openai";
}

function getAiOnlineStatus(provider: "openai" | "mock") {
  if (provider === "mock") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  const aiProvider = getAiProvider();
  const aiOnline = getAiOnlineStatus(aiProvider);

  return (
    <AppShell aiOnline={aiOnline} aiProvider={aiProvider}>{children}</AppShell>
  );
}
