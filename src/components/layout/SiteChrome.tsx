import { Suspense } from "react";
import Link from "next/link";

import { ProfileAvatar } from "@/components/family/ProfileAvatar";
import { getViewer } from "@/lib/family/viewer";

export function SiteHeader() {
  return (
    <header className="border-b-2 border-line px-6">
      <nav
        aria-label="주 메뉴"
        className="mx-auto flex min-h-[76px] max-w-[1200px] flex-wrap items-center justify-between gap-3"
      >
        <Link href="/" className="font-display text-[34px] text-green-dark">
          영웅 도감
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="sticker pressable inline-flex min-h-12 items-center rounded-button px-4 text-[15px] font-bold tracking-[0.053em] text-muted hover:bg-paper-dim"
          >
            세계관
          </Link>
          {/* 누가 보고 있는지는 요청마다 달라서 Suspense 안에서 읽습니다. */}
          <Suspense fallback={<span className="inline-block h-12 w-28" />}>
            <ViewerBadge />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

async function ViewerBadge() {
  const viewer = await getViewer();
  if (!viewer?.family) return null;

  return (
    <>
      {viewer.profile ? (
        <Link
          href="/me"
          aria-label={`${viewer.profile.nickname}(으)로 보는 중. 다른 사람으로 바꾸기`}
          className="sticker pressable inline-flex min-h-12 items-center gap-2 rounded-button py-1 pl-1.5 pr-4 text-[15px] font-bold hover:bg-paper-dim"
        >
          <ProfileAvatar nickname={viewer.profile.nickname} avatar={viewer.profile.avatar} size={36} />
          {viewer.profile.nickname}
        </Link>
      ) : null}
      <Link
        href="/parent"
        className="sticker pressable inline-flex min-h-12 items-center rounded-button px-4 text-[15px] font-bold tracking-[0.053em] text-muted hover:bg-paper-dim"
      >
        부모
      </Link>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-green px-6 py-10">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
        <span className="font-display text-[28px] text-paper">영웅 도감</span>
        <span className="text-[15px] font-bold text-night">우리 아이 첫 인물 사전</span>
      </div>
    </footer>
  );
}
