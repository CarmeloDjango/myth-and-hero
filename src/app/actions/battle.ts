"use server";

import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { recordBattle } from "@/lib/battle/records";

/** 배틀 결과 저장 (가족 안 전적). 둘이 대결이면 상대 아이도 같은 가족이어야 합니다. */
export async function recordBattleAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.profile) return { ok: false, error: "누가 하는지 먼저 골라 주세요." };
  return recordBattle(viewer.family.id, input);
}
