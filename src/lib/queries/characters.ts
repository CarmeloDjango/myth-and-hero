import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  characterPageInput,
  PAGE_SIZE,
  toStatLabels,
  type CharacterPage,
  type CharacterPageInput,
  type SortKey,
} from "@/lib/characters/browse";
import {
  RELATION_BACKWARD,
  RELATION_FORWARD,
  RIVAL_TYPES,
  type CharacterDetail,
  type RelatedCharacter,
} from "@/lib/characters/detail";
import { getDb } from "@/lib/db";
import { isChoseongOnly } from "@/lib/search/choseong";

import { visibleCharacterWhere, visibleSeriesWhere } from "./visibility";

const ORDER_BY: Record<SortKey, Prisma.CharacterOrderByWithRelationInput[]> = {
  name: [{ name: "asc" }, { id: "asc" }],
  stat1: [{ stat1: "desc" }, { id: "asc" }],
  stat2: [{ stat2: "desc" }, { id: "asc" }],
  stat3: [{ stat3: "desc" }, { id: "asc" }],
  stat4: [{ stat4: "desc" }, { id: "asc" }],
  stat5: [{ stat5: "desc" }, { id: "asc" }],
};

function buildSearchWhere(q: string): Prisma.CharacterWhereInput {
  if (isChoseongOnly(q)) {
    // "ㅈㄱㄹ" → 초성 컬럼에서 부분 일치 (trigram 인덱스 사용)
    return { choseong: { contains: q.replace(/\s+/g, "") } };
  }
  // 이름 + 별칭 + 칭호에서 부분 일치 (ILIKE, trigram 인덱스 사용)
  return { searchText: { contains: q, mode: "insensitive" } };
}

/**
 * 도감 목록 한 페이지 (커서 방식)
 * 정렬 기준 + id로 순서를 고정하므로, 스크롤 중에 데이터가 추가돼도 중복이나 누락이 없습니다.
 */
