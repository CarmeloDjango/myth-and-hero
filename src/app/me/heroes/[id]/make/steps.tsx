"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  finishHeroAction,
  saveHeroKindAction,
  saveHeroNameAction,
  saveHeroStatsAction,
  saveHeroStoryAction,
  skipHeroDrawingAction,
} from "@/app/actions/heroes";
import { AutosaveDrawing } from "@/components/drawing/AutosaveDrawing";
import { FormError, PrimaryButton, TextField } from "@/components/ui/form";
import { STAT_KEYS, type StatKey, type StatLabels } from "@/lib/characters/browse";
import {
  HERO_NAME_MAX,
  HERO_STAT_BUDGET,
  HERO_STAT_MAX,
  HERO_TITLE_MAX,
  STORY_ANSWER_MAX,
  STORY_FREE_MAX,
  STORY_PROMPTS,
  stepIndex,
  TITLE_SUGGESTIONS,
  type StoryAnswers,
} from "@/lib/heroes/rules";

const STAT_COLORS: Record<StatKey, string> = {
  stat1: "#1cb0f6",
  stat2: "#ff9600",
  stat3: "#ce82ff",
  stat4: "#58cc02",
  stat5: "#ff86d0",
};

function StepNav({ heroId, step, children }: { heroId: string; step: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      {step > 1 ? (
        <Link
          href={`/me/heroes/${heroId}/make?step=${step - 1}`}
          className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
        >
          ← 뒤로
        </Link>
      ) : (
        <Link
          href="/me/heroes"
          className="sticker pressable inline-flex min-h-14 items-center rounded-button px-5 font-bold tracking-[0.053em] text-blue-ink hover:bg-paper-dim"
        >
          ← 내 영웅
        </Link>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/* ① 이름 */
export function NameStep({ heroId, name, title }: { heroId: string; name: string; title: string }) {
  const [state, action, pending] = useActionState(saveHeroNameAction.bind(null, heroId), undefined);
  const [t, setT] = useState(title);
  return (
    <form action={action} className="flex flex-col gap-5">
      <TextField id="name" name="name" label="이름" defaultValue={name} maxLength={HERO_NAME_MAX} required autoFocus placeholder="예: 번개" />
      <div className="flex flex-col gap-2">
        <TextField id="title" name="title" label="칭호 (골라도 되고 써도 돼요)" value={t} onChange={(e) => setT(e.target.value)} maxLength={HERO_TITLE_MAX} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="칭호 추천">
          {TITLE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={t === s}
              onClick={() => setT(s)}
              className={`pressable min-h-11 rounded-button border-2 border-b-4 px-3 text-[15px] font-bold ${
                t === s ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-muted hover:bg-paper-dim"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <FormError>{state?.error}</FormError>
      <StepNav heroId={heroId} step={stepIndex("name")}>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "저장 중…" : "다음 →"}
        </PrimaryButton>
      </StepNav>
    </form>
  );
}

/* ② 그리기 (자동 저장) */
export function DrawStep({ heroId, background, hasDrawing }: { heroId: string; background: string; hasDrawing: boolean }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  return (
    <AutosaveDrawing saveUrl={`/api/heroes/${heroId}/drawing`} background={background} hasDrawing={hasDrawing}>
      {({ flush, touched, ready }) => (
        <StepNav heroId={heroId} step={stepIndex("draw")}>
          <PrimaryButton
            type="button"
            disabled={leaving || !ready}
            onClick={async () => {
              setLeaving(true);
              if (!(await flush())) {
                setLeaving(false);
                return;
              }
              // 아무것도 안 그렸으면 그림 없이 다음 단계로
              if (!hasDrawing && !touched) {
                await skipHeroDrawingAction(heroId);
                return;
              }
              router.push(`/me/heroes/${heroId}/make?step=${stepIndex("kind")}`);
            }}
          >
            {leaving ? "저장 중…" : "다음 →"}
          </PrimaryButton>
        </StepNav>
      )}
    </AutosaveDrawing>
  );
}

/* ③ 종류와 편 */
export function KindStep({
  heroId,
  kinds,
  factions,
  kindId,
  factionId,
}: {
  heroId: string;
  kinds: { id: string; name: string }[];
  factions: { id: string; name: string; color: string | null }[];
  kindId: string | null;
  factionId: string | null;
}) {
  const [state, action, pending] = useActionState(saveHeroKindAction.bind(null, heroId), undefined);
  const [k, setK] = useState(kindId ?? "");
  const [f, setF] = useState(factionId ?? "");
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="kindId" value={k} />
      <input type="hidden" name="factionId" value={f} />
      {kinds.length ? (
        <ChoiceGroup label="어떤 영웅이에요?" options={kinds.map((x) => ({ value: x.id, label: x.name }))} value={k} onChange={setK} />
      ) : null}
      {factions.length ? (
        <ChoiceGroup
          label="누구 편이에요?"
          options={[{ value: "", label: "아무 편도 아니에요" }, ...factions.map((x) => ({ value: x.id, label: x.name, color: x.color }))]}
          value={f}
          onChange={setF}
        />
      ) : null}
      <FormError>{state?.error}</FormError>
      <StepNav heroId={heroId} step={stepIndex("kind")}>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "저장 중…" : "다음 →"}
        </PrimaryButton>
      </StepNav>
    </form>
  );
}

function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; color?: string | null }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-xl font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value || "none"}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`pressable flex min-h-14 items-center gap-2 rounded-button border-2 border-b-4 px-5 text-lg font-bold ${
              value === o.value ? "border-blue bg-blue-soft text-blue-ink" : "border-line bg-paper text-ink hover:bg-paper-dim"
            }`}
          >
            {o.color ? <span aria-hidden="true" className="size-5 rounded-full border-2 border-line" style={{ background: o.color }} /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ④ 능력치 나누기 (총 250점) */
export function StatsStep({ heroId, labels, stats }: { heroId: string; labels: StatLabels; stats: Record<StatKey, number> }) {
  const [state, action, pending] = useActionState(saveHeroStatsAction.bind(null, heroId), undefined);
  const [values, setValues] = useState(stats);
  const used = STAT_KEYS.reduce((s, k) => s + values[k], 0);
  const left = HERO_STAT_BUDGET - used;

  /** 남은 점수를 넘지 않게 맞춥니다. */
  const setStat = (k: StatKey, raw: number) => {
    setValues((prev) => {
      const others = STAT_KEYS.reduce((s, key) => (key === k ? s : s + prev[key]), 0);
      const v = Math.max(0, Math.min(HERO_STAT_MAX, raw, HERO_STAT_BUDGET - others));
      return { ...prev, [k]: v };
    });
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <p className={`rounded-card px-5 py-4 text-center text-2xl font-bold ${left === 0 ? "bg-green-soft text-green-ink" : "bg-paper-dim"}`} aria-live="polite">
        {left === 0 ? "점수를 다 나눴어요! 멋져요!" : <>남은 점수 <span className="font-black tabular-nums text-green-dark">{left}점</span></>}
      </p>
      {STAT_KEYS.map((k) => (
        <div key={k} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor={`stat-${k}`} className="text-xl font-bold">
              {labels[k]}
            </label>
            <span className="text-2xl font-black tabular-nums">{values[k]}</span>
          </div>
          <div className="flex items-center gap-3">
            <StepButton label={`${labels[k]} 10점 빼기`} onClick={() => setStat(k, values[k] - 10)} disabled={values[k] === 0}>
              −
            </StepButton>
            <input
              id={`stat-${k}`}
              name={k}
              type="range"
              min={0}
              max={HERO_STAT_MAX}
              step={1}
              value={values[k]}
              onChange={(e) => setStat(k, Number(e.target.value))}
              className="h-10 flex-1 cursor-pointer"
              style={{ accentColor: STAT_COLORS[k] }}
            />
            <StepButton label={`${labels[k]} 10점 더하기`} onClick={() => setStat(k, values[k] + 10)} disabled={left === 0 || values[k] === HERO_STAT_MAX}>
              +
            </StepButton>
          </div>
        </div>
      ))}
      <FormError>{state?.error}</FormError>
      <StepNav heroId={heroId} step={stepIndex("stats")}>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "저장 중…" : "다음 →"}
        </PrimaryButton>
      </StepNav>
    </form>
  );
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="sticker pressable inline-flex size-14 shrink-0 items-center justify-center rounded-button bg-paper text-3xl font-black text-blue-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ⑤ 이야기 */
export function StoryStep({ heroId, story }: { heroId: string; story: StoryAnswers | null }) {
  const [state, action, pending] = useActionState(saveHeroStoryAction.bind(null, heroId), undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      {STORY_PROMPTS.map((p) => (
        <TextField
          key={p.key}
          id={`story-${p.key}`}
          name={p.key}
          label={p.question}
          placeholder={p.placeholder}
          defaultValue={story?.[p.key] ?? ""}
          maxLength={STORY_ANSWER_MAX}
        />
      ))}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="story-free" className="text-[15px] font-bold">
          더 하고 싶은 이야기 (안 써도 돼요)
        </label>
        <textarea
          id="story-free"
          name="free"
          defaultValue={story?.free ?? ""}
          maxLength={STORY_FREE_MAX}
          rows={4}
          className="rounded-card border-2 border-line bg-paper-dim px-4 py-3 text-lg font-medium outline-none focus:border-blue"
        />
      </div>
      <FormError>{state?.error}</FormError>
      <StepNav heroId={heroId} step={stepIndex("story")}>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "저장 중…" : "다음 →"}
        </PrimaryButton>
      </StepNav>
    </form>
  );
}

/* ⑥ 완성 */
export function FinishStep({ heroId, children }: { heroId: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState(finishHeroAction.bind(null, heroId), undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      {children}
      <FormError>{state?.error}</FormError>
      <StepNav heroId={heroId} step={stepIndex("done")}>
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "도감에 넣는 중…" : "도감에 넣기!"}
        </PrimaryButton>
      </StepNav>
    </form>
  );
}

