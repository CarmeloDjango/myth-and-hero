"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createWorldAction } from "@/app/actions/worlds";
import { Tori } from "@/components/mascot/Tori";
import { ReadAloudButton } from "@/components/speech/ReadAloudButton";
import { FormError, PrimaryButton, TextField } from "@/components/ui/form";
import { STAT_KEYS } from "@/lib/characters/browse";
import {
  DEFAULT_STAT_LABELS,
  FACTION_COLORS,
  FACTION_NAME_MAX,
  FACTIONS_MAX,
  KIND_NAME_MAX,
  KIND_SUGGESTIONS,
  KINDS_MAX,
  STAT_LABEL_MAX,
  STAT_LABEL_SUGGESTIONS,
  WORLD_COLORS,
  WORLD_DESC_MAX,
  WORLD_NAME_MAX,
} from "@/lib/worlds/rules";

const STEPS = [
  { key: "name", label: "이름", question: "새 세계의 이름은 뭐예요?" },
  { key: "color", label: "색", question: "이 세계는 무슨 색이에요?" },
  { key: "stats", label: "능력치", question: "이 세계 영웅들의 능력치 5가지를 정해요!" },
  { key: "kinds", label: "종류", question: "이 세계에는 어떤 영웅들이 살아요?" },
  { key: "sides", label: "편", question: "편을 나눠 볼까요? (안 나눠도 돼요)" },
  { key: "done", label: "완성", question: "이대로 세계를 만들까요?" },
] as const;

type Faction = { name: string; color: string };

