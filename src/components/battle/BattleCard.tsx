import { ABILITIES, type CardDef } from "@/lib/battle/cards";

/**
 * 배틀 카드 한 장 (손패, 필드, 대장 고르기 공용)
 * - 왼쪽 위 ⚡비용, 오른쪽 위 특별한 힘, 아래 ⚔️공격 · ❤️체력
 * - 체력이 줄면 빨간 숫자
 */
export function BattleCard({
  card,
  attack = card.attack,
  health = card.health,
  maxHealth = card.health,
  size = "md",
  showCost = true,
  dim = false,
}: {
  card: CardDef;
  attack?: number;
  health?: number;
  maxHealth?: number;
  size?: "sm" | "md";
  showCost?: boolean;
  dim?: boolean;
}) {
  const ability = card.ability ? ABILITIES[card.ability] : null;
  const w = size === "sm" ? "w-[92px]" : "w-[118px]";
  const stat = size === "sm" ? "size-7 text-sm" : "size-9 text-base";
  return (
    <span className={`relative flex ${w} flex-col overflow-hidden rounded-[14px] border-2 border-b-4 border-line bg-paper text-left ${dim ? "opacity-50" : ""}`}>
      <span className="relative flex aspect-square items-center justify-center" style={{ background: card.tint }}>
        {card.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- 가족 전용 비공개 그림
          <img src={card.imageSrc} alt="" draggable={false} className={`absolute inset-0 h-full w-full ${card.imageCover ? "object-cover" : "object-contain"}`} />
        ) : (
          <span aria-hidden="true" className={`font-display leading-none text-ink opacity-20 ${size === "sm" ? "text-5xl" : "text-6xl"}`}>
            {card.name[0]}
          </span>
        )}
        {showCost ? (
          <span className={`absolute left-1 top-1 flex ${stat} items-center justify-center rounded-full border-2 border-paper bg-blue font-black text-paper`} title="비용">
            {card.cost}
          </span>
        ) : null}
        {ability ? (
          <span className={`absolute right-1 top-1 flex ${stat} items-center justify-center rounded-full border-2 border-line bg-paper`} title={`${ability.name}: ${ability.text}`}>
            {ability.icon}
          </span>
        ) : null}
      </span>
      <span className={`truncate px-1.5 pt-1 text-center font-bold ${size === "sm" ? "text-[12px]" : "text-[14px]"}`}>{card.name}</span>
      <span className="flex items-center justify-between px-1 pb-1 pt-0.5">
        <span className={`flex ${stat} items-center justify-center rounded-full bg-orange font-black text-paper`} title="공격">
          {attack}
        </span>
        <span
          className={`flex ${stat} items-center justify-center rounded-full font-black text-paper ${health < maxHealth ? "bg-[#b42318]" : "bg-red"}`}
          title="체력"
        >
          {health}
        </span>
      </span>
    </span>
  );
}

/** 뒤집힌 카드 (상대 손패) */
export function CardBack({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex ${size === "sm" ? "h-[60px] w-[44px]" : "h-[150px] w-[110px]"} items-center justify-center rounded-[10px] border-2 border-b-4 border-purple bg-[#f3e1ff] font-display text-2xl text-purple`}
    >
      ★
    </span>
  );
}
