import "server-only";

import { randomBytes } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { STAT_KEYS } from "@/lib/characters/browse";
import { getDb } from "@/lib/db";
import { validateDrawingUpload } from "@/lib/drawing/upload";
import { strokesSchema, type Stroke } from "@/lib/heroes/rules";
import { coverStrokesKey, getDrawingStore, worldCoverKeys, type DrawingStore } from "@/lib/storage";

import { worldInputSchema, worldRenameSchema, WORLDS_PER_FAMILY, type WorldInput } from "./rules";

/**
 * 우리 가족 세계관 (docs/HERO_MAKER.md 5장)
 * - 아이가 만들고, 고치기·지우기는 부모 모드에서만
 * - 가족 세계관은 그 가족에게만 보입니다 (Series.familyId)
 */
export type WorldCtx = { familyId: string; profileId: string };
type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };
type Deps = { db?: PrismaClient; store?: DrawingStore };
const deps = (d?: Deps) => ({ db: d?.db ?? getDb(), store: d?.store ?? getDrawingStore() });
const fail = (error: string) => ({ ok: false as const, error });

/** 세계관 만들기: 능력치 이름, 종류, 편까지 한 번에 */
export async function createWorld(ctx: WorldCtx, input: WorldInput, d?: Deps): Promise<Result<{ id: string; slug: string }>> {
  const { db } = deps(d);
  const parsed = worldInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.");
  const w = parsed.data;

  const [profile, count] = await Promise.all([
    db.childProfile.findFirst({ where: { id: ctx.profileId, familyId: ctx.familyId }, select: { id: true } }),
    db.series.count({ where: { familyId: ctx.familyId } }),
  ]);
  if (!profile) return fail("우리 가족 프로필이 아니에요.");
  if (count >= WORLDS_PER_FAMILY) return fail(`세계관은 ${WORLDS_PER_FAMILY}개까지 만들 수 있어요.`);

  const series = await db.series.create({
    data: {
      slug: `w-${randomBytes(5).toString("hex")}`,
      name: w.name,
      description: w.description || `${w.name}에 사는 영웅들`,
      themeColor: w.themeColor,
      statLabels: Object.fromEntries(STAT_KEYS.map((k, i) => [k, w.statLabels[i]])),
      order: 100 + count,
      familyId: ctx.familyId,
      creatorId: ctx.profileId,
      kinds: { create: w.kinds.map((name, order) => ({ name, order })) },
      factions: { create: w.factions.map((f) => ({ name: f.name, color: f.color })) },
    },
    select: { id: true, slug: true },
  });
  return { ok: true, id: series.id, slug: series.slug };
}

/** 표지 그리기 화면용 (같은 가족만) */
export async function getWorldForCover(familyId: string, seriesId: string, d?: Deps) {
  const { db } = deps(d);
  return db.series.findFirst({
    where: { id: seriesId, familyId },
    select: { id: true, slug: true, name: true, themeColor: true, coverImage: true, creatorId: true },
  });
}

/** 표지 저장: 만든 아이만. 새 버전 키로 올리고 이전 버전은 지웁니다. */
export async function saveWorldCover(
  ctx: WorldCtx,
  seriesId: string,
  input: { png: Uint8Array; strokesJson: string },
  d?: Deps,
): Promise<Result<{ version: string }>> {
  const { db, store } = deps(d);
  const world = await db.series.findFirst({
    where: { id: seriesId, familyId: ctx.familyId, creatorId: ctx.profileId },
    select: { id: true, coverImage: true },
  });
  if (!world) return fail("내가 만든 세계관이 아니에요.");
  const checked = validateDrawingUpload(input.png, input.strokesJson);
  if (!checked.ok) return fail(checked.error);

  const version = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const keys = worldCoverKeys(ctx.familyId, world.id, version);
  await store.put(keys.png, input.png, "image/png");
  await store.put(keys.strokes, JSON.stringify(checked.strokes), "application/json");
  await db.series.update({ where: { id: world.id }, data: { coverImage: keys.png } });

  if (world.coverImage?.startsWith("families/")) {
    await store.deleteMany([world.coverImage, coverStrokesKey(world.coverImage)]).catch(() => {});
  }
  return { ok: true, version };
}

/** 표지 그림 키 (같은 가족만) */
export async function getWorldCoverKey(familyId: string, seriesId: string, d?: Deps): Promise<string | null> {
  const { db } = deps(d);
  const w = await db.series.findFirst({ where: { id: seriesId, familyId }, select: { coverImage: true } });
  return w?.coverImage?.startsWith("families/") ? w.coverImage : null;
}

/** 표지 이어 그리기용 기록 (만든 아이만) */
export async function getWorldCoverStrokes(ctx: WorldCtx, seriesId: string, d?: Deps): Promise<Stroke[] | null> {
  const { db, store } = deps(d);
  const w = await db.series.findFirst({
    where: { id: seriesId, familyId: ctx.familyId, creatorId: ctx.profileId },
    select: { coverImage: true },
  });
  if (!w?.coverImage?.startsWith("families/")) return null;
  const obj = await store.get(coverStrokesKey(w.coverImage));
  if (!obj) return null;
  const parsed = strokesSchema.safeParse(JSON.parse(new TextDecoder().decode(obj.body)));
  return parsed.success ? parsed.data : null;
}

/* ───────────── 부모 모드 ───────────── */

export async function listFamilyWorlds(familyId: string, d?: Deps) {
  const { db } = deps(d);
  return db.series.findMany({
    where: { familyId },
    orderBy: [{ order: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      themeColor: true,
      coverImage: true,
      creator: { select: { nickname: true } },
      _count: { select: { characters: true } },
    },
  });
}

export async function renameWorld(familyId: string, seriesId: string, input: unknown, d?: Deps): Promise<Result> {
  const { db } = deps(d);
  const parsed = worldRenameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.");
  const { count } = await db.series.updateMany({
    where: { id: seriesId, familyId },
    data: { name: parsed.data.name, description: parsed.data.description || `${parsed.data.name}에 사는 영웅들` },
  });
  return count ? { ok: true } : fail("우리 가족 세계관이 아니에요.");
}

/** 세계관 지우기: 그 안의 영웅과 그림 파일까지 함께 지웁니다. */
export async function deleteWorld(familyId: string, seriesId: string, d?: Deps): Promise<Result<{ heroes: number }>> {
  const { db, store } = deps(d);
  const world = await db.series.findFirst({
    where: { id: seriesId, familyId },
    select: { id: true, coverImage: true, characters: { select: { imageUrl: true, strokesUrl: true } } },
  });
  if (!world) return fail("우리 가족 세계관이 아니에요.");

  const files = [
    ...world.characters.flatMap((c) => [c.imageUrl, c.strokesUrl]),
    world.coverImage,
    world.coverImage ? coverStrokesKey(world.coverImage) : null,
  ].filter((k): k is string => !!k?.startsWith("families/"));

  await db.series.delete({ where: { id: world.id } }); // 영웅·종류·편은 DB에서 함께 지워집니다 (onDelete: Cascade)
  await store.deleteMany(files).catch(() => {});
  return { ok: true, heroes: world.characters.length };
}

/** 세계관 표지 주소 (버전이 바뀌면 주소도 바뀜) */
export function worldCoverSrc(world: { id: string; coverImage: string | null }): string | null {
  if (!world.coverImage?.startsWith("families/")) return null;
  const version = world.coverImage.split("/").at(-2) ?? "0";
  return `/api/worlds/${world.id}/cover?v=${version}`;
}
