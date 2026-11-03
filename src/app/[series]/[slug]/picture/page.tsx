import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Tori } from "@/components/mascot/Tori";
import { requireProfile } from "@/lib/family/viewer";
import { getOwnHeroForPicture } from "@/lib/heroes/service";
import { getOfficialForPicture } from "@/lib/pictures/service";

import { PictureEditor } from "./picture-editor";

export const metadata: Metadata = { title: "그림 넣기 · 영웅 도감" };

/**
 * 카드 그림 넣기·바꾸기
 * - 공식 인물: 우리 가족 아이 누구나 (그림은 우리 가족에게만 보임). 부모 모드면 그림 빼기도.
 * - 아이가 만든 영웅: 만든 아이만 (완성한 뒤에도 고칠 수 있음)
 */
export default function PicturePage({ params }: PageProps<"/[series]/[slug]/picture">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-20 pt-8">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6">
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
            {params.then(({ series, slug }) => (
              <Picture seriesSlug={decodeURIComponent(series)} slug={decodeURIComponent(slug)} />
            ))}
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Picture({ seriesSlug, slug }: { seriesSlug: string; slug: string }) {
  const viewer = await requireProfile();
  const detailHref = `/${seriesSlug}/${slug}`;
  const official = await getOfficialForPicture(viewer.family.id, seriesSlug, slug);

  let target: { id: string; name: string; color: string | null; saveUrl: string; has: boolean; canRemove: boolean };
  if (official) {
    const pic = official.familyPictures[0];
    target = {
      id: official.id,
      name: official.name,
      color: official.faction?.color ?? null,
      saveUrl: `/api/characters/${official.id}/picture`,
      has: !!pic,
      canRemove: !!pic && viewer.parentMode,
    };
  } else {
    const hero = await getOwnHeroForPicture({ familyId: viewer.family.id, profileId: viewer.profile.id }, seriesSlug, slug);
    if (!hero) {
      // 형제가 만든 영웅이면 보기 화면으로, 아예 없으면 404
      redirect(detailHref);
    }
    if (hero.status === "DRAFT") redirect(`/me/heroes/${hero.id}/make?step=2`);
    target = {
      id: hero.id,
      name: hero.name,
      color: hero.faction?.color ?? null,
      saveUrl: `/api/heroes/${hero.id}/drawing`,
      has: !!(hero.strokesUrl || hero.backgroundUrl),
      canRemove: false,
    };
  }

  return (
    <>
      <div className="flex items-end gap-3">
        <Tori size={88} mood="happy" />
        <div className="sticker flex-1 rounded-card px-5 py-4">
          <p className="text-[15px] font-bold text-green-ink">{target.name}</p>
          <h1 className="text-[28px] font-bold leading-snug">{target.has ? "그림을 고쳐 볼까요?" : "어떤 모습일까요? 그림을 넣어 봐요!"}</h1>
        </div>
      </div>
      {official ? (
        <p className="rounded-card bg-blue-soft px-4 py-3 text-[15px] font-bold text-blue-ink">
          사진을 올리거나 직접 그려요. 이 그림은 우리 가족에게만 보여요.
        </p>
      ) : null}
      <PictureEditor
        characterId={target.id}
        saveUrl={target.saveUrl}
        background={target.color ?? "#f7f7f7"}
        hasDrawing={target.has}
        doneHref={detailHref}
        canRemove={target.canRemove}
      />
    </>
  );
}
