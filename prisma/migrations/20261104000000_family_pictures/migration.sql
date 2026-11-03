-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "backgroundUrl" TEXT;

-- CreateTable
CREATE TABLE "FamilyCharacterPicture" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "updatedById" TEXT,
    "imageUrl" TEXT NOT NULL,
    "strokesUrl" TEXT,
    "backgroundUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyCharacterPicture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyCharacterPicture_characterId_idx" ON "FamilyCharacterPicture"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyCharacterPicture_familyId_characterId_key" ON "FamilyCharacterPicture"("familyId", "characterId");

-- AddForeignKey
ALTER TABLE "FamilyCharacterPicture" ADD CONSTRAINT "FamilyCharacterPicture_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyCharacterPicture" ADD CONSTRAINT "FamilyCharacterPicture_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyCharacterPicture" ADD CONSTRAINT "FamilyCharacterPicture_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

