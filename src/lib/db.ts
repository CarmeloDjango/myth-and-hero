import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Neon Postgres 연결
 *
 * - 앱 트래픽은 풀링 연결 문자열(DATABASE_URL, 호스트에 `-pooler`)을 씁니다.
 * - 드라이버는 node-postgres(pg)입니다. Vercel Fluid compute에서 함수 인스턴스가 풀을 재사용하므로
 *   Neon 권장 방식대로 pg Pool + attachDatabasePool 조합을 씁니다.
 *   (attachDatabasePool은 Vercel 밖에서는 아무 일도 하지 않습니다.)
 * - 개발 서버의 HMR로 클라이언트가 여러 번 생성되지 않도록 globalThis에 보관합니다.
 */

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  prisma?: PrismaClient;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL이 없습니다. `neon env pull` 또는 `neon deploy`로 .env.local을 만들어 주세요.",
    );
  }
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 10_000 });
  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  globalForDb.pgPool ??= createPool();
  return globalForDb.pgPool;
}

export function getDb(): PrismaClient {
  globalForDb.prisma ??= new PrismaClient({ adapter: new PrismaPg(getPool()) });
  return globalForDb.prisma;
}
