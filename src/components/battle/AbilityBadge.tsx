import { ABILITIES, type Ability } from "@/lib/battle/cards";

/** 카드 배틀 특별한 힘 배지 (도감 상세, 영웅 완성 화면) */
export function AbilityBadge({ ability, withText = true }: { ability: Ability | null; withText?: boolean }) {
  if (!ability) return null;
  const a = ABILITIES[ability];
  return (
    <p className="w-fit rounded-button border-2 border-purple bg-[#f3e1ff] px-3 py-1 text-[15px] font-bold text-[#7a3fb0]">
      카드 배틀 {a.icon} {a.name}
      {withText ? <span className="font-medium text-ink"> · {a.text}</span> : null}
    </p>
  );
}
