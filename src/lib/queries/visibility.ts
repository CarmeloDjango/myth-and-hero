import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * 가족 공개 범위 규칙 (docs/HERO_MAKER.md 6장)
 *
 * - familyId가 null인 데이터: 공식 데이터. 로그인한 모든 가족이 봅니다.
 * - familyId가 있는 데이터: 그 가족만 봅니다.
 *
 * 세계관과 인물을 조회할 때는 반드시 이 함수들로 조건을 만듭니다.
 * 이 조건을 빠뜨리면 다른 가족의 데이터가 보일 수 있습니다.
 */
export function visibleSeriesWhere(familyId: string | null): Prisma.SeriesWhereInput {
  return familyId ? { OR: [{ familyId: null }, { familyId }] } : { familyId: null };
}

export function visibleCharacterWhere(familyId: string | null): Prisma.CharacterWhereInput {
  return {
    published: true,
    hidden: false,
    status: "DONE",
    ...(familyId ? { OR: [{ familyId: null }, { familyId }] } : { familyId: null }),
  };
}
