/**
 * 도감 목록의 검색 조건 정의 (서버와 클라이언트 공용)
 *
 * - URL 파라미터 파서(nuqs): 서버 페이지와 클라이언트 컴포넌트가 같은 규칙으로 읽습니다.
 * - queryKey: 서버 prefetch와 클라이언트 useInfiniteQuery가 같은 키를 쓰도록 여기서만 만듭니다.
 * - zod 스키마: 서버 액션 입력 검증에 씁니다.
 *
 * 서버 전용·클라이언트 전용 import를 넣지 마세요.
 */
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { z } from "zod";

export const PAGE_SIZE = 12;

export const SORT_KEYS = ["name", "power", "intellect", "leadership", "charm"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const ROLE_KEYS = [
  "GOD",
  "HERO",
  "MONSTER",
  "GENERAL",
  "STRATEGIST",
  "RULER",
  "OUTLAW",
  "OTHER",
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABEL: Record<RoleKey, string> = {
  GOD: "신",
  HERO: "영웅",
  MONSTER: "괴물",
  GENERAL: "장수",
  STRATEGIST: "책사",
  RULER: "군주",
  OUTLAW: "호걸",
  OTHER: "기타",
};

/** URL 파라미터: ?q=관&faction=촉&role=GENERAL&sort=power */
export const browseParsers = {
  q: parseAsString.withDefault(""),
  faction: parseAsString.withDefault(""),
  role: parseAsStringLiteral(ROLE_KEYS),
  sort: parseAsStringLiteral(SORT_KEYS).withDefault("name"),
};

export const loadBrowseParams = createLoader(browseParsers);

export type BrowseFilters = {
  q: string;
  faction: string;
  role: RoleKey | null;
  sort: SortKey;
};

export function normalizeFilters(f: BrowseFilters): BrowseFilters {
  return { q: f.q.trim(), faction: f.faction, role: f.role, sort: f.sort };
}

export const charactersQueryKey = (seriesSlug: string, filters: BrowseFilters) =>
  ["characters", seriesSlug, normalizeFilters(filters)] as const;

export const characterPageInput = z.object({
  seriesSlug: z.string().min(1).max(64),
  q: z.string().max(40).default(""),
  faction: z.string().max(40).default(""),
  role: z.enum(ROLE_KEYS).nullable().default(null),
  sort: z.enum(SORT_KEYS).default("name"),
  cursor: z.string().max(64).nullable().default(null),
});
export type CharacterPageInput = z.input<typeof characterPageInput>;

export type StatLabels = {
  leadership: string;
  power: string;
  intellect: string;
  politics: string;
  charm: string;
};

export const DEFAULT_STAT_LABELS: StatLabels = {
  leadership: "통솔",
  power: "무력",
  intellect: "지력",
  politics: "정치",
  charm: "매력",
};

export function toStatLabels(raw: unknown): StatLabels {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<StatLabels>;
  return { ...DEFAULT_STAT_LABELS, ...r };
}

/** 카드 한 장에 필요한 데이터 (서버 → 클라이언트) */
export type CharacterCardData = {
  slug: string;
  name: string;
  originalName: string | null;
  title: string | null;
  rarity: number;
  power: number;
  intellect: number;
  leadership: number;
  faction: { name: string; color: string | null } | null;
  roleLabel: string;
};

export type CharacterPage = {
  items: CharacterCardData[];
  nextCursor: string | null;
  /** 첫 페이지에서만 계산합니다. */
  total: number | null;
};

/**
 * 일러스트 자리에 크게 보여줄 한 글자.
 * 한자 이름(關羽)이 있으면 한자, 아니면(Ζεύς 등) 한글 이름 첫 글자를 씁니다.
 */
export function cardGlyph(name: string, originalName: string | null): string {
  const first = originalName?.[0];
  if (first && /\p{Script=Han}/u.test(first)) return first;
  return name[0] ?? "?";
}
