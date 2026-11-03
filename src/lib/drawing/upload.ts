import "server-only";

import { MAX_PNG_BYTES, MAX_STROKES_BYTES, strokesSchema, type Stroke } from "@/lib/heroes/rules";

/** 그림 업로드 검사 (영웅 그림, 세계관 표지 공용): PNG 형식·크기, 그리기 기록 형식 */
export function validateDrawingUpload(
  png: Uint8Array,
  strokesJson: string,
): { ok: true; strokes: Stroke[] } | { ok: false; error: string } {
  if (png.byteLength === 0 || png.byteLength > MAX_PNG_BYTES) return { ok: false, error: "그림 파일이 너무 커요." };
  // PNG 시그니처 확인 (89 50 4E 47)
  if (png[0] !== 0x89 || png[1] !== 0x50 || png[2] !== 0x4e || png[3] !== 0x47) return { ok: false, error: "그림 파일 형식이 달라요." };
  if (strokesJson.length > MAX_STROKES_BYTES) return { ok: false, error: "그림 데이터가 너무 커요." };
  try {
    const parsed = strokesSchema.safeParse(JSON.parse(strokesJson));
    return parsed.success ? { ok: true, strokes: parsed.data } : { ok: false, error: "그림 데이터를 읽을 수 없어요." };
  } catch {
    return { ok: false, error: "그림 데이터를 읽을 수 없어요." };
  }
}
