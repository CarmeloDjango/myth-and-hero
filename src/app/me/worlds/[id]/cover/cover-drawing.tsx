"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutosaveDrawing } from "@/components/drawing/AutosaveDrawing";
import { PrimaryButton } from "@/components/ui/form";

export function CoverDrawing({ worldId, slug, background, hasDrawing }: { worldId: string; slug: string; background: string; hasDrawing: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  return (
    <AutosaveDrawing saveUrl={`/api/worlds/${worldId}/cover`} background={background} hasDrawing={hasDrawing}>
      {({ flush, ready }) => (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link href={`/${slug}`} className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim">
            나중에 그리기
          </Link>
          <PrimaryButton
            type="button"
            disabled={leaving || !ready}
            onClick={async () => {
              setLeaving(true);
              if (!(await flush())) {
                setLeaving(false);
                return;
              }
              router.push(`/${slug}`);
            }}
          >
            {leaving ? "저장 중…" : "다 그렸어요!"}
          </PrimaryButton>
        </div>
      )}
    </AutosaveDrawing>
  );
}
