/**
 * 인물 상세 화면 공용 타입과 라벨 (서버·클라이언트 공용)
 */
import type { StatLabels } from "./browse";

export type RelationTypeKey =
  | "PARENT"
  | "CHILD"
  | "SPOUSE"
  | "SIBLING"
  | "SWORN_BROTHER"
  | "LORD"
  | "SUBORDINATE"
  | "RIVAL"
  | "MENTOR";

/**
 * Relation(from, to, type)은 "to는 from의 type"이라는 뜻입니다.
 * - from의 화면에서 to를 보여줄 때: FORWARD 라벨
 * - to의 화면에서 from을 보여줄 때: BACKWARD 라벨 (반대 관계)
 */
export const RELATION_FORWARD: Record<RelationTypeKey, string> = {
  PARENT: "부모",
  CHILD: "자녀",
  SPOUSE: "배우자",
  SIBLING: "형제자매",
  SWORN_BROTHER: "의형제",
  LORD: "모시는 주군",
  SUBORDINATE: "부하",
  RIVAL: "라이벌",
  MENTOR: "도와준 스승",
};

export const RELATION_BACKWARD: Record<RelationTypeKey, string> = {
  PARENT: "자녀",
  CHILD: "부모",
  SPOUSE: "배우자",
  SIBLING: "형제자매",
  SWORN_BROTHER: "의형제",
  LORD: "따르는 부하",
  SUBORDINATE: "모시는 주군",
  RIVAL: "라이벌",
  MENTOR: "가르친 제자",
};

/** 친구 쪽 관계는 초록, 라이벌은 주황으로 구분합니다. */
export const RIVAL_TYPES: ReadonlySet<RelationTypeKey> = new Set(["RIVAL"]);

export type StatKey = keyof StatLabels;
export const STAT_ORDER: StatKey[] = ["leadership", "power", "intellect", "politics", "charm"];

/** 능력치 막대 색 (docs/DESIGN.md 2장) */
export const STAT_COLOR: Record<StatKey, string> = {
  leadership: "var(--color-blue)",
  power: "var(--color-orange)",
  intellect: "var(--color-purple)",
  politics: "var(--color-green)",
  charm: "var(--color-pink)",
};

export type RelatedCharacter = {
  slug: string;
  name: string;
  originalName: string | null;
  label: string;
  isRival: boolean;
  factionColor: string | null;
};

export type CharacterDetail = {
  slug: string;
  name: string;
  originalName: string | null;
  title: string | null;
  aliases: string[];
  rarity: number;
  roleLabel: string;
  era: string | null;
  summary: string;
  biography: string;
  funFacts: string[];
  stats: Record<StatKey, number>;
  faction: { name: string; color: string | null } | null;
  series: { slug: string; name: string; statLabels: StatLabels };
  related: RelatedCharacter[];
  prev: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
};
