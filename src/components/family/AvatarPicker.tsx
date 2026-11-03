"use client";

import { useState } from "react";

import { ProfileAvatar } from "@/components/family/ProfileAvatar";
import { AVATARS, type AvatarKey } from "@/lib/family/avatars";

/** 아바타 색 고르기 (라디오 버튼 묶음). 폼에는 name으로 key가 들어갑니다. */
export function AvatarPicker({
  name,
  nickname,
  defaultValue,
  legend = "아바타 색",
}: {
  name: string;
  nickname: string;
  defaultValue: AvatarKey;
  legend?: string;
}) {
  const [value, setValue] = useState<AvatarKey>(defaultValue);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[15px] font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {AVATARS.map((a) => (
          <label
            key={a.key}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-button border-2 p-1.5 ${
              value === a.key ? "border-blue bg-blue-soft" : "border-transparent"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={a.key}
              checked={value === a.key}
              onChange={() => setValue(a.key)}
              className="sr-only"
            />
            <ProfileAvatar nickname={nickname || "?"} avatar={a.key} size={44} />
            <span className="text-xs font-bold text-muted">{a.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
