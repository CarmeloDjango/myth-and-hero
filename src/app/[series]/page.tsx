import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  type InfiniteData,
} from "@tanstack/react-query";

import { CharacterCardSkeleton } from "@/components/card/CharacterCard";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import {
  charactersQueryKey,
  loadBrowseParams,
  type CharacterPage,
} from "@/lib/characters/browse";
import { getViewer, requireProfile } from "@/lib/family/viewer";
import { createHeroDraftAction } from "@/app/actions/heroes";
import { WorldCover } from "@/components/world/WorldCover";
import { getCharacterPage, getSeriesForBrowse } from "@/lib/queries/characters";
import { worldCoverSrc } from "@/lib/worlds/service";

import { CharacterBrowser } from "./character-browser";

export async function generateMetadata({ params }: PageProps<"/[series]">): Promise<Metadata> {
  const { series } = await params;
  const viewer = await getViewer();
  const info = viewer?.family ? await getSeriesForBrowse(viewer.family.id, decodeURIComponent(series)) : null;
  return { title: info ? `${info.name} 도감 · 영웅 도감` : "영웅 도감" };
}

export default function SeriesPage({ params, searchParams }: PageProps<"/[series]">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-24 pt-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7">
          {/* 세계관과 검색 조건은 요청마다 달라지므로 Suspense 안에서 읽습니다 (Cache Components). */}
          <Suspense fallback={<BrowseFallback />}>
            <SeriesBrowse params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function SeriesBrowse({
  params,
  searchParams,
}: Pick<PageProps<"/[series]">, "params" | "searchParams">) {
  const { series: slug } = await params;
  const viewer = await requireProfile();
  const familyId = viewer.family.id;
  const [series, filters] = await Promise.all([
    getSeriesForBrowse(familyId, decodeURIComponent(slug)),
    loadBrowseParams(searchParams),
  ]);
  if (!series) notFound();

  // 첫 페이지를 서버에서 미리 불러와 클라이언트 캐시에 넣어 둡니다 (같은 queryKey).
  const queryClient = new QueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: charactersQueryKey(series.slug, filters),
    queryFn: () => getCharacterPage(familyId, { seriesSlug: series.slug, ...filters, cursor: null }),
    initialPageParam: null as string | null,
  });
  const first = queryClient.getQueryData<InfiniteData<CharacterPage>>(
    charactersQueryKey(series.slug, filters),
  );
  if (!first) throw new Error("첫 페이지를 불러오지 못했어요.");

  return (
    <>
      {series.familyId ? (
        <div className="sticker overflow-hidden rounded-card">
          <WorldCover name={series.name} themeColor={series.themeColor} coverSrc={worldCoverSrc(series)} className="h-56 text-8xl" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
            {series.name} 도감
          </h1>
          <p className="text-[19px] font-medium text-muted">{series.description}</p>
        </div>
        <form action={createHeroDraftAction.bind(null, series.slug)}>
          <button type="submit" className="pressable inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-6 font-bold tracking-[0.053em] text-paper">
            이 세계에 영웅 만들기 +
          </button>
        </form>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <CharacterBrowser
          seriesSlug={series.slug}
          statLabels={series.statLabels}
          factions={series.factions}
          kinds={series.kinds}
        />
      </HydrationBoundary>
    </>
  );
}

function BrowseFallback() {
  return (
    <div className="flex flex-col gap-7" role="status" aria-label="도감 불러오는 중">
      <div className="h-[77px] w-72 animate-pulse rounded-card bg-paper-dim" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CharacterCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