export async function getCharacterPage(
  familyId: string | null,
  raw: CharacterPageInput,
): Promise<CharacterPage> {
  const input = characterPageInput.parse(raw);
  const q = input.q.trim();

  const where: Prisma.CharacterWhereInput = {
    AND: [
      visibleCharacterWhere(familyId),
      { series: { slug: input.seriesSlug, ...visibleSeriesWhere(familyId) } },
      input.faction ? { faction: { name: input.faction } } : {},
      input.kind ? { kind: { name: input.kind } } : {},
      q ? buildSearchWhere(q) : {},
    ],
  };

  const db = getDb();
  const [rows, total] = await Promise.all([
    db.character.findMany({
      where,
      orderBy: ORDER_BY[input.sort],
      take: PAGE_SIZE + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        name: true,
        originalName: true,
        title: true,
        rarity: true,
        stat1: true,
        stat2: true,
        stat3: true,
        familyId: true,
        kind: { select: { name: true } },
        faction: { select: { name: true, color: true } },
      },
    }),
    input.cursor ? Promise.resolve(null) : db.character.count({ where }),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    items: page.map((r) => ({
      slug: r.slug,
      name: r.name,
      originalName: r.originalName,
      title: r.title,
      rarity: r.rarity,
      stat1: r.stat1,
      stat2: r.stat2,
      stat3: r.stat3,
      faction: r.faction,
      kindName: r.kind?.name ?? null,
      isFamily: r.familyId !== null,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  };
}

/** 세계관 정보 + 진영 목록 + 종류 목록 (필터 칩용) */
export async function getSeriesForBrowse(familyId: string | null, slug: string) {
  const series = await getDb().series.findFirst({
    where: { slug, ...visibleSeriesWhere(familyId) },
    select: {
      slug: true,
      name: true,
      description: true,
      statLabels: true,
      factions: { select: { name: true, color: true }, orderBy: { name: "asc" } },
      kinds: { select: { name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] },
    },
  });
  if (!series) return null;

  return {
    slug: series.slug,
    name: series.name,
    description: series.description,
    statLabels: toStatLabels(series.statLabels),
    factions: series.factions,
    kinds: series.kinds.map((k) => k.name),
  };
}

/** 홈 화면: 볼 수 있는 세계관 목록 (공식 + 우리 가족) */
export async function getSeriesList(familyId: string | null) {
  return getDb().series.findMany({
    where: visibleSeriesWhere(familyId),
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      description: true,
      themeColor: true,
      familyId: true,
      _count: { select: { characters: { where: visibleCharacterWhere(familyId) } } },
    },
  });
}

/**
 * 인물 상세: 능력치, 열전, 관계(양방향), 이전/다음 인물(이름순)
 * 없거나 볼 수 없는 인물이면 null을 돌려줍니다.
 */
export async function getCharacterDetail(
  familyId: string | null,
  seriesSlug: string,
  slug: string,
): Promise<CharacterDetail | null> {
  const db = getDb();
  const visible = visibleCharacterWhere(familyId);
  const c = await db.character.findFirst({
    where: { AND: [visible, { slug, series: { slug: seriesSlug, ...visibleSeriesWhere(familyId) } }] },
    select: {
      id: true,
      slug: true,
      name: true,
      originalName: true,
      title: true,
      aliases: true,
      rarity: true,
      era: true,
      summary: true,
      biography: true,
      funFacts: true,
      stat1: true,
      stat2: true,
      stat3: true,
      stat4: true,
      stat5: true,
      seriesId: true,
      familyId: true,
      kind: { select: { name: true } },
      faction: { select: { name: true, color: true } },
      series: { select: { slug: true, name: true, statLabels: true } },
    },
  });
  if (!c) return null;

  const relatedSelect = {
    slug: true,
    name: true,
    originalName: true,
    faction: { select: { color: true } },
  } as const;

  const [outgoing, incoming, prev, next] = await Promise.all([
    db.relation.findMany({
      where: { fromId: c.id, to: visible },
      select: { type: true, to: { select: relatedSelect } },
    }),
    db.relation.findMany({
      where: { toId: c.id, from: visible },
      select: { type: true, from: { select: relatedSelect } },
    }),
    db.character.findFirst({
      where: { AND: [visible, { seriesId: c.seriesId, name: { lt: c.name } }] },
      orderBy: [{ name: "desc" }, { id: "desc" }],
      select: { slug: true, name: true },
    }),
    db.character.findFirst({
      where: { AND: [visible, { seriesId: c.seriesId, name: { gt: c.name } }] },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { slug: true, name: true },
    }),
  ]);

  const related: RelatedCharacter[] = [
    ...outgoing.map((r) => ({ who: r.to, label: RELATION_FORWARD[r.type], type: r.type })),
    ...incoming.map((r) => ({ who: r.from, label: RELATION_BACKWARD[r.type], type: r.type })),
  ]
    // 친구 쪽 관계를 먼저, 라이벌은 뒤에
    .sort((a, b) => Number(RIVAL_TYPES.has(a.type)) - Number(RIVAL_TYPES.has(b.type)))
    .map((r) => ({
      slug: r.who.slug,
      name: r.who.name,
      originalName: r.who.originalName,
      label: r.label,
      isRival: RIVAL_TYPES.has(r.type),
      factionColor: r.who.faction?.color ?? null,
    }));

  return {
    slug: c.slug,
    name: c.name,
    originalName: c.originalName,
    title: c.title,
    aliases: c.aliases,
    rarity: c.rarity,
    kindName: c.kind?.name ?? null,
    era: c.era,
    summary: c.summary,
    biography: c.biography,
    funFacts: c.funFacts,
    stats: { stat1: c.stat1, stat2: c.stat2, stat3: c.stat3, stat4: c.stat4, stat5: c.stat5 },
    faction: c.faction,
    isFamily: c.familyId !== null,
    series: { slug: c.series.slug, name: c.series.name, statLabels: toStatLabels(c.series.statLabels) },
    related,
    prev,
    next,
  };
}
