import type { CardDef } from "@/lib/battle/cards";

export type Profile = { id: string; nickname: string; avatar: string };

/** 자리: 아이 또는 토리 */
export type Seat = { kind: "kid"; profile: Profile } | { kind: "tori" };

/** 한 사람이 고른 대장과 덱 */
export type Loadout = { leader: CardDef; deck: CardDef[] };

export const seatName = (s: Seat) => (s.kind === "tori" ? "토리" : s.profile.nickname);

/** 화면에 보일 전적 (서버 → 클라이언트, 날짜는 문자열) */
export type StatsView = {
  players: { id: string; nickname: string; avatar: string; vsTori: { wins: number; losses: number }; vsFamily: { opponentId: string; nickname: string; wins: number; losses: number }[] }[];
  recent: { id: string; p1: string; p2: string; winner: string; p1Leader: string; p2Leader: string; createdAt: string }[];
};
