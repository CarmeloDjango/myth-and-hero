import { Suspense } from "react";
import type { Metadata } from "next";

import { createHeroDraftAction } from "@/app/actions/heroes";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Tori } from "@/components/mascot/Tori";
import { requireProfile } from "@/lib/family/viewer";
import { getSeriesList } from "@/lib/queries/characters";

export const metadata: Metadata = { title: "영웅 만들기 · 영웅 도감" };

export default function NewHeroPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-20 pt-10">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-8">
          <div className="flex items-end gap-3">
            <Tori size={88} />
            <h1 className="sticker flex-1 rounded-card px-5 py-4 text-[28px] font-bold leading-snug">
              어느 세계에 영웅을 보낼까요?
            </h1>
          </div>
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
            <WorldChooser />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function WorldChooser() {
  const viewer = await requireProfile();
  const worlds = await getSeriesList(viewer.family.id);
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {worlds.map((w) => (
        <li key={w.slug}>
          <form action={createHeroDraftAction.bind(null, w.slug)}>
            <button
              type="submit"
              className="sticker pressable flex w-full flex-col gap-2 rounded-card bg-paper p-6 text-left transition-transform hover:-translate-y-1"
            >
              <span className="font-display text-4xl">{w.name}</span>
              <span className="font-medium text-muted">{w.description}</span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
