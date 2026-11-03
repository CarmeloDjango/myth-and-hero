"use server";

import type { CharacterPage, CharacterPageInput } from "@/lib/characters/browse";
import { getCharacterPage } from "@/lib/queries/characters";

/**
 * 도감 목록 다음 페이지 (인피니트 스크롤의 queryFn)
 * 입력은 getCharacterPage 안에서 zod로 다시 검증합니다. 서버 액션은 외부에서 직접 호출될 수 있기 때문입니다.
 */
export async function fetchCharacterPageAction(input: CharacterPageInput): Promise<CharacterPage> {
  return getCharacterPage(input);
}
