import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CenteredPanel } from "@/components/ui/form";
import { getViewer } from "@/lib/family/viewer";

import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "가족 설정 · 영웅 도감" };

export default function SetupPage() {
  return (
    <CenteredPanel title="반가워요!" lead="함께 볼 아이들의 프로필을 만들어 주세요.">
      <Suspense fallback={<p role="status" className="text-center font-bold text-muted">불러오는 중…</p>}>
        <SetupGate />
      </Suspense>
    </CenteredPanel>
  );
}

async function SetupGate() {
  const viewer = await getViewer();
  if (!viewer) redirect("/auth/sign-in");
  if (viewer.family) redirect("/me");
  return <SetupForm />;
}
