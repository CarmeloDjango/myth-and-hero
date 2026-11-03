/**
 * 영웅 만들기 규칙 (서버·클라이언트 공용). docs/HERO_MAKER.md 3장, 10장
 * 마법사 화면과 서버 검증이 같은 값을 쓰도록 여기서만 정합니다.
 */
import { z } from "zod";

import { STAT_KEYS, type StatKey } from "@/lib/characters/browse";
import { josa } from "@/lib/text/josa";

/** 5칸 합계 최대 점수 (확정) */
export const HERO_STAT_BUDGET = 250;
/** 한 칸 최대 점수 */
export const HERO_STAT_MAX = 100;
export const HERO_NAME_MAX = 12;
export const HERO_TITLE_MAX = 16;
export const STORY_ANSWER_MAX = 30;
export const STORY_FREE_MAX = 200;

/** 마법사 단계 (세계관 고르기는 /me/heroes/new에서 먼저 합니다) */
export const WIZARD_STEPS = [
  { key: "name", label: "이름", question: "영웅의 이름은 뭐예요?" },
  { key: "draw", label: "모습", question: "영웅을 그려 볼까요?" },
  { key: "kind", label: "종류와 편", question: "어떤 영웅이에요? 누구 편이에요?" },
  { key: "stats", label: "능력치", question: "250점을 능력치에 나눠 주세요!" },
  { key: "story", label: "이야기", question: "영웅의 이야기를 들려줘요!" },
  { key: "done", label: "완성", question: "이제 도감에 넣어 볼까요?" },
] as const;
export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];
export const STEP_COUNT = WIZARD_STEPS.length;

export function stepIndex(key: WizardStepKey): number {
  return WIZARD_STEPS.findIndex((s) => s.key === key) + 1;
}

/** 칭호 추천 칩 */
export const TITLE_SUGGESTIONS = [
  "번개 같은",
  "용감한",
  "반짝반짝",
  "지혜로운",
  "하늘을 나는",
  "무적의",
  "마음 따뜻한",
  "바다의",
] as const;

/** 이야기 빈칸 채우기 (질문 → 문장). 답은 짧게, 조사는 받침에 맞춰 붙입니다. */
export const STORY_PROMPTS = [
  { key: "birth", question: "어디에서 태어났나요?", placeholder: "예: 구름 위 마을", sentence: (a: string) => `${a}에서 태어났어요.` },
  { key: "skill", question: "특기는 뭐예요?", placeholder: "예: 바람처럼 달리기", sentence: (a: string) => `특기는 ${josa(a, "이에요", "예요")}.` },
  { key: "like", question: "제일 좋아하는 건 뭐예요?", placeholder: "예: 딸기 케이크", sentence: (a: string) => `${josa(a, "을", "를")} 제일 좋아해요.` },
  { key: "dream", question: "꿈은 뭐예요?", placeholder: "예: 모두를 지키는 것", sentence: (a: string) => `꿈은 ${josa(a, "이에요", "예요")}.` },
] as const;
export type StoryKey = (typeof STORY_PROMPTS)[number]["key"];

export const storyAnswersSchema = z.object({
  birth: z.string().trim().max(STORY_ANSWER_MAX).default(""),
  skill: z.string().trim().max(STORY_ANSWER_MAX).default(""),
  like: z.string().trim().max(STORY_ANSWER_MAX).default(""),
  dream: z.string().trim().max(STORY_ANSWER_MAX).default(""),
  free: z.string().trim().max(STORY_FREE_MAX).default(""),
});
export type StoryAnswers = z.infer<typeof storyAnswersSchema>;

/** 빈칸 답으로 열전 문단과 한 줄 소개를 만듭니다. */
export function composeStory(name: string, answers: StoryAnswers): { biography: string; summary: string } {
  const sentences = STORY_PROMPTS.filter((p) => answers[p.key]).map((p) => p.sentence(answers[p.key]));
  const intro = `${josa(name, "은", "는")} ${sentences[0] ?? "아직 비밀이 많은 영웅이에요."}`;
  const paragraphs = [[intro, ...sentences.slice(1)].join(" ")];
  if (answers.free) paragraphs.push(answers.free);
  const summary = answers.skill ? `특기는 ${josa(answers.skill, "이에요", "예요")}!` : intro;
  return { biography: paragraphs.join("\n\n"), summary };
}

export const heroStatsSchema = z
  .object(
    Object.fromEntries(STAT_KEYS.map((k) => [k, z.coerce.number().int().min(0).max(HERO_STAT_MAX)])) as Record<
      StatKey,
      z.ZodCoercedNumber<unknown>
    >,
  )
  .refine((s) => STAT_KEYS.reduce((sum, k) => sum + Number(s[k]), 0) <= HERO_STAT_BUDGET, {
    message: `능력치 합계는 ${HERO_STAT_BUDGET}점까지예요.`,
  });

export function statTotal(stats: Record<StatKey, number>): number {
  return STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);
}

export const heroNameSchema = z.object({
  name: z.string().trim().min(1, "이름을 적어 주세요.").max(HERO_NAME_MAX, `이름은 ${HERO_NAME_MAX}글자까지예요.`),
  title: z.string().trim().max(HERO_TITLE_MAX, `칭호는 ${HERO_TITLE_MAX}글자까지예요.`).default(""),
});

/** 그리기 획 (저장 형식). 점은 [x, y, 필압], 좌표는 0~1024 캔버스 기준 */
export const CANVAS_SIZE = 1024;
export const strokeSchema = z.object({
  tool: z.enum(["pen", "eraser"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  size: z.number().min(1).max(80),
  simulatePressure: z.boolean(),
  points: z.array(z.tuple([z.number(), z.number(), z.number()])).min(1).max(5000),
});
export type Stroke = z.infer<typeof strokeSchema>;
export const strokesSchema = z.array(strokeSchema).max(3000);

/** 업로드 제한 (Vercel 요청 본문 4.5MB 이내) */
export const MAX_PNG_BYTES = 2 * 1024 * 1024;
export const MAX_STROKES_BYTES = 2 * 1024 * 1024;
