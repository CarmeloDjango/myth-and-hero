/**
 * 시드 데이터 (예시): 삼국지 세계관, 진영 4개, 인물 3명
 * 실행: npx prisma db seed  (prisma.config.ts의 migrations.seed)
 *
 * 능력치는 예시 값입니다. 여러 번 실행해도 같은 결과가 되도록 upsert를 씁니다.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient, Role } from "../src/generated/prisma/client";
import { buildSearchText, toChoseong } from "../src/lib/search/choseong";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL이 없습니다. `neon env pull`을 먼저 실행해 주세요.");

const pool = new Pool({ connectionString: url, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const STAT_LABELS = {
  leadership: "통솔",
  power: "무력",
  intellect: "지력",
  politics: "정치",
  charm: "매력",
};

const FACTIONS = [
  { name: "촉", color: "#d7ffb8" },
  { name: "위", color: "#ddf4ff" },
  { name: "오", color: "#ffe2cc" },
  { name: "기타", color: "#fff4cc" },
];

const CHARACTERS = [
  {
    slug: "guan-yu",
    name: "관우",
    originalName: "關羽",
    title: "미염공",
    aliases: ["운장", "관운장"],
    faction: "촉",
    role: Role.GENERAL,
    rarity: 5,
    stats: { leadership: 95, power: 97, intellect: 75, politics: 62, charm: 93 },
    summary: "유비, 장비와 형제가 되기로 약속하고 평생 그 약속을 지킨 의리의 장수예요.",
    biography:
      "관우는 아주 먼 옛날 중국에 살았던 장수예요. 키가 크고 수염이 길고 멋져서 사람들은 관우를 '미염공'이라고 불렀어요.",
    funFacts: ["관우의 무기는 청룡언월도예요.", "관우가 탄 말은 적토마예요."],
    era: "후한 말",
  },
  {
    slug: "liu-bei",
    name: "유비",
    originalName: "劉備",
    title: "마음이 따뜻한 임금",
    aliases: ["현덕"],
    faction: "촉",
    role: Role.RULER,
    rarity: 5,
    stats: { leadership: 75, power: 73, intellect: 74, politics: 78, charm: 99 },
    summary: "백성을 아끼는 마음으로 촉나라를 세운 임금이에요.",
    biography: "유비는 돗자리를 짜서 팔던 청년이었지만, 관우·장비와 함께 큰 뜻을 품고 나라를 세웠어요.",
    funFacts: ["유비는 귀가 아주 컸다고 전해져요."],
    era: "후한 말",
  },
  {
    slug: "cao-cao",
    name: "조조",
    originalName: "曹操",
    title: "난세의 영웅",
    aliases: ["맹덕"],
    faction: "위",
    role: Role.RULER,
    rarity: 5,
    stats: { leadership: 96, power: 72, intellect: 91, politics: 94, charm: 96 },
    summary: "꾀가 많고 용감해서 위나라의 기틀을 세운 사람이에요.",
    biography: "조조는 뛰어난 장수이자 시인이었어요. 재능 있는 사람을 아껴서 많은 인재를 모았어요.",
    funFacts: ["조조는 시를 아주 잘 지었어요."],
    era: "후한 말",
  },
];

async function main() {
  const series = await db.series.upsert({
    where: { slug: "three-kingdoms" },
    update: {},
    create: {
      slug: "three-kingdoms",
      name: "삼국지",
      description: "위·촉·오 세 나라 장수들의 대결",
      statLabels: STAT_LABELS,
      order: 1,
    },
  });

  const factionIds = new Map<string, string>();
  for (const f of FACTIONS) {
    const faction = await db.faction.upsert({
      where: { seriesId_name: { seriesId: series.id, name: f.name } },
      update: { color: f.color },
      create: { seriesId: series.id, name: f.name, color: f.color },
    });
    factionIds.set(f.name, faction.id);
  }

  for (const c of CHARACTERS) {
    const data = {
      seriesId: series.id,
      factionId: factionIds.get(c.faction) ?? null,
      name: c.name,
      originalName: c.originalName,
      title: c.title,
      aliases: c.aliases,
      searchText: buildSearchText(c),
      choseong: toChoseong(c.name),
      role: c.role,
      rarity: c.rarity,
      ...c.stats,
      summary: c.summary,
      biography: c.biography,
      funFacts: c.funFacts,
      era: c.era,
      published: true,
    };
    await db.character.upsert({
      where: { slug: c.slug },
      update: data,
      create: { slug: c.slug, ...data },
    });
  }

  const [s, f, ch] = await Promise.all([db.series.count(), db.faction.count(), db.character.count()]);
  console.log(`seed 완료: series=${s}, factions=${f}, characters=${ch}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
