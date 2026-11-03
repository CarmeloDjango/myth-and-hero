/**
 * 시드 실행: npm run db:seed  (= prisma db seed → tsx prisma/seed.ts)
 * 직접 연결(DATABASE_URL_UNPOOLED)로 접속합니다.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seed } from "./seed-data";

async function main() {
  config({ path: [".env.local", ".env"], quiet: true });
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 없습니다. `neon env pull`을 먼저 실행해 주세요.");

  const pool = new Pool({ connectionString: url, max: 2 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const counts = await seed(db);
    console.log(`seed 완료: series=${counts.series}, factions=${counts.factions}, characters=${counts.characters}`);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
