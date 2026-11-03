/**
 * 영웅 만들기 서비스 테스트 (실제 Postgres + 메모리 그림 저장소)
 *
 * 실행: TEST_DATABASE_URL=postgresql://… npm run test:db
 * - TEST_DATABASE_URL은 마이그레이션과 시드를 적용한 **테스트 전용** DB여야 합니다 (운영 DB 금지).
 * - 테스트가 만든 가족·영웅은 끝날 때 지웁니다.
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
const heroes = await import("../src/lib/heroes/service");
const { getCharacterPage, getCharacterDetail } = await import("../src/lib/queries/characters");
const { HERO_STAT_BUDGET } = await import("../src/lib/heroes/rules");

/** 메모리 저장소 */
const objects = new Map<string, { body: Uint8Array; contentType: string }>();
setDrawingStore({
  async put(key, body, contentType) {
    objects.set(key, { body: typeof body === "string" ? new TextEncoder().encode(body) : body, contentType });
  },
  async get(key) {
    return objects.get(key) ?? null;
  },
  async deleteMany(keys) {
    keys.forEach((k) => objects.delete(k));
  },
});

const db = getDb();
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const STROKES = JSON.stringify([
  { tool: "pen", color: "#ff9600", size: 12, simulatePressure: false, points: [[10, 10, 0.5], [20, 30, 0.7]] },
]);

let famA: { id: string; kid1: string; kid2: string };
let famB: { id: string; kid: string };

