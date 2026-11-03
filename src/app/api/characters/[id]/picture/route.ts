import { connection } from "next/server";

import { readPictureForm, storedFileResponse } from "@/lib/drawing/http";
import { getFamilyViewerOrNull } from "@/lib/family/viewer";
import { backgroundSrc } from "@/lib/heroes/image";
import { getCharacterPictureKey, getCharacterPictureSource, saveCharacterPicture } from "@/lib/pictures/service";

/**
 * 공식 인물에 우리 가족이 붙인 그림 (src/lib/pictures/service.ts)
 * GET  /api/characters/:id/picture           → 그림 (같은 가족만)
 * GET  /api/characters/:id/picture?strokes=1 → { strokes, background }
 * GET  /api/characters/:id/picture?bg=<버전> → 밑그림 사진
 * POST /api/characters/:id/picture           → 그림 저장 (아이 누구나, 또는 부모 모드)
 */
export async function GET(request: Request, { params }: RouteContext<"/api/characters/[id]/picture">) {
  await connection();
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const search = new URL(request.url).searchParams;

  if (search.get("strokes") || search.get("bg")) {
    const src = await getCharacterPictureSource(viewer.family.id, id);
    if (search.get("bg")) return storedFileResponse(src?.backgroundKey);
    return Response.json(
      { strokes: src?.strokes ?? [], background: backgroundSrc(`/api/characters/${id}/picture`, src?.backgroundKey) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return storedFileResponse(await getCharacterPictureKey(viewer.family.id, id));
}

export async function POST(request: Request, { params }: RouteContext<"/api/characters/[id]/picture">) {
  const { id } = await params;
  const viewer = await getFamilyViewerOrNull();
  if (!viewer || (!viewer.profile && !viewer.parentMode)) return Response.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  const form = await readPictureForm(request);
  if (form instanceof Response) return form;
  const result = await saveCharacterPicture({ familyId: viewer.family.id, profileId: viewer.profile?.id ?? null }, id, form);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
