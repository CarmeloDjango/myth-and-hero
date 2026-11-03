import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { requireProfile } from "@/lib/family/viewer";
import { WorldCover } from "@/components/world/WorldCover";
import { getSeriesList } from "@/lib/queries/characters";
import { worldCoverSrc } from "@/lib/worlds/service";

async function SeriesGrid() {
  await connection();
  // 로그인 → 가족 설정 → 프로필 고르기를 마치지 않았으면 그 화면으로 보냅니다.
  const viewer = await requireProfile();

  let list: Awaited<ReturnType<typeof getSeriesList>>;
  try {
    list = await getSeriesList(viewer.family.id);
  } catch (error) {
    console.error("[home] 세계관 조회 실패", error);
    return (
      <div role="alert" className="sticker rounded-card p-8 text-center">
        <p className="font-display text-4xl text-green-dark">앗, 도감을 못 열었어요!</p>
        <p className="mt-2 text-muted">DB에 연결하지 못했어요. /api/health/db 에서 원인을 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
    <Link
      href="/me/heroes/new"
      className="sticker pressable flex flex-wrap items-center justify-between gap-4 rounded-card bg-green-soft px-6 py-5 transition-transform hover:-translate-y-1"
    >
      <span className="flex flex-col gap-1">
        <span className="font-display text-[32px] leading-tight text-green-ink">나만의 영웅 만들기</span>
        <span className="text-[17px] font-medium text-ink">{viewer.profile.nickname}만의 영웅을 그리고 도감에 넣어 봐요!</span>
      </span>
      <span className="inline-flex min-h-12 items-center rounded-button border-b-4 border-green-dark bg-green px-5 font-bold text-paper">
        만들기 →
      </span>
    </Link>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
      {list.map((s) => (
        <Link
          key={s.slug}
          href={`/${s.slug}`}
          className="sticker pressable flex flex-col overflow-hidden rounded-card bg-paper transition-transform hover:-translate-y-1"
        >
          <WorldCover name={s.name} themeColor={s.themeColor} coverSrc={worldCoverSrc(s)} />
          <span className="flex flex-col gap-1.5 p-5">
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-[32px] leading-tight">{s.name}</span>
              <span className="rounded-button bg-paper-dim px-2.5 py-1 text-[13px] font-bold text-muted">
                {s._count.characters}명
              </span>
            </span>
            <span className="text-base font-medium leading-normal text-muted">{s.description}</span>
            {s.familyId ? (
              <span className="self-start rounded-button bg-pink-soft px-2.5 py-1 text-[13px] font-bold text-pink-ink">
                우리 가족{s.creator ? ` · ${s.creator.nickname}` : ""}
              </span>
            ) : null}
          </span>
        </Link>
      ))}
      <Link
        href="/me/worlds/new"
        className="pressable flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-card border-2 border-b-4 border-dashed border-line bg-paper p-6 text-center transition-transform hover:-translate-y-1 hover:bg-paper-dim"
      >
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-blue-soft font-display text-5xl text-blue-ink">+</span>
        <span className="font-display text-[28px] leading-tight">새 세계관 만들기</span>
        <span className="font-medium text-muted">좋아하는 이야기로 우리만의 세계를 만들어요</span>
      </Link>
    </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
              어떤 이야기로 떠날까?
            </h1>
            <p className="max-w-[520px] text-[19px] font-medium text-muted">
              세계관을 고르면 그 이야기 속 영웅 카드가 나와요.
            </p>
          </div>
          <Suspense
            fallback={
              <p role="status" className="py-16 text-center font-bold text-muted">
                세계관 불러오는 중…
              </p>
            }
          >
            <SeriesGrid />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
