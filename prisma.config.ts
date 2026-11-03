import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// `neon env pull` / `neon deploy`가 쓰는 파일을 읽습니다. (.env가 있으면 .env, 없으면 .env.local)
config({ path: [".env.local", ".env"], quiet: true });

// 마이그레이션은 PgBouncer를 거치지 않는 직접 연결(DATABASE_URL_UNPOOLED)을 씁니다.
// 앱 런타임은 src/lib/db.ts에서 풀링 연결(DATABASE_URL)을 씁니다.
const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});
