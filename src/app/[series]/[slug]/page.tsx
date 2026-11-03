import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { cardGlyph } from "@/lib/characters/browse";
import { STAT_COLOR, STAT_ORDER, type CharacterDetail } from "@/lib/characters/detail";
import { getViewer, requireProfile } from "@/lib/family/viewer";
import { getCharacterDetail } from "@/lib/queries/characters";

import { AbilityBadge } from "@/components/battle/AbilityBadge";
import { DrawingReplay } from "@/components/drawing/DrawingReplay";

import { CollectButton, FlipCard, ReadAloudButton } from "./detail-client";

/** 진영 배경색 → 같은 계열의 진한 글자색 (docs/DESIGN.md 2장) */
const FACTION_TEXT: Record<string, string> = {
  "#d7ffb8": "#3f7f00",
  "#ddf4ff": "#0b7bb3",
  "#ffe2cc": "#a35200",
  "#fff4cc": "#806500",
  "#f3e1ff": "#7a3fb0",
};

export async function generateMetadata({ params }: PageProps<"/[series]/[slug]">): Promise<Metadata> {
  const { series, slug } = await params;
  const viewer = await getViewer();
  const c = viewer?.family
    ? await getCharacterDetail(viewer.family.id, decodeURIComponent(series), decodeURIComponent(slug))
    : null;
  return c
    ? { title: `${c.name} · ${c.series.name} 도감`, description: c.summary }
    : { title: "영웅 도감" };
}

export default function CharacterPage({ params }: PageProps<"/[series]/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <Suspense fallback={<DetailFallback />}>
        {params.then(({ series, slug }) => (
          <CharacterContent seriesSlug={decodeURIComponent(series)} slug={decodeURIComponent(slug)} />
        ))}
      </Suspense>
      <SiteFooter />
    </div>
  );
}

