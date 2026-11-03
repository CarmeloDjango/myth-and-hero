/** 카드 배틀 전적 테스트 (실제 Postgres) */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("TEST_DATABASE_URL이 없어 DB 테스트를 건너뜁니다.");
  process.exit(0);
}
if (/neon\.tech/.test(url)) throw new Error("운영 Neon DB에서는 테스트를 돌리지 않습니다.");
process.env.DATABASE_URL = url;
delete process.env.DATABASE_DRIVER;

const { getDb } = await import("../src/lib/db");
const { getBattleStats, recordBattle } = await import("../src/lib/battle/records");
const db = getDb();
let fam: { id: string; a: string; b: string };
let other: { id: string; c: string };

before(async () => {
  const mk = async (owner: string, kids: string[]) => {
    const f = await db.family.create({
      data: { ownerId: owner, parentPinHash: "t", profiles: { create: kids.map((nickname, order) => ({ nickname, avatar: "pink", order })) } },
      select: { id: true, profiles: { select: { id: true }, orderBy: { order: "asc" } } },
    });
    return { id: f.id, ids: f.profiles.map((p) => p.id) };
  };
  const s = Date.now();
  const x = await mk(`bt-a-${s}`, ["첫째", "둘째"]);
  const y = await mk(`bt-b-${s}`, ["손님"]);
  fam = { id: x.id, a: x.ids[0], b: x.ids[1] };
  other = { id: y.id, c: y.ids[0] };
});
after(async () => {
  await db.family.deleteMany({ where: { id: { in: [fam.id, other.id] } } });
  await db.$disconnect();
});

const res = (p1Id: string, p2Id: string | null, winner: 1 | 2) => ({ p1Id, p2Id, winner, p1Leader: "관우", p2Leader: p2Id ? "제우스" : "토리", turns: 16 });

test("전적 저장과 집계: 토리 대결, 형제 대결", async () => {
  assert.ok((await recordBattle(fam.id, res(fam.a, null, 1))).ok);
  assert.ok((await recordBattle(fam.id, res(fam.a, null, 2))).ok);
  assert.ok((await recordBattle(fam.id, res(fam.a, null, 1))).ok);
  assert.ok((await recordBattle(fam.id, res(fam.a, fam.b, 1))).ok);
  assert.ok((await recordBattle(fam.id, res(fam.b, fam.a, 1))).ok);
  assert.ok((await recordBattle(fam.id, res(fam.b, fam.a, 1))).ok);
  const st = await getBattleStats(fam.id);
  const a = st.players.find((p) => p.id === fam.a)!;
  const b = st.players.find((p) => p.id === fam.b)!;
  assert.deepEqual(a.vsTori, { wins: 2, losses: 1 });
  assert.deepEqual(a.vsFamily, [{ opponentId: fam.b, nickname: "둘째", wins: 1, losses: 2 }]);
  assert.deepEqual(b.vsFamily, [{ opponentId: fam.a, nickname: "첫째", wins: 2, losses: 1 }]);
  assert.deepEqual(b.vsTori, { wins: 0, losses: 0 });
  assert.equal(st.recent.length, 5);
  assert.equal(st.recent[0].winner, "둘째");
});

test("다른 가족 프로필·같은 사람끼리·잘못된 값은 거절, 다른 가족 전적에 안 섞임", async () => {
  assert.equal((await recordBattle(fam.id, res(fam.a, other.c, 1))).ok, false);
  assert.equal((await recordBattle(other.id, res(fam.a, null, 1))).ok, false);
  assert.equal((await recordBattle(fam.id, res(fam.a, fam.a, 1))).ok, false);
  assert.equal((await recordBattle(fam.id, { ...res(fam.a, null, 1), winner: 3 })).ok, false);
  const st = await getBattleStats(other.id);
  assert.deepEqual(st.players[0].vsTori, { wins: 0, losses: 0 });
  assert.equal(st.recent.length, 0);
});

test("트로피: 새로 받은 것만 알려 주고, 난이도·마무리·내 영웅을 기록", async () => {
  const s = Date.now();
  const f = await db.family.create({
    data: { ownerId: `bt-t-${s}`, parentPinHash: "t", profiles: { create: [{ nickname: "트로피", avatar: "pink", order: 0 }, { nickname: "동생", avatar: "blue", order: 1 }] } },
    select: { id: true, profiles: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  const [k, sib] = f.profiles.map((p) => p.id);
  try {
    // 첫 승: 보통 토리를 🔥로 마무리, 내 영웅을 내고, 체력 2 남기고, 10차례
    const r1 = await recordBattle(f.id, { ...res(k, null, 1), toriLevel: "normal", finish: "fire", winnerHp: 2, p1Hero: true, turns: 10 });
    assert.ok(r1.ok);
    assert.deepEqual(r1.ok && r1.earned, [{ profileId: k, trophies: ["first-win", "my-hero", "fire-finish", "close", "quick", "normal-1"] }]);
    // 같은 걸 또 해도 새 트로피 없음
    const r2 = await recordBattle(f.id, { ...res(k, null, 1), toriLevel: "normal", finish: "fire", winnerHp: 2, p1Hero: true, turns: 10 });
    assert.deepEqual(r2.ok && r2.earned, [{ profileId: k, trophies: [] }]);
    // 세 번째 연승 → 3연승, 체력 16 → 끄떡없어 (난이도 없으면 쉬움으로)
    const r3 = await recordBattle(f.id, { ...res(k, null, 1), winnerHp: 16 });
    assert.deepEqual(r3.ok && r3.earned, [{ profileId: k, trophies: ["streak-3", "untouched"] }]);
    // 가족 대결: 진 쪽(동생)은 새 트로피 없음, 이긴 쪽은 가족 대결 승리
    const r4 = await recordBattle(f.id, { ...res(sib, k, 2), winnerHp: 8 });
    assert.deepEqual(r4.ok && r4.earned, [
      { profileId: sib, trophies: [] },
      { profileId: k, trophies: ["family-win"] },
    ]);
    // 가족 대결에 토리 난이도는 거절
    assert.equal((await recordBattle(f.id, { ...res(k, sib, 1), toriLevel: "easy" })).ok, false);
    const st = await getBattleStats(f.id);
    const me = st.players.find((p) => p.id === k)!;
    assert.deepEqual(me.vsNormal, { wins: 2, losses: 0 });
    assert.deepEqual(me.vsTori, { wins: 3, losses: 0 });
    assert.deepEqual(me.trophies, ["first-win", "my-hero", "fire-finish", "close", "quick", "family-win", "streak-3", "normal-1", "untouched"]);
    assert.deepEqual(st.players.find((p) => p.id === sib)!.trophies, []);
    const rec = await db.battleRecord.findFirst({ where: { familyId: f.id, vsTori: true }, orderBy: { createdAt: "desc" } });
    assert.equal(rec?.toriLevel, "easy");
    assert.equal(st.recent.at(-1)?.p2, "보통 토리");
  } finally {
    await db.family.delete({ where: { id: f.id } });
  }
});
