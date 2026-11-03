/**
 * 영웅 카드 배틀: 도감 인물 → 배틀 카드 (서버·클라이언트 공용)
 *
 * 균형 원칙 (수집형 카드 게임의 "기본 곡선"):
 * - 공격 + 체력 = 비용 × 2 + 1  (1코스트 2/1, 3코스트 3/4, 5코스트 5/6 정도)
 * - 특별한 힘이 있으면 그 값으로 1을 뺍니다.
 * - 공격·체력은 최대 6. 한 방에 끝나는 카드가 없어야 끝까지 조마조마합니다.
 *
 * 공식 인물(삼국지, 그리스신화)은 한 장씩 손으로 정한 숫자(OFFICIAL_CARDS)를 쓰고,
 * 아이가 만든 영웅은 도감 능력치에서 같은 원칙으로 계산합니다(familyCardStats).
 * 도감의 능력치(통솔·무력…)는 그대로이고, 카드 숫자만 따로 있습니다.
 */
export type Ability = "guard" | "charge" | "scheme" | "divine";

export const ABILITIES: Record<Ability, { icon: string; name: string; text: string }> = {
  guard: { icon: "🛡️", name: "지키기", text: "상대는 이 카드부터 공격해야 해요." },
  charge: { icon: "💨", name: "돌격", text: "내자마자 공격할 수 있어요." },
  scheme: { icon: "📜", name: "꾀", text: "낼 때 카드를 1장 더 뽑아요." },
  divine: { icon: "✨", name: "신의 힘", text: "낼 때 상대 카드 모두에게 1 피해를 줘요." },
};

/** 종류 이름 → 특별한 힘 (공식 세계관의 종류) */
export const KIND_ABILITY: Record<string, Ability> = {
  장수: "guard",
  영웅: "guard",
  괴물: "charge",
  책사: "scheme",
  신: "divine",
};

