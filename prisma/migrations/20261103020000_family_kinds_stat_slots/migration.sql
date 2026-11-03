-- H0: 가족·아이 프로필, 세계관별 종류(CharacterKind), 능력치 칸 이름 중립화(stat1~stat5)
--
-- Prisma가 자동 생성한 SQL은 능력치 컬럼을 DROP 후 ADD 해서 값이 사라집니다.
-- 이 파일은 기존 데이터를 보존하도록 직접 작성했습니다.
--   leadership → stat1, power → stat2, intellect → stat3, politics → stat4, charm → stat5
--   role(enum) → CharacterKind(세계관별 테이블) + Character.kindId

-- CreateEnum
CREATE TYPE "CreationStatus" AS ENUM ('DRAFT', 'DONE');

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "parentPinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterKind" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterKind_pkey" PRIMARY KEY ("id")
);

-- AlterTable: 세계관 소유자와 파츠 팩
ALTER TABLE "Series" ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "partsPack" TEXT NOT NULL DEFAULT 'general';

-- 능력치 컬럼 이름 바꾸기 (값 보존)
ALTER TABLE "Character" RENAME COLUMN "leadership" TO "stat1";
ALTER TABLE "Character" RENAME COLUMN "power" TO "stat2";
ALTER TABLE "Character" RENAME COLUMN "intellect" TO "stat3";
ALTER TABLE "Character" RENAME COLUMN "politics" TO "stat4";
ALTER TABLE "Character" RENAME COLUMN "charm" TO "stat5";

-- 능력치 정렬 인덱스 이름도 Prisma 기본 이름에 맞춰 바꾸기
ALTER INDEX "Character_seriesId_leadership_id_idx" RENAME TO "Character_seriesId_stat1_id_idx";
ALTER INDEX "Character_seriesId_power_id_idx" RENAME TO "Character_seriesId_stat2_id_idx";
ALTER INDEX "Character_seriesId_intellect_id_idx" RENAME TO "Character_seriesId_stat3_id_idx";
ALTER INDEX "Character_seriesId_politics_id_idx" RENAME TO "Character_seriesId_stat4_id_idx";
ALTER INDEX "Character_seriesId_charm_id_idx" RENAME TO "Character_seriesId_stat5_id_idx";

-- 세계관 능력치 라벨 키 바꾸기: {"leadership": "통솔", ...} → {"stat1": "통솔", ...}
UPDATE "Series"
SET "statLabels" = jsonb_build_object(
    'stat1', "statLabels"->>'leadership',
    'stat2', "statLabels"->>'power',
    'stat3', "statLabels"->>'intellect',
    'stat4', "statLabels"->>'politics',
    'stat5', "statLabels"->>'charm'
)
WHERE "statLabels" ? 'leadership';

-- AlterTable: 종류·가족·만들기 상태 컬럼
ALTER TABLE "Character" ADD COLUMN     "avatarParts" JSONB,
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kindId" TEXT,
ADD COLUMN     "status" "CreationStatus" NOT NULL DEFAULT 'DONE',
ADD COLUMN     "strokesUrl" TEXT,
ADD COLUMN     "wizardStep" INTEGER NOT NULL DEFAULT 0;

-- 기존 role 값으로 세계관별 종류 만들기
INSERT INTO "CharacterKind" ("id", "seriesId", "name", "order")
SELECT
    gen_random_uuid()::text,
    r."seriesId",
    CASE r."role"
        WHEN 'GOD' THEN '신'
        WHEN 'HERO' THEN '영웅'
        WHEN 'MONSTER' THEN '괴물'
        WHEN 'RULER' THEN '군주'
        WHEN 'GENERAL' THEN '장수'
        WHEN 'STRATEGIST' THEN '책사'
        WHEN 'OUTLAW' THEN '호걸'
        ELSE '기타'
    END,
    CASE r."role"
        WHEN 'GOD' THEN 0
        WHEN 'HERO' THEN 1
        WHEN 'MONSTER' THEN 2
        WHEN 'RULER' THEN 0
        WHEN 'GENERAL' THEN 1
        WHEN 'STRATEGIST' THEN 2
        WHEN 'OUTLAW' THEN 3
        ELSE 9
    END
FROM (SELECT DISTINCT "seriesId", "role"::text AS "role" FROM "Character") AS r;

-- 인물에 종류 연결
UPDATE "Character" AS c
SET "kindId" = k."id"
FROM "CharacterKind" AS k
WHERE k."seriesId" = c."seriesId"
  AND k."name" = CASE c."role"::text
        WHEN 'GOD' THEN '신'
        WHEN 'HERO' THEN '영웅'
        WHEN 'MONSTER' THEN '괴물'
        WHEN 'RULER' THEN '군주'
        WHEN 'GENERAL' THEN '장수'
        WHEN 'STRATEGIST' THEN '책사'
        WHEN 'OUTLAW' THEN '호걸'
        ELSE '기타'
    END;

-- role 컬럼과 enum 정리
DROP INDEX "Character_seriesId_factionId_role_idx";
ALTER TABLE "Character" DROP COLUMN "role";
DROP TYPE "Role";

-- CreateIndex
CREATE UNIQUE INDEX "Family_ownerId_key" ON "Family"("ownerId");

-- CreateIndex
CREATE INDEX "ChildProfile_familyId_order_idx" ON "ChildProfile"("familyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterKind_seriesId_name_key" ON "CharacterKind"("seriesId", "name");

-- CreateIndex
CREATE INDEX "Series_familyId_order_idx" ON "Series"("familyId", "order");

-- CreateIndex
CREATE INDEX "Character_seriesId_factionId_kindId_idx" ON "Character"("seriesId", "factionId", "kindId");

-- CreateIndex
CREATE INDEX "Character_familyId_creatorId_status_updatedAt_idx" ON "Character"("familyId", "creatorId", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterKind" ADD CONSTRAINT "CharacterKind_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_kindId_fkey" FOREIGN KEY ("kindId") REFERENCES "CharacterKind"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
