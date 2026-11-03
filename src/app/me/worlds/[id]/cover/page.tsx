import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Tori } from "@/components/mascot/Tori";
import { requireProfile } from "@/lib/family/viewer";
import { worldColor } from "@/lib/worlds/rules";
import { getWorldForCover } from "@/lib/worlds/service";

import { CoverDrawing } from "./cover-drawing";

export const metadata: Metadata = { title: "표지 그리기 · 영웅 도감" };

export default function WorldCoverPage({ params }: PageProps<"/me/worlds/[id]/cover">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-20 pt-8">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6">
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
            {params.then(({ id }) => (
              <Cover id={id} />
            ))}
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Cover({ id }: { id: string }) {
  const viewer = await requireProfile();
  const world = await getWorldForCover(viewer.family.id, id);
  if (!world) notFound();
  // 표지는 만든 아이가 그립니다. 다른 아이는 세계관 화면으로.
  if (world.creatorId !== viewer.profile.id) redirect(`/${world.slug}`);
  const color = worldColor(world.themeColor);

  return (
    <>
      <div className="flex items-end gap-3">
        <Tori size={88} mood="wow" />
        <div className="sticker flex-1 rounded-card px-5 py-4">
          <p className="text-[15px] font-bold text-green-ink">&ldquo;{world.name}&rdquo;를 만들었어요!</p>
          <h1 className="text-[28px] font-bold leading-snug">표지를 그려 볼까요?</h1>
        </div>
      </div>
      <CoverDrawing worldId={world.id} slug={world.slug} background={color?.soft ?? "#f7f7f7"} hasDrawing={!!world.coverImage} />
    </>
  );
}
