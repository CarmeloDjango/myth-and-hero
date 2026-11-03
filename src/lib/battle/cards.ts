/**
 * 영웅 카드 배틀: 도감 인물 → 배틀 카드 (서버·클라이언트 공용)
 *
 * 균형 원칙 (수집형 카드 게임의 "기본 곡선"):
 * - 공격 + 체력 = 비용 × 2 + 1  (1코스트 2/1, 3코스트 3/4, 5코스트 5/6 정도)
 * - 특별한 힘이 있으면 그 값으로 1을 뺍니다.
 * - 공격·체력은 최대 6. 한 방에 끝나는 카드가 없어야 끝까지 조마조마합니다.
 *
 * 공식 인물(그리스신화, 삼국지, 수호지, 초한지)은 한 장씩 손으로 정한 숫자(OFFICIAL_CARDS)를 쓰고,
 * 아이가 만든 영웅은 도감 능력치에서 같은 원칙으로 계산합니다(familyCardStats).
 * 도감의 능력치(통솔·무력…)는 그대로이고, 카드 숫자만 따로 있습니다.
 */
import { heroStars } from "@/lib/heroes/rules";

export type Ability = "guard" | "charge" | "scheme" | "divine" | "fire";

export const ABILITIES: Record<Ability, { icon: string; name: string; text: string }> = {
  guard: { icon: "🛡️", name: "지키기", text: "상대는 이 카드부터 공격해야 해요." },
  charge: { icon: "💨", name: "돌격", text: "내자마자 공격할 수 있어요." },
  scheme: { icon: "📜", name: "꾀", text: "낼 때 카드를 1장 더 뽑아요." },
  divine: { icon: "✨", name: "신의 힘", text: "낼 때 상대 카드 모두에게 1 피해를 줘요." },
  fire: { icon: "🔥", name: "불꽃", text: "낼 때 상대 대장에게 2 피해를 줘요." },
};

/** 종류 이름 → 특별한 힘 (공식 세계관의 종류; 군주·두령은 없음) */
export const KIND_ABILITY: Record<string, Ability> = {
  장수: "guard",
  영웅: "guard",
  괴물: "charge",
  책사: "scheme",
  신: "divine",
  호걸: "charge",
  도사: "divine",
};

/** 영웅 만들기에서 고를 수 있는 특별한 힘 */
export const ABILITY_CHOICES: Ability[] = ["guard", "charge", "scheme", "divine", "fire"];
export const isAbility = (v: unknown): v is Ability => typeof v === "string" && (ABILITY_CHOICES as string[]).includes(v);

/**
 * 인물의 특별한 힘
 * - 아이가 고른 값이 있으면 그 값 ("none"이면 없음)
 * - 없으면 공식 세계관의 종류에서 (장수 🛡️ …), 아이가 만든 세계관의 종류는 없음
 */
export function resolveAbility(c: { ability: string | null | undefined; kindName: string | null | undefined; officialSeries: boolean }): Ability | null {
  if (c.ability === "none") return null;
  if (isAbility(c.ability)) return c.ability;
  return c.officialSeries && c.kindName ? (KIND_ABILITY[c.kindName] ?? null) : null;
}

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
 * 공식 인물 카드 (slug → 비용/공격/체력). 비용별 장수: 1:4, 2:10, 3:20, 4:18, 5:11
 * 특별한 힘은 종류에서 (장수·영웅 🛡️, 괴물·호걸 💨, 책사 📜, 신·도사 ✨, 군주·두령 없음).
 * 몇 명은 시드에서 따로 정합니다(seed-data의 ability):
 *   그리스신화 아테나 📜, 포세이돈 🛡️, 하데스 없음, 아폴론 🔥, 아르테미스·헤르메스 💨 / 초한지 항우·번쾌·하후영 💨 / 수호지 대종·연청 📜
 * 시뮬레이션(docs/BATTLE.md)으로 네 세계관의 한 세계관 덱끼리 46~57%가 되게 맞췄습니다.
 */
