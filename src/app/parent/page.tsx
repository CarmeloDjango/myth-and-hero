import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { exitParentModeAction } from "@/app/actions/family";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";
import { CenteredPanel, SecondaryButton } from "@/components/ui/form";
import { AVATAR_KEYS, MAX_PROFILES, type AvatarKey } from "@/lib/family/avatars";
import { requireFamily } from "@/lib/family/viewer";
import { heroImageSrc, listFamilyHeroes } from "@/lib/heroes/service";
import { listOfficialWithoutPicture } from "@/lib/pictures/service";
import { worldColor } from "@/lib/worlds/rules";
import { listFamilyWorlds, worldCoverSrc } from "@/lib/worlds/service";

import { ParentHeroList } from "./hero-controls";
import { ParentWorldList } from "./world-controls";
import { AddProfileForm, ParentPinForm, ProfileEditor, SignOutButton } from "./parent-client";

export const metadata: Metadata = { title: "부모 모드 · 영웅 도감" };

export default function ParentPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <Suspense fallback={<p role="status" className="py-16 text-center font-bold text-muted">불러오는 중…</p>}>
        <ParentContent />
      </Suspense>
      <SiteFooter />
    </div>
  );
}

function toAvatarKey(v: string): AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(v) ? (v as AvatarKey) : "green";
}

async function ParentContent() {
  const viewer = await requireFamily();

  if (!viewer.parentMode) {
    return (
      <CenteredPanel title="부모 모드" lead="부모 PIN을 입력해 주세요. 10분 동안 유지돼요.">
        <ParentPinForm />
        <Link href="/me" className="text-center text-[15px] font-bold text-blue-ink underline-offset-4 hover:underline">
          돌아가기
        </Link>
      </CenteredPanel>
    );
  }

  const profiles = viewer.family.profiles;
  const [heroRows, worldRows, noPicture] = await Promise.all([
    listFamilyHeroes(viewer.family.id),
    listFamilyWorlds(viewer.family.id),
    listOfficialWithoutPicture(viewer.family.id),
  ]);
  const noPictureBySeries = Map.groupBy(noPicture, (c) => c.series.name);
  const worlds = worldRows.map((w) => ({
    id: w.id,
    slug: w.slug,
    name: w.name,
    description: w.description,
    coverSrc: worldCoverSrc(w),
    tint: worldColor(w.themeColor)?.soft ?? "#f7f7f7",
    creator: w.creator?.nickname ?? null,
    heroes: w._count.characters,
  }));
  const heroes = heroRows.map((h) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    status: h.status,
    hidden: h.hidden,
    imageSrc: heroImageSrc(h, "thumb"),
    color: h.faction?.color ?? null,
    creator: h.creator?.nickname ?? null,
    seriesSlug: h.series.slug,
    seriesName: h.series.name,
  }));
  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto flex max-w-[960px] flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">부모 모드</h1>
            <p className="text-[17px] font-medium text-muted">{viewer.user.email} 계정의 가족 도감이에요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={exitParentModeAction}>
              <SecondaryButton type="submit">부모 모드 끝내기</SecondaryButton>
            </form>
            <SignOutButton />
          </div>
        </div>

        <section aria-labelledby="profiles" className="flex flex-col gap-4">
          <h2 id="profiles" className="text-[32px] font-bold">
            아이 프로필 ({profiles.length}/{MAX_PROFILES})
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {profiles.map((p) => (
              <ProfileEditor key={p.id} id={p.id} nickname={p.nickname} avatar={toAvatarKey(p.avatar)} canDelete={profiles.length > 1} />
            ))}
            {profiles.length < MAX_PROFILES ? <AddProfileForm /> : null}
          </div>
        </section>

        <section aria-labelledby="worlds" className="flex flex-col gap-4">
          <h2 id="worlds" className="text-[32px] font-bold">
            아이들이 만든 세계관 ({worlds.length})
          </h2>
          <p className="font-medium text-muted">세계관을 지우면 그 안의 영웅과 그림도 함께 지워져요.</p>
          <ParentWorldList worlds={worlds} />
        </section>

        <section aria-labelledby="no-picture" className="flex flex-col gap-4">
          <h2 id="no-picture" className="text-[32px] font-bold">
            그림이 없는 인물 ({noPicture.length})
          </h2>
          <p className="font-medium text-muted">
            누르면 그림 넣기 화면이 열려요. 사진을 올리거나 직접 그릴 수 있고, 붙인 그림은 우리 가족에게만 보여요. 아이들도 인물 화면의 &ldquo;그림 넣기&rdquo;로 넣을 수 있어요.
          </p>
          {noPicture.length ? (
            <div className="flex flex-col gap-3">
              {[...noPictureBySeries].map(([series, list]) => (
                <div key={series} className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold">{series}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {list.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/${c.series.slug}/${c.slug}/picture`}
                          className="sticker pressable inline-flex min-h-11 items-center rounded-button bg-paper px-3 text-[15px] font-bold text-blue-ink hover:bg-paper-dim"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-card bg-green-soft p-5 font-bold text-green-ink">모든 인물에 그림이 있어요!</p>
          )}
        </section>

        <section aria-labelledby="heroes" className="flex flex-col gap-4">
          <h2 id="heroes" className="text-[32px] font-bold">
            아이들이 만든 영웅 ({heroes.length})
          </h2>
          <p className="font-medium text-muted">숨기면 도감에서 사라지고, 다시 보이기로 되돌릴 수 있어요. 지우면 그림까지 함께 지워져요.</p>
          <ParentHeroList heroes={heroes} />
        </section>
      </div>
    </main>
  );
}
