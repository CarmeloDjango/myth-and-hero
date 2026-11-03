/**
 * 그림 첨부 테스트: 공식 인물에 가족별 그림, 밑그림 사진 위에 덧그리기 (실제 Postgres + 메모리 저장소)
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
const pictures = await import("../src/lib/pictures/service");
const heroes = await import("../src/lib/heroes/service");
const { getCharacterDetail, getCharacterPage } = await import("../src/lib/queries/characters");

const objects = new Map<string, { body: Uint8Array; type: string }>();
setDrawingStore({
  async put(key, body, type) {
    objects.set(key, { body: typeof body === "string" ? new TextEncoder().encode(body) : body, type });
  },
  async get(key) {
    const o = objects.get(key);
    return o ? { body: o.body, contentType: o.type } : null;
  },
  async deleteMany(keys) {
    keys.forEach((k) => objects.delete(k));
  },
});

const db = getDb();
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const STROKES = JSON.stringify([{ tool: "fill", color: "#ffe0f3", x: 5, y: 5 }]);
const keysOf = (prefix: string) => [...objects.keys()].filter((k) => k.startsWith(prefix));

let famA: { id: string; kid1: string; kid2: string };
let famB: { id: string; kid: string };
let official: { id: string; slug: string; seriesSlug: string };

async function makeFamily(owner: string, kids: string[]) {
  const f = await db.family.create({
    data: { ownerId: owner, parentPinHash: "test", profiles: { create: kids.map((nickname, order) => ({ nickname, avatar: "pink", order })) } },
    select: { id: true, profiles: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  return { id: f.id, ids: f.profiles.map((p) => p.id) };
}

before(async () => {
  const stamp = Date.now();
  const a = await makeFamily(`pic-a-${stamp}`, ["딸", "아들"]);
  const b = await makeFamily(`pic-b-${stamp}`, ["옆집"]);
  famA = { id: a.id, kid1: a.ids[0], kid2: a.ids[1] };
  famB = { id: b.id, kid: b.ids[0] };
  const c = await db.character.findFirstOrThrow({
    where: { familyId: null, published: true, hidden: false, status: "DONE" },
    select: { id: true, slug: true, series: { select: { slug: true } } },
  });
  official = { id: c.id, slug: c.slug, seriesSlug: c.series.slug };
});

after(async () => {
  await db.family.deleteMany({ where: { id: { in: [famA.id, famB.id] } } });
  await db.$disconnect();
});

describe("공식 인물에 가족 그림 붙이기", () => {
  const base = () => `families/${famA.id}/characters/${official.id}`;

  test("아이가 사진 + 덧그림을 붙이면 우리 가족 카드·상세에만 보임", async () => {
    const r = await pictures.saveCharacterPicture({ familyId: famA.id, profileId: famA.kid1 }, official.id, { png: JPEG, strokesJson: STROKES, background: JPEG });
    assert.ok(r.ok, JSON.stringify(r));
    const files = keysOf(base());
    assert.equal(files.length, 3, "그림·기록·사진");
    assert.ok(files.some((k) => /\/drawing\.jpg$/.test(k)) && files.some((k) => /\/bg\/[^/]+\.jpg$/.test(k)));
    assert.equal(objects.get(files.find((k) => k.endsWith("drawing.jpg"))!)!.type, "image/jpeg");

    const mine = await getCharacterDetail(famA.id, official.seriesSlug, official.slug);
    assert.match(mine!.imageSrc ?? "", new RegExp(`^/api/characters/${official.id}/picture\\?v=`));
    assert.equal(mine!.replaySource, `/api/characters/${official.id}/picture`);
    assert.equal(mine!.isFamily, false, "공식 인물 그대로");

    const theirs = await getCharacterDetail(famB.id, official.seriesSlug, official.slug);
    assert.equal(theirs!.imageSrc, null, "다른 가족에게는 안 보임");
    assert.equal(await pictures.getCharacterPictureKey(famB.id, official.id), null);

    const page = await getCharacterPage(famA.id, { seriesSlug: official.seriesSlug, q: "", faction: "", kind: "", sort: "name", cursor: null });
    assert.ok(page.items.find((i) => i.slug === official.slug)?.imageSrc?.startsWith(`/api/characters/${official.id}/picture`));
  });

  test("작은 그림(thumb)도 같은 버전 폴더에 저장하고, 바꾸면 이전 것도 지움", async () => {
    const ctx = { familyId: famA.id, profileId: famA.kid1 };
    const r = await pictures.saveCharacterPicture(ctx, official.id, { png: JPEG, strokesJson: STROKES, thumb: JPEG });
    assert.ok(r.ok);
    const thumbs = keysOf(base()).filter((k) => k.endsWith("/thumb.jpg"));
    assert.equal(thumbs.length, 1);
    assert.equal((await pictures.saveCharacterPicture(ctx, official.id, { png: JPEG, strokesJson: STROKES, thumb: PNG })).ok, false, "그림과 형식이 다르면 거절");
    const again = await pictures.saveCharacterPicture(ctx, official.id, { png: JPEG, strokesJson: STROKES });
    assert.ok(again.ok);
    assert.equal(keysOf(base()).filter((k) => k.includes("/thumb.")).length, 0, "이전 작은 그림 정리");
  });

  test("형제가 바꾸면 이전 파일은 지우고, 사진은 그대로 유지", async () => {
    const before = keysOf(base());
    const bg = before.find((k) => k.includes("/bg/"))!;
    const r = await pictures.saveCharacterPicture({ familyId: famA.id, profileId: famA.kid2 }, official.id, { png: JPEG, strokesJson: STROKES });
    assert.ok(r.ok);
    const now = keysOf(base());
    assert.equal(now.length, 3);
    assert.ok(now.includes(bg), "밑그림은 그대로");
    const src = await pictures.getCharacterPictureSource(famA.id, official.id);
    assert.equal(src?.backgroundKey, bg);
    assert.equal(src?.strokes.length, 1);
    const row = await db.familyCharacterPicture.findFirstOrThrow({ where: { familyId: famA.id, characterId: official.id } });
    assert.equal(row.updatedById, famA.kid2);
  });

  test("사진 빼기 → PNG 그림만 남음", async () => {
    const r = await pictures.saveCharacterPicture({ familyId: famA.id, profileId: famA.kid1 }, official.id, { png: PNG, strokesJson: STROKES, background: null });
    assert.ok(r.ok);
    const now = keysOf(base());
    assert.equal(now.length, 2);
    assert.ok(!now.some((k) => k.includes("/bg/")));
    assert.equal((await pictures.getCharacterPictureSource(famA.id, official.id))?.backgroundKey, null);
  });

  test("입력 검사: 그림이 아니거나 사진이 JPEG가 아니면 거절", async () => {
    const ctx = { familyId: famA.id, profileId: famA.kid1 };
    assert.equal((await pictures.saveCharacterPicture(ctx, official.id, { png: new Uint8Array([1, 2, 3]), strokesJson: STROKES })).ok, false);
    assert.equal((await pictures.saveCharacterPicture(ctx, official.id, { png: PNG, strokesJson: STROKES, background: PNG })).ok, false);
  });

  test("아이가 만든 영웅에는 공식 인물 그림을 붙일 수 없음 (영웅 그림은 따로)", async () => {
    const d = await heroes.createHeroDraft({ familyId: famA.id, profileId: famA.kid1 }, official.seriesSlug);
    assert.ok(d.ok);
    const r = await pictures.saveCharacterPicture({ familyId: famA.id, profileId: famA.kid1 }, d.heroId, { png: PNG, strokesJson: STROKES });
    assert.equal(r.ok, false);
  });

  test("그림 없는 인물 목록에서 빠지고, 빼면 다시 들어감", async () => {
    const without = await pictures.listOfficialWithoutPicture(famA.id);
    assert.ok(!without.some((c) => c.id === official.id));
    assert.ok((await pictures.listOfficialWithoutPicture(famB.id)).some((c) => c.id === official.id), "다른 가족에겐 여전히 그림 없음");

    assert.ok((await pictures.deleteCharacterPicture(famA.id, official.id)).ok);
    assert.equal(keysOf(base()).length, 0, "파일도 지움");
    assert.ok((await pictures.listOfficialWithoutPicture(famA.id)).some((c) => c.id === official.id));
    assert.equal((await pictures.deleteCharacterPicture(famB.id, official.id)).ok, false);
  });
});

describe("영웅 그림에 밑그림 사진", () => {
  test("사진 + 덧그림 저장, 완성 후에도 만든 아이는 고침, 지우면 사진까지 지움", async () => {
    const kid = { familyId: famA.id, profileId: famA.kid2 };
    const d = await heroes.createHeroDraft(kid, official.seriesSlug);
    assert.ok(d.ok);
    const r = await heroes.saveHeroDrawing(kid, d.heroId, { png: JPEG, strokesJson: "[]", background: JPEG });
    assert.ok(r.ok, JSON.stringify(r));
    const src = await heroes.getHeroDrawingSource(kid, d.heroId);
    assert.ok(src?.backgroundKey?.includes("/bg/"));
    assert.equal(await heroes.getHeroDrawingSource({ familyId: famA.id, profileId: famA.kid1 }, d.heroId), null, "초안 사진은 형제가 못 봄");

    await db.character.update({ where: { id: d.heroId }, data: { status: "DONE" } });
    const again = await heroes.saveHeroDrawing(kid, d.heroId, { png: PNG, strokesJson: STROKES });
    assert.ok(again.ok, "완성 후에도 그림 고치기");
    assert.ok((await heroes.saveHeroDrawing({ familyId: famA.id, profileId: famA.kid1 }, d.heroId, { png: PNG, strokesJson: STROKES })).ok === false, "형제는 못 고침");

    const prefix = `families/${famA.id}/heroes/${d.heroId}`;
    assert.equal(keysOf(prefix).length, 3);
    assert.ok((await heroes.deleteFamilyHero(famA.id, d.heroId)).ok);
    assert.equal(keysOf(prefix).length, 0);
  });
});
