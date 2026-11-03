import { connection } from "next/server";

import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { MAX_PNG_BYTES, MAX_STROKES_BYTES } from "@/lib/heroes/rules";
import { getHeroImageKey, getHeroStrokes, saveHeroDrawing } from "@/lib/heroes/service";
import { getDrawingStore } from "@/lib/storage";

/**
 * GET  /api/heroes/:id/drawing          → 그림 PNG (같은 가족만, 초안은 만든 아이만)
 * GET  /api/heroes/:id/drawing?strokes=1 → 이어 그리기용 획 JSON (만든 아이만)
 * POST /api/heroes/:id/drawing          → 그림 저장 (multipart: png, strokes) (만든 아이만)
 *
 * 저장소(비공개 버킷)는 이 핸들러만 읽고 씁니다. 브라우저는 저장소에 직접 접근하지 않습니다.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/heroes/[id]/drawing">) {
  await connection();
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  if (new URL(request.url).searchParams.get("strokes")) {
    if (!viewer.profile) return new Response("Forbidden", { status: 403 });
    const strokes = await getHeroStrokes({ familyId: viewer.family.id, profileId: viewer.profile.id }, id);
    return Response.json({ strokes: strokes ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const key = await getHeroImageKey(viewer.family.id, viewer.profile?.id ?? null, id);
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await getDrawingStore().get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(obj.body), {
    headers: {
      "Content-Type": "image/png",
      // 주소에 버전(?v=)이 들어 있어서 그림이 바뀌면 주소도 바뀝니다. 가족 전용이라 private.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request, { params }: RouteContext<"/api/heroes/[id]/drawing">) {
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.profile) return Response.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_PNG_BYTES + MAX_STROKES_BYTES + 64 * 1024) {
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
  if (!(png instanceof Blob) || typeof strokes !== "string") {
    return Response.json({ ok: false, error: "그림을 읽을 수 없어요." }, { status: 400 });
  }

  const result = await saveHeroDrawing(
    { familyId: viewer.family.id, profileId: viewer.profile.id },
    id,
    { png: new Uint8Array(await png.arrayBuffer()), strokesJson: strokes },
  );
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
