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

/** 능력치 5칸. 화면에 보이는 이름은 세계관의 statLabels에서 가져옵니다. */
export const STAT_KEYS = ["stat1", "stat2", "stat3", "stat4", "stat5"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type StatLabels = Record<StatKey, string>;

export const SORT_KEYS = ["name", ...STAT_KEYS] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** URL 파라미터: ?q=관&faction=촉&kind=장수&sort=stat2 */
export const browseParsers = {
  q: parseAsString.withDefault(""),
  faction: parseAsString.withDefault(""),
  kind: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(SORT_KEYS).withDefault("name"),
};

export const loadBrowseParams = createLoader(browseParsers);

export type BrowseFilters = {
  q: string;
  faction: string;
  kind: string;
  sort: SortKey;
};

export function normalizeFilters(f: BrowseFilters): BrowseFilters {
  return { q: f.q.trim(), faction: f.faction, kind: f.kind, sort: f.sort };
}

export const charactersQueryKey = (seriesSlug: string, filters: BrowseFilters) =>
  ["characters", seriesSlug, normalizeFilters(filters)] as const;

export const characterPageInput = z.object({
  seriesSlug: z.string().min(1).max(64),
  q: z.string().max(40).default(""),
  faction: z.string().max(40).default(""),
  kind: z.string().max(40).default(""),
  sort: z.enum(SORT_KEYS).default("name"),
  cursor: z.string().max(64).nullable().default(null),
});
export type CharacterPageInput = z.input<typeof characterPageInput>;

export const DEFAULT_STAT_LABELS: StatLabels = {
  stat1: "능력1",
  stat2: "능력2",
  stat3: "능력3",
  stat4: "능력4",
  stat5: "능력5",
};

export function toStatLabels(raw: unknown): StatLabels {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<StatLabels>;
  const out = { ...DEFAULT_STAT_LABELS };
  for (const k of STAT_KEYS) {
    if (typeof r[k] === "string" && r[k]) out[k] = r[k];
  }
  return out;
}

/** 카드 한 장에 필요한 데이터 (서버 → 클라이언트). 카드에는 능력치 1~3칸을 보여줍니다. */
export type CharacterCardData = {
  slug: string;
  name: string;
  title: string | null;
  rarity: number;
  stat1: number;
  stat2: number;
  stat3: number;
  faction: { name: string; color: string | null } | null;
  kindName: string | null;
  /** 카드 배경색: 편 색, 편이 없으면 종류 색 */
  tint: string;
  /** 아이가 만든 카드("나만의 카드")인지 */
  isFamily: boolean;
  /** 아이가 그린 그림 주소 (없으면 null) */
  imageSrc: string | null;
  /** 사진 위에 그린 그림이면 카드 칸을 꽉 채움 */
  imageCover: boolean;
};

export type CharacterPage = {
  items: CharacterCardData[];
  nextCursor: string | null;
  /** 첫 페이지에서만 계산합니다. */
  total: number | null;
};

/** 일러스트 자리에 크게 보여줄 한 글자: 한글 이름 첫 글자 */
export function cardGlyph(name: string): string {
  return name[0] ?? "?";
}

/** 카드 배경색: 편 색이 먼저, 편이 없으면 종류 색 (그리스신화처럼 편이 없는 세계관) */
export function cardTint(faction: { color: string | null } | null | undefined, kind: { color: string | null } | null | undefined): string {
  return faction?.color ?? kind?.color ?? "#f7f7f7";
}