async function CharacterContent({ seriesSlug, slug }: { seriesSlug: string; slug: string }) {
  const viewer = await requireProfile();
  const c = await getCharacterDetail(viewer.family.id, seriesSlug, slug);
  if (!c) notFound();

  const labels = c.series.statLabels;
  const tint = c.tint;
  const factionText = FACTION_TEXT[tint.toLowerCase()] ?? "#4b4b4b";
  const glyph = cardGlyph(c.name);
  // 공식 인물: 우리 가족 누구나 그림을 넣고 바꿈 / 아이가 만든 영웅: 만든 아이만
  const canEditPicture = !c.isFamily || c.creatorId === viewer.profile.id;
  const topStat = STAT_ORDER.reduce((best, k) => (c.stats[k] > c.stats[best] ? k : best), STAT_ORDER[0]);
  const paragraphs = c.biography.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // 문장 끝에 마침표가 없을 때만 붙여서 "예요.." 처럼 두 번 찍히지 않게 합니다.
  const readText = [c.name, c.title, c.summary, ...paragraphs]
    .filter((t): t is string => Boolean(t))
    .map((t) => (/[.!?…"”]$/.test(t) ? t : `${t}.`))
    .join(" ");

  return (
    <main className="flex-1">
      {/* 머리말: 카드 + 소개 */}
      <section className="px-6 pb-20 pt-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
          <Link
            href={`/${c.series.slug}`}
            className="sticker pressable inline-flex min-h-12 w-fit items-center gap-1.5 rounded-button px-4 text-[15px] font-bold tracking-[0.053em] text-muted hover:bg-paper-dim"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 L8 12 L15 19" />
            </svg>
            {c.series.name} 도감
          </Link>

          <div className="flex flex-wrap items-center gap-16">
            <div className="mx-auto flex flex-[0_1_380px] justify-center">
              <FlipCard
                name={c.name}
                glyph={glyph}
                rarity={c.rarity}
                tint={tint}
                stats={c.stats}
                labels={labels}
                motto={c.summary}
                imageSrc={c.imageSrc}
                isFamily={c.isFamily}
                imageCover={c.imageCover}
              />
            </div>

            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {c.faction ? (
                  <span className="rounded-button px-3 py-1.5 text-[15px] font-bold tracking-[0.053em]" style={{ background: tint, color: factionText }}>
                    {c.faction.name}
                  </span>
                ) : null}
                {c.kindName ? <Tag>{c.kindName}</Tag> : null}
                {c.era ? <Tag>{c.era}</Tag> : null}
                {c.aliases.length ? <Tag>별명 · {c.aliases.join(", ")}</Tag> : null}
              </div>
              <h1 className="font-display text-[96px] leading-[1.1] tracking-[-0.02em] text-green-dark">{c.name}</h1>
              {c.title ? <p className="text-2xl font-bold">{c.title}</p> : null}
              {c.isFamily ? (
                <p className="w-fit rounded-button border-2 border-green bg-green-soft px-3 py-1 text-[15px] font-bold text-green-ink">
                  {c.creatorNickname ? `${c.creatorNickname}이(가) 만든 나만의 카드` : "우리 가족이 만든 나만의 카드"}
                </p>
              ) : null}
              <AbilityBadge ability={c.ability} />
              <p className="max-w-[520px] text-[19px] font-medium leading-relaxed text-muted">{c.summary}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <ReadAloudButton text={readText} />
                <CollectButton cardId={`${c.series.slug}/${c.slug}`} name={c.name} />
                {c.replaySource ? <DrawingReplay source={c.replaySource} name={c.name} background={tint} /> : null}
                {canEditPicture ? (
                  <Link
                    href={`/${c.series.slug}/${c.slug}/picture`}
                    className="sticker pressable inline-flex min-h-14 items-center gap-2 rounded-button bg-paper px-6 text-[17px] font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20 l4-1 L19 8 l-3-3 L5 16 z" />
                    </svg>
                    {c.imageSrc ? "그림 바꾸기" : "그림 넣기"}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 능력치 */}
      <section aria-labelledby="stats" className="border-t-2 border-line px-6 py-20">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-16">
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
            <h2 id="stats" className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
              능력치
            </h2>
            <p className="text-[19px] font-medium leading-relaxed text-muted">
              100점이 가장 높아요. {c.name}{hasBatchim(c.name) ? "은" : "는"}{" "}
              <strong className="text-ink">{labels[topStat]}</strong>
              {hasBatchim(labels[topStat]) ? "이" : "가"} 제일 높아요!
            </p>
          </div>
          <dl className="grid min-w-0 flex-[2_1_560px] grid-cols-[minmax(4rem,auto)_1fr] items-center gap-x-4 gap-y-5">
            {STAT_ORDER.map((k) => (
              <div key={k} className="contents">
                <dt className="whitespace-nowrap text-[19px] font-bold">{labels[k]}</dt>
                <dd className="flex flex-1 items-center gap-4">
                  <span className="h-6 flex-1 overflow-hidden rounded-xl bg-line">
                    <span className="relative block h-full rounded-xl" style={{ width: `${c.stats[k]}%`, background: STAT_COLOR[k] }}>
                      <span className="absolute inset-x-2.5 top-[5px] h-1.5 rounded-sm bg-paper opacity-35" />
                    </span>
                  </span>
                  <span className="w-10 text-right text-[22px] font-black tabular-nums">{c.stats[k]}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 열전 + 알고 있었나요 */}
      <section aria-labelledby="bio" className="border-t-2 border-line px-6 py-20">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-16">
          <article className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
            <h2 id="bio" className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
              인물 열전
            </h2>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-xl font-medium leading-[1.8]">
                {p}
              </p>
            ))}
          </article>
          {c.funFacts.length ? (
            <aside aria-labelledby="facts" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
              <h2 id="facts" className="text-[32px] font-bold leading-tight">
                알고 있었나요?
              </h2>
              {c.funFacts.map((f, i) => (
                <p key={i} className="sticker rounded-card px-5 py-[18px] text-lg font-medium leading-relaxed">
                  {f}
                </p>
              ))}
            </aside>
          ) : null}
        </div>
      </section>

      {/* 친구와 라이벌 */}
      {c.related.length ? (
        <section aria-labelledby="friends" className="border-t-2 border-line px-6 py-20">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
            <h2 id="friends" className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
              친구와 라이벌
            </h2>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
              {c.related.map((r) => (
                <li key={`${r.slug}-${r.label}`}>
                  <Link
                    href={`/${c.series.slug}/${r.slug}`}
                    className="sticker pressable flex items-center gap-3.5 rounded-card bg-paper p-3.5 transition-transform hover:-translate-y-1"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-[72px] shrink-0 items-center justify-center rounded-button font-display text-[38px]"
                      style={{ background: r.factionColor ?? "#f7f7f7" }}
                    >
                      {cardGlyph(r.name)}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className={`text-[13px] font-bold tracking-[0.053em] ${r.isRival ? "text-[#a35200]" : "text-green-ink"}`}>
                        {r.label}
                      </span>
                      <span className="font-display text-[30px] leading-tight">{r.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <NeighborNav current={c} />
    </main>
  );
}

function NeighborNav({ current }: { current: CharacterDetail }) {
  const base = `/${current.series.slug}`;
  return (
    <nav aria-label="다른 카드" className="border-t-2 border-line px-6 py-12">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-3">
        {current.prev ? (
          <Link
            href={`${base}/${current.prev.slug}`}
            className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
          >
            ← 이전 카드 · {current.prev.name}
          </Link>
        ) : (
          <span />
        )}
        {current.next ? (
          <Link
            href={`${base}/${current.next.slug}`}
            className="pressable inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-5 font-bold tracking-[0.053em] text-paper"
          >
            다음 카드 · {current.next.name} →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-button border-2 border-line px-3 py-1 text-[15px] font-bold tracking-[0.053em] text-muted">
      {children}
    </span>
  );
}

/** 마지막 글자에 받침이 있는지 (조사 은/는, 이/가 고르기) */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function DetailFallback() {
  return (
    <main className="flex-1 px-6 py-10" role="status" aria-label="카드 불러오는 중">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-16">
        <div className="mx-auto h-[540px] w-full max-w-[380px] animate-pulse rounded-card bg-paper-dim" />
        <div className="flex flex-[1_1_460px] flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-paper-dim" />
          <div className="h-24 w-72 animate-pulse rounded bg-paper-dim" />
          <div className="h-6 w-full animate-pulse rounded bg-paper-dim" />
        </div>
      </div>
    </main>
  );
}
