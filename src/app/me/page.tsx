import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProfileAvatar } from "@/components/family/ProfileAvatar";
import { requireFamily } from "@/lib/family/viewer";

import { ProfileButton } from "./profile-button";

export const metadata: Metadata = { title: "누가 볼까요? · 영웅 도감" };

export default function MePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <h1 className="text-center font-display text-[64px] leading-[1.2] tracking-[-0.02em] text-green-dark">
        누가 볼까요?
      </h1>
      <Suspense fallback={<p role="status" className="font-bold text-muted">불러오는 중…</p>}>
        <ProfileChooser />
      </Suspense>
    </main>
  );
}

async function ProfileChooser() {
  const viewer = await requireFamily();
  return (
    <>
      <ul className="flex flex-wrap justify-center gap-6">
        {viewer.family.profiles.map((p) => (
          <li key={p.id}>
            <ProfileButton profileId={p.id} current={viewer.profile?.id === p.id}>
              <ProfileAvatar nickname={p.nickname} avatar={p.avatar} size={112} />
              <span className="font-display text-3xl">{p.nickname}</span>
            </ProfileButton>
          </li>
        ))}
      </ul>
      <Link
        href="/parent"
        className="sticker pressable inline-flex min-h-12 items-center rounded-button px-5 text-[15px] font-bold tracking-[0.053em] text-muted hover:bg-paper-dim"
      >
        부모 모드
      </Link>
    </>
  );
}
