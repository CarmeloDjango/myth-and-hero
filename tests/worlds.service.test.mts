/**
 * 세계관 만들기 서비스 테스트 (실제 Postgres + 메모리 그림 저장소)
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
const { setDrawingStore } = await import("../src/lib/storage");
const worlds = await import("../src/lib/worlds/service");
const heroes = await import("../src/lib/heroes/service");
const { getCharacterPage, getSeriesForBrowse, getSeriesList } = await import("../src/lib/queries/characters");

const objects = new Map<string, Uint8Array>();
setDrawingStore({
  async put(key, body) {
    objects.set(key, typeof body === "string" ? new TextEncoder().encode(body) : body);
  },
  async get(key) {
    const b = objects.get(key);
    return b ? { body: b, contentType: "application/octet-stream" } : null;
  },
  async deleteMany(keys) {
    keys.forEach((k) => objects.delete(k));
  },
});

const db = getDb();
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]);
const STROKES = JSON.stringify([
  { tool: "pen", color: "#ff86d0", size: 16, simulatePressure: false, points: [[10, 10, 0.5]] },
  { tool: "stamp", shape: "heart", color: "#ff86d0", x: 500, y: 500, size: 160, rotation: 5 },
  { tool: "fill", color: "#ffe0f3", x: 5, y: 5 },
]);

let famA: { id: string; kid1: string; kid2: string };
let famB: { id: string; kid: string };

async function makeFamily(owner: string, kids: string[]) {
  const f = await db.family.create({
    data: { ownerId: owner, parentPinHash: "test", profiles: { create: kids.map((nickname, order) => ({ nickname, avatar: "pink", order })) } },
    select: { id: true, profiles: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  return { id: f.id, ids: f.profiles.map((p) => p.id) };
}

before(async () => {
  const stamp = Date.now();
  const a = await makeFamily(`world-a-${stamp}`, ["딸", "아들"]);
  const b = await makeFamily(`world-b-${stamp}`, ["옆집"]);
  famA = { id: a.id, kid1: a.ids[0], kid2: a.ids[1] };
  famB = { id: b.id, kid: b.ids[0] };
});

after(async () => {
  await db.family.deleteMany({ where: { id: { in: [famA.id, famB.id] } } });
  await db.$disconnect();
});

const tiniping = {
  name: "티니핑 나라",
  description: "마음을 지켜 주는 요정들",
  themeColor: "#ff86d0",
  statLabels: ["마법", "사랑", "지혜", "용기", "귀여움"],
  kinds: ["티니핑", "로열 티니핑", "악당"],
  factions: [
    { name: "하츄핑 편", color: "#ffe0f3" },
    { name: "악당 편", color: "#f3e1ff" },
  ],
};

describe("세계관 만들기", () => {
  let worldId = "";
  let slug = "";
  const kid1 = () => ({ familyId: famA.id, profileId: famA.kid1 });
  const kid2 = () => ({ familyId: famA.id, profileId: famA.kid2 });
  const other = () => ({ familyId: famB.id, profileId: famB.kid });

  test("입력 검사: 이름 없음, 능력치 이름 겹침, 종류 없음, 다른 가족 프로필은 거절", async () => {
    assert.equal((await worlds.createWorld(kid1(), { ...tiniping, name: " " })).ok, false);
    assert.equal((await worlds.createWorld(kid1(), { ...tiniping, statLabels: ["마법", "마법", "지혜", "용기", "귀여움"] })).ok, false);
    assert.equal((await worlds.createWorld(kid1(), { ...tiniping, kinds: [] })).ok, false);
    assert.equal((await worlds.createWorld(kid1(), { ...tiniping, themeColor: "#123456" })).ok, false);
    assert.equal((await worlds.createWorld({ familyId: famA.id, profileId: famB.kid }, tiniping)).ok, false);
  });

  test("만들면 능력치 이름·종류·편이 함께 생김", async () => {
    const r = await worlds.createWorld(kid1(), tiniping);
    assert.ok(r.ok);
    worldId = r.id;
    slug = r.slug;
    const s = await getSeriesForBrowse(famA.id, slug);
    assert.equal(s?.name, "티니핑 나라");
    assert.deepEqual(Object.values(s!.statLabels), tiniping.statLabels);
    assert.deepEqual(s?.kinds, tiniping.kinds);
    assert.deepEqual(s?.factions.map((f) => f.name).sort(), ["악당 편", "하츄핑 편"]);
  });

  test("우리 가족에게만 보임", async () => {
    assert.ok((await getSeriesList(famA.id)).some((s) => s.slug === slug));
    assert.ok(!(await getSeriesList(famB.id)).some((s) => s.slug === slug));
    assert.equal(await getSeriesForBrowse(famB.id, slug), null);
    assert.equal(await getSeriesForBrowse(null, slug), null);
  });

  test("표지: 만든 아이만 저장, 같은 가족은 볼 수 있음, 다른 가족은 불가", async () => {
    assert.equal((await worlds.saveWorldCover(kid2(), worldId, { png: PNG, strokesJson: STROKES })).ok, false);
    assert.equal((await worlds.saveWorldCover(kid1(), worldId, { png: new Uint8Array([1]), strokesJson: STROKES })).ok, false);
    const first = await worlds.saveWorldCover(kid1(), worldId, { png: PNG, strokesJson: STROKES });
    assert.ok(first.ok);
    assert.equal(objects.size, 2);
    await new Promise((r) => setTimeout(r, 5));
    assert.ok((await worlds.saveWorldCover(kid1(), worldId, { png: PNG, strokesJson: STROKES })).ok);
    assert.equal(objects.size, 2, "이전 표지는 지워짐");
    assert.ok(await worlds.getWorldCoverKey(famA.id, worldId));
    assert.equal(await worlds.getWorldCoverKey(famB.id, worldId), null);
    assert.equal((await worlds.getWorldCoverStrokes(kid1(), worldId))?.length, 3, "스탬프·채우기 기록 포함");
  });

  test("이 세계관에 영웅을 만들면 세계관의 종류·능력치 이름을 씀", async () => {
    const d = await heroes.createHeroDraft(kid2(), slug);
    assert.ok(d.ok);
    const h = await heroes.getHeroForWizard(kid2(), d.heroId);
    assert.equal(h?.series.statLabels.stat1, "마법");
    assert.deepEqual(h?.series.kinds.map((k) => k.name), tiniping.kinds);
    assert.ok((await heroes.saveHeroName(kid2(), d.heroId, { name: "하츄핑" })).ok);
    const royal = h!.series.kinds.find((k) => k.name === "로열 티니핑")!;
    assert.ok((await heroes.saveHeroKind(kid2(), d.heroId, { kindId: royal.id })).ok);
    assert.ok((await heroes.saveHeroDrawing(kid2(), d.heroId, { png: PNG, strokesJson: STROKES })).ok);
    assert.ok((await heroes.finishHero(kid2(), d.heroId)).ok);
    const page = await getCharacterPage(famA.id, { seriesSlug: slug });
    assert.equal(page.total, 1);
    assert.equal(page.items[0].kindName, "로열 티니핑");
    // 다른 가족은 이 세계관에 영웅을 만들 수 없음
    assert.equal((await heroes.createHeroDraft(other(), slug)).ok, false);
  });

  test("부모 모드: 이름 바꾸기 (다른 가족은 불가)", async () => {
    assert.equal((await worlds.renameWorld(famB.id, worldId, { name: "몰래" })).ok, false);
    assert.ok((await worlds.renameWorld(famA.id, worldId, { name: "반짝 티니핑 나라", description: "" })).ok);
    const list = await worlds.listFamilyWorlds(famA.id);
    assert.equal(list[0].name, "반짝 티니핑 나라");
    assert.equal(list[0].description, "반짝 티니핑 나라에 사는 영웅들");
    assert.equal(list[0]._count.characters, 1);
  });

  test("부모 모드: 지우면 안의 영웅과 그림 파일까지 함께 지움", async () => {
    assert.equal((await worlds.deleteWorld(famB.id, worldId)).ok, false);
    assert.ok(objects.size >= 4, "표지 2개 + 영웅 그림 2개");
    const r = await worlds.deleteWorld(famA.id, worldId);
    assert.ok(r.ok && r.heroes === 1);
    assert.equal(objects.size, 0);
    assert.equal(await db.series.findUnique({ where: { id: worldId } }), null);
    assert.equal(await db.character.count({ where: { seriesId: worldId } }), 0);
    assert.equal(await db.characterKind.count({ where: { seriesId: worldId } }), 0);
  });
});
