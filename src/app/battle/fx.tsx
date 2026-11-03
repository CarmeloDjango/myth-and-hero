"use client";

import { BattleCard } from "@/components/battle/BattleCard";
import type { Ability } from "@/lib/battle/cards";
import type { Unit } from "@/lib/battle/engine";

/** 움직임 줄이기 설정이면 연출을 건너뜁니다. */
export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** 화면에서 카드·대장 자리 찾기 */
export const unitEl = (uid: string) => document.querySelector<HTMLElement>(`[data-uid="${uid}"]`);
export const leaderEl = (side: number) => document.querySelector<HTMLElement>(`[data-leader="${side}"]`);

/** 공격: 공격하는 카드가 상대에게 휙 날아가 부딪히고 돌아옵니다. */
export async function lunge(from: HTMLElement | null, to: HTMLElement | null): Promise<void> {
  if (!from || !to || reducedMotion() || !from.animate) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) * 0.8;
  const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) * 0.8;
  const anim = from.animate(
    [
      { transform: "translate(0, 0) scale(1)", zIndex: 30 },
      { transform: `translate(${-dx * 0.08}px, ${-dy * 0.08}px) scale(1.05)`, zIndex: 30, offset: 0.25 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.1)`, zIndex: 30, offset: 0.6 },
      { transform: "translate(0, 0) scale(1)", zIndex: 30 },
    ],
    { duration: 480, easing: "ease-in-out" },
  );
  await anim.finished.catch(() => {});
}

/** 쓰러진 카드: 원래 자리에서 조각나듯 사라지는 잔상 */
export type Ghost = { key: string; unit: Unit; rect: { left: number; top: number; width: number; height: number } };

export function DeathGhosts({ ghosts }: { ghosts: Ghost[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      {ghosts.map((g) => (
        <div key={g.key} className="absolute" style={{ left: g.rect.left, top: g.rect.top, width: g.rect.width, height: g.rect.height }}>
          <div className="battle-anim [animation:card-die_.65s_ease-in_forwards]">
            <BattleCard card={g.unit.card} attack={g.unit.attack} health={0} maxHealth={g.unit.maxHealth} showCost={false} />
          </div>
          {Array.from({ length: 10 }, (_, i) => {
            const angle = (i / 10) * Math.PI * 2;
            return (
              <span
                key={i}
                className="battle-anim absolute left-1/2 top-1/2 size-3 rounded-sm [animation:shard_.7s_ease-out_forwards]"
                style={
                  {
                    background: i % 2 ? g.unit.card.tint : "#4b4b4b",
                    "--dx": `${Math.cos(angle) * 90}px`,
                    "--dy": `${Math.sin(angle) * 90}px`,
                    "--rot": `${(i * 77) % 360}deg`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** 끌어서 공격할 때 나오는 화살표 (대상 위면 빨강, 아니면 회색) */
export function DragArrow({ from, to, hot }: { from: { x: number; y: number }; to: { x: number; y: number }; hot: boolean }) {
  const color = hot ? "#ff4b4b" : "#afafaf";
  return (
    <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 h-full w-full">
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={color} />
        </marker>
      </defs>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray="2 16" markerEnd="url(#arrowhead)" />
      <circle cx={to.x} cy={to.y} r={hot ? 26 : 18} fill="none" stroke={color} strokeWidth="5" />
    </svg>
  );
}

/** 카드를 낼 때 특별한 힘 연출 (카드 위) */
export function AbilityBurst({ ability }: { ability: Ability }) {
  if (ability === "charge") {
    return (
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[18px]">
        <span className="battle-anim absolute inset-y-6 left-0 w-full text-center text-5xl [animation:wind_.7s_ease-out_forwards]">💨💨</span>
      </span>
    );
  }
  const icon = ability === "guard" ? "🛡️" : ability === "scheme" ? "📜 +1장" : "✨";
  return (
    <span aria-hidden="true" className="battle-anim pointer-events-none absolute left-1/2 top-1/2 z-20 whitespace-nowrap rounded-button text-5xl font-black drop-shadow-lg [animation:pop-fade_.9s_ease-out_forwards]">
      {ability === "scheme" ? <span className="rounded-button bg-paper px-2 text-2xl text-ink">{icon}</span> : icon}
    </span>
  );
}

/** 신의 힘: 화면이 번쩍, 상대 카드마다 번개 */
export function DivineFlash({ targets }: { targets: { left: number; top: number; width: number; height: number }[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
      <div className="battle-anim absolute inset-0 bg-yellow [animation:screen-flash_.6s_ease-out_forwards]" />
      {targets.map((r, i) => (
        <span key={i} className="battle-anim absolute text-6xl [animation:bolt-drop_.7s_ease-out_forwards]" style={{ left: r.left + r.width / 2, top: r.top + r.height / 2 }}>
          ⚡
        </span>
      ))}
    </div>
  );
}

/** 위기의 힘: 화면 가장자리가 빨갛게 두근두근 */
export function CrisisVignette() {
  return <div aria-hidden="true" className="battle-anim pointer-events-none fixed inset-0 z-30 [animation:crisis-pulse_.8s_ease-in-out_3]" />;
}

/** 승리 꽃가루 (자리는 번호로 정해서 그릴 때마다 같음) */
export function Confetti() {
  const colors = ["#58cc02", "#1cb0f6", "#ff9600", "#ce82ff", "#ff86d0", "#ffc800"];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: 40 }, (_, i) => (
        <span
          key={i}
          className="battle-anim absolute top-0 block h-4 w-2.5 rounded-sm [animation:confetti-fall_linear_forwards]"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDuration: `${2.2 + ((i * 13) % 10) / 6}s`,
            animationDelay: `${((i * 7) % 10) / 12}s`,
          }}
        />
      ))}
    </div>
  );
}
