import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="font-display text-[64px] leading-[1.2] text-green-dark">길을 잃었어요!</p>
        <p className="text-[19px] font-medium text-muted">찾는 세계관이나 영웅이 도감에 없어요.</p>
        <Link
          href="/"
          className="pressable mt-2 inline-flex min-h-14 items-center rounded-button border-b-4 border-green-dark bg-green px-6 text-[17px] font-bold tracking-[0.053em] text-paper"
        >
          세계관 고르러 가기
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
