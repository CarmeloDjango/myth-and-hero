import { connection } from "next/server";

import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { MAX_PNG_BYTES, MAX_STROKES_BYTES } from "@/lib/heroes/rules";
import { getDrawingStore } from "@/lib/storage";
import { getWorldCoverKey, getWorldCoverStrokes, saveWorldCover } from "@/lib/worlds/service";

/**
 * GET  /api/worlds/:id/cover          → 표지 PNG (같은 가족만)
 * GET  /api/worlds/:id/cover?strokes=1 → 표지 그리기 기록 (만든 아이만, 이어 그리기용)
 * POST /api/worlds/:id/cover          → 표지 저장 (multipart: png, strokes) (만든 아이만)
 */
export async function GET(request: Request, { params }: RouteContext<"/api/worlds/[id]/cover">) {
  await connection();
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  if (new URL(request.url).searchParams.get("strokes")) {
    if (!viewer.profile) return Response.json({ strokes: [] });
    const strokes = await getWorldCoverStrokes({ familyId: viewer.family.id, profileId: viewer.profile.id }, id);
    return Response.json({ strokes: strokes ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const key = await getWorldCoverKey(viewer.family.id, id);
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await getDrawingStore().get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(obj.body), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: Request, { params }: RouteContext<"/api/worlds/[id]/cover">) {
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.profile) return Response.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PNG_BYTES + MAX_STROKES_BYTES + 64 * 1024) {
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
  const result = await saveWorldCover(
    { familyId: viewer.family.id, profileId: viewer.profile.id },
    id,
    { png: new Uint8Array(await png.arrayBuffer()), strokesJson: strokes },
  );
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
