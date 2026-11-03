import { Suspense } from "react";
import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { requireProfile } from "@/lib/family/viewer";
import { getBattlePool } from "@/lib/queries/battle";

import { BattleApp } from "./battle-app";

export const metadata: Metadata = { title: "카드 배틀 · 영웅 도감" };

export default function BattlePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-4 pb-16 pt-6">
        <div className="mx-auto max-w-[900px]">
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">카드 모으는 중…</p>}>
            <Battle />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Battle() {
  const viewer = await requireProfile();
  const pool = await getBattlePool(viewer.family.id);
  return <BattleApp pool={pool} profileId={viewer.profile.id} nickname={viewer.profile.nickname} />;
}
