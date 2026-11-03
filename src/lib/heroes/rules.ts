/**
 * 영웅 만들기 규칙 (서버·클라이언트 공용). docs/HERO_MAKER.md 3장, 10장
 * 마법사 화면과 서버 검증이 같은 값을 쓰도록 여기서만 정합니다.
 */
import { z } from "zod";

import { STAT_KEYS, type StatKey } from "@/lib/characters/browse";
import { josa } from "@/lib/text/josa";

/** 5칸 합계 최대 점수 (확정) */
export const HERO_STAT_BUDGET = 300;

/**
 * 별(★) = 능력치 합의 구간 = 카드 배틀 비용(⚡). 공식 인물도 아이가 만든 영웅도 같은 규칙입니다.
 * ★5 261~300, ★4 221~260, ★3 171~220, ★2 121~170, ★1 120 이하
 */
export const STAR_BANDS = [261, 221, 171, 121] as const;
export function heroStars(statSum: number): number {
  const i = STAR_BANDS.findIndex((min) => statSum >= min);
  return i === -1 ? 1 : 5 - i;
}
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
  { key: "stats", label: "능력치", question: `${HERO_STAT_BUDGET}점을 능력치에 나눠 주세요!` },
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

/**
 * 그리기 기록 (저장 형식). 그린 순서대로 다시 그리면 같은 그림이 나옵니다(되돌리기·다시 보기에 씀).
 * 좌표는 0~1024 캔버스 기준, 점은 [x, y, 필압].
 *
 * - 붓 획: 펜, 크레용, 마커, 형광펜, 반짝이, 무지개, 지우개
 * - 채우기: 그 지점과 이어진 같은 색 영역을 칠함
 * - 스탬프: 모양을 찍음
 *
 * 예전에 저장한 그림(펜·지우개만 있던 때)도 그대로 읽힙니다.
 */
export const CANVAS_SIZE = 1024;

export const BRUSH_TOOLS = ["pen", "crayon", "marker", "highlighter", "glitter", "rainbow", "eraser"] as const;
export type BrushTool = (typeof BRUSH_TOOLS)[number];

export const STAMP_SHAPES = ["star", "heart", "bolt", "crown", "sword", "shield", "flame", "flower", "moon", "gem"] as const;
export type StampShape = (typeof STAMP_SHAPES)[number];

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const coord = z.number().finite().min(-256).max(CANVAS_SIZE + 256);

const brushOpSchema = z.object({
  tool: z.enum(BRUSH_TOOLS),
  color: hex,
  size: z.number().min(1).max(160),
  simulatePressure: z.boolean(),
  points: z.array(z.tuple([coord, coord, z.number().min(0).max(1)])).min(1).max(5000),
});
const fillOpSchema = z.object({ tool: z.literal("fill"), color: hex, x: coord, y: coord });
const stampOpSchema = z.object({
  tool: z.literal("stamp"),
  shape: z.enum(STAMP_SHAPES),
  color: hex,
  x: coord,
  y: coord,
  size: z.number().min(16).max(800),
  rotation: z.number().min(-360).max(360),
});

export const strokeSchema = z.union([brushOpSchema, fillOpSchema, stampOpSchema]);
export type BrushOp = z.infer<typeof brushOpSchema>;
export type FillOp = z.infer<typeof fillOpSchema>;
export type StampOp = z.infer<typeof stampOpSchema>;
export type Stroke = z.infer<typeof strokeSchema>;
export const strokesSchema = z.array(strokeSchema).max(3000);

export function isBrushOp(s: Stroke): s is BrushOp {
  return (BRUSH_TOOLS as readonly string[]).includes(s.tool);
}

/** 업로드 제한 (Vercel 요청 본문 4.5MB 이내) */
export const MAX_PNG_BYTES = 2 * 1024 * 1024;
export const MAX_STROKES_BYTES = 2 * 1024 * 1024;
/** 밑그림 사진 (브라우저에서 1024px JPEG로 줄인 뒤) */
export const MAX_BACKGROUND_BYTES = 2 * 1024 * 1024;
/** 카드 목록용 작은 그림 (가로세로 384px) */
export const THUMB_SIZE = 384;
export const MAX_THUMB_BYTES = 512 * 1024;
