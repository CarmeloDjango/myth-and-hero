"use server";

import { revalidatePath } from "next/cache";

import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { deleteCharacterPicture } from "@/lib/pictures/service";

/** 공식 인물에 붙인 그림 빼기 (부모 모드만) */
export async function deleteCharacterPictureAction(characterId: string): Promise<{ ok?: boolean; error?: string }> {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.parentMode) return { error: "부모 모드에서만 뺄 수 있어요." };
  const result = await deleteCharacterPicture(viewer.family.id, characterId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { ok: true };
}
