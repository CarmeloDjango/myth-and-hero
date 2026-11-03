import "server-only";

import { randomBytes } from "node:crypto";

import { validateBackground, validateDrawingUpload } from "@/lib/drawing/upload";
import { strokesSchema, type Stroke } from "@/lib/heroes/rules";
import type { DrawingStore } from "@/lib/storage";

/**
 * 그림 파일 묶음 쓰기 (영웅 그림, 공식 인물 그림 공용)
 *
 * 저장소 키 (base = families/<가족>/heroes/<영웅> 같은 폴더):
 * - <base>/<버전>/drawing.png|jpg : 완성 그림 (사진이 있으면 사진 + 덧그림을 합친 JPEG)
 * - <base>/<버전>/strokes.json    : 그리기 기록 (이어 그리기, 그린 과정 보기)
 * - <base>/bg/<버전>.jpg          : 밑그림 사진. 그림을 저장할 때마다 바뀌지 않으므로 따로 둡니다.
 *
 * 새 버전 키로 올리고, 더는 안 쓰는 이전 키 목록(stale)을 돌려줍니다.
 * 호출하는 쪽이 DB를 새 키로 바꾼 뒤 stale을 지웁니다.
 */
export type PictureKeys = { image: string | null; strokes: string | null; background: string | null };

export type PictureInput = {
  image: Uint8Array;
  strokesJson: string;
  /** undefined: 밑그림 그대로, null: 밑그림 빼기, 바이트: 새 밑그림 */
  background?: Uint8Array | null;
};

export const newVersion = () => `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

const owned = (k: string | null | undefined): k is string => !!k?.startsWith("families/");

export async function writePicture(
  store: DrawingStore,
  base: string,
  prev: PictureKeys,
  input: PictureInput,
): Promise<{ ok: true; keys: PictureKeys; stale: string[] } | { ok: false; error: string }> {
  const checked = validateDrawingUpload(input.image, input.strokesJson, { allowJpeg: true });
  if (!checked.ok) return checked;
  if (input.background) {
    const bg = validateBackground(input.background);
    if (!bg.ok) return bg;
  }

  const version = newVersion();
  const ext = checked.contentType === "image/jpeg" ? "jpg" : "png";
  const keys: PictureKeys = {
    image: `${base}/${version}/drawing.${ext}`,
    strokes: `${base}/${version}/strokes.json`,
    background: input.background === undefined ? prev.background : input.background ? `${base}/bg/${version}.jpg` : null,
  };
  if (input.background) await store.put(keys.background!, input.background, "image/jpeg");
  await store.put(keys.image!, input.image, checked.contentType);
  await store.put(keys.strokes!, JSON.stringify(checked.strokes), "application/json");

  const stale = [prev.image, prev.strokes, prev.background !== keys.background ? prev.background : null].filter(owned);
  return { ok: true, keys, stale };
}

/** 지울 때: 이 그림이 쓰는 파일 키 전부 */
export function pictureFiles(keys: { imageUrl?: string | null; strokesUrl?: string | null; backgroundUrl?: string | null }): string[] {
  return [keys.imageUrl, keys.strokesUrl, keys.backgroundUrl].filter(owned);
}

export async function readStrokes(store: DrawingStore, key: string | null | undefined): Promise<Stroke[] | null> {
  if (!owned(key)) return null;
  const obj = await store.get(key);
  if (!obj) return null;
  try {
    const parsed = strokesSchema.safeParse(JSON.parse(new TextDecoder().decode(obj.body)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
