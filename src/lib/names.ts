import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { visibleSeriesWhere } from "@/lib/queries/visibility";

/**
 * 이름 겹침 막기 (같은 세계관에 관우가 둘이 되지 않게)
 * 비교할 때는 띄어쓰기와 대소문자를 무시합니다: "관 우" = "관우", "Zeus" = "zeus".
 */
export function nameKey(name: string): string {
  return name.normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

/**
 * 영웅 이름: 같은 세계관 안에서
 * - 공식 인물 이름·별명
 * - 우리 가족 영웅 이름 (만드는 중인 것 포함)
 * 과 겹치면 안 됩니다. 다른 가족의 영웅은 보이지 않으므로 겹쳐도 됩니다.
 * 겹치면 안내 문구, 아니면 null
 */
export async function heroNameConflict(
  db: PrismaClient,
  { familyId, seriesId, name, exceptId }: { familyId: string; seriesId: string; name: string; exceptId?: string },
): Promise<string | null> {
  const key = nameKey(name);
  const others = await db.character.findMany({
    where: { seriesId, id: exceptId ? { not: exceptId } : undefined, OR: [{ familyId: null }, { familyId }] },
    select: { name: true, aliases: true, familyId: true, series: { select: { name: true } } },
  });
  for (const c of others) {
    if (nameKey(c.name) === key) return `"${c.name}"은(는) ${c.series.name}에 이미 있어요. 다른 이름을 지어 볼까요?`;
    if (c.familyId === null && c.aliases.some((a) => nameKey(a) === key)) {
      return `"${name.trim()}"은(는) ${c.name}의 별명이에요. 다른 이름을 지어 볼까요?`;
    }
  }
  return null;
}

/** 세계관 이름: 공식 세계관, 우리 가족 세계관과 겹치면 안 됩니다. */
export async function worldNameConflict(
  db: PrismaClient,
  { familyId, name, exceptId }: { familyId: string; name: string; exceptId?: string },
): Promise<string | null> {
  const key = nameKey(name);
  const worlds = await db.series.findMany({
    where: { ...visibleSeriesWhere(familyId), id: exceptId ? { not: exceptId } : undefined },
    select: { name: true },
  });
  const hit = worlds.find((w) => nameKey(w.name) === key);
  return hit ? `"${hit.name}" 세계관은 이미 있어요. 다른 이름을 지어 볼까요?` : null;
}
