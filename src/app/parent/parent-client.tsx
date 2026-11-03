"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addProfileAction,
  deleteProfileAction,
  enterParentModeAction,
  updateProfileAction,
  type FormState,
} from "@/app/actions/family";
import { AvatarPicker } from "@/components/family/AvatarPicker";
import { FormError, PrimaryButton, SecondaryButton, TextField } from "@/components/ui/form";
import { authClient } from "@/lib/auth/client";
import type { AvatarKey } from "@/lib/family/avatars";

export function ParentPinForm() {
  const [state, action, pending] = useActionState(enterParentModeAction, undefined);
  const router = useRouter();
  // PIN이 맞으면 새 요청으로 다시 그려서 부모 모드 화면을 보여줍니다.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="flex flex-col gap-5">
      <TextField id="pin" name="pin" label="부모 PIN" type="password" inputMode="numeric" autoComplete="off" maxLength={6} required autoFocus />
      <FormError>{state?.error}</FormError>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "확인 중…" : "들어가기"}
      </PrimaryButton>
    </form>
  );
}

function Saved({ state }: { state: FormState }) {
  if (state?.error) return <FormError>{state.error}</FormError>;
  if (state?.ok) return <p role="status" className="text-[15px] font-bold text-green-ink">저장했어요.</p>;
  return null;
}

export function ProfileEditor({ id, nickname, avatar, canDelete }: { id: string; nickname: string; avatar: AvatarKey; canDelete: boolean }) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);
  const [name, setName] = useState(nickname);
  const [deleteState, setDeleteState] = useState<FormState>();
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  return (
    <form action={action} className="sticker flex flex-col gap-4 rounded-card p-5">
      <input type="hidden" name="id" value={id} />
      <TextField id={`nickname-${id}`} name="nickname" label="별명" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
      <AvatarPicker name="avatar" nickname={name} defaultValue={avatar} />
      <Saved state={state} />
      <FormError>{deleteState?.error}</FormError>
      <div className="flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </PrimaryButton>
        {canDelete ? (
          <SecondaryButton
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!window.confirm(`${nickname} 프로필을 지울까요? 이 프로필로 만든 영웅은 남아요.`)) return;
              startDelete(async () => {
                const result = await deleteProfileAction(id);
                setDeleteState(result);
                if (result?.ok) router.refresh();
              });
            }}
          >
            지우기
          </SecondaryButton>
        ) : null}
      </div>
    </form>
  );
}

export function AddProfileForm() {
  const [state, action, pending] = useActionState(addProfileAction, undefined);
  const [name, setName] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border-2 border-dashed border-line p-5">
      <TextField id="new-nickname" name="nickname" label="새 아이 별명" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} />
      <AvatarPicker name="avatar" nickname={name} defaultValue="yellow" />
      <Saved state={state} />
      <SecondaryButton type="submit" disabled={pending}>
        {pending ? "추가 중…" : "+ 프로필 추가"}
      </SecondaryButton>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <SecondaryButton
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await authClient.signOut();
          router.replace("/auth/sign-in");
          router.refresh();
        })
      }
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </SecondaryButton>
  );
}
