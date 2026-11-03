import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { requireProfile } from "@/lib/family/viewer";
import { getSeriesList } from "@/lib/queries/characters";

/** 세계관 카드 위쪽 그림 영역 색 (테마 색이 없을 때) */
const FALLBACK_TINT = "#f7f7f7";
const SERIES_TINT: Record<string, string> = {
  "#58cc02": "#d7ffb8",
  "#ce82ff": "#f3e1ff",
};

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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
      {list.map((s) => (
        <Link
          key={s.slug}
          href={`/${s.slug}`}
          className="sticker pressable flex flex-col overflow-hidden rounded-card bg-paper transition-transform hover:-translate-y-1"
        >
          <span
            aria-hidden="true"
            className="flex h-40 items-center justify-center font-display text-7xl text-ink/20"
            style={{ background: (s.themeColor && SERIES_TINT[s.themeColor]) || FALLBACK_TINT }}
          >
            {s.name.slice(0, 2)}
          </span>
          <span className="flex flex-col gap-1.5 p-5">
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-[32px] leading-tight">{s.name}</span>
              <span className="rounded-button bg-paper-dim px-2.5 py-1 text-[13px] font-bold text-muted">
                {s._count.characters}명
              </span>
            </span>
            <span className="text-base font-medium leading-normal text-muted">{s.description}</span>
          </span>
        </Link>
      ))}
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
