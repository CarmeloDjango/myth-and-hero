/**
 * 이름 겹침 막기 테스트: 같은 세계관에 관우가 둘이 되지 않게 (실제 Postgres)
 * 실행: TEST_DATABASE_URL=postgresql://… npm run test:db
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("TEST_DATABASE_URL이 없어 DB 테스트를 건너뜁니다.");
  process.exit(0);
}
if (/neon\.tech/.test(url)) throw new Error("운영 Neon DB에서는 테스트를 돌리지 않습니다.");
process.env.DATABASE_URL = url;
delete process.env.DATABASE_DRIVER;

const { getDb } = await import("../src/lib/db");
const heroes = await import("../src/lib/heroes/service");
const worlds = await import("../src/lib/worlds/service");
const { nameKey } = await import("../src/lib/names");

const db = getDb();
let famA: { id: string; kid1: string; kid2: string };
let famB: { id: string; kid: string };
let guanyu: { name: string; alias: string; seriesSlug: string; seriesName: string };

async function makeFamily(owner: string, kids: string[]) {
  const f = await db.family.create({
    data: { ownerId: owner, parentPinHash: "test", profiles: { create: kids.map((nickname, order) => ({ nickname, avatar: "pink", order })) } },
    select: { id: true, profiles: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  return { id: f.id, ids: f.profiles.map((p) => p.id) };
}

before(async () => {
  const stamp = Date.now();
  const a = await makeFamily(`names-a-${stamp}`, ["딸", "아들"]);
  const b = await makeFamily(`names-b-${stamp}`, ["옆집"]);
  famA = { id: a.id, kid1: a.ids[0], kid2: a.ids[1] };
  famB = { id: b.id, kid: b.ids[0] };
  const c = await db.character.findFirstOrThrow({
    where: { familyId: null, aliases: { isEmpty: false } },
    select: { name: true, aliases: true, series: { select: { slug: true, name: true } } },
  });
  guanyu = { name: c.name, alias: c.aliases[0], seriesSlug: c.series.slug, seriesName: c.series.name };
});

after(async () => {
  await db.family.deleteMany({ where: { id: { in: [famA.id, famB.id] } } });
  await db.$disconnect();
});

const draft = async (ctx: { familyId: string; profileId: string }, slug = guanyu.seriesSlug) => {
  const d = await heroes.createHeroDraft(ctx, slug);
  assert.ok(d.ok);
  return d.heroId;
};

test("비교는 띄어쓰기·대소문자 무시", () => {
  assert.equal(nameKey(" 관 우 "), nameKey("관우"));
  assert.equal(nameKey("Zeus"), nameKey("zeus"));
});

describe("영웅 이름", () => {
  test("공식 인물 이름·별명과 겹치면 거절 (띄어써도)", async () => {
    const kid = { familyId: famA.id, profileId: famA.kid1 };
    const id = await draft(kid);
    const same = await heroes.saveHeroName(kid, id, { name: guanyu.name.split("").join(" ") });
    assert.equal(same.ok, false);
    assert.match(!same.ok ? same.error : "", new RegExp(`${guanyu.seriesName}에 이미 있어요`));
    const alias = await heroes.saveHeroName(kid, id, { name: guanyu.alias });
    assert.equal(alias.ok, false);
    assert.match(!alias.ok ? alias.error : "", /별명이에요/);
  });

  test("형제의 영웅(만드는 중 포함)과 겹치면 거절, 내 영웅 이름 그대로 다시 저장은 됨", async () => {
    const k1 = { familyId: famA.id, profileId: famA.kid1 };
    const k2 = { familyId: famA.id, profileId: famA.kid2 };
    const a = await draft(k1);
    assert.ok((await heroes.saveHeroName(k1, a, { name: "번개맨" })).ok);
    assert.ok((await heroes.saveHeroName(k1, a, { name: "번개맨", title: "빠른" })).ok, "자기 자신과는 안 겹침");
    const b = await draft(k2);
    assert.equal((await heroes.saveHeroName(k2, b, { name: "번개 맨" })).ok, false);
  });

  test("다른 세계관이나 다른 가족이면 같은 이름 가능", async () => {
    const other = await draft({ familyId: famB.id, profileId: famB.kid });
    assert.ok((await heroes.saveHeroName({ familyId: famB.id, profileId: famB.kid }, other, { name: "번개맨" })).ok, "다른 가족");
    const otherSeries = await db.series.findFirstOrThrow({ where: { familyId: null, slug: { not: guanyu.seriesSlug } }, select: { slug: true } });
    const k2 = { familyId: famA.id, profileId: famA.kid2 };
    const c = await draft(k2, otherSeries.slug);
    assert.ok((await heroes.saveHeroName(k2, c, { name: "번개맨" })).ok, "다른 세계관");
  });

  test("완성할 때 한 번 더 확인 (형제가 먼저 같은 이름으로 완성한 경우)", async () => {
    const k1 = { familyId: famA.id, profileId: famA.kid1 };
    const k2 = { familyId: famA.id, profileId: famA.kid2 };
    const a = await draft(k1);
    const b = await draft(k2);
    assert.ok((await heroes.saveHeroName(k1, a, { name: "쌍둥이" })).ok);
    // 동시에 정한 것처럼 DB에 직접 같은 이름을 넣음
    await db.character.update({ where: { id: b }, data: { name: "쌍둥이" } });
    assert.equal((await heroes.finishHero(k2, b)).ok, false);
  });
});

describe("세계관 이름", () => {
  const input = (name: string) => ({ name, description: "", themeColor: "#ff86d0", statLabels: ["힘", "마법", "지혜", "용기", "매력"], kinds: ["요정"], factions: [] });

  test("공식 세계관·우리 가족 세계관과 겹치면 거절, 다른 가족은 가능", async () => {
    const k1 = { familyId: famA.id, profileId: famA.kid1 };
    assert.equal((await worlds.createWorld(k1, input(guanyu.seriesName))).ok, false, "공식 세계관 이름");
    assert.ok((await worlds.createWorld(k1, input("티니핑 나라"))).ok);
    const dup = await worlds.createWorld({ familyId: famA.id, profileId: famA.kid2 }, input("티니핑나라"));
    assert.equal(dup.ok, false);
    assert.match(!dup.ok ? dup.error : "", /이미 있어요/);
    assert.equal(await worlds.checkWorldName(famA.id, "티니핑 나라"), '"티니핑 나라" 세계관은 이미 있어요. 다른 이름을 지어 볼까요?');
    assert.ok((await worlds.createWorld({ familyId: famB.id, profileId: famB.kid }, input("티니핑 나라"))).ok, "다른 가족은 가능");
  });

  test("이름 바꾸기도 겹치면 거절 (자기 이름 그대로는 가능)", async () => {
    const k1 = { familyId: famA.id, profileId: famA.kid1 };
    const w = await worlds.createWorld(k1, input("공룡 나라"));
    assert.ok(w.ok);
    assert.equal((await worlds.renameWorld(famA.id, w.id, { name: "티니핑 나라", description: "" })).ok, false);
    assert.ok((await worlds.renameWorld(famA.id, w.id, { name: "공룡 나라", description: "쿵쿵" })).ok);
  });
});

test("세계관: 편 이름이 종류 이름과 같으면 거절", async () => {
  const r = await worlds.createWorld(
    { familyId: famA.id, profileId: famA.kid1 },
    { name: "겹침 나라", description: "", themeColor: "#ff86d0", statLabels: ["힘", "마법", "지혜", "용기", "매력"], kinds: ["영웅", "괴물"], factions: [{ name: "영웅", color: "#ddf4ff" }] },
  );
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.error : "", /종류 이름과 같아요/);
});

test("영웅 별 = 능력치 합으로 (300 = ★5), 예산 300 넘으면 거절", async () => {
  const kid = { familyId: famA.id, profileId: famA.kid1 };
  const d = await heroes.createHeroDraft(kid, guanyu.seriesSlug);
  assert.ok(d.ok);
  const rarity = async () => (await db.character.findUniqueOrThrow({ where: { id: d.heroId }, select: { rarity: true } })).rarity;
  assert.equal(await rarity(), 1, "처음엔 ★1");
  assert.ok((await heroes.saveHeroStats(kid, d.heroId, { stat1: 100, stat2: 100, stat3: 100, stat4: 0, stat5: 0 })).ok);
  assert.equal(await rarity(), 5);
  assert.ok((await heroes.saveHeroStats(kid, d.heroId, { stat1: 30, stat2: 30, stat3: 30, stat4: 0, stat5: 0 })).ok);
  assert.equal(await rarity(), 1, "90점 → ★1");
  assert.ok((await heroes.saveHeroStats(kid, d.heroId, { stat1: 100, stat2: 100, stat3: 30, stat4: 0, stat5: 0 })).ok);
  assert.equal(await rarity(), 4, "230점 → ★4");
  assert.equal((await heroes.saveHeroStats(kid, d.heroId, { stat1: 100, stat2: 100, stat3: 100, stat4: 1, stat5: 0 })).ok, false, "301점은 거절");
});

test("영웅 특별한 힘 저장: 고른 힘이 배틀 카드에, 없음은 숫자 +1, 잘못된 값 거절", async () => {
  const { getBattlePool } = await import("../src/lib/queries/battle");
  const kid = { familyId: famA.id, profileId: famA.kid2 };
  const d = await heroes.createHeroDraft(kid, guanyu.seriesSlug);
  assert.ok(d.ok);
  assert.ok((await heroes.saveHeroName(kid, d.heroId, { name: "불꽃소년" })).ok);
  assert.ok((await heroes.saveHeroStats(kid, d.heroId, { stat1: 100, stat2: 100, stat3: 100, stat4: 0, stat5: 0 })).ok);
  assert.ok((await heroes.saveHeroKind(kid, d.heroId, { kindId: null, factionId: null, ability: "fire" })).ok);
  assert.ok((await heroes.finishHero(kid, d.heroId)).ok);
  let card = (await getBattlePool(famA.id)).find((c) => c.id === d.heroId)!;
  assert.equal(card.ability, "fire");
  assert.equal(card.attack + card.health, card.cost * 2, "힘이 있으면 비용×2+1-1");
  assert.ok((await heroes.saveHeroKind(kid, d.heroId, { kindId: null, factionId: null, ability: "none" })).ok);
  card = (await getBattlePool(famA.id)).find((c) => c.id === d.heroId)!;
  assert.equal(card.ability, null);
  assert.equal(card.attack + card.health, card.cost * 2 + 1, "없음이면 숫자 +1");
  assert.equal((await heroes.saveHeroKind(kid, d.heroId, { kindId: null, factionId: null, ability: "laser" })).ok, false);
});
