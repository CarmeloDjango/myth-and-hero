import { connection } from "next/server";

import { getDb } from "@/lib/db";

/**
 * Neon Postgres 연결 확인용 엔드포인트.
 * GET /api/health/db → DB 이름, 서버 시각, 테이블별 행 수, 샘플 인물 1명
 */
export async function GET() {
  await connection();

  try {
    const db = getDb();
    const [info] = await db.$queryRaw<
      { database: string; server_time: Date; version: string }[]
    >`SELECT current_database() AS database, now() AS server_time, version() AS version`;

    const [series, characters, sample] = await Promise.all([
      db.series.count(),
      db.character.count(),
      db.character.findFirst({
        where: { published: true },
        orderBy: { name: "asc" },
        select: {
          name: true,
          title: true,
          choseong: true,
          power: true,
          series: { select: { name: true } },
          faction: { select: { name: true } },
        },
      }),
    ]);

    return Response.json({
      ok: true,
      database: info.database,
      serverTime: info.server_time,
      postgres: info.version.split(" ").slice(0, 2).join(" "),
      counts: { series, characters },
      sample,
    });
  } catch (error) {
    console.error("[health/db]", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
