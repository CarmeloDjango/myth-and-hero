import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { CharacterCard, type CharacterCardData } from "@/components/card/CharacterCard";
import { getDb, getDriver } from "@/lib/db";

const ROLE_LABEL: Record<string, string> = {
  GOD: "신",
  HERO: "영웅",
  MONSTER: "괴물",
  GENERAL: "장수",
  STRATEGIST: "책사",
  RULER: "군주",
  OUTLAW: "호걸",
  OTHER: "기타",
};

type StatLabels = { power?: string; intellect?: string; leadership?: string };

async function loadCharacters(): Promise<CharacterCardData[]> {
  const rows = await getDb().character.findMany({
    where: { published: true },
    orderBy: [{ power: "desc" }, { id: "asc" }],
    take: 24,
    select: {
      slug: true,
      name: true,
      originalName: true,
      title: true,
      rarity: true,
      role: true,
      power: true,
      intellect: true,
      leadership: true,
      faction: { select: { name: true, color: true } },
      series: { select: { statLabels: true } },
    },
  });

  return rows.map(({ series, role, ...c }) => {
    const labels = (series.statLabels ?? {}) as StatLabels;
    return {
      ...c,
      roleLabel: ROLE_LABEL[role] ?? role,
      statLabels: {
        power: labels.power ?? "무력",
        intellect: labels.intellect ?? "지력",
        leadership: labels.leadership ?? "통솔",
      },
    };
  });
}

async function CharacterGrid() {
  await connection();

  let characters: CharacterCardData[];
  try {
    characters = await loadCharacters();
  } catch (error) {
    console.error("[home] DB 조회 실패", error);
    return (
      <div role="alert" className="sticker rounded-card p-8 text-center">
        <p className="font-display text-4xl text-green-dark">앗, 도감을 못 열었어요!</p>
        <p className="mt-2 text-muted">DB에 연결하지 못했어요. /api/health/db 에서 원인을 확인해 주세요.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-[17px] font-bold">
        카드 <span className="text-green-dark">{characters.length}장</span>을 DB에서 불러왔어요
        <span className="ml-2 rounded-button bg-paper-dim px-2 py-0.5 text-xs font-bold text-muted">
          driver: {getDriver()}
        </span>
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {characters.map((c) => (
          <CharacterCard key={c.slug} c={c} />
        ))}
      </div>
    </>
  );
}

function GridFallback() {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 font-bold text-muted">
      카드 불러오는 중…
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b-2 border-line px-6">
        <nav aria-label="주 메뉴" className="mx-auto flex min-h-[76px] max-w-[1200px] items-center justify-between gap-3">
          <Link href="/" className="font-display text-[34px] text-green-dark">
            영웅 도감
          </Link>
          <a
            href="/api/health/db"
            className="sticker pressable inline-flex min-h-12 items-center rounded-button px-4 text-[15px] font-bold tracking-[0.053em] text-muted hover:bg-paper-dim"
          >
            DB 상태
          </a>
        </nav>
      </header>

      <main className="flex-1 px-6 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
              삼국지 도감
            </h1>
            <p className="text-[19px] font-medium text-muted">
              위·촉·오 세 나라, 누가 제일 셀까? 카드를 모아 비교해 봐요!
            </p>
          </div>
          <Suspense fallback={<GridFallback />}>
            <CharacterGrid />
          </Suspense>
        </div>
      </main>

      <footer className="bg-green px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
          <span className="font-display text-[28px] text-paper">영웅 도감</span>
          <span className="text-[15px] font-bold text-night">우리 아이 첫 인물 사전</span>
        </div>
      </footer>
    </div>
  );
}
