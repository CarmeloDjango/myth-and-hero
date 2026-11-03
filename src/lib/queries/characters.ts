import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  characterPageInput,
  PAGE_SIZE,
  ROLE_LABEL,
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

const ORDER_BY: Record<SortKey, Prisma.CharacterOrderByWithRelationInput[]> = {
  name: [{ name: "asc" }, { id: "asc" }],
  power: [{ power: "desc" }, { id: "asc" }],
  intellect: [{ intellect: "desc" }, { id: "asc" }],
  leadership: [{ leadership: "desc" }, { id: "asc" }],
  charm: [{ charm: "desc" }, { id: "asc" }],
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
export async function getCharacterPage(raw: CharacterPageInput): Promise<CharacterPage> {
  const input = characterPageInput.parse(raw);
  const q = input.q.trim();

  const where: Prisma.CharacterWhereInput = {
    published: true,
    series: { slug: input.seriesSlug },
    ...(input.faction ? { faction: { name: input.faction } } : {}),
    ...(input.role ? { role: input.role } : {}),
    ...(q ? buildSearchWhere(q) : {}),
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
        role: true,
        power: true,
        intellect: true,
        leadership: true,
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
      power: r.power,
      intellect: r.intellect,
      leadership: r.leadership,
      faction: r.faction,
      roleLabel: ROLE_LABEL[r.role] ?? r.role,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  };
}

/** 세계관 정보 + 진영 목록 + 실제로 쓰이는 역할 목록 (필터 칩용) */
export async function getSeriesForBrowse(slug: string) {
  const db = getDb();
  const series = await db.series.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      statLabels: true,
      factions: { select: { name: true, color: true }, orderBy: { name: "asc" } },
    },
  });
  if (!series) return null;

  const roles = await db.character.findMany({
    where: { series: { slug }, published: true },
    distinct: ["role"],
    select: { role: true },
  });

  return {
    slug: series.slug,
    name: series.name,
    description: series.description,
    statLabels: toStatLabels(series.statLabels),
    factions: series.factions,
    roles: roles.map((r) => r.role),
  };
}

/** 홈 화면: 공식 세계관 목록 */
export async function getSeriesList() {
  return getDb().series.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      description: true,
      themeColor: true,
      _count: { select: { characters: { where: { published: true } } } },
    },
  });
}

/**
 * 인물 상세: 능력치, 열전, 관계(양방향), 이전/다음 인물(이름순)
 * 없거나 공개되지 않은 인물이면 null을 돌려줍니다.
 */
export async function getCharacterDetail(seriesSlug: string, slug: string): Promise<CharacterDetail | null> {
  const db = getDb();
  const c = await db.character.findFirst({
    where: { slug, published: true, series: { slug: seriesSlug } },
    select: {
      id: true,
      slug: true,
      name: true,
      originalName: true,
      title: true,
      aliases: true,
      rarity: true,
      role: true,
      era: true,
      summary: true,
      biography: true,
      funFacts: true,
      leadership: true,
      power: true,
      intellect: true,
      politics: true,
      charm: true,
      seriesId: true,
      faction: { select: { name: true, color: true } },
      series: { select: { slug: true, name: true, statLabels: true } },
    },
  });
  if (!c) return null;

  const relatedSelect = {
    slug: true,
    name: true,
    originalName: true,
    published: true,
    faction: { select: { color: true } },
  } as const;

  const [outgoing, incoming, prev, next] = await Promise.all([
    db.relation.findMany({ where: { fromId: c.id }, select: { type: true, to: { select: relatedSelect } } }),
    db.relation.findMany({ where: { toId: c.id }, select: { type: true, from: { select: relatedSelect } } }),
    db.character.findFirst({
      where: { seriesId: c.seriesId, published: true, name: { lt: c.name } },
      orderBy: [{ name: "desc" }, { id: "desc" }],
      select: { slug: true, name: true },
    }),
    db.character.findFirst({
      where: { seriesId: c.seriesId, published: true, name: { gt: c.name } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { slug: true, name: true },
    }),
  ]);

  const related: RelatedCharacter[] = [
    ...outgoing.map((r) => ({ who: r.to, label: RELATION_FORWARD[r.type], type: r.type })),
    ...incoming.map((r) => ({ who: r.from, label: RELATION_BACKWARD[r.type], type: r.type })),
  ]
    .filter((r) => r.who.published)
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
    roleLabel: ROLE_LABEL[c.role] ?? c.role,
    era: c.era,
    summary: c.summary,
    biography: c.biography,
    funFacts: c.funFacts,
    stats: {
      leadership: c.leadership,
      power: c.power,
      intellect: c.intellect,
      politics: c.politics,
      charm: c.charm,
    },
    faction: c.faction,
    series: { slug: c.series.slug, name: c.series.name, statLabels: toStatLabels(c.series.statLabels) },
    related,
    prev,
    next,
  };
}
