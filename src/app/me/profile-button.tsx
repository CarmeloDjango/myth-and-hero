"use client";

import { useTransition } from "react";

import { selectProfileAction } from "@/app/actions/family";

/** 아바타를 누르면 프로필 쿠키를 정하고 홈을 새로 엽니다. */
export function ProfileButton({ profileId, current, children }: { profileId: string; current: boolean; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-current={current ? "true" : undefined}
      onClick={() =>
        start(async () => {
          const result = await selectProfileAction(profileId);
          if (result?.error) {
            window.alert(result.error);
            return;
          }
          // 보는 사람이 바뀌면 모든 화면이 달라집니다. 클라이언트 라우터 이동(router.push)은
          // 미리 받아 둔(prefetch) 화면을 써서 예전 상태로 다시 /me로 돌아오는 경우가 있어, 전체 새로 고침으로 엽니다.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 위 이유로 의도적
          window.location.assign("/");
        })
      }
      className="sticker pressable flex w-44 flex-col items-center gap-3 rounded-card bg-paper px-4 py-6 transition-transform hover:-translate-y-1 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
