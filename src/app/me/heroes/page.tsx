import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { requireProfile } from "@/lib/family/viewer";
import { STEP_COUNT, WIZARD_STEPS } from "@/lib/heroes/rules";
import { heroImageSrc, listMyHeroes } from "@/lib/heroes/service";

import { DeleteDraftButton } from "./delete-draft-button";

export const metadata: Metadata = { title: "내가 만든 영웅 · 영웅 도감" };

export default function MyHeroesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-20 pt-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">내가 만든 영웅</h1>
            <Link
              href="/me/heroes/new"
              className="pressable inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold tracking-[0.053em] text-paper"
            >
              + 새 영웅 만들기
            </Link>
          </div>
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
            <HeroLists />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function HeroLists() {
  const viewer = await requireProfile();
  const heroes = await listMyHeroes({ familyId: viewer.family.id, profileId: viewer.profile.id });
  const drafts = heroes.filter((h) => h.status === "DRAFT");
  const done = heroes.filter((h) => h.status === "DONE");

  if (!heroes.length) {
    return (
      <div className="sticker flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center">
        <p className="font-display text-4xl text-green-dark">아직 만든 영웅이 없어요</p>
        <p className="text-lg font-medium text-muted">&ldquo;새 영웅 만들기&rdquo;를 눌러 첫 영웅을 만들어 봐요!</p>
      </div>
    );
  }

  return (
    <>
      {drafts.length ? (
        <section aria-labelledby="drafts" className="flex flex-col gap-4">
          <h2 id="drafts" className="text-[32px] font-bold">만드는 중</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {drafts.map((h) => {
              const step = Math.min(Math.max(1, h.wizardStep), STEP_COUNT);
              return (
                <li key={h.id} className="sticker flex flex-col gap-3 rounded-card p-5">
                  <span className="text-[13px] font-bold tracking-[0.053em] text-muted">{h.series.name}</span>
                  <span className="font-display text-3xl">{h.name || "이름 없는 영웅"}</span>
                  <span className="font-medium text-muted">
                    {step}/{STEP_COUNT} 단계 · {WIZARD_STEPS[step - 1].label}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/me/heroes/${h.id}/make?step=${step}`}
                      className="pressable inline-flex min-h-12 items-center rounded-button border-b-4 border-green-dark bg-green px-4 font-bold text-paper"
                    >
                      이어서 만들기
                    </Link>
                    <DeleteDraftButton heroId={h.id} name={h.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {done.length ? (
        <section aria-labelledby="done" className="flex flex-col gap-4">
          <h2 id="done" className="text-[32px] font-bold">완성한 영웅</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {done.map((h) => {
              const src = heroImageSrc(h);
              return (
                <li key={h.id}>
                  <Link
                    href={`/${h.series.slug}/${h.slug}`}
                    className="sticker pressable flex flex-col overflow-hidden rounded-card bg-paper transition-transform hover:-translate-y-1"
                  >
                    <span className="relative flex aspect-square items-center justify-center" style={{ background: h.faction?.color ?? "#f7f7f7" }}>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
                        <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
                      ) : (
                        <span aria-hidden="true" className="font-display text-[96px] text-ink opacity-15">
                          {h.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col gap-0.5 p-4">
                      <span className="text-[13px] font-bold text-muted">{h.series.name}</span>
                      <span className="font-display text-3xl">{h.name}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
