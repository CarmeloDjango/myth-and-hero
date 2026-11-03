import "server-only";

import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Neon Postgres 연결
 *
 * 기본(DATABASE_DRIVER 없음 또는 "pg"):
 * - 앱 트래픽은 풀링 연결 문자열(DATABASE_URL, 호스트에 `-pooler`)을 씁니다.
 * - 드라이버는 node-postgres(pg)입니다. Vercel Fluid compute에서 함수 인스턴스가 풀을 재사용하므로
 *   Neon 권장 방식대로 pg Pool + attachDatabasePool 조합을 씁니다.
 *   (attachDatabasePool은 Vercel 밖에서는 아무 일도 하지 않습니다.)
 *
 * DATABASE_DRIVER="neon-http":
 * - Postgres 포트(5432)로 직접 연결할 수 없고 HTTPS만 되는 환경(일부 샌드박스, 미리보기 환경)용입니다.
 * - Neon serverless 드라이버의 HTTP 모드를 씁니다. **트랜잭션을 지원하지 않으므로**
 *   upsert, $transaction, 중첩 쓰기 등은 실패합니다. 읽기 위주 확인용으로만 쓰세요.
 *
 * 개발 서버의 HMR로 클라이언트가 여러 번 생성되지 않도록 globalThis에 보관합니다.
 */

type Driver = "pg" | "neon-http";

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  prisma?: PrismaClient;
};

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL이 없습니다. `neon env pull` 또는 `neon deploy`로 .env.local을 만들어 주세요.",
    );
  }
  return connectionString;
}

export function getDriver(): Driver {
  return process.env.DATABASE_DRIVER === "neon-http" ? "neon-http" : "pg";
}

export function getPool(): Pool {
  if (!globalForDb.pgPool) {
    const pool = new Pool({ connectionString: getConnectionString(), max: 10, idleTimeoutMillis: 10_000 });
    attachDatabasePool(pool);
    globalForDb.pgPool = pool;
  }
  return globalForDb.pgPool;
}

function createClient(): PrismaClient {
  if (getDriver() === "neon-http") {
    return new PrismaClient({ adapter: new PrismaNeonHttp(getConnectionString(), {}) });
  }
  return new PrismaClient({ adapter: new PrismaPg(getPool()) });
}

export function getDb(): PrismaClient {
  globalForDb.prisma ??= createClient();
  return globalForDb.prisma;
}
