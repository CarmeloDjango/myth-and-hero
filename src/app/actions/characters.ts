"use server";

import type { CharacterPage, CharacterPageInput } from "@/lib/characters/browse";
import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { getCharacterPage } from "@/lib/queries/characters";

/**
 * 도감 목록 다음 페이지 (인피니트 스크롤의 queryFn)
 * 서버 액션은 외부에서 직접 호출될 수 있으므로 세션과 가족을 여기서 다시 확인하고,
 * 입력은 getCharacterPage 안에서 zod로 검증합니다.
 */
export async function fetchCharacterPageAction(input: CharacterPageInput): Promise<CharacterPage> {
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) throw new Error("로그인이 필요해요.");
  return getCharacterPage(viewer.family.id, input);
}
