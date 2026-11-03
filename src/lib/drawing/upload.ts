import "server-only";

import { MAX_BACKGROUND_BYTES, MAX_PNG_BYTES, MAX_STROKES_BYTES, strokesSchema, type Stroke } from "@/lib/heroes/rules";

export type ImageType = "image/png" | "image/jpeg";

/** 파일 앞부분으로 형식 확인 (PNG: 89 50 4E 47, JPEG: FF D8 FF) */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}

/**
 * 그림 업로드 검사 (영웅 그림, 세계관 표지, 공식 인물 그림 공용)
 * - 그림: PNG(투명 배경 그림) 또는 JPEG(사진 위에 덧그린 그림)
 * - 그리기 기록: strokesSchema
 */
export function validateDrawingUpload(
  image: Uint8Array,
  strokesJson: string,
  { allowJpeg = false }: { allowJpeg?: boolean } = {},
): { ok: true; strokes: Stroke[]; contentType: ImageType } | { ok: false; error: string } {
  if (image.byteLength === 0 || image.byteLength > MAX_PNG_BYTES) return { ok: false, error: "그림 파일이 너무 커요." };
  const contentType = sniffImage(image);
  if (!contentType || (contentType === "image/jpeg" && !allowJpeg)) return { ok: false, error: "그림 파일 형식이 달라요." };
  if (strokesJson.length > MAX_STROKES_BYTES) return { ok: false, error: "그림 데이터가 너무 커요." };
  try {
    const parsed = strokesSchema.safeParse(JSON.parse(strokesJson));
    return parsed.success ? { ok: true, strokes: parsed.data, contentType } : { ok: false, error: "그림 데이터를 읽을 수 없어요." };
  } catch {
    return { ok: false, error: "그림 데이터를 읽을 수 없어요." };
  }
}

/** 밑그림 사진 검사: 브라우저가 1024px JPEG로 줄여서 보냅니다. */
export function validateBackground(b: Uint8Array): { ok: true } | { ok: false; error: string } {
  if (b.byteLength === 0 || b.byteLength > MAX_BACKGROUND_BYTES) return { ok: false, error: "사진이 너무 커요." };
  if (sniffImage(b) !== "image/jpeg") return { ok: false, error: "사진 형식이 달라요." };
  return { ok: true };
}
