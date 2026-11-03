import { connection } from "next/server";

import { readPictureForm, storedFileResponse } from "@/lib/drawing/http";
import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { backgroundSrc } from "@/lib/heroes/image";
import { getHeroDrawingSource, getHeroImageKey, saveHeroDrawing } from "@/lib/heroes/service";

/**
 * GET  /api/heroes/:id/drawing          → 그림 (같은 가족만, 초안은 만든 아이만)
 * GET  /api/heroes/:id/drawing?strokes=1 → { strokes, background } 그리기 기록과 밑그림 사진 주소
 * GET  /api/heroes/:id/drawing?bg=<버전> → 밑그림 사진 (기록과 같은 권한)
 * POST /api/heroes/:id/drawing          → 그림 저장 (multipart, src/lib/drawing/http.ts) (만든 아이만)
 *
 * 저장소(비공개 버킷)는 이 핸들러만 읽고 씁니다. 브라우저는 저장소에 직접 접근하지 않습니다.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/heroes/[id]/drawing">) {
  await connection();
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const ctx = { familyId: viewer.family.id, profileId: viewer.profile?.id ?? null };
  const search = new URL(request.url).searchParams;

  if (search.get("strokes") || search.get("bg")) {
    const src = await getHeroDrawingSource(ctx, id);
    if (search.get("bg")) return storedFileResponse(src?.backgroundKey);
    return Response.json(
      { strokes: src?.strokes ?? [], background: backgroundSrc(`/api/heroes/${id}/drawing`, src?.backgroundKey) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return storedFileResponse(await getHeroImageKey(ctx.familyId, ctx.profileId, id));
}

export async function POST(request: Request, { params }: RouteContext<"/api/heroes/[id]/drawing">) {
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer?.profile) return Response.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  const form = await readPictureForm(request);
  if (form instanceof Response) return form;
  const result = await saveHeroDrawing({ familyId: viewer.family.id, profileId: viewer.profile.id }, id, form);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
