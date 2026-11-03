-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GOD', 'HERO', 'MONSTER', 'GENERAL', 'STRATEGIST', 'RULER', 'OUTLAW', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'SWORN_BROTHER', 'LORD', 'SUBORDINATE', 'RIVAL', 'MENTOR');

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "themeColor" TEXT,
    "statLabels" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "emblem" TEXT,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "factionId" TEXT,
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "title" TEXT,
    "aliases" TEXT[],
    "searchText" TEXT NOT NULL,
    "choseong" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "leadership" INTEGER NOT NULL DEFAULT 0,
    "power" INTEGER NOT NULL DEFAULT 0,
    "intellect" INTEGER NOT NULL DEFAULT 0,
    "politics" INTEGER NOT NULL DEFAULT 0,
    "charm" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    "funFacts" TEXT[],
    "imageUrl" TEXT,
    "thumbUrl" TEXT,
    "era" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterTag" (
    "characterId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CharacterTag_pkey" PRIMARY KEY ("characterId","tagId")
);

-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "RelationType" NOT NULL,
    "note" TEXT,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_seriesId_name_key" ON "Faction"("seriesId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Character_slug_key" ON "Character"("slug");

-- CreateIndex
CREATE INDEX "Character_seriesId_factionId_role_idx" ON "Character"("seriesId", "factionId", "role");

-- CreateIndex
CREATE INDEX "Character_seriesId_name_id_idx" ON "Character"("seriesId", "name", "id");

-- CreateIndex
CREATE INDEX "Character_seriesId_leadership_id_idx" ON "Character"("seriesId", "leadership" DESC, "id");

-- CreateIndex
CREATE INDEX "Character_seriesId_power_id_idx" ON "Character"("seriesId", "power" DESC, "id");

-- CreateIndex
CREATE INDEX "Character_seriesId_intellect_id_idx" ON "Character"("seriesId", "intellect" DESC, "id");

-- CreateIndex
CREATE INDEX "Character_seriesId_politics_id_idx" ON "Character"("seriesId", "politics" DESC, "id");

-- CreateIndex
CREATE INDEX "Character_seriesId_charm_id_idx" ON "Character"("seriesId", "charm" DESC, "id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Relation_fromId_toId_type_key" ON "Relation"("fromId", "toId", "type");

-- AddForeignKey
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTag" ADD CONSTRAINT "CharacterTag_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTag" ADD CONSTRAINT "CharacterTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