async function makeFamily(owner: string, kids: string[]) {
  const f = await db.family.create({
    data: {
      ownerId: owner,
      parentPinHash: "test",
      profiles: { create: kids.map((nickname, order) => ({ nickname, avatar: "green", order })) },
    },
    select: { id: true, profiles: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  return { id: f.id, ids: f.profiles.map((p) => p.id) };
}

before(async () => {
  const stamp = Date.now();
  const a = await makeFamily(`test-a-${stamp}`, ["첫째", "둘째"]);
  const b = await makeFamily(`test-b-${stamp}`, ["옆집"]);
  famA = { id: a.id, kid1: a.ids[0], kid2: a.ids[1] };
  famB = { id: b.id, kid: b.ids[0] };
});

after(async () => {
  await db.family.deleteMany({ where: { id: { in: [famA.id, famB.id] } } });
  await db.$disconnect();
});

describe("영웅 만들기", () => {
  let heroId = "";
  const kid1 = () => ({ familyId: famA.id, profileId: famA.kid1 });
  const kid2 = () => ({ familyId: famA.id, profileId: famA.kid2 });
  const other = () => ({ familyId: famB.id, profileId: famB.kid });

  test("세계관을 고르면 초안이 생기고, 없는 세계관은 거절", async () => {
    const bad = await heroes.createHeroDraft(kid1(), "no-such-world");
    assert.equal(bad.ok, false);
    const r = await heroes.createHeroDraft(kid1(), "three-kingdoms");
    assert.ok(r.ok);
    heroId = r.heroId;
    const h = await heroes.getHeroForWizard(kid1(), heroId);
    assert.equal(h?.status, "DRAFT");
    assert.equal(h?.series.statLabels.stat2, "무력");
  });

  test("다른 아이·다른 가족은 내 영웅을 고칠 수 없음", async () => {
    assert.equal((await heroes.saveHeroName(kid2(), heroId, { name: "몰래" })).ok, false);
    assert.equal((await heroes.saveHeroName(other(), heroId, { name: "몰래" })).ok, false);
    assert.equal(await heroes.getHeroForWizard(other(), heroId), null);
  });

  test("이름: 12글자 넘으면 거절, 정상 저장 시 다음 단계로", async () => {
    assert.equal((await heroes.saveHeroName(kid1(), heroId, { name: "가".repeat(13) })).ok, false);
    assert.ok((await heroes.saveHeroName(kid1(), heroId, { name: "번개", title: "하늘을 나는" })).ok);
    const h = await heroes.getHeroForWizard(kid1(), heroId);
    assert.equal(h?.name, "번개");
    assert.equal(h?.wizardStep, 2);
  });

  test("그림: PNG가 아니면 거절, 저장하면 새 버전 키로 올리고 이전 버전은 지움", async () => {
    const bad = await heroes.saveHeroDrawing(kid1(), heroId, { png: new Uint8Array([1, 2, 3]), strokesJson: STROKES });
    assert.equal(bad.ok, false);
    const badStrokes = await heroes.saveHeroDrawing(kid1(), heroId, { png: PNG, strokesJson: '[{"tool":"x"}]' });
    assert.equal(badStrokes.ok, false);

    const first = await heroes.saveHeroDrawing(kid1(), heroId, { png: PNG, strokesJson: STROKES });
    assert.ok(first.ok);
    const keysAfterFirst = [...objects.keys()];
    assert.equal(keysAfterFirst.length, 2);
    await new Promise((r) => setTimeout(r, 5));
    const second = await heroes.saveHeroDrawing(kid1(), heroId, { png: PNG, strokesJson: STROKES });
    assert.ok(second.ok);
    assert.equal(objects.size, 2, "이전 버전이 정리돼야 함");
    assert.ok(keysAfterFirst.every((k) => !objects.has(k)));

    const strokes = await heroes.getHeroStrokes(kid1(), heroId);
    assert.equal(strokes?.[0].color, "#ff9600");
    assert.equal(await heroes.getHeroStrokes(kid2(), heroId), null, "형제도 획 데이터는 못 읽음");
  });

  test("종류와 편: 다른 세계관 것은 거절", async () => {
    const greekKind = await db.characterKind.findFirst({ where: { series: { slug: "greek-myth" } }, select: { id: true } });
    assert.equal((await heroes.saveHeroKind(kid1(), heroId, { kindId: greekKind!.id })).ok, false);
    const h = await heroes.getHeroForWizard(kid1(), heroId);
    const general = h!.series.kinds.find((k) => k.name === "장수")!;
    const shu = h!.series.factions.find((f) => f.name === "촉")!;
    assert.ok((await heroes.saveHeroKind(kid1(), heroId, { kindId: general.id, factionId: shu.id })).ok);
  });

  test(`능력치: 합계 ${HERO_STAT_BUDGET}점 초과·칸당 100점 초과는 거절`, async () => {
    const over = { stat1: 100, stat2: 100, stat3: 100, stat4: HERO_STAT_BUDGET - 300 + 1, stat5: 0 };
    assert.equal((await heroes.saveHeroStats(kid1(), heroId, over)).ok, false);
    assert.equal((await heroes.saveHeroStats(kid1(), heroId, { stat1: 101, stat2: 0, stat3: 0, stat4: 0, stat5: 0 })).ok, false);
    assert.ok((await heroes.saveHeroStats(kid1(), heroId, { stat1: 50, stat2: 100, stat3: 60, stat4: 10, stat5: 30 })).ok);
  });

  test("이야기: 받침에 맞는 조사로 문장을 만듦", async () => {
    assert.ok(
      (await heroes.saveHeroStory(kid1(), heroId, { birth: "구름 마을", skill: "달리기", like: "딸기", dream: "모두를 지키는 것", free: "" }))
        .ok,
    );
    const c = await db.character.findUnique({ where: { id: heroId }, select: { biography: true, summary: true } });
    assert.equal(c?.biography, "번개는 구름 마을에서 태어났어요. 특기는 달리기예요. 딸기를 제일 좋아해요. 꿈은 모두를 지키는 것이에요.");
    assert.equal(c?.summary, "특기는 달리기예요!");
    const h = await heroes.getHeroForWizard(kid1(), heroId);
    assert.equal(h?.story?.birth, "구름 마을", "다시 고칠 때 답을 채워 넣을 수 있어야 함");
  });

  test("완성 전에는 도감에 안 보이고, 완성하면 우리 가족에게만 보임", async () => {
    const before = await getCharacterPage(famA.id, { seriesSlug: "three-kingdoms", q: "번개" });
    assert.equal(before.total, 0);

    const done = await heroes.finishHero(kid1(), heroId);
    assert.ok(done.ok);

    const mine = await getCharacterPage(famA.id, { seriesSlug: "three-kingdoms", q: "번개" });
    assert.equal(mine.total, 1);
    assert.equal(mine.items[0].isFamily, true);
    const choseong = await getCharacterPage(famA.id, { seriesSlug: "three-kingdoms", q: "ㅂㄱ" });
    assert.equal(choseong.total, 1, "초성 검색도 됨");
    const theirs = await getCharacterPage(famB.id, { seriesSlug: "three-kingdoms", q: "번개" });
    assert.equal(theirs.total, 0, "다른 가족에게는 안 보임");

    const detail = await getCharacterDetail(famA.id, "three-kingdoms", done.ok ? done.slug : "");
    assert.equal(detail?.stats.stat2, 100);
    assert.equal(await getCharacterDetail(famB.id, "three-kingdoms", done.ok ? done.slug : ""), null);

    // 공식 인물 수는 그대로 (20명 + 우리 영웅 1명)
    const all = await getCharacterPage(famA.id, { seriesSlug: "three-kingdoms" });
    assert.equal(all.total, 21);
    assert.equal((await getCharacterPage(famB.id, { seriesSlug: "three-kingdoms" })).total, 20);
  });

  test("그림 읽기 권한: 형제는 완성작 OK, 다른 가족은 불가", async () => {
    assert.ok(await heroes.getHeroImageKey(famA.id, famA.kid2, heroId));
    assert.equal(await heroes.getHeroImageKey(famB.id, famB.kid, heroId), null);
    // 그린 과정 다시 보기: 완성작은 형제도, 다른 가족은 불가
    assert.equal((await heroes.getHeroStrokes(kid2(), heroId))?.length, 1);
    assert.equal(await heroes.getHeroStrokes(other(), heroId), null);
  });

  test("완성한 영웅은 아이가 못 지우고, 부모 모드에서 숨기기·지우기", async () => {
    assert.equal((await heroes.deleteOwnDraft(kid1(), heroId)).ok, false);

    assert.equal((await heroes.setFamilyHeroHidden(famB.id, heroId, true)).ok, false, "다른 가족 부모는 못 숨김");
    assert.ok((await heroes.setFamilyHeroHidden(famA.id, heroId, true)).ok);
    assert.equal((await getCharacterPage(famA.id, { seriesSlug: "three-kingdoms", q: "번개" })).total, 0, "숨기면 도감에서 사라짐");

    assert.ok((await heroes.deleteFamilyHero(famA.id, heroId)).ok);
    assert.equal(await db.character.findUnique({ where: { id: heroId } }), null);
    assert.equal(objects.size, 0, "그림 파일도 지워짐");
  });

  test("만드는 중인 초안은 아이가 지울 수 있음", async () => {
    const r = await heroes.createHeroDraft(kid2(), "greek-myth");
    assert.ok(r.ok);
    assert.equal((await heroes.listMyHeroes(kid2())).length, 1);
    assert.equal((await heroes.deleteOwnDraft(kid1(), r.heroId)).ok, false, "형제 초안은 못 지움");
    assert.ok((await heroes.deleteOwnDraft(kid2(), r.heroId)).ok);
    assert.equal((await heroes.listMyHeroes(kid2())).length, 0);
  });
});
