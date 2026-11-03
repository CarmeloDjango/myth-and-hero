"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteWorldAction, renameWorldAction } from "@/app/actions/worlds";
import { FormError, TextField } from "@/components/ui/form";
import { WORLD_DESC_MAX, WORLD_NAME_MAX } from "@/lib/worlds/rules";

export type ParentWorld = {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverSrc: string | null;
  tint: string;
  creator: string | null;
  heroes: number;
};

/** 부모 모드: 아이들이 만든 세계관 이름 바꾸기·지우기 */
export function ParentWorldList({ worlds }: { worlds: ParentWorld[] }) {
  if (!worlds.length) {
    return <p className="rounded-card bg-paper-dim p-5 font-medium text-muted">아직 아이들이 만든 세계관이 없어요.</p>;
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {worlds.map((w) => (
        <WorldRow key={w.id} world={w} />
      ))}
    </ul>
  );
}

function WorldRow({ world }: { world: ParentWorld }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [state, rename, renaming] = useActionState(async (prev: Awaited<ReturnType<typeof renameWorldAction>>, form: FormData) => {
    const result = await renameWorldAction(world.id, prev, form);
    if (result?.ok) {
      setEditing(false);
      router.refresh();
    }
    return result;
  }, undefined);

  return (
    <li className="sticker flex flex-col gap-3 rounded-card p-4">
      <div className="flex gap-4">
        <span className="relative size-20 shrink-0 overflow-hidden rounded-button" style={{ background: world.tint }}>
          {world.coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
            <img src={world.coverSrc} alt="" className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <span aria-hidden="true" className="flex h-full items-center justify-center font-display text-3xl text-ink/30">
              {world.name.slice(0, 2)}
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[13px] font-bold text-muted">
            {world.creator ?? "(지운 프로필)"} · 영웅 {world.heroes}명
          </span>
          <Link href={`/${world.slug}`} className="truncate font-display text-2xl hover:underline">
            {world.name}
          </Link>
          <span className="truncate text-sm font-medium text-muted">{world.description}</span>
        </div>
      </div>

      {editing ? (
        <form action={rename} className="flex flex-col gap-3">
          <TextField id={`rename-${world.id}`} name="name" label="세계관 이름" defaultValue={world.name} maxLength={WORLD_NAME_MAX} required />
          <TextField id={`redesc-${world.id}`} name="description" label="한 줄 소개" defaultValue={world.description} maxLength={WORLD_DESC_MAX} />
          <FormError>{state?.error}</FormError>
          <div className="flex gap-2">
            <button type="submit" disabled={renaming} className="pressable min-h-11 rounded-button border-b-4 border-green-dark bg-green px-4 text-[15px] font-bold text-paper disabled:opacity-50">
              저장
            </button>
            <button type="button" onClick={() => setEditing(false)} className="sticker pressable min-h-11 rounded-button bg-paper px-4 text-[15px] font-bold text-blue-ink">
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="sticker pressable min-h-11 rounded-button bg-paper px-3 text-[15px] font-bold text-blue-ink">
            이름 바꾸기
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const msg = world.heroes
                ? `"${world.name}"과 그 안의 영웅 ${world.heroes}명을 모두 지울까요? 되돌릴 수 없어요.`
                : `"${world.name}"을(를) 지울까요? 되돌릴 수 없어요.`;
              if (!window.confirm(msg)) return;
              start(async () => {
                const result = await deleteWorldAction(world.id);
                setError(result?.error);
                router.refresh();
              });
            }}
            className="sticker pressable min-h-11 rounded-button bg-paper px-3 text-[15px] font-bold text-[#b42318] disabled:opacity-50"
          >
            지우기
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm font-bold text-[#b42318]">
          {error}
        </p>
      ) : null}
    </li>
  );
}
