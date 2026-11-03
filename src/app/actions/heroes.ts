"use server";

import { redirect } from "next/navigation";

import { stepIndex, type WizardStepKey } from "@/lib/heroes/rules";
import * as heroes from "@/lib/heroes/service";
import { getFamilyViewerOrNull } from "@/lib/family/viewer";

/**
 * 영웅 만들기 서버 액션
 * 서버 액션은 외부에서 직접 호출될 수 있으므로, 모든 액션이 먼저 세션·가족·아이 프로필을 확인합니다.
 * 소유권과 입력값 검사는 src/lib/heroes/service.ts가 합니다.
 */
export type HeroFormState = { error?: string } | undefined;

async function kidCtx(): Promise<heroes.HeroCtx | null> {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.profile) return null;
  return { familyId: viewer.family.id, profileId: viewer.profile.id };
}

const NEED_PROFILE = { error: "누가 만드는지 먼저 골라 주세요." };
const makeUrl = (heroId: string, step: WizardStepKey) => `/me/heroes/${heroId}/make?step=${stepIndex(step)}`;

export async function createHeroDraftAction(seriesSlug: string) {
  const ctx = await kidCtx();
  if (!ctx) redirect("/me");
  const result = await heroes.createHeroDraft(ctx, seriesSlug);
  if (!result.ok) redirect("/me/heroes/new");
  redirect(makeUrl(result.heroId, "name"));
}

export async function saveHeroNameAction(heroId: string, _prev: HeroFormState, form: FormData): Promise<HeroFormState> {
  const ctx = await kidCtx();
  if (!ctx) return NEED_PROFILE;
  const result = await heroes.saveHeroName(ctx, heroId, { name: form.get("name"), title: form.get("title") ?? "" });
  if (!result.ok) return { error: result.error };
  redirect(makeUrl(heroId, "draw"));
}

export async function skipHeroDrawingAction(heroId: string) {
  const ctx = await kidCtx();
  if (!ctx) redirect("/me");
  await heroes.skipHeroDrawing(ctx, heroId);
  redirect(makeUrl(heroId, "kind"));
}

export async function saveHeroKindAction(heroId: string, _prev: HeroFormState, form: FormData): Promise<HeroFormState> {
  const ctx = await kidCtx();
  if (!ctx) return NEED_PROFILE;
  const result = await heroes.saveHeroKind(ctx, heroId, {
    kindId: (form.get("kindId") as string) || null,
    factionId: (form.get("factionId") as string) || null,
    ability: (form.get("ability") as string) || null,
  });
  if (!result.ok) return { error: result.error };
  redirect(makeUrl(heroId, "stats"));
}

export async function saveHeroStatsAction(heroId: string, _prev: HeroFormState, form: FormData): Promise<HeroFormState> {
  const ctx = await kidCtx();
  if (!ctx) return NEED_PROFILE;
  const result = await heroes.saveHeroStats(ctx, heroId, Object.fromEntries(form));
  if (!result.ok) return { error: result.error };
  redirect(makeUrl(heroId, "story"));
}

export async function saveHeroStoryAction(heroId: string, _prev: HeroFormState, form: FormData): Promise<HeroFormState> {
  const ctx = await kidCtx();
  if (!ctx) return NEED_PROFILE;
  const result = await heroes.saveHeroStory(ctx, heroId, Object.fromEntries(form));
  if (!result.ok) return { error: result.error };
  redirect(makeUrl(heroId, "done"));
}

export async function finishHeroAction(heroId: string): Promise<HeroFormState> {
  const ctx = await kidCtx();
  if (!ctx) return NEED_PROFILE;
  const result = await heroes.finishHero(ctx, heroId);
  if (!result.ok) return { error: result.error };
  redirect(`/me/heroes/${heroId}/done`);
}

export async function deleteDraftAction(heroId: string): Promise<HeroFormState> {
  const ctx = await kidCtx();
  if (!ctx) return NEED_PROFILE;
  const result = await heroes.deleteOwnDraft(ctx, heroId);
  return result.ok ? undefined : { error: result.error };
}

/* 부모 모드 */
async function parentFamilyId(): Promise<string | null> {
  const viewer = await getFamilyViewerOrNull();
  return viewer?.parentMode ? viewer.family.id : null;
}

export async function setHeroHiddenAction(heroId: string, hidden: boolean): Promise<HeroFormState> {
  const familyId = await parentFamilyId();
  if (!familyId) return { error: "부모 모드에서만 할 수 있어요." };
  const result = await heroes.setFamilyHeroHidden(familyId, heroId, hidden);
  return result.ok ? undefined : { error: result.error };
}

export async function deleteFamilyHeroAction(heroId: string): Promise<HeroFormState> {
  const familyId = await parentFamilyId();
  if (!familyId) return { error: "부모 모드에서만 할 수 있어요." };
  const result = await heroes.deleteFamilyHero(familyId, heroId);
  return result.ok ? undefined : { error: result.error };
}
