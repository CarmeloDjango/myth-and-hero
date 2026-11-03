-- CreateTable
CREATE TABLE "BattleRecord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "p1Id" TEXT,
    "p2Id" TEXT,
    "vsTori" BOOLEAN NOT NULL,
    "winner" INTEGER NOT NULL,
    "p1Leader" TEXT NOT NULL,
    "p2Leader" TEXT NOT NULL,
    "turns" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BattleRecord_familyId_createdAt_idx" ON "BattleRecord"("familyId", "createdAt");

-- AddForeignKey
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_p1Id_fkey" FOREIGN KEY ("p1Id") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRecord" ADD CONSTRAINT "BattleRecord_p2Id_fkey" FOREIGN KEY ("p2Id") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

