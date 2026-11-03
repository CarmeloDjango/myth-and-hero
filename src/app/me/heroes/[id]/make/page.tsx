import { cardTint } from "@/lib/characters/browse";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { Tori } from "@/components/mascot/Tori";
import { ReadAloudButton } from "@/components/speech/ReadAloudButton";
import { STAT_KEYS } from "@/lib/characters/browse";
import { requireProfile } from "@/lib/family/viewer";
import { STEP_COUNT, WIZARD_STEPS, statTotal } from "@/lib/heroes/rules";
import { getHeroForWizard, heroImageSrc, type WizardHero } from "@/lib/heroes/service";

import { DrawStep, FinishStep, KindStep, NameStep, StatsStep, StoryStep } from "./steps";

export const metadata: Metadata = { title: "영웅 만들기 · 영웅 도감" };

export default function MakeHeroPage({ params, searchParams }: PageProps<"/me/heroes/[id]/make">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 pb-20 pt-8">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6">
          <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
            <Wizard params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Wizard({ params, searchParams }: Pick<PageProps<"/me/heroes/[id]/make">, "params" | "searchParams">) {
  const [{ id }, sp, viewer] = await Promise.all([params, searchParams, requireProfile()]);
  const hero = await getHeroForWizard({ familyId: viewer.family.id, profileId: viewer.profile.id }, id);
  if (!hero) notFound();
  if (hero.status === "DONE") redirect(`/me/heroes/${hero.id}/done`);

  // 아직 지나지 않은 단계로 건너뛸 수 없습니다.
  const requested = Number(Array.isArray(sp.step) ? sp.step[0] : sp.step) || hero.wizardStep;
  const step = Math.min(Math.max(1, requested), Math.max(1, hero.wizardStep), STEP_COUNT);
  const current = WIZARD_STEPS[step - 1];
  // 편이 없는 세계관(그리스신화 등)은 종류만 묻습니다.
  const stepQuestion = current.key === "kind" && !hero.series.factions.length ? "어떤 영웅이에요?" : current.question;
  const question = current.key === "name" ? stepQuestion : current.key === "done" ? `${hero.name || "영웅"}, ${stepQuestion}` : `${hero.name || "영웅"}! ${stepQuestion}`;

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[15px] font-bold text-muted">
          <span>
            {hero.series.name} · {step}/{STEP_COUNT} {current.label}
          </span>
        </div>
        <div
          className="h-4 overflow-hidden rounded-lg bg-line"
          role="progressbar"
          aria-label="영웅 만들기 진행"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step}
        >
          <div className="relative h-full rounded-lg bg-green transition-[width]" style={{ width: `${(step / STEP_COUNT) * 100}%` }}>
            <span className="absolute inset-x-2 top-[3px] h-1 rounded-sm bg-paper opacity-35" />
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <Tori size={88} mood={current.key === "done" ? "wow" : "happy"} />
        <div className="sticker relative flex flex-1 items-center gap-3 rounded-card px-5 py-4">
          <h1 className="flex-1 text-[28px] font-bold leading-snug">{question}</h1>
          <ReadAloudButton text={question} compact />
        </div>
      </div>

      <StepBody hero={hero} stepKey={current.key} />
    </>
  );
}

function StepBody({ hero, stepKey }: { hero: WizardHero; stepKey: (typeof WIZARD_STEPS)[number]["key"] }) {
  const faction = hero.series.factions.find((f) => f.id === hero.factionId);
  const tint = cardTint(faction, hero.series.kinds.find((k) => k.id === hero.kindId));
  switch (stepKey) {
    case "name":
      return <NameStep heroId={hero.id} name={hero.name} title={hero.title ?? ""} />;
    case "draw":
      return <DrawStep heroId={hero.id} background={tint} hasDrawing={!!hero.imageUrl} />;
    case "kind":
      return <KindStep heroId={hero.id} kinds={hero.series.kinds} factions={hero.series.factions} kindId={hero.kindId} factionId={hero.factionId} />;
    case "stats":
      return <StatsStep heroId={hero.id} labels={hero.series.statLabels} stats={hero.stats} />;
    case "story":
      return <StoryStep heroId={hero.id} story={hero.story} />;
    case "done": {
      const src = heroImageSrc(hero);
      const kind = hero.series.kinds.find((k) => k.id === hero.kindId);
      return (
        <FinishStep heroId={hero.id}>
          <div className="sticker mx-auto flex w-full max-w-[360px] flex-col overflow-hidden rounded-card">
            <div className="relative flex aspect-square items-center justify-center" style={{ background: tint }}>
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림 (라우트 핸들러에서 권한 확인)
                <img src={src} alt={`${hero.name} 그림`} className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <span aria-hidden="true" className="font-display text-[140px] text-ink opacity-15">
                  {hero.name.slice(0, 1) || "?"}
                </span>
              )}
              <span className="absolute bottom-3 left-3 rounded-button border-2 border-green bg-paper px-2 py-0.5 text-xs font-bold text-green-ink">
                나만의 카드
              </span>
            </div>
            <div className="flex flex-col gap-1 p-5">
              <span className="text-[13px] font-bold tracking-[0.053em] text-muted">
                {[faction?.name, kind?.name].filter(Boolean).join(" · ") || hero.series.name}
              </span>
              <span className="font-display text-4xl">{hero.name}</span>
              {hero.title ? <span className="font-medium text-muted">{hero.title}</span> : null}
              <dl className="mt-2 grid grid-cols-5 gap-1 text-center">
                {STAT_KEYS.map((k) => (
                  <div key={k} className="flex flex-col">
                    <dt className="text-xs font-bold text-muted">{hero.series.statLabels[k]}</dt>
                    <dd className="text-lg font-black tabular-nums">{hero.stats[k]}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-right text-xs font-bold text-muted">합계 {statTotal(hero.stats)}점</p>
            </div>
          </div>
        </FinishStep>
      );
    }
  }
}
