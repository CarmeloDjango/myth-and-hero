/**
 * 영웅 카드 배틀: 도감 인물 → 배틀 카드 (서버·클라이언트 공용)
 *
 * 카드 숫자는 도감 능력치에서 자동으로 나옵니다.
 * - 비용: 별 개수 - 1 (1~4). 도감 인물은 대부분 4~5성이라 별 그대로면 처음 몇 차례에 낼 카드가 없습니다.
 * - 힘의 합(공격 + 체력) = 비용 × 2 + 3. 비싼 카드일수록 셉니다.
 * - 나누기: 한 능력치만 높은 인물(장비: 무력 98, 정치 22)은 공격이 높고 체력이 낮게,
 *   골고루 높은 인물(조조)은 공격과 체력이 비슷하게.
 * 종류별 특별한 힘은 아래 KIND_ABILITY. 아이가 만든 세계관의 종류는 특별한 힘이 없습니다.
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

/** 도감 능력치 → 카드 숫자 */
export function cardStats(rarity: number, stats: number[]): { cost: number; attack: number; health: number } {
  const max = Math.max(1, ...stats);
  const avg = stats.length ? stats.reduce((a, b) => a + b, 0) / stats.length : 0;
  const cost = clamp(Math.round(rarity) - 1, 1, 4);
  const total = cost * 2 + 3;
  // max/(max+avg)는 0.5(골고루) ~ 1(한 가지만). 차이를 키워 카드마다 개성이 나게 합니다.
  // 골고루 높으면 체력 쪽(튼튼), 한 가지만 높으면 공격 쪽(세지만 약함)
  const lean = clamp(0.4 + (max / (max + avg) - 0.5) * 2.5, 0.3, 0.8);
  const attack = clamp(Math.round(total * lean), 1, total - 1);
  return { cost, attack, health: total - attack };
}

export const LEADER_HP = 20;
export const DECK_SIZE = 10;
export const MAX_ENERGY = 6;
export const BOARD_MAX = 5;
export const HAND_MAX = 7;
