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
