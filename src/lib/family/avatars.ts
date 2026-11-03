/** 아이 프로필 아바타 (서버·클라이언트 공용). 그림은 나중에 바꿀 수 있고, 저장 값은 key입니다. */
export const AVATARS = [
  { key: "green", label: "초록", bg: "#d7ffb8", ring: "#58cc02", text: "#3f7f00" },
  { key: "blue", label: "파랑", bg: "#ddf4ff", ring: "#1cb0f6", text: "#0b7bb3" },
  { key: "orange", label: "주황", bg: "#ffe2cc", ring: "#ff9600", text: "#a35200" },
  { key: "purple", label: "보라", bg: "#f3e1ff", ring: "#ce82ff", text: "#7a3fb0" },
  { key: "pink", label: "분홍", bg: "#ffe0f3", ring: "#ff86d0", text: "#a8336f" },
  { key: "yellow", label: "노랑", bg: "#fff4cc", ring: "#ffc800", text: "#806500" },
] as const;

export type AvatarKey = (typeof AVATARS)[number]["key"];
export const AVATAR_KEYS = AVATARS.map((a) => a.key) as [AvatarKey, ...AvatarKey[]];

export function getAvatar(key: string) {
  return AVATARS.find((a) => a.key === key) ?? AVATARS[0];
}

export const MAX_PROFILES = 4;
