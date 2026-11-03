"use server";

import { revalidatePath } from "next/cache";

import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import type { WorldInput } from "@/lib/worlds/rules";
import * as worlds from "@/lib/worlds/service";

/**
 * 세계관 서버 액션. 서버 액션은 외부에서 직접 호출될 수 있으므로 모든 액션이 먼저 세션·가족을 확인합니다.
 * 입력 검사와 소유권 확인은 src/lib/worlds/service.ts가 합니다.
 */
export type WorldActionState = { error?: string; ok?: boolean } | undefined;

export async function createWorldAction(input: WorldInput): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.profile) return { ok: false, error: "누가 만드는지 먼저 골라 주세요." };
  const result = await worlds.createWorld({ familyId: viewer.family.id, profileId: viewer.profile.id }, input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

async function parentFamilyId(): Promise<string | null> {
  const viewer = await getFamilyViewerOrNull();
  return viewer?.parentMode ? viewer.family.id : null;
}

export async function renameWorldAction(seriesId: string, _prev: WorldActionState, form: FormData): Promise<WorldActionState> {
  const familyId = await parentFamilyId();
  if (!familyId) return { error: "부모 모드에서만 바꿀 수 있어요." };
  const result = await worlds.renameWorld(familyId, seriesId, { name: form.get("name"), description: form.get("description") ?? "" });
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWorldAction(seriesId: string): Promise<WorldActionState> {
  const familyId = await parentFamilyId();
  if (!familyId) return { error: "부모 모드에서만 지울 수 있어요." };
  const result = await worlds.deleteWorld(familyId, seriesId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { ok: true };
}
