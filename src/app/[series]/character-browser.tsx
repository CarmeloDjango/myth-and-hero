"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useQueryStates } from "nuqs";

import { fetchCharacterPageAction } from "@/app/actions/characters";
import { CharacterCard, CharacterCardSkeleton } from "@/components/card/CharacterCard";
import {
  browseParsers,
  charactersQueryKey,
  STAT_KEYS,
  type SortKey,
  type StatLabels,
} from "@/lib/characters/browse";

type Props = {
  seriesSlug: string;
  statLabels: StatLabels;
  factions: { name: string; color: string | null }[];
  kinds: string[];
};

export function CharacterBrowser({ seriesSlug, statLabels, factions, kinds }: Props) {
  const [filters, setFilters] = useQueryStates(browseParsers);
  // 칩과 정렬은 브라우저 기록에 남겨 뒤로 가기로 되돌릴 수 있게 하고,
  // 검색어는 글자마다 기록이 쌓이지 않도록 덮어씁니다.
  const pick = (next: Parameters<typeof setFilters>[0]) => setFilters(next, { history: "push" });

  const query = useInfiniteQuery({
    queryKey: charactersQueryKey(seriesSlug, filters),
    queryFn: ({ pageParam }) =>
      fetchCharacterPageAction({ seriesSlug, ...filters, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? null;

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "name", label: "이름순" },
    ...STAT_KEYS.map((k) => ({ value: k, label: `${statLabels[k]} 높은 순` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="sticker flex flex-col gap-4 rounded-card p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <SearchBox value={filters.q} onSearch={(q) => setFilters({ q: q || null })} />
          <label htmlFor="sort" className="text-[15px] font-bold text-muted">
            정렬
          </label>
          <select
            id="sort"
            value={filters.sort}
            onChange={(e) => pick({ sort: e.target.value as SortKey })}
            className="sticker min-h-[58px] cursor-pointer rounded-button bg-paper px-4 text-base font-bold"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <ChipRow label="편">
          <Chip pressed={!filters.faction} onClick={() => pick({ faction: null })}>
            전체
          </Chip>
          {factions.map((f) => (
            <Chip key={f.name} pressed={filters.faction === f.name} onClick={() => pick({ faction: f.name })}>
              {f.name}
            </Chip>
          ))}
        </ChipRow>

        {kinds.length > 1 ? (
          <ChipRow label="종류">
            <Chip pressed={!filters.kind} onClick={() => pick({ kind: null })}>
              전체
            </Chip>
            {kinds.map((k) => (
              <Chip key={k} pressed={filters.kind === k} onClick={() => pick({ kind: k })}>
                {k}
              </Chip>
            ))}
          </ChipRow>
        ) : null}
      </div>

      <p className="text-[17px] font-bold" aria-live="polite">
        {total === null ? "카드를 찾는 중이에요" : (
          <>
            카드 <span className="text-green-dark">{total}장</span>을 찾았어요
          </>
        )}
      </p>

      {query.isError ? (
        <div role="alert" className="sticker rounded-card p-8 text-center">
          <p className="font-display text-4xl text-green-dark">앗, 카드를 못 불러왔어요</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="sticker pressable mt-4 min-h-12 rounded-button px-5 font-bold text-blue-ink"
          >
            다시 해 보기
          </button>
        </div>
      ) : items.length === 0 && !query.isFetching && !filters.q && !filters.faction && !filters.kind ? (
        <div className="sticker flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center">
          <p className="font-display text-5xl text-green-dark">아직 영웅이 없어요!</p>
          <p className="text-lg font-medium text-muted">위의 &ldquo;이 세계에 영웅 만들기&rdquo;를 눌러 첫 영웅을 만들어 볼까요?</p>
        </div>
      ) : items.length === 0 && !query.isFetching ? (
        <div className="sticker flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center">
          <p className="font-display text-5xl text-green-dark">앗, 못 찾았어요!</p>
          <p className="text-lg font-medium text-muted">다른 이름이나 초성으로 찾아볼까요?</p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 transition-opacity ${
            query.isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {items.map((c) => (
            <Link
              key={c.slug}
              href={`/${seriesSlug}/${c.slug}`}
              aria-label={`${c.name} 카드 자세히 보기`}
              className="rounded-card focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue"
            >
              <CharacterCard c={c} labels={statLabels} />
            </Link>
          ))}
          {query.isFetchingNextPage
            ? Array.from({ length: 3 }, (_, i) => <CharacterCardSkeleton key={`s${i}`} />)
            : null}
        </div>
      )}

      <LoadMoreSentinel
        enabled={query.hasNextPage && !query.isFetchingNextPage && !query.isPlaceholderData}
        onVisible={() => query.fetchNextPage()}
      />

      {query.isFetchingNextPage ? (
        <div role="status" className="flex items-center justify-center gap-3.5 font-bold text-muted">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 animate-bounce rounded-full bg-green" />
            <span className="size-2.5 animate-bounce rounded-full bg-green [animation-delay:150ms]" />
            <span className="size-2.5 animate-bounce rounded-full bg-green [animation-delay:300ms]" />
          </span>
          다음 카드 불러오는 중
        </div>
      ) : !query.hasNextPage && items.length > 0 ? (
        <p className="text-center font-bold text-muted">카드를 모두 봤어요!</p>
      ) : null}
    </div>
  );
}

/** 입력이 멈추고 300ms 뒤에 URL(?q=)을 바꿉니다. */
function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const id = useId();
  const [text, setText] = useState(value);
  const lastSent = useRef(value);
  const send = useEffectEvent((q: string) => {
    lastSent.current = q;
    onSearch(q);
  });

  // 뒤로 가기 등으로 URL이 바뀌면 입력창도 맞춥니다.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    const next = text.trim();
    if (next === lastSent.current) return;
    const t = setTimeout(() => send(next), 300);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <div className="flex min-w-0 flex-[1_1_320px] items-center gap-2.5 rounded-card border-2 border-line bg-paper-dim px-4">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#737373" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20 L16 16" />
      </svg>
      <label htmlFor={id} className="sr-only">
        영웅 이름 찾기
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="이름, 별명, 초성 (예: ㅈㄱㄹ)"
        className="min-h-[54px] min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-muted"
      />
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="min-w-10 text-[15px] font-bold text-muted">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`pressable min-h-11 rounded-button border-2 border-b-4 px-4 text-[15px] font-bold ${
        pressed ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-muted hover:bg-paper-dim"
      }`}
    >
      {children}
    </button>
  );
}

/** 화면 아래 표시가 보이면 다음 페이지를 불러옵니다. */
function LoadMoreSentinel({ enabled, onVisible }: { enabled: boolean; onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleVisible = useEffectEvent(onVisible);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) handleVisible();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