export type CardDef = {
  /** 인물 id */
  id: string;
  name: string;
  /** 그림 주소 (없으면 이름 첫 글자) */
  imageSrc: string | null;
  imageCover: boolean;
  /** 카드 배경색 (편 색 → 종류 색) */
  tint: string;
  kindName: string | null;
  seriesName: string;
  /** 아이가 만든 영웅 */
  isFamily: boolean;
  /** 이 영웅을 만든 아이 (덱에 자기 영웅을 넣을 때) */
  creatorId: string | null;
  cost: number;
  attack: number;
  health: number;
  ability: Ability | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const STAT_CAP = 6;

/** 비용에 맞는 힘의 합 (특별한 힘이 있으면 1 적게) */
export function statBudget(cost: number, hasAbility: boolean): number {
  return cost * 2 + 1 - (hasAbility ? 1 : 0);
}

/**
 * 공식 인물 카드 (slug → 비용/공격/체력). 비용별 장수: 1:2, 2:6, 3:11, 4:9, 5:6
 * 특별한 힘은 종류에서 (장수·영웅 🛡️, 괴물 💨, 책사 📜, 신 ✨, 군주 없음)
 */
export const OFFICIAL_CARDS: Record<string, [cost: number, attack: number, health: number]> = {
  // 그리스신화
  zeus: [5, 5, 5], // ✨ 천둥의 신
  athena: [5, 4, 6], // ✨ 지혜
  heracles: [5, 4, 6], // 🛡️ 열두 과업
  poseidon: [4, 4, 4], // ✨
  hades: [4, 5, 3], // ✨
  achilles: [4, 4, 4], // 🛡️
  apollo: [3, 3, 3], // ✨
  artemis: [3, 4, 2], // ✨ 사냥꾼
  perseus: [3, 3, 3], // 🛡️
  theseus: [3, 2, 4], // 🛡️
  minotaur: [3, 4, 2], // 💨 황소
  odysseus: [2, 2, 2], // 🛡️
  medusa: [2, 3, 1], // 💨
  hermes: [1, 1, 1], // ✨ 빠른 전령
  // 삼국지
  "guan-yu": [5, 5, 5], // 🛡️ 미염공
  "lu-bu": [5, 6, 4], // 🛡️ 천하제일 무장
  "cao-cao": [5, 5, 6], // 군주
  "liu-bei": [4, 4, 5], // 군주
  "zhang-fei": [4, 5, 3], // 🛡️
  "zhao-yun": [4, 4, 4], // 🛡️
  "zhang-liao": [4, 3, 5], // 🛡️
  "zhuge-liang": [4, 3, 5], // 📜
  "zhou-yu": [4, 4, 4], // 📜
  "ma-chao": [3, 4, 2], // 🛡️
  "huang-zhong": [3, 3, 3], // 🛡️
  "xiahou-dun": [3, 2, 4], // 🛡️
  "sima-yi": [3, 2, 4], // 📜
  "sun-quan": [3, 3, 4], // 군주
  "sun-ce": [3, 4, 3], // 군주
  "xu-chu": [2, 2, 2], // 🛡️
  "lu-meng": [2, 1, 3], // 🛡️
  "gan-ning": [2, 3, 1], // 🛡️
  "yuan-shao": [2, 2, 3], // 군주
  "dong-zhuo": [1, 2, 1], // 군주
};

/**
 * 아이가 만든 영웅 카드: 능력치 합으로 비용, 능력치 모양으로 공격·체력 나누기
 * - 비용: 합 350(가득) → 5, 250 → 4, 170 → 3 …
 * - 한 능력치만 높으면 공격 쪽, 골고루 높으면 체력 쪽
 */
export function familyCardStats(stats: number[], hasAbility: boolean): { cost: number; attack: number; health: number } {
  const sum = stats.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...stats);
  const avg = stats.length ? sum / stats.length : 0;
  const cost = clamp(Math.round((sum / 350) * 4) + 1, 1, 5);
  const total = statBudget(cost, hasAbility);
  const lean = clamp(0.4 + (max / (max + avg) - 0.5) * 2.5, 0.3, 0.7);
  // 공격·체력 둘 다 1~6 안에 들도록 (합은 그대로)
  const attack = clamp(Math.round(total * lean), Math.max(1, total - STAT_CAP), Math.min(STAT_CAP, total - 1));
  return { cost, attack, health: total - attack };
}

/** 카드 숫자: 공식 인물이면 손으로 정한 표, 아니면 계산 */
export function cardStatsFor(c: { slug: string; official: boolean; stats: number[]; ability: Ability | null }): { cost: number; attack: number; health: number } {
  const fixed = c.official ? OFFICIAL_CARDS[c.slug] : undefined;
  if (fixed) return { cost: fixed[0], attack: fixed[1], health: fixed[2] };
  return familyCardStats(c.stats, c.ability !== null);
}

/**
 * 게임 길이·긴장감을 정하는 값. 시뮬레이션(docs/BATTLE.md)으로 맞췄습니다.
 * 테스트·시뮬레이션에서만 바꿔 봅니다.
 */
export const RULES = {
  leaderHp: 18,
  startEnergy: 1,
  maxEnergy: 6,
  /** 나중에 하는 쪽 첫 차례 에너지 보너스 (먼저 하는 쪽이 너무 유리해서) */
  secondBonus: 1,
  /** 대장 체력이 이 값 이하면 위기의 힘 (0이면 끔) */
  crisisHp: 10,
  /** 위기의 힘: 차례마다 카드 더 뽑기 / 에너지 더 받기 */
  crisisDraw: 0,
  crisisEnergy: 1,
};
export const LEADER_HP = RULES.leaderHp;
export const DECK_SIZE = 10;
export const MAX_ENERGY = RULES.maxEnergy;
export const BOARD_MAX = 5;
export const HAND_MAX = 7;