/** 세계관 만들기 마법사 (끝까지 화면에서 고르고, 마지막에 한 번 저장) */
export function WorldWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState<string>(WORLD_COLORS[0].main);
  const [stats, setStats] = useState<string[]>([...DEFAULT_STAT_LABELS]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [kindDraft, setKindDraft] = useState("");
  const [factions, setFactions] = useState<Faction[]>([]);
  const [factionDraft, setFactionDraft] = useState("");
  const [factionColor, setFactionColor] = useState<string>(FACTION_COLORS[0]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const current = STEPS[step - 1];
  const theme = WORLD_COLORS.find((c) => c.main === themeColor) ?? WORLD_COLORS[0];

  /** 단계별 확인 (서버에서도 다시 검사합니다) */
  const problem = (): string | undefined => {
    if (current.key === "name" && !name.trim()) return "세계관 이름을 적어 주세요.";
    if (current.key === "stats") {
      const t = stats.map((s) => s.trim());
      if (t.some((s) => !s)) return "능력치 이름 5개를 모두 정해 주세요.";
      if (new Set(t).size !== t.length) return "능력치 이름이 서로 겹쳐요.";
    }
    if (current.key === "kinds" && kinds.length === 0) return "종류를 하나 이상 정해 주세요.";
    return undefined;
  };

  const next = () => {
    const p = problem();
    setError(p);
    if (!p) setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const addKind = (k: string) => {
    const v = k.trim();
    if (!v || kinds.includes(v) || kinds.length >= KINDS_MAX) return;
    setKinds((list) => [...list, v.slice(0, KIND_NAME_MAX)]);
    setKindDraft("");
  };

  const addFaction = () => {
    const v = factionDraft.trim();
    if (!v || factions.some((f) => f.name === v) || factions.length >= FACTIONS_MAX) return;
    setFactions((list) => [...list, { name: v.slice(0, FACTION_NAME_MAX), color: factionColor }]);
    setFactionDraft("");
    setFactionColor(FACTION_COLORS[(factions.length + 1) % FACTION_COLORS.length]);
  };

  /** 추천 칩을 누르면 비어 있는(없으면 마지막) 능력치 칸에 넣기 */
  const pickStat = (label: string) => {
    if (stats.includes(label)) return;
    setStats((list) => {
      const i = list.findIndex((s) => !s.trim());
      const at = i === -1 ? list.length - 1 : i;
      return list.map((s, j) => (j === at ? label : s));
    });
  };

  const create = () =>
    start(async () => {
      setError(undefined);
      const result = await createWorldAction({ name, description, themeColor, statLabels: stats, kinds, factions });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/me/worlds/${result.id}/cover`);
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-[15px] font-bold text-muted">
          세계관 만들기 · {step}/{STEPS.length} {current.label}
        </span>
        <div className="h-4 overflow-hidden rounded-lg bg-line" role="progressbar" aria-label="세계관 만들기 진행" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step}>
          <div className="relative h-full rounded-lg bg-green transition-[width]" style={{ width: `${(step / STEPS.length) * 100}%` }}>
            <span className="absolute inset-x-2 top-[3px] h-1 rounded-sm bg-paper opacity-35" />
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <Tori size={88} mood={current.key === "done" ? "wow" : "happy"} />
        <div className="sticker flex flex-1 items-center gap-3 rounded-card px-5 py-4">
          <h1 className="flex-1 text-[28px] font-bold leading-snug">{current.question}</h1>
          <ReadAloudButton text={current.question} compact />
        </div>
      </div>

      {current.key === "name" ? (
        <div className="flex flex-col gap-5">
          <TextField id="world-name" label="세계관 이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={WORLD_NAME_MAX} placeholder="예: 티니핑 나라" autoFocus />
          <TextField id="world-desc" label="한 줄 소개 (안 써도 돼요)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={WORLD_DESC_MAX} placeholder="예: 마음을 지켜 주는 요정들" />
        </div>
      ) : null}

      {current.key === "color" ? (
        <div className="flex flex-wrap justify-center gap-3" role="radiogroup" aria-label="세계관 색">
          {WORLD_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={themeColor === c.main}
              onClick={() => setThemeColor(c.main)}
              className={`flex w-28 flex-col items-center gap-2 rounded-card border-2 border-b-4 p-3 font-bold ${themeColor === c.main ? "border-blue bg-blue-soft" : "border-line bg-paper"}`}
            >
              <span aria-hidden="true" className="size-16 rounded-full border-4" style={{ background: c.soft, borderColor: c.main }} />
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      {current.key === "stats" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {STAT_KEYS.map((k, i) => (
              <TextField
                key={k}
                id={`stat-label-${i}`}
                label={`능력치 ${i + 1}`}
                value={stats[i]}
                maxLength={STAT_LABEL_MAX}
                onChange={(e) => setStats((list) => list.map((s, j) => (j === i ? e.target.value : s)))}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="능력치 이름 추천">
            {STAT_LABEL_SUGGESTIONS.map((s) => (
              <Chip key={s} pressed={stats.includes(s)} onClick={() => pickStat(s)}>
                {s}
              </Chip>
            ))}
          </div>
          <p className="text-sm font-medium text-muted">추천을 누르면 빈 칸에 들어가요. 칸을 지우고 다시 골라도 돼요.</p>
        </div>
      ) : null}

      {current.key === "kinds" ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <TextField
                id="kind-draft"
                label="종류 이름"
                value={kindDraft}
                maxLength={KIND_NAME_MAX}
                placeholder="예: 티니핑"
                onChange={(e) => setKindDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKind(kindDraft);
                  }
                }}
              />
            </div>
            <button type="button" onClick={() => addKind(kindDraft)} className="sticker pressable mt-7 min-h-14 rounded-button bg-paper px-5 font-bold text-blue-ink">
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="종류 추천">
            {KIND_SUGGESTIONS.map((s) => (
              <Chip key={s} pressed={kinds.includes(s)} onClick={() => (kinds.includes(s) ? setKinds((l) => l.filter((x) => x !== s)) : addKind(s))}>
                {s}
              </Chip>
            ))}
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="정한 종류">
            {kinds.map((k) => (
              <li key={k} className="flex items-center gap-1 rounded-button bg-green-soft py-1 pl-3 pr-1 font-bold text-green-ink">
                {k}
                <button type="button" aria-label={`${k} 빼기`} onClick={() => setKinds((l) => l.filter((x) => x !== k))} className="size-9 rounded-button text-lg">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {current.key === "sides" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <TextField id="faction-draft" label="편 이름" value={factionDraft} maxLength={FACTION_NAME_MAX} placeholder="예: 하츄핑 편" onChange={(e) => setFactionDraft(e.target.value)} />
            </div>
            <div className="flex gap-1.5" role="radiogroup" aria-label="편 색">
              {FACTION_COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={factionColor === c} aria-label={`편 색 ${c}`} onClick={() => setFactionColor(c)} className={`size-12 rounded-full border-2 ${factionColor === c ? "border-ink ring-4 ring-blue" : "border-line"}`} style={{ background: c }} />
              ))}
            </div>
            <button type="button" onClick={addFaction} disabled={factions.length >= FACTIONS_MAX} className="sticker pressable min-h-14 rounded-button bg-paper px-5 font-bold text-blue-ink disabled:opacity-40">
              추가
            </button>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="정한 편">
            {factions.map((f) => (
              <li key={f.name} className="flex items-center gap-1 rounded-button border-2 border-line py-1 pl-3 pr-1 font-bold" style={{ background: f.color }}>
                {f.name}
                <button type="button" aria-label={`${f.name} 빼기`} onClick={() => setFactions((l) => l.filter((x) => x.name !== f.name))} className="size-9 rounded-button text-lg">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {current.key === "done" ? (
        <div className="sticker mx-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-card">
          <div className="flex h-36 items-center justify-center font-display text-6xl" style={{ background: theme.soft, color: theme.ink }}>
            {name.trim().slice(0, 2) || "?"}
          </div>
          <div className="flex flex-col gap-3 p-5">
            <span className="font-display text-4xl">{name.trim()}</span>
            <span className="font-medium text-muted">{description.trim() || `${name.trim()}에 사는 영웅들`}</span>
            <dl className="flex flex-col gap-2 text-[15px]">
              <div className="flex gap-2"><dt className="w-14 shrink-0 font-bold text-muted">능력치</dt><dd className="font-bold">{stats.join(" · ")}</dd></div>
              <div className="flex gap-2"><dt className="w-14 shrink-0 font-bold text-muted">종류</dt><dd className="font-bold">{kinds.join(" · ")}</dd></div>
              <div className="flex gap-2"><dt className="w-14 shrink-0 font-bold text-muted">편</dt><dd className="font-bold">{factions.length ? factions.map((f) => f.name).join(" · ") : "없음"}</dd></div>
            </dl>
          </div>
        </div>
      ) : null}

      <FormError>{error}</FormError>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {step > 1 ? (
          <button type="button" onClick={() => { setError(undefined); setStep((s) => s - 1); }} className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim">
            ← 뒤로
          </button>
        ) : (
          <Link href="/" className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim">
            ← 그만두기
          </Link>
        )}
        {current.key === "done" ? (
          <PrimaryButton type="button" onClick={create} disabled={pending}>
            {pending ? "만드는 중…" : "세계 만들기!"}
          </PrimaryButton>
        ) : (
          <PrimaryButton type="button" onClick={next}>
            다음 →
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`pressable min-h-11 rounded-button border-2 border-b-4 px-3 text-[15px] font-bold ${pressed ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-muted hover:bg-paper-dim"}`}
    >
      {children}
    </button>
  );
}
