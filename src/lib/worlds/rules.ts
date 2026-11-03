/**
 * 세계관 만들기 규칙 (서버·클라이언트 공용). docs/HERO_MAKER.md 5장
 */
import { z } from "zod";

import { STAT_KEYS } from "@/lib/characters/browse";

export const WORLD_NAME_MAX = 14;
export const WORLD_DESC_MAX = 40;
export const STAT_LABEL_MAX = 6;
export const KIND_NAME_MAX = 10;
export const FACTION_NAME_MAX = 10;
export const KINDS_MAX = 8;
export const FACTIONS_MAX = 6;
/** 가족 하나가 만들 수 있는 세계관 수 */
export const WORLDS_PER_FAMILY = 20;

/** 세계관 테마 색: main(진한 색, 표시용) + soft(카드 배경) + ink(글자) */
export const WORLD_COLORS = [
  { key: "pink", label: "분홍", main: "#ff86d0", soft: "#ffe0f3", ink: "#a8336f" },
  { key: "purple", label: "보라", main: "#ce82ff", soft: "#f3e1ff", ink: "#7a3fb0" },
  { key: "blue", label: "파랑", main: "#1cb0f6", soft: "#ddf4ff", ink: "#0b7bb3" },
  { key: "green", label: "초록", main: "#58cc02", soft: "#d7ffb8", ink: "#3f7f00" },
  { key: "yellow", label: "노랑", main: "#ffc800", soft: "#fff4cc", ink: "#806500" },
  { key: "orange", label: "주황", main: "#ff9600", soft: "#ffe2cc", ink: "#a35200" },
] as const;

export function worldColor(themeColor: string | null | undefined) {
  return WORLD_COLORS.find((c) => c.main === themeColor) ?? null;
}

/** 편(진영) 색: 카드 배경으로 쓰는 연한 색 */
export const FACTION_COLORS = WORLD_COLORS.map((c) => c.soft);

export const STAT_LABEL_SUGGESTIONS = ["힘", "마법", "지혜", "용기", "속도", "사랑", "귀여움", "재치", "행운", "통솔", "매력", "인기"] as const;
export const DEFAULT_STAT_LABELS = ["힘", "마법", "지혜", "용기", "매력"] as const;
export const KIND_SUGGESTIONS = ["영웅", "악당", "요정", "왕과 왕비", "마법사", "동물 친구", "로봇", "괴물"] as const;

const label = (max: number, what: string) =>
  z.string().trim().min(1, `${what}을(를) 적어 주세요.`).max(max, `${what}은(는) ${max}글자까지예요.`);

export const worldInputSchema = z
  .object({
    name: label(WORLD_NAME_MAX, "세계관 이름"),
    description: z.string().trim().max(WORLD_DESC_MAX, `한 줄 소개는 ${WORLD_DESC_MAX}글자까지예요.`).default(""),
    themeColor: z.enum(WORLD_COLORS.map((c) => c.main) as [string, ...string[]]),
    statLabels: z.array(label(STAT_LABEL_MAX, "능력치 이름")).length(STAT_KEYS.length),
    kinds: z.array(label(KIND_NAME_MAX, "종류 이름")).min(1, "종류를 하나 이상 정해 주세요.").max(KINDS_MAX),
    factions: z
      .array(z.object({ name: label(FACTION_NAME_MAX, "편 이름"), color: z.enum(FACTION_COLORS as [string, ...string[]]) }))
      .max(FACTIONS_MAX)
      .default([]),
  })
  .refine((w) => new Set(w.statLabels).size === w.statLabels.length, { message: "능력치 이름이 서로 겹쳐요.", path: ["statLabels"] })
  .refine((w) => new Set(w.kinds).size === w.kinds.length, { message: "종류 이름이 서로 겹쳐요.", path: ["kinds"] })
  .refine((w) => new Set(w.factions.map((f) => f.name)).size === w.factions.length, { message: "편 이름이 서로 겹쳐요.", path: ["factions"] })
  // 종류(어떤 영웅)와 편(누구 편)은 다른 질문이라, 같은 이름이면 아이가 헷갈립니다.
  .refine((w) => !w.factions.some((f) => w.kinds.includes(f.name)), { message: "편 이름이 종류 이름과 같아요. 다른 이름을 지어 주세요.", path: ["factions"] });

export type WorldInput = z.input<typeof worldInputSchema>;

export const worldRenameSchema = z.object({
  name: label(WORLD_NAME_MAX, "세계관 이름"),
  description: z.string().trim().max(WORLD_DESC_MAX).default(""),
});
