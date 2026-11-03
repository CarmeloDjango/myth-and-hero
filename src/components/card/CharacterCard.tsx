import type { CSSProperties } from "react";

/** 진영 배경색 → 같은 계열의 진한 글자색 (docs/DESIGN.md 2장) */
const FACTION_TEXT: Record<string, string> = {
  "#d7ffb8": "#3f7f00",
  "#ddf4ff": "#0b7bb3",
  "#ffe2cc": "#a35200",
  "#fff4cc": "#806500",
  "#f3e1ff": "#7a3fb0",
};

export type CharacterCardData = {
  slug: string;
  name: string;
  originalName: string | null;
  title: string | null;
  rarity: number;
  power: number;
  intellect: number;
  leadership: number;
  faction: { name: string; color: string | null } | null;
  roleLabel: string;
  statLabels: { power: string; intellect: string; leadership: string };
};

export function CharacterCard({ c }: { c: CharacterCardData }) {
  const tint = c.faction?.color ?? "#f7f7f7";
  const factionText = FACTION_TEXT[tint.toLowerCase()] ?? "#4b4b4b";
  const glyph = c.originalName?.[0] ?? c.name[0];
  const stats = [
    { label: c.statLabels.power, value: c.power, color: "var(--color-orange)" },
    { label: c.statLabels.intellect, value: c.intellect, color: "var(--color-purple)" },
    { label: c.statLabels.leadership, value: c.leadership, color: "var(--color-blue)" },
  ];

  return (
    <article className="sticker relative flex flex-col overflow-hidden rounded-card bg-paper transition-transform hover:-translate-y-1">
      <div
        className="relative flex h-[220px] items-center justify-center"
        style={{ background: tint }}
      >
        <span aria-hidden="true" className="font-display text-[120px] leading-none text-ink opacity-15">
          {glyph}
        </span>
        <span
          className="absolute left-3 top-3 rounded-button border-2 border-yellow bg-paper px-2.5 py-1 text-[13px] font-black"
          aria-label={`${c.rarity}성`}
        >
          {"★".repeat(c.rarity)}
        </span>
        <span className="absolute bottom-2.5 left-3 rounded-button bg-paper px-2 py-0.5 text-[11px] font-bold text-muted">
          일러스트 자리
        </span>
      </div>

      <div className="flex flex-col gap-0.5 px-[18px] pb-1 pt-4">
        <span className="text-[13px] font-bold tracking-[0.053em]" style={{ color: factionText }}>
          {c.faction?.name ?? "무소속"} · {c.roleLabel}
        </span>
        <h3 className="font-display text-4xl leading-tight">{c.name}</h3>
        {c.title ? <p className="text-[15px] font-medium text-muted">{c.title}</p> : null}
      </div>

      <dl className="flex flex-col gap-2.5 px-[18px] pb-[18px] pt-3">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <dt className="w-[34px] text-[13px] font-bold text-muted">{s.label}</dt>
            <dd className="flex flex-1 items-center gap-2.5">
              <span className="h-4 flex-1 overflow-hidden rounded-lg bg-line">
                <span
                  className="relative block h-full rounded-lg"
                  style={{ width: `${s.value}%`, background: s.color } as CSSProperties}
                >
                  <span className="absolute inset-x-1.5 top-[3px] h-1 rounded-sm bg-paper opacity-35" />
                </span>
              </span>
              <span className="w-7 text-right text-sm font-black tabular-nums">{s.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
