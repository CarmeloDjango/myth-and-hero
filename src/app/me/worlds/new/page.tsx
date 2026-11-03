import { Suspense } from "react";
import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { requireProfile } from "@/lib/family/viewer";

import { WorldWizard } from "./world-wizard";

export const metadata: Metadata = { title: "세계관 만들기 · 영웅 도감" };

export default function NewWorldPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-20 pt-8">
        <div className="mx-auto max-w-[760px]">
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
            <Gate />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Gate() {
  await requireProfile();
  return <WorldWizard />;
}
