"use client";

import { useState } from "react";

import type { StatLabels } from "@/lib/characters/browse";
import { STAT_COLOR, STAT_ORDER, type StatKey } from "@/lib/characters/detail";
import { useCollected } from "@/lib/collection";

export { ReadAloudButton } from "@/components/speech/ReadAloudButton";

type FlipCardProps = {
  name: string;
  glyph: string;
  rarity: number;
  tint: string;
  stats: Record<StatKey, number>;
  labels: StatLabels;
  motto: string;
  /** 아이가 그린 그림 (나만의 카드) */
  imageSrc?: string | null;
};

/** 누르면 뒤집히는 카드: 앞면은 일러스트, 뒷면은 능력치 */
export function FlipCard({ name, glyph, rarity, tint, stats, labels, motto, imageSrc }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={flipped ? `${name} 카드 앞면 보기` : `${name} 카드 뒤집어서 능력치 보기`}
      className="block w-full max-w-[380px] cursor-pointer text-left [perspective:1200px]"
    >
      <span
        className="relative block h-[540px] transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        {/* 앞면 */}
        <span className="sticker absolute inset-0 flex flex-col overflow-hidden rounded-card bg-paper [backface-visibility:hidden]">
          <span className="relative flex flex-1 items-center justify-center" style={{ background: tint }}>
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림 (라우트 핸들러에서 권한 확인)
              <img src={imageSrc} alt={`${name} 그림`} className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <span aria-hidden="true" className="font-display text-[220px] leading-none text-ink opacity-15">
                {glyph}
              </span>
            )}
            <span className="absolute left-3.5 top-3.5 rounded-button border-2 border-yellow bg-paper px-3 py-1 text-[15px] font-black">
              {"★".repeat(rarity)}
            </span>
            {imageSrc !== undefined && imageSrc !== null ? (
              <span className="absolute bottom-3 left-3.5 rounded-button border-2 border-green bg-paper px-2.5 py-0.5 text-xs font-bold text-green-ink">
                나만의 카드
              </span>
            ) : (
              <span className="absolute bottom-3 left-3.5 rounded-button bg-paper px-2.5 py-0.5 text-xs font-bold text-muted">
                일러스트 자리
              </span>
            )}
          </span>
          <span className="flex items-center justify-between gap-3 px-[22px] py-5">
            <span className="font-display text-[44px] leading-none">{name}</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-ink">
              <FlipIcon />
              뒤집기
            </span>
          </span>
        </span>

        {/* 뒷면 */}
        <span className="absolute inset-0 flex flex-col gap-4 rounded-card border-2 border-b-4 border-blue bg-blue-soft p-7 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="font-display text-[40px] leading-tight text-blue-ink">{name}의 비밀 카드</span>
          {STAT_ORDER.map((k) => (
            <span key={k} className="flex items-center gap-2.5">
              <span className="min-w-12 shrink-0 whitespace-nowrap text-[15px] font-bold">{labels[k]}</span>
              <span className="h-4 flex-1 overflow-hidden rounded-lg bg-paper">
                <span className="block h-full rounded-lg" style={{ width: `${stats[k]}%`, background: STAT_COLOR[k] }} />
              </span>
              <span className="w-8 text-right font-black tabular-nums">{stats[k]}</span>
            </span>
          ))}
          <span className="mt-auto text-lg font-bold leading-normal">“{motto}”</span>
          <span className="text-sm font-bold text-blue-ink">다시 눌러서 앞면 보기</span>
        </span>
      </span>
    </button>
  );
}

function FlipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12 A8 8 0 0 1 18 7 L20 5 L20 11 L14 11 L16 9 A5.5 5.5 0 0 0 6.5 12" />
      <path d="M20 12 A8 8 0 0 1 6 17 L4 19 L4 13 L10 13 L8 15 A5.5 5.5 0 0 0 17.5 12" />
    </svg>
  );
}

/** 내 도감에 담기 / 빼기 */
export function CollectButton({ cardId, name }: { cardId: string; name: string }) {
  const { collected, toggle } = useCollected(cardId);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={collected}
      aria-label={collected ? `${name} 내 도감에서 빼기` : `${name} 내 도감에 담기`}
      className="sticker pressable inline-flex min-h-14 items-center gap-2.5 rounded-button bg-paper px-6 text-[17px] font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill={collected ? "#ff4b4b" : "none"} stroke={collected ? "#ff4b4b" : "#afafaf"} strokeWidth="2" strokeLinejoin="round">
        <path d="M12 20 C 5 15, 2 11.5, 2 8 A 4.5 4.5 0 0 1 12 6 A 4.5 4.5 0 0 1 22 8 C 22 11.5, 19 15, 12 20 Z" />
      </svg>
      {collected ? "내 도감에 있어요" : "내 도감에 담기"}
    </button>
  );
}
