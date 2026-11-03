-- 토리 난이도·트로피용 대결 기록 (모두 추가만, 예전 기록은 그대로)
ALTER TABLE "BattleRecord" ADD COLUMN "toriLevel" TEXT,
ADD COLUMN "finish" TEXT,
ADD COLUMN "winnerHp" INTEGER,
ADD COLUMN "p1Hero" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "p2Hero" BOOLEAN NOT NULL DEFAULT false;
