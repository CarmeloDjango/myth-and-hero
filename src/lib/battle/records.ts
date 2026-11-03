import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { earnedTrophies, newTrophies, type KidGame } from "@/lib/battle/trophies";

/**
 * 카드 배틀 전적 (가족 안에서만)
 * 결과는 아이패드(브라우저)가 보내 줍니다. 가족끼리 보는 기록이라 판을 서버에서 다시 검증하지는 않고,
 * 프로필이 우리 가족인지와 값의 범위만 확인합니다.
 */
export const battleResultSchema = z
  .object({
    p1Id: z.string().min(1),
    /** null이면 토리 */
    p2Id: z.string().min(1).nullable(),
    winner: z.union([z.literal(1), z.literal(2)]),
    p1Leader: z.string().trim().min(1).max(40),
    p2Leader: z.string().trim().min(1).max(40),
    turns: z.number().int().min(1).max(500),
    toriLevel: z.enum(["easy", "normal"]).nullable().default(null),
    finish: z.enum(["attack", "fire", "fatigue"]).nullable().default(null),
    winnerHp: z.number().int().min(0).max(99).nullable().default(null),
    p1Hero: z.boolean().default(false),
    p2Hero: z.boolean().default(false),
  })
  .refine((r) => r.p1Id !== r.p2Id, { message: "같은 사람끼리는 대결할 수 없어요." })
  .refine((r) => r.p2Id === null || r.toriLevel === null, { message: "가족 대결에는 토리 난이도가 없어요." })
  // 토리는 영웅을 만들지 않아요
  .transform((r) => ({ ...r, p2Hero: r.p2Id === null ? false : r.p2Hero, toriLevel: r.p2Id === null ? (r.toriLevel ?? "easy") : null }));

export type BattleResultInput = z.input<typeof battleResultSchema>;
type Deps = { db?: PrismaClient };
const db = (d?: Deps) => d?.db ?? getDb();

/** 새로 받은 트로피 (아이별) */
export type EarnedNow = { profileId: string; trophies: string[] }[];

const RECORD_SELECT = {
  id: true,
  p1Id: true,
  p2Id: true,
  vsTori: true,
  winner: true,
  p1Leader: true,
  p2Leader: true,
  turns: true,
  toriLevel: true,
  finish: true,
  winnerHp: true,
  p1Hero: true,
  p2Hero: true,
  createdAt: true,
} as const;
type Row = { p1Id: string | null; p2Id: string | null; vsTori: boolean; winner: number; turns: number; toriLevel: string | null; finish: string | null; winnerHp: number | null; p1Hero: boolean; p2Hero: boolean };

/** 한 아이 입장에서 본 한 판 (그 아이가 안 했으면 null) */
export function kidGame(r: Row, profileId: string): KidGame | null {
  const side = r.p1Id === profileId ? 1 : r.p2Id === profileId ? 2 : 0;
  if (!side) return null;
  const won = r.winner === side;
  return {
    won,
    vsTori: r.vsTori,
    toriLevel: r.toriLevel,
    finish: won ? r.finish : null,
    winnerHp: r.winnerHp,
    turns: r.turns,
    playedMyHero: side === 1 ? r.p1Hero : r.p2Hero,
  };
}

const gamesOf = (rows: Row[], profileId: string) => rows.map((r) => kidGame(r, profileId)).filter((g): g is KidGame => !!g);

export async function recordBattle(familyId: string, input: unknown, d?: Deps): Promise<{ ok: true; earned: EarnedNow } | { ok: false; error: string }> {
  const parsed = battleResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "결과를 읽을 수 없어요." };
  const r = parsed.data;
  const ids = [r.p1Id, r.p2Id].filter((x): x is string => !!x);
  const mine = await db(d).childProfile.count({ where: { familyId, id: { in: ids } } });
  if (mine !== ids.length) return { ok: false, error: "우리 가족 프로필이 아니에요." };
  // 이번 판 전까지의 기록 (오래된 것부터) → 새로 받은 트로피 계산
  const before = await db(d).battleRecord.findMany({
    where: { familyId, OR: [{ p1Id: { in: ids } }, { p2Id: { in: ids } }] },
    orderBy: { createdAt: "asc" },
    select: RECORD_SELECT,
  });
  const row = await db(d).battleRecord.create({ data: { familyId, ...r, vsTori: r.p2Id === null }, select: RECORD_SELECT });
  const earned = ids.map((id) => ({ profileId: id, trophies: newTrophies(gamesOf(before, id), kidGame(row, id)!) }));
  return { ok: true, earned };
}

export type WinLoss = { wins: number; losses: number };
export type BattleStats = {
  /** 아이별: 토리와의 전적, 형제별 전적 */
  players: {
    id: string;
    nickname: string;
    avatar: string;
    vsTori: WinLoss;
    /** 보통 토리와의 전적 (vsTori 안에 포함) */
    vsNormal: WinLoss;
    vsFamily: { opponentId: string; nickname: string; wins: number; losses: number }[];
    /** 받은 트로피 id */
    trophies: string[];
  }[];
  recent: { id: string; p1: string; p2: string; winner: string; p1Leader: string; p2Leader: string; createdAt: Date }[];
};

export async function getBattleStats(familyId: string, d?: Deps): Promise<BattleStats> {
  const [profiles, records] = await Promise.all([
    db(d).childProfile.findMany({ where: { familyId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }], select: { id: true, nickname: true, avatar: true } }),
    // 트로피는 모든 기록에서 계산 (가족 기록이라 많지 않아요)
    db(d).battleRecord.findMany({ where: { familyId }, orderBy: { createdAt: "desc" }, select: RECORD_SELECT }),
  ]);
  const name = new Map(profiles.map((p) => [p.id, p.nickname]));
  const players = profiles.map((p) => {
    const vsTori: WinLoss = { wins: 0, losses: 0 };
    const vsNormal: WinLoss = { wins: 0, losses: 0 };
    const vsFamily = new Map<string, WinLoss>();
    for (const r of records) {
      const side = r.p1Id === p.id ? 1 : r.p2Id === p.id ? 2 : 0;
      if (!side) continue;
      const won = r.winner === side;
      if (r.vsTori) {
        if (won) vsTori.wins++;
        else vsTori.losses++;
        if (r.toriLevel === "normal") {
          if (won) vsNormal.wins++;
          else vsNormal.losses++;
        }
        continue;
      }
      const opp = side === 1 ? r.p2Id : r.p1Id;
      if (!opp || !name.has(opp)) continue;
      const wl = vsFamily.get(opp) ?? { wins: 0, losses: 0 };
      if (won) wl.wins++;
      else wl.losses++;
      vsFamily.set(opp, wl);
    }
    return {
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      vsTori,
      vsNormal,
      trophies: earnedTrophies(gamesOf([...records].reverse(), p.id)),
      vsFamily: [...vsFamily].map(([opponentId, wl]) => ({ opponentId, nickname: name.get(opponentId)!, ...wl })),
    };
  });
  const who = (id: string | null, tori: boolean) => (tori && id === null ? "토리" : (name.get(id ?? "") ?? "(지운 프로필)"));
  const recent = records.slice(0, 5).map((r) => {
    const p1 = who(r.p1Id, false);
    const p2 = r.vsTori && r.toriLevel === "normal" ? "보통 토리" : who(r.p2Id, r.vsTori);
    return { id: r.id, p1, p2, winner: r.winner === 1 ? p1 : p2, p1Leader: r.p1Leader, p2Leader: r.p2Leader, createdAt: r.createdAt };
  });
  return { players, recent };
}
