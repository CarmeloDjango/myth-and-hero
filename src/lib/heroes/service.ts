import "server-only";

import { randomBytes } from "node:crypto";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { STAT_KEYS, toStatLabels } from "@/lib/characters/browse";
import { getDb } from "@/lib/db";
import { pictureFiles, readStrokes, writePicture } from "@/lib/drawing/picture";
import {
  composeStory,
  heroNameSchema,
  heroStatsSchema,
  stepIndex,
  storyAnswersSchema,
  type Stroke,
  type StoryAnswers,
  type WizardStepKey,
} from "@/lib/heroes/rules";
import { visibleSeriesWhere } from "@/lib/queries/visibility";
import { buildSearchText, toChoseong } from "@/lib/search/choseong";
import { getDrawingStore, type DrawingStore } from "@/lib/storage";

/**
 * 아이가 만드는 영웅 (docs/HERO_MAKER.md 3장)
 *
 * 모든 함수는 "누가(가족, 아이 프로필)"를 인자로 받고, 대상 영웅이 그 가족·그 아이의 것인지 직접 확인합니다.
 * 세션 확인은 호출하는 쪽(서버 액션, 라우트 핸들러)이 하고, 여기서는 소유권과 입력값을 검사합니다.
 * 세션과 분리해 두었기 때문에 테스트에서 로그인 없이 바로 부를 수 있습니다.
 */
export type HeroCtx = { familyId: string; profileId: string };
export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

type Deps = { db?: PrismaClient; store?: DrawingStore };
const deps = (d?: Deps) => ({ db: d?.db ?? getDb(), store: d?.store ?? getDrawingStore() });

const fail = (error: string) => ({ ok: false as const, error });

/** 이 아이가 만든 영웅만 찾습니다. */
async function findOwnHero(db: PrismaClient, ctx: HeroCtx, heroId: string) {
  return db.character.findFirst({
    where: { id: heroId, familyId: ctx.familyId, creatorId: ctx.profileId },
    select: { id: true, slug: true, seriesId: true, status: true, wizardStep: true, name: true, wizardData: true, imageUrl: true, strokesUrl: true, backgroundUrl: true },
  });
}

const advance = (current: number, step: WizardStepKey) => Math.max(current, stepIndex(step) + 1);

function readWizardData(raw: Prisma.JsonValue | null): { story?: StoryAnswers } {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { story?: StoryAnswers }) : {};
}

/** 1) 세계관을 고르면 초안을 만듭니다. */
export async function createHeroDraft(ctx: HeroCtx, seriesSlug: string, d?: Deps): Promise<Result<{ heroId: string }>> {
  const { db } = deps(d);
  const series = await db.series.findFirst({
    where: { slug: seriesSlug, ...visibleSeriesWhere(ctx.familyId) },
    select: { id: true },
  });
  if (!series) return fail("그 세계관을 찾을 수 없어요.");

  const hero = await db.character.create({
    data: {
      slug: `kid-${randomBytes(6).toString("hex")}`,
      seriesId: series.id,
      familyId: ctx.familyId,
      creatorId: ctx.profileId,
      status: "DRAFT",
      wizardStep: stepIndex("name"),
      published: true,
      rarity: 5, // 나만의 카드는 언제나 5성
      name: "",
      searchText: "",
      choseong: "",
      summary: "",
      biography: "",
      aliases: [],
      funFacts: [],
    },
    select: { id: true },
  });
  return { ok: true, heroId: hero.id };
}

