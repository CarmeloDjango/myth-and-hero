import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DrawingReplay } from "@/components/drawing/DrawingReplay";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Tori } from "@/components/mascot/Tori";
import { requireProfile } from "@/lib/family/viewer";
import { getHeroForWizard, heroImageSrc } from "@/lib/heroes/service";

export const metadata: Metadata = { title: "영웅 완성! · 영웅 도감" };

export default function HeroDonePage({ params }: PageProps<"/me/heroes/[id]/done">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <Suspense fallback={<p role="status" className="py-16 font-bold text-muted">불러오는 중…</p>}>
          {params.then(({ id }) => (
            <Done id={id} />
          ))}
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Done({ id }: { id: string }) {
  const viewer = await requireProfile();
  const hero = await getHeroForWizard({ familyId: viewer.family.id, profileId: viewer.profile.id }, id);
  if (!hero) notFound();
  if (hero.status !== "DONE") redirect(`/me/heroes/${hero.id}/make`);
  const src = heroImageSrc(hero);
  const faction = hero.series.factions.find((f) => f.id === hero.factionId);

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-6 text-center">
      <Tori size={120} mood="wow" />
      <h1 className="font-display text-[56px] leading-[1.15] text-green-dark">
        {hero.name} 완성!
      </h1>
      <p className="text-xl font-medium text-muted">{hero.series.name} 도감에 &ldquo;나만의 카드&rdquo;로 들어갔어요.</p>
      <div className="sticker w-full max-w-[320px] overflow-hidden rounded-card motion-safe:animate-[pop_.5s_ease-out]">
        <div className="relative flex aspect-square items-center justify-center" style={{ background: faction?.color ?? "#f7f7f7" }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
            <img src={src} alt={`${hero.name} 그림`} className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <span aria-hidden="true" className="font-display text-[120px] text-ink opacity-15">
              {hero.name.slice(0, 1)}
            </span>
          )}
        </div>
        <p className="p-4 font-display text-3xl">{hero.name}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {src ? <DrawingReplay heroId={hero.id} name={hero.name} background={faction?.color ?? "#f7f7f7"} /> : null}
        <Link
          href={`/${hero.series.slug}/${hero.slug}`}
          className="pressable inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold tracking-[0.053em] text-paper"
        >
          도감에서 보기
        </Link>
        <Link
          href="/me/heroes/new"
          className="sticker pressable inline-flex min-h-14 items-center rounded-button px-6 text-[17px] font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
        >
          또 만들기
        </Link>
      </div>
    </div>
  );
}
