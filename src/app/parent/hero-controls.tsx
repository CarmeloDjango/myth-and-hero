"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteFamilyHeroAction, setHeroHiddenAction } from "@/app/actions/heroes";

export type ParentHero = {
  id: string;
  slug: string;
  name: string;
  status: "DRAFT" | "DONE";
  hidden: boolean;
  imageSrc: string | null;
  color: string | null;
  creator: string | null;
  seriesSlug: string;
  seriesName: string;
};

/** 부모 모드: 아이들이 만든 영웅 숨기기·보이기·지우기 */
export function ParentHeroList({ heroes }: { heroes: ParentHero[] }) {
  if (!heroes.length) {
    return <p className="rounded-card bg-paper-dim p-5 font-medium text-muted">아직 아이들이 만든 영웅이 없어요.</p>;
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {heroes.map((h) => (
        <HeroRow key={h.id} hero={h} />
      ))}
    </ul>
  );
}

function HeroRow({ hero }: { hero: ParentHero }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const run = (fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      const result = await fn();
      setError(result?.error);
      router.refresh();
    });

  return (
    <li className={`sticker flex gap-4 rounded-card p-4 ${hero.hidden ? "opacity-60" : ""}`}>
      <span className="relative size-20 shrink-0 overflow-hidden rounded-button" style={{ background: hero.color ?? "#f7f7f7" }}>
        {hero.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
          <img src={hero.imageSrc} alt="" className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <span aria-hidden="true" className="flex h-full items-center justify-center font-display text-4xl text-ink/30">
            {hero.name.slice(0, 1) || "?"}
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[13px] font-bold text-muted">
          {hero.seriesName} · {hero.creator ?? "(지운 프로필)"} · {hero.status === "DRAFT" ? "만드는 중" : hero.hidden ? "숨김" : "도감에 있음"}
        </span>
        {hero.status === "DONE" && !hero.hidden ? (
          <Link href={`/${hero.seriesSlug}/${hero.slug}`} className="truncate font-display text-2xl hover:underline">
            {hero.name}
          </Link>
        ) : (
          <span className="truncate font-display text-2xl">{hero.name || "이름 없는 영웅"}</span>
        )}
        {error ? (
          <p role="alert" className="text-sm font-bold text-[#b42318]">
            {error}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-2">
          {hero.status === "DONE" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setHeroHiddenAction(hero.id, !hero.hidden))}
              className="sticker pressable min-h-11 rounded-button bg-paper px-3 text-[15px] font-bold text-blue-ink disabled:opacity-50"
            >
              {hero.hidden ? "다시 보이기" : "숨기기"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`${hero.name || "이 영웅"}을(를) 지울까요? 되돌릴 수 없어요.`)) return;
              run(() => deleteFamilyHeroAction(hero.id));
            }}
            className="sticker pressable min-h-11 rounded-button bg-paper px-3 text-[15px] font-bold text-[#b42318] disabled:opacity-50"
          >
            지우기
          </button>
        </div>
      </div>
    </li>
  );
}