/** 마법사 화면에 필요한 정보 (세계관의 능력치 이름, 종류, 편 포함) */
export async function getHeroForWizard(ctx: HeroCtx, heroId: string, d?: Deps) {
  const { db } = deps(d);
  const hero = await db.character.findFirst({
    where: { id: heroId, familyId: ctx.familyId, creatorId: ctx.profileId },
    select: {
      id: true,
      slug: true,
      status: true,
      wizardStep: true,
      name: true,
      title: true,
      kindId: true,
      factionId: true,
      stat1: true,
      stat2: true,
      stat3: true,
      stat4: true,
      stat5: true,
      imageUrl: true,
      updatedAt: true,
      wizardData: true,
      series: {
        select: {
          slug: true,
          name: true,
          statLabels: true,
          kinds: { select: { id: true, name: true }, orderBy: [{ order: "asc" }, { name: "asc" }] },
          factions: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });
  if (!hero) return null;
  return {
    ...hero,
    stats: { stat1: hero.stat1, stat2: hero.stat2, stat3: hero.stat3, stat4: hero.stat4, stat5: hero.stat5 },
    story: readWizardData(hero.wizardData).story ?? null,
    series: { ...hero.series, statLabels: toStatLabels(hero.series.statLabels) },
  };
}
export type WizardHero = NonNullable<Awaited<ReturnType<typeof getHeroForWizard>>>;

export async function saveHeroName(ctx: HeroCtx, heroId: string, input: unknown, d?: Deps): Promise<Result> {
  const { db } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");
  const parsed = heroNameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "이름을 확인해 주세요.");

  await db.character.update({
    where: { id: hero.id },
    data: { name: parsed.data.name, title: parsed.data.title || null, wizardStep: advance(hero.wizardStep, "name") },
  });
  return { ok: true };
}

/**
 * 그림 저장: 그림(PNG, 사진이 있으면 JPEG)과 획 데이터를 새 버전 키로 올리고, 이전 버전은 지웁니다.
 * 완성한 영웅도 만든 아이는 그림을 다시 고칠 수 있습니다.
 */
export async function saveHeroDrawing(
  ctx: HeroCtx,
  heroId: string,
  input: { png: Uint8Array; strokesJson: string; background?: Uint8Array | null; thumb?: Uint8Array },
  d?: Deps,
): Promise<Result<{ version: string }>> {
  const { db, store } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");

  const written = await writePicture(
    store,
    `families/${ctx.familyId}/heroes/${hero.id}`,
    { image: hero.imageUrl, strokes: hero.strokesUrl, background: hero.backgroundUrl },
    { image: input.png, strokesJson: input.strokesJson, background: input.background, thumb: input.thumb },
  );
  if (!written.ok) return fail(written.error);
  const { keys } = written;

  await db.character.update({
    where: { id: hero.id },
    data: { imageUrl: keys.image, strokesUrl: keys.strokes, backgroundUrl: keys.background, wizardStep: advance(hero.wizardStep, "draw") },
  });
  // 이전 버전 정리 (실패해도 새 그림은 이미 저장됐으므로 무시)
  await store.deleteMany(written.stale).catch(() => {});
  return { ok: true, version: keys.image!.split("/").at(-2)! };
}

/**
 * 이어 그리기·그린 과정 보기용 원본: 그리기 기록과 밑그림 사진 키
 * - 만드는 중(초안): 만든 아이만
 * - 완성: 같은 가족 누구나 (형제도 "그린 과정 보기" 가능)
 */
export async function getHeroDrawingSource(
  ctx: { familyId: string; profileId: string | null },
  heroId: string,
  d?: Deps,
): Promise<{ strokes: Stroke[]; backgroundKey: string | null } | null> {
  const { db, store } = deps(d);
  const hero = await db.character.findFirst({
    where: { id: heroId, familyId: ctx.familyId },
    select: { strokesUrl: true, backgroundUrl: true, status: true, creatorId: true },
  });
  if (!hero) return null;
  if (hero.status === "DRAFT" && hero.creatorId !== ctx.profileId) return null;
  const strokes = await readStrokes(store, hero.strokesUrl);
  const backgroundKey = hero.backgroundUrl?.startsWith("families/") ? hero.backgroundUrl : null;
  if (!strokes && !backgroundKey) return null;
  return { strokes: strokes ?? [], backgroundKey };
}

/** 저장된 그리기 기록 (권한은 getHeroDrawingSource와 같음) */
export async function getHeroStrokes(ctx: { familyId: string; profileId: string | null }, heroId: string, d?: Deps): Promise<Stroke[] | null> {
  const src = await getHeroDrawingSource(ctx, heroId, d);
  return src && src.strokes.length ? src.strokes : src?.backgroundKey ? [] : null;
}

/** 그림 없이 다음 단계로 넘어가기 */
export async function skipHeroDrawing(ctx: HeroCtx, heroId: string, d?: Deps): Promise<Result> {
  const { db } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");
  await db.character.update({ where: { id: hero.id }, data: { wizardStep: advance(hero.wizardStep, "draw") } });
  return { ok: true };
}

export async function saveHeroKind(
  ctx: HeroCtx,
  heroId: string,
  input: { kindId?: string | null; factionId?: string | null },
  d?: Deps,
): Promise<Result> {
  const { db } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");

  const [kind, faction] = await Promise.all([
    input.kindId ? db.characterKind.findFirst({ where: { id: input.kindId, seriesId: hero.seriesId }, select: { id: true } }) : null,
    input.factionId ? db.faction.findFirst({ where: { id: input.factionId, seriesId: hero.seriesId }, select: { id: true } }) : null,
  ]);
  if (input.kindId && !kind) return fail("이 세계관에 없는 종류예요.");
  if (input.factionId && !faction) return fail("이 세계관에 없는 편이에요.");

  await db.character.update({
    where: { id: hero.id },
    data: { kindId: kind?.id ?? null, factionId: faction?.id ?? null, wizardStep: advance(hero.wizardStep, "kind") },
  });
  return { ok: true };
}

export async function saveHeroStats(ctx: HeroCtx, heroId: string, input: unknown, d?: Deps): Promise<Result> {
  const { db } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");
  const parsed = heroStatsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "능력치를 확인해 주세요.");

  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, Number(parsed.data[k])]));
  await db.character.update({
    where: { id: hero.id },
    data: { ...stats, wizardStep: advance(hero.wizardStep, "stats") },
  });
  return { ok: true };
}

