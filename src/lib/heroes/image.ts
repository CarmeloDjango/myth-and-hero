/**
 * 가족 전용 그림 주소 (서버·클라이언트 공용)
 * 저장소 키에 버전이 들어 있어서, 그림이 바뀌면 주소도 바뀌고 브라우저 캐시가 새로 받아옵니다.
 * 실제 파일은 라우트 핸들러가 가족을 확인한 뒤 내려줍니다.
 */
const owned = (k: string | null | undefined): k is string => !!k?.startsWith("families/");

const version = (key: string) => key.split("/").at(-2) ?? "0";
const suffix = (size: "full" | "thumb") => (size === "thumb" ? "&size=thumb" : "");

/** 아이가 만든 영웅의 그림: /api/heroes/:id/drawing (size=thumb: 카드 목록용 작은 그림) */
export function heroImageSrc(hero: { id: string; imageUrl: string | null }, size: "full" | "thumb" = "full"): string | null {
  if (!owned(hero.imageUrl)) return null;
  return `/api/heroes/${hero.id}/drawing?v=${version(hero.imageUrl)}${suffix(size)}`;
}

/** 공식 인물에 우리 가족이 붙인 그림: /api/characters/:id/picture */
export function characterPictureSrc(characterId: string, imageUrl: string | null | undefined, size: "full" | "thumb" = "full"): string | null {
  if (!owned(imageUrl)) return null;
  return `/api/characters/${characterId}/picture?v=${version(imageUrl)}${suffix(size)}`;
}

/** 사진 위에 그린 그림(JPEG)인지. 사진은 카드 칸을 꽉 채우고, 투명 그림(PNG)은 진영 색 위에 통째로 보여줍니다. */
export function isPhotoPicture(imageUrl: string | null | undefined): boolean {
  return !!imageUrl?.endsWith(".jpg");
}

/** 작은 그림 키: 같은 버전 폴더의 thumb.png|jpg */
export function thumbKeyOf(imageKey: string): string {
  return imageKey.replace(/drawing\.(png|jpg)$/, "thumb.$1");
}

/** 밑그림 사진 주소: 그림 주소와 같은 핸들러에 ?bg=<버전> */
export function backgroundSrc(endpoint: string, backgroundKey: string | null | undefined): string | null {
  if (!owned(backgroundKey)) return null;
  const version = backgroundKey.split("/").at(-1)?.replace(/\.jpg$/, "") ?? "0";
  return `${endpoint}?bg=${version}`;
}
