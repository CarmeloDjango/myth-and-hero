import "server-only";

import { cardTint } from "@/lib/characters/browse";
import { cardStatsFor, KIND_ABILITY, type CardDef } from "@/lib/battle/cards";
import { getDb } from "@/lib/db";
import { characterPictureSrc, heroImageSrc, isPhotoPicture } from "@/lib/heroes/image";

import { visibleCharacterWhere, visibleSeriesWhere } from "./visibility";

/**
 * 배틀에 쓸 수 있는 카드: 우리 가족이 도감에서 볼 수 있는 인물 전부 (공식 + 우리 가족 영웅)
 * 그림은 카드 크기에 맞는 작은 그림(thumb)을 씁니다.
 */
export async function getBattlePool(familyId: string): Promise<CardDef[]> {
  const rows = await getDb().character.findMany({
    where: { AND: [visibleCharacterWhere(familyId), { series: visibleSeriesWhere(familyId) }] },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      stat1: true,
      stat2: true,
      stat3: true,
      stat4: true,
      stat5: true,
      familyId: true,
      creatorId: true,
      imageUrl: true,
      familyPictures: { where: { familyId }, select: { imageUrl: true }, take: 1 },
      kind: { select: { name: true, color: true } },
      faction: { select: { color: true } },
      series: { select: { name: true, familyId: true } },
    },
  });
  return rows.map((r) => {
    const picture = r.familyPictures[0]?.imageUrl;
    const kindName = r.kind?.name ?? null;
    // 특별한 힘은 공식 세계관의 종류에만 (아이가 만든 세계관의 "영웅" 종류는 이름만 같을 수 있음)
    const ability = kindName && r.series.familyId === null ? (KIND_ABILITY[kindName] ?? null) : null;
    return {
      id: r.id,
      name: r.name,
      imageSrc: heroImageSrc(r, "thumb") ?? characterPictureSrc(r.id, picture, "thumb"),
      imageCover: isPhotoPicture(r.imageUrl ?? picture),
      tint: cardTint(r.faction, r.kind),
      kindName,
      seriesName: r.series.name,
      isFamily: r.familyId !== null,
      creatorId: r.creatorId,
      ability,
      ...cardStatsFor({ slug: r.slug, official: r.familyId === null, stats: [r.stat1, r.stat2, r.stat3, r.stat4, r.stat5], ability }),
    };
  });
}