export const OFFICIAL_CARDS: Record<string, [cost: number, attack: number, health: number]> = {
  // 그리스신화
  zeus: [5, 4, 6], // ✨ 천둥의 신 (그리스신화에서 ✨는 제우스만)
  athena: [5, 4, 6], // 📜 지혜
  heracles: [5, 4, 6], // 🛡️ 열두 과업
  poseidon: [4, 3, 5], // 🛡️ 바다의 벽
  hades: [4, 4, 5], // 힘 없음 (조용한 저승의 왕)
  achilles: [4, 3, 5], // 🛡️
  apollo: [3, 2, 4], // 🔥 태양
  artemis: [3, 2, 4], // 💨 사냥꾼
  perseus: [3, 2, 4], // 🛡️
  theseus: [3, 2, 4], // 🛡️
  minotaur: [3, 3, 3], // 💨 황소
  odysseus: [2, 2, 2], // 🛡️
  medusa: [2, 1, 3], // 💨
  hermes: [1, 1, 1], // 💨 빠른 전령
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
  // 수호지 (두령 없음, 장수 🛡️, 호걸 💨, 책사 📜, 도사 ✨)
  "song-jiang": [4, 4, 5], // 두령 급시우
  "lu-junyi": [4, 4, 5], // 두령
  "chao-gai": [3, 3, 4], // 두령
  "lin-chong": [5, 5, 5], // 🛡️ 표자두
  "guan-sheng": [4, 4, 4], // 🛡️
  "hua-rong": [3, 3, 3], // 🛡️
  "yang-zhi": [3, 2, 4], // 🛡️
  "zhang-qing": [2, 2, 2], // 🛡️
  "wu-song": [5, 5, 5], // 💨 호랑이 잡은 행자
  "lu-zhishen": [4, 4, 4], // 💨
  "li-kui": [3, 4, 2], // 💨 흑선풍
  "yan-qing": [2, 2, 2], // 📜 (종류는 호걸이지만 영리한 꾀돌이)
  "dai-zong": [1, 1, 1], // 📜 (소식을 전하는 전령)
  "wu-yong": [4, 3, 5], // 📜
  "gongsun-sheng": [3, 3, 3], // ✨ 도술
  // 초한지
  "liu-bang": [4, 5, 4], // 군주
  "xiang-yu": [5, 6, 4], // 💨 (군주지만 언제나 맨 앞에서 달림)
  "qin-shi-huang": [4, 5, 4], // 군주
  "chen-sheng": [1, 2, 1], // 군주
  "han-xin": [5, 6, 4], // 🛡️ 국사무쌍
  "fan-kuai": [3, 4, 2], // 💨 (잔치 자리로 뛰어든 용사)
  "xiahou-ying": [2, 3, 1], // 💨 (수레를 모는 장수)
  "ying-bu": [3, 4, 2], // 🛡️
  "zhongli-mo": [3, 3, 3], // 🛡️
  "ji-bu": [2, 2, 2], // 🛡️
  "zhang-liang": [5, 5, 5], // 📜
  "xiao-he": [4, 4, 4], // 📜
  "chen-ping": [3, 3, 3], // 📜
  "fan-zeng": [4, 4, 4], // 📜
};

/**
 * 아이가 만든 영웅 카드: 능력치 합으로 비용, 능력치 모양으로 공격·체력 나누기
 * - 비용 = 별: heroStars(능력치 합) — 300(가득) → 5, 225 → 4, 150 → 3 …
 * - 한 능력치만 높으면 공격 쪽, 골고루 높으면 체력 쪽
 */
export function familyCardStats(stats: number[], hasAbility: boolean): { cost: number; attack: number; health: number } {
  const sum = stats.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...stats);
  const avg = stats.length ? sum / stats.length : 0;
  const cost = heroStars(sum);
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
  /** 첫 차례 에너지 (1이면 1코스트 카드가 없을 때 첫 차례에 할 게 없음) */
  startEnergy: 2,
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
