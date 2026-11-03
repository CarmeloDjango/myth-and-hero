"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteCharacterPictureAction } from "@/app/actions/pictures";
import { AutosaveDrawing } from "@/components/drawing/AutosaveDrawing";
import { FormError, PrimaryButton } from "@/components/ui/form";

export function PictureEditor({
  characterId,
  saveUrl,
  background,
  hasDrawing,
  doneHref,
  canRemove,
}: {
  characterId: string;
  saveUrl: string;
  background: string;
  hasDrawing: boolean;
  doneHref: string;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [removing, startRemove] = useTransition();
  const [error, setError] = useState<string>();

  const leave = () => {
    router.push(doneHref);
    router.refresh();
  };

  return (
    <AutosaveDrawing saveUrl={saveUrl} background={background} hasDrawing={hasDrawing} allowPhoto>
      {({ flush, ready }) => (
        <div className="flex flex-col gap-3">
          <FormError>{error}</FormError>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              <Link href={doneHref} className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim">
                ← 돌아가기
              </Link>
              {canRemove ? (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => {
                    if (!window.confirm("붙인 그림을 뺄까요? 되돌릴 수 없어요.")) return;
                    startRemove(async () => {
                      const r = await deleteCharacterPictureAction(characterId);
                      if (r.error) setError(r.error);
                      else leave();
                    });
                  }}
                  className="sticker pressable min-h-14 rounded-button bg-paper px-5 font-bold text-[#b42318] disabled:opacity-50"
                >
                  그림 빼기
                </button>
              ) : null}
            </div>
            <PrimaryButton
              type="button"
              disabled={leaving || !ready}
              onClick={async () => {
                setLeaving(true);
                if (!(await flush())) {
                  setLeaving(false);
                  return;
                }
                leave();
              }}
            >
              {leaving ? "저장 중…" : "다 했어요!"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </AutosaveDrawing>
  );
}
