/**
 * 아이가 그린 그림의 주소 (서버·클라이언트 공용)
 * 저장소 키에 버전이 들어 있어서, 그림이 바뀌면 주소도 바뀌고 브라우저 캐시가 새로 받아옵니다.
 * 실제 파일은 /api/heroes/:id/drawing 라우트 핸들러가 가족을 확인한 뒤 내려줍니다.
 */
export function heroImageSrc(hero: { id: string; imageUrl: string | null }): string | null {
  if (!hero.imageUrl?.startsWith("families/")) return null;
  const version = hero.imageUrl.split("/").at(-2) ?? "0";
  return `/api/heroes/${hero.id}/drawing?v=${version}`;
}
