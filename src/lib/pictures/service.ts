import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { pictureFiles, readStrokes, writePicture } from "@/lib/drawing/picture";
import type { Stroke } from "@/lib/heroes/rules";
import { visibleCharacterWhere, visibleSeriesWhere } from "@/lib/queries/visibility";
import { getDrawingStore, type DrawingStore } from "@/lib/storage";

/**
 * 공식 인물(관우, 제우스 …)에 가족이 붙이는 그림
 *
 * - 공식 인물 데이터는 모든 가족이 같이 쓰므로, 그림은 가족마다 FamilyCharacterPicture에 따로 둡니다.
 *   그래서 인터넷에서 받은 그림을 붙여도 그 가족에게만 보입니다.
 * - 그림 넣기·바꾸기: 그 가족의 아이 누구나, 또는 부모 모드 (profileId = null)
 * - 그림 빼기: 부모 모드만 (형제가 서로 지우지 않도록)
 */
export type PictureCtx = { familyId: string; profileId: string | null };
type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };
type Deps = { db?: PrismaClient; store?: DrawingStore };
const deps = (d?: Deps) => ({ db: d?.db ?? getDb(), store: d?.store ?? getDrawingStore() });
const fail = (error: string) => ({ ok: false as const, error });

const NOT_OFFICIAL = "공식 인물에만 그림을 붙일 수 있어요.";

/** 그림을 붙일 수 있는 공식 인물인지 (도감에 보이는 공식 인물만) */
async function findOfficial(db: PrismaClient, familyId: string, characterId: string) {
  return db.character.findFirst({
    where: { AND: [visibleCharacterWhere(familyId), { id: characterId, familyId: null }] },
    select: { id: true },
  });
}

const pictureSelect = { id: true, imageUrl: true, strokesUrl: true, backgroundUrl: true } as const;

/** 그림 화면용: 공식 인물 + 우리 가족 그림 */
export async function getOfficialForPicture(familyId: string, seriesSlug: string, slug: string, d?: Deps) {
  const { db } = deps(d);
  return db.character.findFirst({
    where: { AND: [visibleCharacterWhere(familyId), { slug, familyId: null, series: { slug: seriesSlug, ...visibleSeriesWhere(familyId) } }] },
    select: {
      id: true,
      slug: true,
      name: true,
      faction: { select: { color: true } },
      series: { select: { slug: true, name: true } },
      familyPictures: { where: { familyId }, select: pictureSelect, take: 1 },
    },
  });
}

export async function saveCharacterPicture(
  ctx: PictureCtx,
  characterId: string,
  input: { png: Uint8Array; strokesJson: string; background?: Uint8Array | null; thumb?: Uint8Array },
  d?: Deps,
): Promise<Result<{ version: string }>> {
  const { db, store } = deps(d);
  if (!(await findOfficial(db, ctx.familyId, characterId))) return fail(NOT_OFFICIAL);
  const prev = await db.familyCharacterPicture.findUnique({
    where: { familyId_characterId: { familyId: ctx.familyId, characterId } },
    select: pictureSelect,
  });

  const written = await writePicture(
    store,
    `families/${ctx.familyId}/characters/${characterId}`,
    { image: prev?.imageUrl ?? null, strokes: prev?.strokesUrl ?? null, background: prev?.backgroundUrl ?? null },
    { image: input.png, strokesJson: input.strokesJson, background: input.background, thumb: input.thumb },
  );
  if (!written.ok) return fail(written.error);
  const data = {
    imageUrl: written.keys.image!,
    strokesUrl: written.keys.strokes,
    backgroundUrl: written.keys.background,
    updatedById: ctx.profileId,
  };
  // upsert 대신 나눠서 씁니다 (Neon HTTP 드라이버는 트랜잭션이 없음).
  if (prev) await db.familyCharacterPicture.update({ where: { id: prev.id }, data });
  else await db.familyCharacterPicture.create({ data: { ...data, familyId: ctx.familyId, characterId } });

  await store.deleteMany(written.stale).catch(() => {});
  return { ok: true, version: written.keys.image!.split("/").at(-2)! };
}

async function findPicture(db: PrismaClient, familyId: string, characterId: string) {
  return db.familyCharacterPicture.findUnique({
    where: { familyId_characterId: { familyId, characterId } },
    select: pictureSelect,
  });
}

/** 그림 파일 키 (같은 가족만) */
export async function getCharacterPictureKey(familyId: string, characterId: string, d?: Deps): Promise<string | null> {
  const { db } = deps(d);
  return (await findPicture(db, familyId, characterId))?.imageUrl ?? null;
}

/** 이어 그리기·그린 과정 보기용: 그리기 기록과 밑그림 사진 키 (같은 가족 누구나) */
export async function getCharacterPictureSource(
  familyId: string,
  characterId: string,
  d?: Deps,
): Promise<{ strokes: Stroke[]; backgroundKey: string | null } | null> {
  const { db, store } = deps(d);
  const pic = await findPicture(db, familyId, characterId);
  if (!pic) return null;
  return { strokes: (await readStrokes(store, pic.strokesUrl)) ?? [], backgroundKey: pic.backgroundUrl };
}

/** 그림 빼기 (부모 모드) */
export async function deleteCharacterPicture(familyId: string, characterId: string, d?: Deps): Promise<Result> {
  const { db, store } = deps(d);
  const pic = await findPicture(db, familyId, characterId);
  if (!pic) return fail("붙인 그림이 없어요.");
  await db.familyCharacterPicture.delete({ where: { id: pic.id } });
  await store.deleteMany(pictureFiles(pic)).catch(() => {});
  return { ok: true };
}

/** 부모 모드: 아직 그림이 없는 공식 인물 (세계관별) */
export async function listOfficialWithoutPicture(familyId: string, d?: Deps) {
  const { db } = deps(d);
  return db.character.findMany({
    where: { AND: [visibleCharacterWhere(familyId), { familyId: null, imageUrl: null, familyPictures: { none: { familyId } } }] },
    orderBy: [{ series: { order: "asc" } }, { name: "asc" }],
    select: { id: true, slug: true, name: true, series: { select: { slug: true, name: true } } },
  });
}