export async function saveHeroStory(ctx: HeroCtx, heroId: string, input: unknown, d?: Deps): Promise<Result> {
  const { db } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");
  if (!hero.name) return fail("이름을 먼저 정해 주세요.");
  const parsed = storyAnswersSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "이야기를 확인해 주세요.");

  const { biography, summary } = composeStory(hero.name, parsed.data);
  const wizardData = { ...readWizardData(hero.wizardData), story: parsed.data };
  await db.character.update({
    where: { id: hero.id },
    data: { biography, summary, wizardData, wizardStep: advance(hero.wizardStep, "story") },
  });
  return { ok: true };
}

/** 완성: 도감에 넣습니다 (가족에게 보이기 시작). */
export async function finishHero(ctx: HeroCtx, heroId: string, d?: Deps): Promise<Result<{ seriesSlug: string; slug: string }>> {
  const { db } = deps(d);
  const hero = await db.character.findFirst({
    where: { id: heroId, familyId: ctx.familyId, creatorId: ctx.profileId },
    select: { id: true, slug: true, name: true, title: true, summary: true, aliases: true, series: { select: { slug: true } } },
  });
  if (!hero) return fail("내가 만든 영웅이 아니에요.");
  if (!hero.name) return fail("이름을 먼저 정해 주세요.");

  await db.character.update({
    where: { id: hero.id },
    data: {
      status: "DONE",
      wizardStep: stepIndex("done"),
      searchText: buildSearchText({ name: hero.name, aliases: hero.aliases, title: hero.title }),
      choseong: toChoseong(hero.name),
      summary: hero.summary || `${hero.name}의 이야기는 아직 비밀이에요!`,
    },
  });
  return { ok: true, seriesSlug: hero.series.slug, slug: hero.slug };
}

/** 아이는 자기 초안만 지울 수 있습니다. 완성한 영웅은 부모 모드에서 지웁니다. */
export async function deleteOwnDraft(ctx: HeroCtx, heroId: string, d?: Deps): Promise<Result> {
  const { db, store } = deps(d);
  const hero = await findOwnHero(db, ctx, heroId);
  if (!hero) return fail("내가 만든 영웅이 아니에요.");
  if (hero.status !== "DRAFT") return fail("완성한 영웅은 부모님만 지울 수 있어요.");
  await db.character.delete({ where: { id: hero.id } });
  await store.deleteMany(pictureFiles(hero)).catch(() => {});
  return { ok: true };
}

/** 내가 만든 영웅 목록 (만드는 중 / 완성) */
export async function listMyHeroes(ctx: HeroCtx, d?: Deps) {
  const { db } = deps(d);
  return db.character.findMany({
    where: { familyId: ctx.familyId, creatorId: ctx.profileId, hidden: false },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      title: true,
      status: true,
      wizardStep: true,
      imageUrl: true,
      updatedAt: true,
      faction: { select: { color: true } },
      series: { select: { slug: true, name: true } },
    },
  });
}

/* ───────────── 부모 모드 ───────────── */

export async function listFamilyHeroes(familyId: string, d?: Deps) {
  const { db } = deps(d);
  return db.character.findMany({
    where: { familyId },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      hidden: true,
      imageUrl: true,
      updatedAt: true,
      faction: { select: { color: true } },
      creator: { select: { nickname: true } },
      series: { select: { slug: true, name: true } },
    },
  });
}

export async function setFamilyHeroHidden(familyId: string, heroId: string, hidden: boolean, d?: Deps): Promise<Result> {
  const { db } = deps(d);
  const { count } = await db.character.updateMany({ where: { id: heroId, familyId }, data: { hidden } });
  return count ? { ok: true } : fail("우리 가족 영웅이 아니에요.");
}

export async function deleteFamilyHero(familyId: string, heroId: string, d?: Deps): Promise<Result> {
  const { db, store } = deps(d);
  const hero = await db.character.findFirst({ where: { id: heroId, familyId }, select: { id: true, imageUrl: true, strokesUrl: true, backgroundUrl: true } });
  if (!hero) return fail("우리 가족 영웅이 아니에요.");
  await db.character.delete({ where: { id: hero.id } });
  await store.deleteMany(pictureFiles(hero)).catch(() => {});
  return { ok: true };
}

/** 그림 읽기 권한: 같은 가족의 영웅만 (초안은 만든 아이만) */
export async function getHeroImageKey(familyId: string, profileId: string | null, heroId: string, d?: Deps) {
  const { db } = deps(d);
  const hero = await db.character.findFirst({
    where: { id: heroId, familyId },
    select: { imageUrl: true, status: true, creatorId: true },
  });
  if (!hero?.imageUrl?.startsWith("families/")) return null;
  if (hero.status === "DRAFT" && hero.creatorId !== profileId) return null;
  return hero.imageUrl;
}

export { heroImageSrc } from "./image";

/** 그림 고치기 화면용: 내가 만든 영웅 (완성작 포함) */
export async function getOwnHeroForPicture(ctx: HeroCtx, seriesSlug: string, slug: string, d?: Deps) {
  const { db } = deps(d);
  return db.character.findFirst({
    where: { slug, familyId: ctx.familyId, creatorId: ctx.profileId, series: { slug: seriesSlug } },
    select: { id: true, name: true, status: true, imageUrl: true, strokesUrl: true, backgroundUrl: true, faction: { select: { color: true } } },
  });
}
