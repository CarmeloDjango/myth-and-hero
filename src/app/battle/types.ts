import type { ToriLevel } from "@/lib/battle/ai";
import type { CardDef } from "@/lib/battle/cards";

export type Profile = { id: string; nickname: string; avatar: string };

/** 자리: 아이 또는 토리 */
export type Seat = { kind: "kid"; profile: Profile } | { kind: "tori"; level: ToriLevel };

/** 한 사람이 고른 대장과 덱 */
export type Loadout = { leader: CardDef; deck: CardDef[] };

export const seatName = (s: Seat) => (s.kind === "tori" ? (s.level === "normal" ? "보통 토리" : "토리") : s.profile.nickname);

export const TORI_LEVELS: { level: ToriLevel; label: string; icon: string; text: string }[] = [
  { level: "easy", label: "쉬움", icon: "🐣", text: "처음이라면 여기부터" },
  { level: "normal", label: "보통", icon: "💪", text: "토리가 진지하게 해요" },
];

/** 화면에 보일 전적 (서버 → 클라이언트, 날짜는 문자열) */
export type StatsView = {
  players: {
    id: string;
    nickname: string;
    avatar: string;
    vsTori: { wins: number; losses: number };
    vsNormal: { wins: number; losses: number };
    vsFamily: { opponentId: string; nickname: string; wins: number; losses: number }[];
    trophies: string[];
  }[];
  recent: { id: string; p1: string; p2: string; winner: string; p1Leader: string; p2Leader: string; createdAt: string }[];
};

/** 한 판이 끝났을 때 트로피 계산에 쓰는 사실들 */
export type FinishFacts = {
  finish: "attack" | "fire" | "fatigue";
  winnerHp: number;
  /** 자리별: 자기가 만든 영웅 카드를 냈는지 */
  heroPlayed: [boolean, boolean];
};

/** 이번 판에 새로 받은 트로피 (아이별) */
export type TrophiesEarned = { profileId: string; trophies: string[] }[];
