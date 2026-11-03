"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteDraftAction } from "@/app/actions/heroes";

export function DeleteDraftButton({ heroId, name }: { heroId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`${name || "이 영웅"}을(를) 그만 만들고 지울까요?`)) return;
        start(async () => {
          const result = await deleteDraftAction(heroId);
          if (result?.error) window.alert(result.error);
          router.refresh();
        });
      }}
      className="sticker pressable inline-flex min-h-12 items-center rounded-button bg-paper px-4 font-bold text-muted hover:bg-paper-dim disabled:opacity-50"
    >
      {pending ? "지우는 중…" : "지우기"}
    </button>
  );
}
