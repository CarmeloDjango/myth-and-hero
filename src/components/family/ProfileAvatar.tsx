import { getAvatar } from "@/lib/family/avatars";

/** 아이 프로필 아바타: 색 동그라미 + 별명 첫 글자 */
export function ProfileAvatar({
  nickname,
  avatar,
  size = 48,
}: {
  nickname: string;
  avatar: string;
  size?: number;
}) {
  const a = getAvatar(avatar);
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display leading-none"
      style={{
        width: size,
        height: size,
        background: a.bg,
        color: a.text,
        border: `${Math.max(2, Math.round(size / 24))}px solid ${a.ring}`,
        borderBottomWidth: Math.max(4, Math.round(size / 12)),
        fontSize: Math.round(size * 0.46),
      }}
    >
      {nickname.slice(0, 1)}
    </span>
  );
}
