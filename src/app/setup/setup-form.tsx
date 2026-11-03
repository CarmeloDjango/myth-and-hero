"use client";

import { useActionState, useState } from "react";

import { createFamilyAction } from "@/app/actions/family";
import { AvatarPicker } from "@/components/family/AvatarPicker";
import { FormError, PrimaryButton, SecondaryButton, TextField } from "@/components/ui/form";
import { AVATARS, MAX_PROFILES } from "@/lib/family/avatars";

export function SetupForm() {
  const [state, action, pending] = useActionState(createFamilyAction, undefined);
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(Array(MAX_PROFILES).fill(""));

  return (
    <form action={action} className="flex flex-col gap-6">
      {Array.from({ length: count }, (_, i) => (
        <fieldset key={i} className="flex flex-col gap-4 rounded-card border-2 border-line p-4">
          <legend className="px-1 font-display text-2xl text-green-dark">아이 {i + 1}</legend>
          <TextField
            id={`nickname_${i}`}
            name={`nickname_${i}`}
            label="별명"
            placeholder={i === 0 ? "예: 첫째, 용감이" : "예: 둘째, 반짝이"}
            maxLength={12}
            value={names[i]}
            onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
            hint={i === 0 ? "실명 대신 별명을 써 주세요. 별명과 색만 저장해요." : undefined}
          />
          <AvatarPicker name={`avatar_${i}`} nickname={names[i]} defaultValue={AVATARS[i % AVATARS.length].key} />
        </fieldset>
      ))}

      {count < MAX_PROFILES ? (
        <SecondaryButton type="button" onClick={() => setCount((c) => c + 1)}>
          + 아이 한 명 더
        </SecondaryButton>
      ) : null}

      <fieldset className="flex flex-col gap-4 rounded-card border-2 border-line p-4">
        <legend className="px-1 font-display text-2xl text-green-dark">부모 PIN</legend>
        <p className="text-[15px] font-medium text-muted">
          아이 작품을 숨기거나 지우는 &ldquo;부모 모드&rdquo;에 들어갈 때 써요. 숫자 4~6자리.
        </p>
        <TextField id="pin" name="pin" label="PIN" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} required />
        <TextField id="pinConfirm" name="pinConfirm" label="PIN 한 번 더" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} required />
      </fieldset>

      <FormError>{state?.error}</FormError>
      <PrimaryButton type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "가족 도감 만들기"}
      </PrimaryButton>
    </form>
  );
}
