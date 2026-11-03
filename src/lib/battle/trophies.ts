/**
 * 카드 배틀 트로피 (서버·클라이언트 공용, 순수 함수)
 * 따로 저장하지 않고 대결 기록에서 그때그때 계산합니다 → 조건을 바꿔도 예전 기록에 그대로 적용돼요.
 * 예전 기록(난이도·마무리·남은 체력이 없던 때)은 그 값이 필요한 트로피에만 안 셉니다.
 */

/** 아이 한 명이 본 한 판 (오래된 것부터) */
export type KidGame = {
  won: boolean;
  vsTori: boolean;
  toriLevel: string | null;
  /** 내가 이겼을 때 마무리 ("attack" | "fire" | "fatigue") */
  finish: string | null;
  /** 이긴 쪽 대장의 남은 체력 */
  winnerHp: number | null;
  /** 두 사람 차례 수 합 */
  turns: number;
  /** 내가 만든 영웅 카드를 냈는지 */
  playedMyHero: boolean;
};

type Trophy = { id: string; icon: string; name: string; hint: string; test: (games: KidGame[]) => boolean };

const wins = (g: KidGame[]) => g.filter((x) => x.won);
const toriWins = (g: KidGame[], level?: string) => wins(g).filter((x) => x.vsTori && (!level || x.toriLevel === level)).length;
const maxStreak = (g: KidGame[]) => {
  let best = 0;
  let run = 0;
  for (const x of g) {
    run = x.won ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
};

/** 순서 = 화면에 보이는 순서 (쉬운 것부터) */
export const TROPHIES: Trophy[] = [
  { id: "first-win", icon: "🥇", name: "첫 승리", hint: "대결에서 한 번 이기기", test: (g) => wins(g).length >= 1 },
  { id: "games-10", icon: "🎮", name: "열 판 도전", hint: "대결 10판 하기", test: (g) => g.length >= 10 },
  { id: "tori-5", icon: "🐣", name: "토리 잡기", hint: "토리를 5번 이기기", test: (g) => toriWins(g) >= 5 },
  { id: "my-hero", icon: "🦸", name: "내 영웅과 함께", hint: "내가 만든 영웅 카드를 내고 이기기", test: (g) => wins(g).some((x) => x.playedMyHero) },
  { id: "fire-finish", icon: "🔥", name: "불꽃 마무리", hint: "🔥 불꽃 카드로 마지막 한 방", test: (g) => wins(g).some((x) => x.finish === "fire") },
  { id: "close", icon: "😅", name: "아슬아슬", hint: "대장 체력 3 이하로 이기기", test: (g) => wins(g).some((x) => x.winnerHp !== null && x.winnerHp <= 3) },
  { id: "quick", icon: "⚡", name: "번개 승리", hint: "12차례 안에 이기기", test: (g) => wins(g).some((x) => x.turns <= 12) },
  { id: "family-win", icon: "🤝", name: "가족 대결 승리", hint: "가족과 대결해서 이기기", test: (g) => wins(g).some((x) => !x.vsTori) },
  { id: "streak-3", icon: "🌟", name: "3연승", hint: "세 번 연달아 이기기", test: (g) => maxStreak(g) >= 3 },
  { id: "normal-1", icon: "💪", name: "보통 토리 이기기", hint: "보통 토리를 한 번 이기기", test: (g) => toriWins(g, "normal") >= 1 },
  { id: "untouched", icon: "🛡️", name: "끄떡없어", hint: "대장 체력 15 이상 남기고 이기기", test: (g) => wins(g).some((x) => x.winnerHp !== null && x.winnerHp >= 15) },
  { id: "tori-20", icon: "👑", name: "토리 대장", hint: "토리를 20번 이기기", test: (g) => toriWins(g) >= 20 },
  { id: "normal-5", icon: "🏆", name: "토리 박사", hint: "보통 토리를 5번 이기기", test: (g) => toriWins(g, "normal") >= 5 },
];

export type TrophyView = { id: string; icon: string; name: string; hint: string };
export const trophyView = (id: string): TrophyView | undefined => {
  const t = TROPHIES.find((x) => x.id === id);
  return t ? { id: t.id, icon: t.icon, name: t.name, hint: t.hint } : undefined;
};

/** 받은 트로피 id (TROPHIES 순서) */
export function earnedTrophies(games: KidGame[]): string[] {
  return TROPHIES.filter((t) => t.test(games)).map((t) => t.id);
}

/** 한 판을 더한 뒤 새로 받은 트로피 */
export function newTrophies(before: KidGame[], game: KidGame): string[] {
  const had = new Set(earnedTrophies(before));
  return earnedTrophies([...before, game]).filter((id) => !had.has(id));
}
