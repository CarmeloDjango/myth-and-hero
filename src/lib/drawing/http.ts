import "server-only";

import { MAX_BACKGROUND_BYTES, MAX_PNG_BYTES, MAX_STROKES_BYTES } from "@/lib/heroes/rules";
import { getDrawingStore } from "@/lib/storage";

/**
 * 그림 라우트 핸들러 공용 도우미 (영웅 그림, 공식 인물 그림)
 *
 * POST multipart:
 * - png        : 완성 그림 (PNG, 사진이 있으면 JPEG). 이름은 예전 그대로 png
 * - strokes    : 그리기 기록 JSON
 * - background : 새 밑그림 사진 (JPEG) — 없으면 그대로
 * - clearBackground=1 : 밑그림 빼기
 */
export type PictureForm = { png: Uint8Array; strokesJson: string; background?: Uint8Array | null };

export async function readPictureForm(request: Request): Promise<PictureForm | Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PNG_BYTES + MAX_STROKES_BYTES + MAX_BACKGROUND_BYTES + 64 * 1024) {
    return Response.json({ ok: false, error: "그림이 너무 커요." }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "그림을 읽을 수 없어요." }, { status: 400 });
  }
  const png = form.get("png");
  const strokes = form.get("strokes");
  const background = form.get("background");
  if (!(png instanceof Blob) || typeof strokes !== "string") {
    return Response.json({ ok: false, error: "그림을 읽을 수 없어요." }, { status: 400 });
  }
  return {
    png: new Uint8Array(await png.arrayBuffer()),
    strokesJson: strokes,
    background:
      background instanceof Blob ? new Uint8Array(await background.arrayBuffer()) : form.get("clearBackground") === "1" ? null : undefined,
  };
}

/** 저장소 파일 내려주기. 주소에 버전(?v=, ?bg=)이 있어서 오래 캐시해도 됩니다. 가족 전용이라 private. */
export async function storedFileResponse(key: string | null | undefined): Promise<Response> {
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await getDrawingStore().get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const type = obj.contentType === "image/jpeg" ? "image/jpeg" : "image/png";
  return new Response(Buffer.from(obj.body), {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
